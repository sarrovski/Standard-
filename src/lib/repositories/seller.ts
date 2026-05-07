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
type PaymentVerificationRow =
  Database["public"]["Tables"]["payment_verification_requests"]["Row"];
type ProviderTagRequestRow =
  Database["public"]["Tables"]["provider_tag_requests"]["Row"];

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
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
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
 * Bundle of everything the seller dashboard needs in a single shot.
 * Returns null if the profile isn't a seller yet (so the page can render an
 * onboarding state instead of crashing).
 */
export type SellerDashboardData = {
  seller: SellerRow;
  products: ProductRow[];
  paymentRequests: PaymentVerificationRow[];
  providerTagRequest: ProviderTagRequestRow | null;
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

  const [productsRes, paymentsRes, tagRes] = await Promise.all([
    getSellerProducts(seller.id),
    getSellerPaymentVerificationRequests(seller.id),
    getSellerProviderTagRequest(seller.id),
  ]);

  return {
    seller,
    products: productsRes.data ?? [],
    paymentRequests: (paymentsRes.data ?? []) as PaymentVerificationRow[],
    providerTagRequest: tagRes.data ?? null,
  };
}
