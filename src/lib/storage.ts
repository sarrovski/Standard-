import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

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
 * Storage RLS (migration 004) inspects the seller_id segment via split_part
 * so sellers can only write/delete under their own prefix when called via
 * a user-scoped client. When the caller is the service-role admin client
 * the policy is bypassed — but the path layout is preserved so public URLs
 * still match what the public marketplace expects.
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
 * Server-side upload. Validates mime + size, then writes to the bucket via
 * the supplied Supabase client. Returns either the upload result or a typed
 * error so route handlers can pick a clean status code.
 *
 * The caller decides which client to use. As of Batch 12 the seller media
 * route passes its admin client because storage RLS was rejecting otherwise-
 * valid uploads from authenticated cookies-based sessions in production.
 * Ownership is verified at the API layer before this is called.
 */
export async function uploadProductMedia(args: {
  client: SupabaseClient<Database>;
  sellerId: string;
  productId: string;
  file: File;
}): Promise<UploadResult | StorageError> {
  const { client, file, sellerId, productId } = args;

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

  const storagePath = buildProductMediaPath({
    sellerId,
    productId,
    fileName: file.name,
  });

  const { error } = await client.storage
    .from(PRODUCT_MEDIA_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
  if (error) {
    return { code: "upload_failed", message: error.message };
  }

  const publicUrl = client.storage
    .from(PRODUCT_MEDIA_BUCKET)
    .getPublicUrl(storagePath).data.publicUrl;
  return { storagePath, publicUrl };
}

/**
 * Resolve a public URL using the supplied client. Public URLs don't depend
 * on the JWT (the bucket is marked public), but we keep the helper for
 * symmetry and future-proofing if the bucket switches to private + signed.
 */
export function getProductMediaPublicUrl(
  client: SupabaseClient<Database>,
  storagePath: string,
): string {
  return client.storage
    .from(PRODUCT_MEDIA_BUCKET)
    .getPublicUrl(storagePath).data.publicUrl;
}

/**
 * Delete an object from the bucket via the supplied client. Returns null on
 * success, typed error on failure. Caller is responsible for deleting the
 * matching product_media row.
 */
export async function deleteProductMedia(
  client: SupabaseClient<Database>,
  storagePath: string,
): Promise<null | StorageError> {
  const { error } = await client.storage
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
