import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/roles";
import { getSellerByProfileId } from "@/lib/repositories/seller";
import {
  deleteProductMedia,
  isStorageError,
  uploadProductMedia,
} from "@/lib/storage";
import type { Database } from "@/lib/supabase/types";

/**
 * POST   /api/seller/products/[id]/media   (multipart/form-data)
 *   field "file": image (png/jpeg/webp, <= 10MB)
 *   field "alt_text": optional string
 *
 * DELETE /api/seller/products/[id]/media
 *   body: { media_id?: string, storage_path?: string }
 *
 * Auth + ownership flow:
 *   1. Authenticate user via cookies-scoped client (RLS applies).
 *   2. Detect admins via profiles.role.
 *   3. Verify product ownership through the user-scoped client (sellers
 *      see their own; admins see everything).
 *   4. Once ownership is confirmed at the API layer, switch to the
 *      service-role admin client for the product_media DB write/delete.
 *
 * Why service-role for product_media writes: production-tested in Batch
 * 10/11, an authenticated user-scoped INSERT on product_media kept hitting
 * "new row violates row-level security policy" even after migration 005
 * rewrote the policies as per-operation. Rather than fight RLS for a
 * path that already does explicit ownership verification at the API
 * layer, the privileged DB op runs as service-role. Migration 005 stays
 * in place — it's the right backstop for direct PostgREST clients, just
 * not the primary gate for this server-side route any more.
 *
 * Storage object policies (migration 004) still apply to bucket writes;
 * they piggyback on the path layout (sellers/{seller_id}/...) and use
 * auth.uid(), which works fine for storage. Storage uploads continue
 * to go through the user-scoped helper in lib/storage.ts.
 */

type ProductMediaInsert =
  Database["public"]["Tables"]["product_media"]["Insert"];

