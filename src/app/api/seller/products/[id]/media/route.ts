import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
 *   one of media_id / storage_path is required
 *
 * Auth:
 *   - User authenticated, with a sellers row (profile.role === 'seller'
 *     after Stripe webhook promotes the user).
 *   - Ownership: the product referenced in the URL must belong to this
 *     seller. RLS on products + storage.objects (migration 004) enforces
 *     this at the DB level too.
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

async function authSeller(request: NextRequest, productId: string) {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase not configured.", status: 503 } as const;
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Unauthorized", status: 401 } as const;
  }
  const { data: seller, error: sellerError } = await getSellerByProfileId(user.id);
  if (sellerError) {
    return { error: "Seller lookup failed.", status: 500 } as const;
  }
  if (!seller) {
    return { error: "No seller account.", status: 403 } as const;
  }

  // Confirm product ownership.
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("seller_id", seller.id)
    .maybeSingle<{ id: string }>();
  if (productError) {
    return { error: "Product lookup failed.", status: 500 } as const;
  }
  if (!product) {
    return { error: "Product not found or you don't own it.", status: 404 } as const;
  }

  return { user, seller, supabase, product } as const;
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
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data body." },
      { status: 400 },
    );
  }

  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File)) {
    return NextResponse.json(
      { error: "No file provided in 'file' field." },
      { status: 400 },
    );
  }
  const altTextRaw = formData.get("alt_text");
  const altText = readString(typeof altTextRaw === "string" ? altTextRaw : null);

  // Compute the next sort_order so newly uploaded media goes after existing.
  const { data: lastMedia } = await auth.supabase
    .from("product_media")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();
  const nextSortOrder = (lastMedia?.sort_order ?? -1) + 1;

  const upload = await uploadProductMedia({
    sellerId: auth.seller.id,
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

  const { data, error: insertError } = await auth.supabase
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
    // Best-effort cleanup: if the row insert failed, drop the storage object
    // so we don't leave orphaned files. Logged on second failure.
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
    );
    // Surface the underlying error message so RLS / schema mismatches are
    // diagnosable from the dashboard. Postgres errors don't include
    // secrets; the message is e.g. "new row violates row-level security
    // policy for table \"product_media\"".
    const detail = insertError?.message ?? "Unknown insert error.";
    return NextResponse.json(
      {
        error: `Could not record uploaded media: ${detail}`,
        step: "product_media_insert",
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
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let raw: DeleteBody;
  try {
    raw = (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const mediaId = readString(raw.media_id);
  const storagePath = readString(raw.storage_path);
  if (!mediaId && !storagePath) {
    return NextResponse.json(
      { error: "media_id or storage_path required." },
      { status: 400 },
    );
  }

  // Resolve the row so we know the storage_path to delete.
  let row:
    | { id: string; product_id: string; storage_path: string }
    | null = null;
  if (mediaId) {
    const { data } = await auth.supabase
      .from("product_media")
      .select("id, product_id, storage_path")
      .eq("id", mediaId)
      .eq("product_id", productId)
      .maybeSingle<{ id: string; product_id: string; storage_path: string }>();
    row = data ?? null;
  } else if (storagePath) {
    const { data } = await auth.supabase
      .from("product_media")
      .select("id, product_id, storage_path")
      .eq("storage_path", storagePath)
      .eq("product_id", productId)
      .maybeSingle<{ id: string; product_id: string; storage_path: string }>();
    row = data ?? null;
  }

  if (!row) {
    return NextResponse.json(
      { error: "Media not found for this product." },
      { status: 404 },
    );
  }

  // Delete storage object first; if the row delete fails afterward we'd
  // rather have an orphaned DB row than an orphaned storage object that
  // racks up bytes silently.
  const storageErr = await deleteProductMedia(row.storage_path);
  if (storageErr) {
    console.error(
      "[api/seller/products/[id]/media DELETE] storage delete failed:",
      storageErr.message,
    );
    return NextResponse.json(
      { error: storageErr.message },
      { status: 500 },
    );
  }

  const { error: dbError } = await auth.supabase
    .from("product_media")
    .delete()
    .eq("id", row.id);
  if (dbError) {
    console.error(
      "[api/seller/products/[id]/media DELETE] row delete failed:",
      dbError.message,
    );
    return NextResponse.json(
      {
        warning:
          "Storage object deleted but DB row could not be removed. Please retry.",
        error: dbError.message,
      },
      { status: 207 },
    );
  }

  return NextResponse.json({ deleted: true, media_id: row.id });
}
