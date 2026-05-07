import { createClient } from "@/lib/supabase/server";

export const PRODUCT_MEDIA_BUCKET = "product-media";

export const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

// 10 MB. Generous for hero / product screenshots, restrictive enough that
// nobody uploads multi-MB unoptimized PNGs from a phone shot.
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/**
 * Result of a successful upload: storage_path inside the bucket plus the
 * public URL the public-facing site can render.
 */
export type UploadResult = {
  storagePath: string;
  publicUrl: string;
};

/**
 * Typed errors so callers can render specific messages.
 */
export type StorageError =
  | { code: "invalid_mime"; message: string }
  | { code: "file_too_large"; message: string }
  | { code: "upload_failed"; message: string }
  | { code: "delete_failed"; message: string };

function safeFileNameFragment(name: string): string {
  // Strip directory traversal, weird characters; keep an extension.
  const base = name
    .replace(/[\\/]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return base.length > 0 ? base : "upload";
}

/**
 * Build a deterministic storage path that encodes ownership:
 *   sellers/{seller_id}/products/{product_id}/{timestamp}-{safe_filename}
 *
 * RLS on storage.objects (in migration 004) checks the seller_id segment to
 * enforce that sellers only write/delete under their own prefix.
 */
export function buildProductMediaPath(args: {
  sellerId: string;
  productId: string;
  fileName: string;
}): string {
  const safe = safeFileNameFragment(args.fileName);
  return `sellers/${args.sellerId}/products/${args.productId}/${Date.now()}-${safe}`;
}

/**
 * Server-side upload. Validates mime + size, then writes to the bucket.
 * Returns either the upload result or a typed error so route handlers can
 * pick a clean status code.
 *
 * Note: this is a SERVER helper. The file is read from a route handler
 * (formData.get('file') as File). We never expose the bucket directly to
 * the browser.
 */
export async function uploadProductMedia(args: {
  sellerId: string;
  productId: string;
  file: File;
}): Promise<UploadResult | StorageError> {
  const { file, sellerId, productId } = args;

  if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
    return {
      code: "invalid_mime",
      message: `Unsupported file type "${file.type}". Allowed: ${ALLOWED_MIME_TYPES.join(", ")}.`,
    };
  }
  if (file.size > MAX_FILE_BYTES) {
    return {
      code: "file_too_large",
      message: `File is ${Math.round(file.size / 1024 / 1024)}MB. Max is ${MAX_FILE_BYTES / 1024 / 1024}MB.`,
    };
  }

  const supabase = createClient();
  const storagePath = buildProductMediaPath({
    sellerId,
    productId,
    fileName: file.name,
  });

  const { error } = await supabase.storage
    .from(PRODUCT_MEDIA_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
  if (error) {
    return { code: "upload_failed", message: error.message };
  }

  const publicUrl = supabase.storage
    .from(PRODUCT_MEDIA_BUCKET)
    .getPublicUrl(storagePath).data.publicUrl;
  return { storagePath, publicUrl };
}

/**
 * Public URL for a stored object. The bucket must be public (recommended
 * for product images — see README). For private buckets switch to
 * createSignedUrl().
 */
export function getProductMediaPublicUrl(storagePath: string): string {
  const supabase = createClient();
  return supabase.storage
    .from(PRODUCT_MEDIA_BUCKET)
    .getPublicUrl(storagePath).data.publicUrl;
}

/**
 * Delete an object from the bucket. Returns null on success, typed error on
 * failure. Caller is responsible for deleting the matching product_media row.
 */
export async function deleteProductMedia(
  storagePath: string,
): Promise<null | StorageError> {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(PRODUCT_MEDIA_BUCKET)
    .remove([storagePath]);
  if (error) {
    return { code: "delete_failed", message: error.message };
  }
  return null;
}

/** Type narrowing helper for callers. */
export function isStorageError(value: unknown): value is StorageError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value
  );
}
