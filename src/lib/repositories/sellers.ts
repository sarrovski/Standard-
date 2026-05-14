import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { withTimeout } from "@/lib/repositories/query-timeout";
import { toSlug } from "@/lib/slugs";

/**
 * Public seller repositories used by /sellers/[sellerSlug].
 *
 * MVP slug derivation:
 *   The sellers table doesn't have a slug column yet — we derive
 *   `toSlug(seller_name)` at request time. Lookups are O(N) over the
 *   sellers table (capped at 1000 rows for safety). When two sellers
 *   share the same name, the oldest one wins (deterministic order by
 *   created_at asc), and newer collisions are unreachable until a
 *   slug column is added. See the page header comment for the
 *   suggested future migration.
 */

type SellerRow = Database["public"]["Tables"]["sellers"]["Row"];
type TrustSignalRow = Database["public"]["Tables"]["trust_signals"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ProductMediaRow =
  Database["public"]["Tables"]["product_media"]["Row"];
type SellerPaymentMethodRow =
  Database["public"]["Tables"]["seller_payment_methods"]["Row"];
type PaymentMethodRow = Database["public"]["Tables"]["payment_methods"]["Row"];

export type VerifiedSellerPaymentMethod = SellerPaymentMethodRow & {
  payment_methods: PaymentMethodRow | null;
};

export type PublicSellerProfile = SellerRow & {
  profile: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  trust_signals: TrustSignalRow[];
  verified_payment_methods: VerifiedSellerPaymentMethod[];
};

export type PublishedProductForSeller = ProductRow & {
  sellers: SellerRow | null;
  product_media: ProductMediaRow[] | null;
};

/**
 * Look up a seller by their derived slug (toSlug(seller_name)). Returns
 * the full seller record plus joined profile (display_name + avatar
 * only — never email), public trust signals, and verified payment
 * methods. The user-scoped client handles the sellers + trust_signals +
 * seller_payment_methods reads through the existing public RLS
 * policies; the profile read uses the admin client because the
 * profiles table is auth.uid()-scoped.
 *
 * Returns { data: null, error: null } when no seller matches the slug
 * — the caller renders a 404 page in that case.
 */
export async function getPublicSellerBySlug(slug: string): Promise<{
  data: PublicSellerProfile | null;
  error: { message: string; code?: string } | null;
}> {
  if (!slug) return { data: null, error: null };

  const supabase = createClient();
  const sellersRes = await withTimeout(
    supabase
      .from("sellers")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1000),
    { label: "getPublicSellerBySlug.list" },
  );
  if (sellersRes.error || !sellersRes.data) {
    return {
      data: null,
      error: sellersRes.error
        ? {
            message: sellersRes.error.message,
            code: (sellersRes.error as { code?: string }).code,
          }
        : null,
    };
  }
  const candidates = sellersRes.data as unknown as SellerRow[];
  const target = candidates.find(
    (row) => toSlug(row.seller_name) === slug,
  );
  if (!target) return { data: null, error: null };

  const admin = createAdminClient();
  const [profileRes, trustRes, paymentRes] = await Promise.all([
    admin
      .from("profiles")
      .select("id, display_name, avatar_url")
      .eq("id", target.profile_id)
      .maybeSingle<{
        id: string;
        display_name: string | null;
        avatar_url: string | null;
      }>(),
    admin
      .from("trust_signals")
      .select("*")
      .eq("seller_id", target.id)
      .eq("is_public", true)
      .order("created_at", { ascending: false }),
    admin
      .from("seller_payment_methods")
      .select("*, payment_methods(*)")
      .eq("seller_id", target.id)
      .eq("status", "verified"),
  ]);

  return {
    data: {
      ...target,
      profile: profileRes.data
        ? {
            id: profileRes.data.id,
            display_name: profileRes.data.display_name,
            avatar_url: profileRes.data.avatar_url,
          }
        : null,
      trust_signals: (trustRes.data as unknown as TrustSignalRow[] | null) ?? [],
      verified_payment_methods:
        (paymentRes.data as unknown as VerifiedSellerPaymentMethod[] | null) ??
        [],
    },
    error: null,
  };
}

/**
 * All published products for a seller, newest first. Used by the public
 * profile page's "Products" grid. Joins sellers + product_media so the
 * `adaptProductCard` adapter can produce UIProductCard rows without
 * extra round-trips.
 */
export async function getPublishedProductsForSeller(
  sellerId: string,
): Promise<{
  data: PublishedProductForSeller[];
  error: { message: string; code?: string } | null;
}> {
  if (!sellerId) return { data: [], error: null };
  const supabase = createClient();
  const res = await withTimeout(
    supabase
      .from("products")
      .select("*, sellers(*), product_media(*)")
      .eq("seller_id", sellerId)
      .eq("status", "published")
      .order("created_at", { ascending: false }),
    { label: "getPublishedProductsForSeller" },
  );
  if (res.error || !res.data) {
    return {
      data: [],
      error: res.error
        ? {
            message: res.error.message,
            code: (res.error as { code?: string }).code,
          }
        : null,
    };
  }
  return {
    data: res.data as unknown as PublishedProductForSeller[],
    error: null,
  };
}
