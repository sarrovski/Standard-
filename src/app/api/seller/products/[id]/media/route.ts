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
import { parseYouTubeUrl } from "@/lib/youtube";
import type { Database } from "@/lib/supabase/types";

/**
 * POST   /api/seller/products/[id]/media   (multipart/form-data)
 *   field "file": image (png/jpeg/webp, <= 10MB)
 *   field "alt_text": optional string
 *
 * DELETE /api/seller/products/[id]/media
 *   body: { media_id?: string, storage_path?: string }
 *
 * Two named clients, one job each:
 *
 *   userSupabase  - cookies-based, user-scoped. RLS applies. Used ONLY for:
 *     * auth.getUser()
 *     * profiles.role lookup
 *     * sellers + products ownership lookup
 *
 *   adminSupabase - service-role. RLS bypassed. Used ONLY after ownership
 *     is confirmed at the API layer, for every privileged mutation:
 *     * storage.upload()
 *     * storage.remove()
 *     * product_media.insert()
 *     * product_media.delete()
 *
 * Why both storage AND DB use admin client (this is the Batch 12 change):
 * In production, even after migration 005 fixed product_media RLS, the
 * upload kept failing with the same RLS error message. Diagnosis showed
 * the storage helpers in lib/storage.ts were instantiating their own
 * cookies-scoped clients via createClient() — which meant storage.objects
 * RLS was checked even though the route was supposed to be running
 * privileged. The helpers now require a SupabaseClient parameter, and
 * this route passes adminSupabase. Ownership stays verified at the API
 * layer before any privileged op.
 *
 * Service role never crosses the browser boundary. The admin client is
 * instantiated inside the request lifecycle, never returned, never logged.
 */

type ProductMediaInsert =
  Database["public"]["Tables"]["product_media"]["Insert"];

type DeleteBody = {
  media_id?: unknown;
  storage_path?: unknown;
};

type VideoBody = {
  type?: unknown;
  url?: unknown;
  title?: unknown;
  alt_text?: unknown;
};

type MediaApiStep =
  | "auth"
  | "ownership"
  | "validation"
  | "storage_upload"
  | "storage_delete"
  | "product_media_insert"
  | "product_media_delete";

type AuthError = {
  error: string;
  status: number;
  step?: MediaApiStep;
  code?: string;
  details?: string;
};

type AuthSuccess = {
  user: NonNullable<
    Awaited<
      ReturnType<ReturnType<typeof createClient>["auth"]["getUser"]>
    >["data"]["user"]
  >;
  isAdmin: boolean;
  seller: { id: string } | null;
  effectiveSellerId: string;
  userSupabase: ReturnType<typeof createClient>;
  adminSupabase: ReturnType<typeof createAdminClient>;
  product: { id: string; seller_id: string };
};

type AuthResult = AuthSuccess | AuthError;

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isAuthError(result: AuthResult): result is AuthError {
  return "error" in result && !("user" in result);
}

/**
 * Resolve user, role, seller, and target product. Returns the two clients
 * the route needs, or a structured error response shape.
 *
 * The admin client is created up-front so we fail fast with a clear error
 * if SUPABASE_SERVICE_ROLE_KEY is missing in the environment — instead of
 * silently falling through to a partial flow.
 */
async function authSeller(productId: string): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase not configured.", status: 503, step: "auth" };
  }

  let adminSupabase: ReturnType<typeof createAdminClient>;
  try {
    adminSupabase = createAdminClient();
  } catch (err) {
    console.error(
      "[api/seller/products/[id]/media] admin client init failed:",
      err instanceof Error ? err.message : err,
    );
    return {
      error: "Missing Supabase service role configuration",
      status: 500,
      step: "auth",
      code: "admin_client",
    };
  }

  const userSupabase = createClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();
  if (!user) {
    return { error: "Unauthorized", status: 401, step: "auth" };
  }

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
      status: 500,
      step: "ownership",
    };
  }
  if (!seller && !isAdmin) {
    return { error: "No seller account.", status: 403, step: "ownership" };
  }

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
      status: 500,
      step: "ownership",
    };
  }
  if (!product) {
    return {
      error: isAdmin
        ? "Product not found."
        : "Product not found or you don't own it.",
      status: 404,
      step: "ownership",
    };
  }

  return {
    user,
    isAdmin,
    seller: seller ? { id: seller.id } : null,
    effectiveSellerId: product.seller_id,
    userSupabase,
    adminSupabase,
    product,
  };
}

