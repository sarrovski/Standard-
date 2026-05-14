import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

/**
 * Read-only repository for the authenticated seller's own data.
 *
 * Every function takes the auth user's profile id (= auth.uid()). All queries
 * are scoped to that seller; nothing here touches another seller's rows.
 *
 * Writes live in API routes under /api/seller/* so we can validate input,
 * enforce ownership, and return clean JSON responses.
 */

type SellerRow = Database["public"]["Tables"]["sellers"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ProductMediaRow = Database["public"]["Tables"]["product_media"]["Row"];
type PaymentMethodRow = Database["public"]["Tables"]["payment_methods"]["Row"];
type PaymentVerificationRow =
  Database["public"]["Tables"]["payment_verification_requests"]["Row"];
type ProviderTagRequestRow =
  Database["public"]["Tables"]["provider_tag_requests"]["Row"];
type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"];

export type ProductRowWithMedia = ProductRow & {
  product_media: ProductMediaRow[] | null;
};

/** Returns null when the profile has no sellers row yet (pre-subscription). */
export async function getSellerByProfileId(profileId: string) {
  const supabase = createClient();
  return supabase
    .from("sellers")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle<SellerRow>();
}

export async function getSellerProducts(sellerId: string) {
  const supabase = createClient();
  return supabase
    .from("products")
    .select("*, product_media(*)")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
}

/**
 * Per-product traffic totals (views + outbound clicks) for a seller.
 *
 * Backed by the public.get_product_traffic_stats(uuid) RPC defined in
 * migration 010_product_events.sql. Returns an empty Map on error so
 * callers can fall back to "no traffic yet" without crashing.
 */
export type ProductTrafficStats = {
  views: number;
  outboundClicks: number;
};

export async function getProductTrafficStats(
  sellerId: string,
): Promise<Map<string, ProductTrafficStats>> {
  // EXECUTE on public.get_product_traffic_stats is revoked from anon /
  // authenticated by migration 012_security_hardening_round_2.sql to
  // satisfy the Supabase advisor. The function therefore can only be
  // called by service_role, so we invoke it through the admin client.
  // This call site is already server-only and the caller is responsible
  // for passing the correct sellerId (the dashboard page derives it from
  // the authenticated user before calling). The admin client is safe to
  // use here for that reason.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "get_product_traffic_stats" as never,
    { p_seller_id: sellerId } as never,
  );
  if (error) {
    console.error("[seller-repo] traffic stats RPC failed:", error.message);
    return new Map();
  }
  const rows = (data ?? []) as Array<{
    product_id: string;
    views: number | string | null;
    outbound_clicks: number | string | null;
  }>;
  const stats = new Map<string, ProductTrafficStats>();
  for (const row of rows) {
    stats.set(row.product_id, {
      views: Number(row.views ?? 0) || 0,
      outboundClicks: Number(row.outbound_clicks ?? 0) || 0,
    });
  }
  return stats;
}

/**
 * Count the verified seller_payment_methods rows for a seller. Used by the
 * seller-facing "Listing strength" score so we can credit the seller once
 * they've gone through payment-method verification at least once.
 *
 * Returns 0 on any error so callers can fall back gracefully.
 */
export async function getVerifiedPaymentMethodCount(
  sellerId: string,
): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("seller_payment_methods")
    .select("*", { count: "exact", head: true })
    .eq("seller_id", sellerId)
    .eq("status", "verified");
  if (error) {
    console.error(
      "[seller-repo] verified payment method count failed:",
      error.message,
    );
    return 0;
  }
  return count ?? 0;
}

export async function getSellerPaymentVerificationRequests(sellerId: string) {
  const supabase = createClient();
  return supabase
    .from("payment_verification_requests")
    .select("*, payment_methods(*), products(*)")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
}

export async function getSellerProviderTagRequest(sellerId: string) {
  const supabase = createClient();
  return supabase
    .from("provider_tag_requests")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<ProviderTagRequestRow>();
}

/**
 * Lookup all payment_methods rows. Used to populate the seller's "payment
 * method" dropdown so the UI can submit real payment_method_id UUIDs to
 * /api/seller/payment-requests.
 *
 * payment_methods is a global lookup table — every seller sees the same list,
 * so no seller_id filter is needed. RLS policies in migration 001 make this
 * row-readable to authenticated users.
 */
export async function getPaymentMethods() {
  const supabase = createClient();
  return supabase.from("payment_methods").select("*").order("name");
}

/**
 * Most recent subscription row for the seller. Returns null when there's no
 * subscription yet (e.g. user just promoted to seller, webhook still
 * arriving). The Billing page uses this to show status and current_period_end.
 */
export async function getSellerSubscription(sellerId: string) {
  const supabase = createClient();
  return supabase
    .from("subscriptions")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionRow>();
}

/**
 * Bundle of everything the seller dashboard needs in a single shot.
 * Returns null if the profile isn't a seller yet (so the page can render an
 * onboarding state instead of crashing).
 */
export type SellerDashboardData = {
  seller: SellerRow;
  products: ProductRowWithMedia[];
  paymentRequests: PaymentVerificationRow[];
  providerTagRequest: ProviderTagRequestRow | null;
  paymentMethods: PaymentMethodRow[];
  subscription: SubscriptionRow | null;
};

export async function getSellerDashboardData(
  profileId: string,
): Promise<SellerDashboardData | null> {
  const sellerRes = await getSellerByProfileId(profileId);
  if (sellerRes.error || !sellerRes.data) {
    if (sellerRes.error) {
      console.error("[seller-repo] sellers lookup failed:", sellerRes.error.message);
    }
    return null;
  }
  const seller = sellerRes.data;

  const [productsRes, paymentsRes, tagRes, methodsRes, subRes] = await Promise.all([
    getSellerProducts(seller.id),
    getSellerPaymentVerificationRequests(seller.id),
    getSellerProviderTagRequest(seller.id),
    getPaymentMethods(),
    getSellerSubscription(seller.id),
  ]);

  return {
    seller,
    products: (productsRes.data ?? []) as unknown as ProductRowWithMedia[],
    paymentRequests: (paymentsRes.data ?? []) as PaymentVerificationRow[],
    providerTagRequest: tagRes.data ?? null,
    paymentMethods: methodsRes.data ?? [],
    subscription: subRes.data ?? null,
  };
}

/**
 * Currently active featured slots owned by this seller. Used by the Billing
 * page to show "Featured active" cards alongside the featured slot purchase
 * UI, so the seller doesn't try to buy a slot they already own.
 */
export async function getActiveSellerFeaturedSlots(sellerId: string) {
  const supabase = createClient();
  return supabase
    .from("featured_slots")
    .select("*, products(name, slug, game, category)")
    .eq("seller_id", sellerId)
    .eq("status", "active")
    .order("ends_at", { ascending: true });
}