type DeleteBody = {
  media_id?: unknown;
  storage_path?: unknown;
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

async function authSeller(_request: NextRequest, productId: string) {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase not configured.", status: 503 } as const;
  }
  const userSupabase = createClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();
  if (!user) {
    return { error: "Unauthorized", status: 401 } as const;
  }

  // Detect admins so they can manage media for any product.
  const { data: profile } = await userSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: "user" | "seller" | "admin" }>();
  const isAdmin = profile?.role === "admin";

  const { data: seller, error: sellerError } = await getSellerByProfileId(user.id);
  if (sellerError) {
    return {
      error: "Seller lookup failed.",
      step: "seller_lookup" as const,
      status: 500,
    } as const;
  }

  if (!seller && !isAdmin) {
    return { error: "No seller account.", status: 403 } as const;
  }

  // Load the product. Admins can target any product; sellers must own it.
  let productQuery = userSupabase
    .from("products")
    .select("id, seller_id")
    .eq("id", productId);
  if (!isAdmin && seller) {
    productQuery = productQuery.eq("seller_id", seller.id);
  }
  const { data: product, error: productError } = await productQuery
    .maybeSingle<{ id: string; seller_id: string }>();
  if (productError) {
    return {
      error: "Product lookup failed.",
      step: "product_lookup" as const,
      status: 500,
    } as const;
  }
  if (!product) {
    return {
      error: isAdmin
        ? "Product not found."
        : "Product not found or you don't own it.",
      status: 404,
    } as const;
  }

  // Encode the product's owning seller in the storage path so when an
  // admin uploads on behalf of a seller, the path still matches what
  // migration 004's storage RLS expects.
  const effectiveSellerId = product.seller_id;

  // Service-role client for the privileged product_media DB ops.
  const adminSupabase = createAdminClient();

  return {
    user,
    isAdmin,
    seller,
    effectiveSellerId,
    userSupabase,
    adminSupabase,
    product,
  } as const;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const productId = params.id;
  if (!productId) {
    return NextResponse.json({ error: "Missing product id." }, { status: 400 });
  }

  const auth = await authSeller(request, productId);
  if ("error" in auth) {
    return NextResponse.json(
      {
        error: auth.error,
        ...("step" in auth ? { step: auth.step } : {}),
      },
      { status: auth.status },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data body.", step: "parse_form" },
      { status: 400 },
    );
  }

  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File)) {
    return NextResponse.json(
      { error: "No file provided in 'file' field.", step: "parse_form" },
      { status: 400 },
    );
  }
  const altTextRaw = formData.get("alt_text");
  const altText = readString(typeof altTextRaw === "string" ? altTextRaw : null);

  // sort_order via admin client (no RLS surprises here either).
  const { data: lastMedia } = await auth.adminSupabase
    .from("product_media")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();
  const nextSortOrder = (lastMedia?.sort_order ?? -1) + 1;

  // Storage upload still uses the user-scoped helper.
  const upload = await uploadProductMedia({
    sellerId: auth.effectiveSellerId,
    productId,
    file: fileEntry,
  });
  if (isStorageError(upload)) {
    const httpStatus =
      upload.code === "invalid_mime" || upload.code === "file_too_large"
        ? 400
        : 500;
    return NextResponse.json(
      {
        error: upload.message,
        code: upload.code,
        step: "storage_upload",
      },
      { status: httpStatus },
    );
  }

  const insertRow: ProductMediaInsert = {
    product_id: productId,
    storage_path: upload.storagePath,
    public_url: upload.publicUrl,
    alt_text: altText,
    sort_order: nextSortOrder,
  };

  // Privileged write — service role bypasses RLS. Ownership was verified
  // above at the API layer.
  const { data, error: insertError } = await auth.adminSupabase
    .from("product_media")
    .insert(insertRow as never)
    .select("id, product_id, storage_path, public_url, alt_text, sort_order")
    .single<{
      id: string;
      product_id: string;
      storage_path: string;
      public_url: string | null;
      alt_text: string | null;
      sort_order: number;
    }>();

  if (insertError || !data) {
    const cleanup = await deleteProductMedia(upload.storagePath);
    if (cleanup) {
      console.error(
        "[api/seller/products/[id]/media POST] orphan storage object — cleanup also failed:",
        upload.storagePath,
        cleanup.message,
      );
    }
    console.error(
      "[api/seller/products/[id]/media POST] insert failed:",
      insertError?.message,
      insertError?.code,
      insertError?.details,
    );
    const detail = insertError?.message ?? "Unknown insert error.";
    return NextResponse.json(
      {
        error: `product_media_insert failed: ${detail}`,
        step: "product_media_insert",
        ...(insertError?.code ? { code: insertError.code } : {}),
        ...(insertError?.details ? { details: insertError.details } : {}),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ media: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const productId = params.id;
  if (!productId) {
    return NextResponse.json({ error: "Missing product id." }, { status: 400 });
  }

  const auth = await authSeller(request, productId);
  if ("error" in auth) {
    return NextResponse.json(
      {
        error: auth.error,
        ...("step" in auth ? { step: auth.step } : {}),
      },
      { status: auth.status },
    );
  }

  let raw: DeleteBody;
  try {
    raw = (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body.", step: "parse_body" },
      { status: 400 },
    );
  }

  const mediaId = readString(raw.media_id);
  const storagePath = readString(raw.storage_path);
  if (!mediaId && !storagePath) {
    return NextResponse.json(
      { error: "media_id or storage_path required.", step: "parse_body" },
      { status: 400 },
    );
  }

  let row:
    | { id: string; product_id: string; storage_path: string }
    | null = null;
  if (mediaId) {
    const { data } = await auth.adminSupabase
      .from("product_media")
      .select("id, product_id, storage_path")
      .eq("id", mediaId)
      .eq("product_id", productId)
      .maybeSingle<{ id: string; product_id: string; storage_path: string }>();
    row = data ?? null;
  } else if (storagePath) {
    const { data } = await auth.adminSupabase
      .from("product_media")
      .select("id, product_id, storage_path")
      .eq("storage_path", storagePath)
      .eq("product_id", productId)
      .maybeSingle<{ id: string; product_id: string; storage_path: string }>();
    row = data ?? null;
  }

  if (!row) {
    return NextResponse.json(
      { error: "Media not found for this product.", step: "media_lookup" },
      { status: 404 },
    );
  }

  const storageErr = await deleteProductMedia(row.storage_path);
  if (storageErr) {
    console.error(
      "[api/seller/products/[id]/media DELETE] storage delete failed:",
      storageErr.message,
    );
    return NextResponse.json(
      {
        error: `storage_delete failed: ${storageErr.message}`,
        step: "storage_delete",
      },
      { status: 500 },
    );
  }

  const { error: dbError } = await auth.adminSupabase
    .from("product_media")
    .delete()
    .eq("id", row.id);
  if (dbError) {
    console.error(
      "[api/seller/products/[id]/media DELETE] row delete failed:",
      dbError.message,
      dbError.code,
      dbError.details,
    );
    return NextResponse.json(
      {
        warning:
          "Storage object deleted but DB row could not be removed. Please retry.",
        error: `product_media_delete failed: ${dbError.message}`,
        step: "product_media_delete",
        ...(dbError.code ? { code: dbError.code } : {}),
      },
      { status: 207 },
    );
  }

  return NextResponse.json({ deleted: true, media_id: row.id });
}