function authErrorResponse(auth: {
  error: string;
  status: number;
  step?: MediaApiStep;
  code?: string;
  details?: string;
}) {
  return NextResponse.json(
    {
      error: auth.error,
      ...(auth.step ? { step: auth.step } : {}),
      ...(auth.code ? { code: auth.code } : {}),
      ...(auth.details ? { details: auth.details } : {}),
    },
    { status: auth.status },
  );
}

function jsonError(
  status: number,
  error: string,
  step: MediaApiStep,
  extra: { code?: string; details?: string } = {},
) {
  return NextResponse.json({ error, step, ...extra }, { status });
}

async function getNextSortOrder(
  adminSupabase: ReturnType<typeof createAdminClient>,
  productId: string,
) {
  const { data: lastMedia } = await adminSupabase
    .from("product_media")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>();
  return (lastMedia?.sort_order ?? -1) + 1;
}

function mediaSelect() {
  return [
    "id",
    "product_id",
    "storage_path",
    "public_url",
    "alt_text",
    "sort_order",
    "media_type",
    "external_url",
    "provider",
    "video_id",
    "thumbnail_url",
    "title",
    "created_at",
  ].join(", ");
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const productId = params.id;
  if (!productId) {
    return NextResponse.json(
      { error: "Missing product id.", step: "ownership" },
      { status: 400 },
    );
  }

  const auth = await authSeller(productId);
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return addYouTubeMedia(request, productId, auth);
  }

  return addImageMedia(request, productId, auth);
}

async function addImageMedia(
  request: NextRequest,
  productId: string,
  auth: AuthSuccess,
) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError(400, "Expected multipart/form-data body.", "storage_upload");
  }

  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File)) {
    return jsonError(400, "No file provided in 'file' field.", "storage_upload");
  }
  const altTextRaw = formData.get("alt_text");
  const altText = readString(typeof altTextRaw === "string" ? altTextRaw : null);

  const nextSortOrder = await getNextSortOrder(auth.adminSupabase, productId);

  // Storage upload via admin client. This is the Batch 12 fix — previously
  // lib/storage.ts created its own cookies-scoped client, so storage.objects
  // RLS was applied even from this server route.
  const upload = await uploadProductMedia({
    client: auth.adminSupabase,
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
    media_type: "image",
  };

  // Privileged DB write — admin client.
  const { data, error: insertError } = await auth.adminSupabase
    .from("product_media")
    .insert(insertRow as never)
    .select(mediaSelect())
    .single<Database["public"]["Tables"]["product_media"]["Row"]>();

  if (insertError || !data) {
    // Best-effort cleanup: drop the orphan storage object via admin client.
    const cleanup = await deleteProductMedia(
      auth.adminSupabase,
      upload.storagePath,
    );
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
    return jsonError(
      500,
      `product_media_insert failed: ${detail}`,
      "product_media_insert",
      {
        code: insertError?.code,
        details: insertError?.details ?? undefined,
      },
    );
  }

  return NextResponse.json({ media: data });
}

