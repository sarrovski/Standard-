import { createClient } from "@/lib/supabase/server";

/**
 * Read-only admin queue repositories. Writes go through the admin API
 * routes under /api/admin/* (Batch 5).
 *
 * Admin role is enforced in /admin/page.tsx via requireRole(['admin']);
 * RLS on the underlying tables also gates these reads to admins.
 */

export async function getPendingPaymentVerificationRequests() {
  const supabase = createClient();
  return supabase
    .from("payment_verification_requests")
    .select("*, sellers(*), payment_methods(*), products(*)")
    .in("status", ["pending_verification", "needs_recheck"])
    .order("created_at", { ascending: true });
}

export async function getPendingProviderTagRequests() {
  const supabase = createClient();
  return supabase
    .from("provider_tag_requests")
    .select("*, sellers(*)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
}

/**
 * All sellers with the joined data the admin Sellers tab needs to render
 * one summary row each:
 *   - profile (display name, email, role)
 *   - latest subscription status
 *
 * Counts are computed separately via the helpers below to avoid pulling
 * every product/payment-method row.
 */
export async function getAllSellersForAdmin() {
  const supabase = createClient();
  return supabase
    .from("sellers")
    .select(
      "*, profiles(id, email, display_name, role), subscriptions(status, current_period_end)",
    )
    .order("created_at", { ascending: false });
}

/**
 * Build seller_id -> product_count map. We pull seller_id only so the
 * row payload stays tiny even on long catalogs.
 */
export async function getProductCountBySeller() {
  const supabase = createClient();
  const { data } = await supabase.from("products").select("seller_id");
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ seller_id: string }>) {
    counts.set(row.seller_id, (counts.get(row.seller_id) ?? 0) + 1);
  }
  return counts;
}

/**
 * Build seller_id -> verified payment method count map. Mirrors how the
 * marketplace surfaces "verified payment methods" so the admin Sellers
 * tab can sanity-check at a glance.
 */
export async function getVerifiedPaymentMethodCountBySeller() {
  const supabase = createClient();
  const { data } = await supabase
    .from("seller_payment_methods")
    .select("seller_id")
    .eq("status", "verified");
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ seller_id: string }>) {
    counts.set(row.seller_id, (counts.get(row.seller_id) ?? 0) + 1);
  }
  return counts;
}
