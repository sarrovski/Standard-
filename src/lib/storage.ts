import { createClient } from "@/lib/supabase/client";

export const PRODUCT_MEDIA_BUCKET = "product-media";

export async function uploadProductImage(productId: string, file: File) {
  const supabase = createClient();
  const extension = file.name.split(".").pop() || "jpg";
  const path = `${productId}/${crypto.randomUUID()}.${extension}`;
  const { data, error } = await supabase.storage.from(PRODUCT_MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data: publicUrlData } = supabase.storage.from(PRODUCT_MEDIA_BUCKET).getPublicUrl(data.path);
  return { path: data.path, publicUrl: publicUrlData.publicUrl };
}

export async function deleteProductImage(path: string) {
  const supabase = createClient();
  const { error } = await supabase.storage.from(PRODUCT_MEDIA_BUCKET).remove([path]);
  if (error) throw error;
}
