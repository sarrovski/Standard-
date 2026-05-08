import { createClient } from "@/lib/supabase/server";

/**
 * Read-only product repositories used by Marketplace and product detail pages.
 * These are called from server components when isSupabaseConfigured() is true.
 * Writes belong elsewhere (Batch 5).
 *
 * NOTE (Batch 11): seller_payment_methods has no direct FK to products.
 * The FK chain is: products -> sellers -> seller_payment_methods.
 * PostgREST cannot traverse products->seller_payment_methods directly.
 * We join seller_payment_methods through sellers instead.
 */

export async function getPublishedProducts() {
    const supabase = createClient();
    // seller_payment_methods is nested under sellers — that is the only FK path
  // PostgREST can follow. We filter to verified inside the embed so the
  // marketplace payment-method badges reflect only approved methods.
  return supabase
      .from("products")
      .select(
              "*, sellers(*, seller_payment_methods(*, payment_methods(*))), product_media(*)",
            )
      .eq("status", "published")
      .eq("sellers.seller_payment_methods.status", "verified")
      .order("created_at", { ascending: false });
}

export async function getPublishedProductBySlug(productSlug: string) {
    const supabase = createClient();
    // Same FK-path fix: seller_payment_methods lives under sellers, not products.
  // We include verified + pending + needs_recheck so the product page can
  // show "Under review" items to the authenticated seller while hiding
  // rejected rows from the public payload.
  return supabase
      .from("products")
      .select(
              "*, sellers(*, seller_payment_methods(*, payment_methods(*))), product_media(*), trust_signals(*)",
            )
      .eq("slug", productSlug)
      .eq("status", "published")
      .in("sellers.seller_payment_methods.status", [
              "verified",
              "pending_verification",
              "needs_recheck",
            ])
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
