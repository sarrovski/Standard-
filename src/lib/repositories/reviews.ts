import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { withTimeout } from "@/lib/repositories/query-timeout";

/**
 * Repository helpers for product reviews.
 *
 * - getApprovedReviewsForProduct: public read used by the product page.
 *   Joins reviewer display_name + avatar_url from public.profiles via the
 *   service-role admin client because public RLS on profiles is intentionally
 *   restrictive (auth.uid()-scoped). We only expose display_name + avatar.
 *
 * - getReviewsForSeller: seller-dashboard read. RLS already restricts the
 *   public read path to approved-only, but the seller-owner SELECT policy
 *   added in migration 016 lets a logged-in seller read every status on
 *   their own products. We call this from the seller dashboard server-side
 *   loader with the user-scoped client so RLS does the gating.
 *
 * - getReviewsForAdmin: admin moderation read. Uses the admin client so
 *   the join into reviewer profile + product still works regardless of
 *   profiles RLS. The route guard upstream verifies admin role.
 */

export type ProductReviewRow =
  Database["public"]["Tables"]["product_reviews"]["Row"];

export type ProductReviewWithReviewer = ProductReviewRow & {
  reviewer: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export type ProductReviewWithProduct = ProductReviewRow & {
  product: {
    id: string;
    name: string;
    slug: string;
  } | null;
  seller: {
    id: string;
    seller_name: string;
  } | null;
  reviewer: {
    id: string;
    display_name: string | null;
  } | null;
};

type ReviewBaseRow = {
  id: string;
  product_id: string;
  seller_id: string;
  reviewer_profile_id: string | null;
  rating: number;
  body: string;
  status: ProductReviewRow["status"];
  appeal_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Approved reviews for a single product, newest first. Joined with the
 * reviewer's display name + avatar so the product page can render a
 * minimal author chip. Uses the admin client so we can pull `profiles`
 * data without expanding the public profiles RLS — only `display_name`
 * + `avatar_url` are returned.
 */
export async function getApprovedReviewsForProduct(
  productId: string,
): Promise<{
  data: ProductReviewWithReviewer[];
  error: { message: string } | null;
}> {
  if (!productId) return { data: [], error: null };
  const admin = createAdminClient();
  const res = await withTimeout(
    admin
      .from("product_reviews")
      .select("*")
      .eq("product_id", productId)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    { label: "getApprovedReviewsForProduct" },
  );
  if (res.error || !res.data) {
    return {
      data: [],
      error: res.error ? { message: res.error.message } : null,
    };
  }
  const rows = res.data as unknown as ReviewBaseRow[];
  const reviewers = await loadReviewerProfiles(
    rows.map((r) => r.reviewer_profile_id),
  );
  return {
    data: rows.map((row) => ({
      ...row,
      reviewer: row.reviewer_profile_id
        ? reviewers.get(row.reviewer_profile_id) ?? null
        : null,
    })),
    error: null,
  };
}

/**
 * Every review (any status) on products owned by the given seller.
 * Powers the seller-dashboard Reviews tab where the seller can choose to
 * appeal `approved` reviews and see status of ones they've already
 * appealed. Uses the user-scoped client so RLS gates ownership — the
 * caller MUST already be authenticated as the seller's profile.
 */
export async function getReviewsForSeller(sellerId: string): Promise<{
  data: Array<
    ProductReviewRow & {
      product: { id: string; name: string; slug: string } | null;
      reviewer: { display_name: string | null } | null;
    }
  >;
  error: { message: string } | null;
}> {
  if (!sellerId) return { data: [], error: null };
  const supabase = createClient();
  const res = await withTimeout(
    supabase
      .from("product_reviews")
      .select("*, product:products(id,name,slug)")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false }),
    { label: "getReviewsForSeller" },
  );
  if (res.error || !res.data) {
    return {
      data: [],
      error: res.error ? { message: res.error.message } : null,
    };
  }
  const rows = res.data as unknown as Array<
    ReviewBaseRow & {
      product: { id: string; name: string; slug: string } | null;
    }
  >;
  const reviewers = await loadReviewerProfiles(
    rows.map((r) => r.reviewer_profile_id),
  );
  return {
    data: rows.map((row) => ({
      ...row,
      product: row.product,
      reviewer: row.reviewer_profile_id
        ? (reviewers.get(row.reviewer_profile_id)
            ? { display_name: reviewers.get(row.reviewer_profile_id)!.display_name }
            : null)
        : null,
    })),
    error: null,
  };
}

/**
 * Admin moderation queue. Loads every appealed review plus optional
 * filters extension points later. Uses the admin client because we
 * need to join reviewer + product across RLS-restricted scopes.
 */
export async function getAppealedReviewsForAdmin(): Promise<{
  data: ProductReviewWithProduct[];
  error: { message: string } | null;
}> {
  const admin = createAdminClient();
  const res = await withTimeout(
    admin
      .from("product_reviews")
      .select("*, product:products(id,name,slug), seller:sellers(id,seller_name)")
      .eq("status", "appealed")
      .order("created_at", { ascending: false }),
    { label: "getAppealedReviewsForAdmin" },
  );
  if (res.error || !res.data) {
    return {
      data: [],
      error: res.error ? { message: res.error.message } : null,
    };
  }
  const rows = res.data as unknown as Array<
    ReviewBaseRow & {
      product: { id: string; name: string; slug: string } | null;
      seller: { id: string; seller_name: string } | null;
    }
  >;
  const reviewers = await loadReviewerProfiles(
    rows.map((r) => r.reviewer_profile_id),
  );
  return {
    data: rows.map((row) => ({
      ...row,
      product: row.product,
      seller: row.seller,
      reviewer: row.reviewer_profile_id
        ? (reviewers.get(row.reviewer_profile_id)
            ? {
                id: row.reviewer_profile_id,
                display_name: reviewers.get(row.reviewer_profile_id)!.display_name,
              }
            : null)
        : null,
    })),
    error: null,
  };
}

async function loadReviewerProfiles(
  ids: ReadonlyArray<string | null>,
): Promise<
  Map<string, { id: string; display_name: string | null; avatar_url: string | null }>
> {
  const unique = Array.from(
    new Set(ids.filter((id): id is string => Boolean(id))),
  );
  const out = new Map<
    string,
    { id: string; display_name: string | null; avatar_url: string | null }
  >();
  if (unique.length === 0) return out;
  const admin = createAdminClient();
  const res = await admin
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", unique);
  if (res.error || !res.data) return out;
  type ProfileLite = {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  for (const profile of res.data as unknown as ProfileLite[]) {
    out.set(profile.id, profile);
  }
  return out;
}