async function addYouTubeMedia(
  request: NextRequest,
  productId: string,
  auth: AuthSuccess,
) {
  let raw: VideoBody;
  try {
    raw = (await request.json()) as VideoBody;
  } catch {
    return jsonError(400, "Invalid JSON body.", "validation", {
      code: "invalid_json",
    });
  }

  const type = readString(raw.type);
  const url = readString(raw.url);
  const title = readString(raw.title);
  const altText = readString(raw.alt_text);

  if (type !== "youtube") {
    return jsonError(400, "Only YouTube video links are supported.", "validation", {
      code: "unsupported_media_type",
    });
  }
  if (!url) {
    return jsonError(400, "YouTube URL is required.", "validation", {
      code: "missing_url",
    });
  }

  const parsed = parseYouTubeUrl(url);
  if (!parsed) {
    return jsonError(
      400,
      "Enter a valid YouTube watch, short, embed, shorts, or youtu.be URL.",
      "validation",
      { code: "invalid_youtube_url" },
    );
  }

  const nextSortOrder = await getNextSortOrder(auth.adminSupabase, productId);
  const insertRow: ProductMediaInsert = {
    product_id: productId,
    storage_path: null,
    public_url: null,
    alt_text: altText,
    sort_order: nextSortOrder,
    media_type: "youtube",
    external_url: parsed.normalizedUrl,
    provider: "youtube",
    video_id: parsed.videoId,
    thumbnail_url: parsed.thumbnailUrl,
    title,
  };

  const { data, error: insertError } = await auth.adminSupabase
    .from("product_media")
    .insert(insertRow as never)
    .select(mediaSelect())
    .single<Database["public"]["Tables"]["product_media"]["Row"]>();

  if (insertError || !data) {
    console.error(
      "[api/seller/products/[id]/media POST] youtube insert failed:",
      insertError?.message,
      insertError?.code,
      insertError?.details,
    );
    return jsonError(
      500,
      `product_media_insert failed: ${insertError?.message ?? "Unknown insert error."}`,
      "product_media_insert",
      {
        code: insertError?.code,
        details: insertError?.details ?? undefined,
      },
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
    return NextResponse.json(
      { error: "Missing product id.", step: "ownership" },
      { status: 400 },
    );
  }

  const auth = await authSeller(productId);
  if (isAuthError(auth)) {
    return authErrorResponse(auth);
  }

  let raw: DeleteBody;
  try {
    raw = (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body.", step: "product_media_delete" },
      { status: 400 },
    );
  }

  const mediaId = readString(raw.media_id);
  const storagePath = readString(raw.storage_path);
  if (!mediaId && !storagePath) {
    return NextResponse.json(
      {
        error: "media_id or storage_path required.",
        step: "product_media_delete",
      },
      { status: 400 },
    );
  }

  // Resolve the media row via admin client. We re-check product_id as
  // defense-in-depth — even though authSeller already verified ownership.
  let row:
    | {
        id: string;
        product_id: string;
        storage_path: string | null;
        media_type: "image" | "youtube";
      }
    | null = null;
  if (mediaId) {
    const { data } = await auth.adminSupabase
      .from("product_media")
      .select("id, product_id, storage_path, media_type")
      .eq("id", mediaId)
      .eq("product_id", productId)
      .maybeSingle<{
        id: string;
        product_id: string;
        storage_path: string | null;
        media_type: "image" | "youtube";
      }>();
    row = data ?? null;
  } else if (storagePath) {
    const { data } = await auth.adminSupabase
      .from("product_media")
      .select("id, product_id, storage_path, media_type")
      .eq("storage_path", storagePath)
      .eq("product_id", productId)
      .maybeSingle<{
        id: string;
        product_id: string;
        storage_path: string | null;
        media_type: "image" | "youtube";
      }>();
    row = data ?? null;
  }

  if (!row) {
    return NextResponse.json(
      {
        error: "Media not found for this product.",
        step: "product_media_delete",
      },
      { status: 404 },
    );
  }

  // Storage delete via admin client for images. YouTube link rows have no
  // storage object and delete only the DB row below.
  if (row.media_type === "image") {
    if (!row.storage_path) {
      return jsonError(
        500,
        "Image media row is missing storage_path.",
        "storage_delete",
        { code: "missing_storage_path" },
      );
    }
    const storageErr = await deleteProductMedia(
      auth.adminSupabase,
      row.storage_path,
    );
    if (storageErr) {
      console.error(
        "[api/seller/products/[id]/media DELETE] storage delete failed:",
        storageErr.message,
      );
      return jsonError(
        500,
        `storage_delete failed: ${storageErr.message}`,
        "storage_delete",
        { code: storageErr.code },
      );
    }
  }

  // DB delete via admin client.
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
        ...(dbError.details ? { details: dbError.details } : {}),
      },
      { status: 207 },
    );
  }

  return NextResponse.json({ deleted: true, media_id: row.id });
}
