import { createClient } from "@/lib/supabase/server";

/**
 * Read-only product repositories used by Marketplace and product detail pages.
 * These are called from server components when isSupabaseConfigured() is true.
 * Writes belong elsewhere (Batch 5).
 */

export async function getPublishedProducts() {
  const supabase = createClient();
  return supabase
    .from("products")
    .select("*, sellers(*), product_media(*)")
    .eq("status", "published")
    .order("created_at", { ascending: false });
}

export async function getPublishedProductBySlug(productSlug: string) {
  const supabase = createClient();
  return supabase
    .from("products")
    .select(
      "*, sellers(*), product_media(*), trust_signals(*), seller_payment_methods(*, payment_methods(*))",
    )
    .eq("slug", productSlug)
    .eq("status", "published")
    .maybeSingle();
}

export async function getVerifiedSellerPaymentMethods(sellerId: string) {
  const supabase = createClient();
  return supabase
    .from("seller_payment_methods")
    .select("*, payment_methods(*)")
    .eq("seller_id", sellerId)
    .eq("status", "verified");
}

export async function getAvailableFeaturedSlot(game: string, category: string) {
  const supabase = createClient();
  return supabase
    .from("featured_slots")
    .select("*")
    .eq("game", game)
    .eq("category", category)
    .neq("status", "active")
    .maybeSingle();
}
