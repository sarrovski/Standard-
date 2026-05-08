import { createClient } from "@/lib/supabase/server";

/**
 * Read-only product repositories used by Marketplace and product detail pages.
 * These are called from server components when isSupabaseConfigured() is true.
 * Writes belong elsewhere (Batch 5).
 *
 * Batch 11 note: seller_payment_methods has no direct FK to products.
 * The FK chain is products -> sellers -> seller_payment_methods.
 * We join through sellers in the select string to avoid PostgREST errors.
 */

export async function getPublishedProducts() {
      const supabase = createClient();
      return supabase
        .from("products")
        .select(
                  "*, sellers(*, seller_payment_methods(*, payment_methods(*))), product_media(*)",
                )
        .eq("status", "published")
        .order("created_at", { ascending: false });
}

export async function getPublishedProductBySlug(productSlug: string) {
      const supabase = createClient();
      return supabase
        .from("products")
        .select(
                  "*, sellers(*, seller_payment_methods(*, payment_methods(*))), product_media(*), trust_signals(*)",
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
