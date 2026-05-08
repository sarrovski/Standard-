import { createClient } from "@/lib/supabase/server";

/**
 * Read-only product repositories used by Marketplace and product detail pages.
 * These are called from server components when isSupabaseConfigured() is true.
 * Writes belong elsewhere (Batch 5).
 */

export async function getPublishedProducts() {
  const supabase = createClient();
  // Include verified seller_payment_methods so marketplace cards can render
  // the right payment badges and the payment filter actually matches. Other
  // statuses are private to seller/admin and excluded here.
  return supabase
    .from("products")
    .select(
      "*, sellers(*), product_media(*), seller_payment_methods(*, payment_methods(*))",
    )
    .eq("status", "published")
    .eq("seller_payment_methods.status", "verified")
    .order("created_at", { ascending: false });
}

export async function getPublishedProductBySlug(productSlug: string) {
  const supabase = createClient();
  // PostgREST: when filtering on a non-inner joined table with .in(), rows
  // with no match still come through as an empty array. Verified rows
  // surface as the "Verified payments" badges; pending + needs_recheck
  // surface in the "Under review" panel. Rejected rows are private —
  // filtered here so they never reach the public payload.
  return supabase
    .from("products")
    .select(
      "*, sellers(*), product_media(*), trust_signals(*), seller_payment_methods(*, payment_methods(*))",
    )
    .eq("slug", productSlug)
    .eq("status", "published")
    .in("seller_payment_methods.status", [
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
