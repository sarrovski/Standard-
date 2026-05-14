import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Nav, Shell } from "@/components/ui";
import {
  ProductPageClient,
  type ProductPageReview,
} from "@/components/product-page-client";
import { isSupabaseConfigured } from "@/lib/roles";
import { getPublishedProductBySlug } from "@/lib/repositories/products";
import { isTimeoutError } from "@/lib/repositories/query-timeout";
import { isProductSavedByProfile } from "@/lib/repositories/buyer";
import { getApprovedReviewsForProduct } from "@/lib/repositories/reviews";
import {
  adaptProductDetail,
  type ProductFullJoins,
  type UIProductDetail,
} from "@/lib/adapters";
import {
  buildNonIndexableMetadata,
  buildProductJsonLd,
  buildProductMetadata,
} from "@/lib/product-seo";
import { getSessionUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

type LoadResult =
  | { product: UIProductDetail; source: "supabase"; state: "ok" }
  | { product: null; source: "supabase"; state: "not_found" }
  | { product: null; source: "supabase"; state: "error"; message: string }
  | { product: null; source: "supabase"; state: "timeout" }
  | { product: null; source: "demo"; state: "demo" };

const loadProduct = cache(async (slug: string): Promise<LoadResult> => {
  if (!isSupabaseConfigured()) {
    return { product: null, source: "demo", state: "demo" };
  }
  const { data, error } = await getPublishedProductBySlug(slug);
  if (error) {
    if (isTimeoutError(error)) {
      console.error("[product] supabase query timed out for slug:", slug);
      return { product: null, source: "supabase", state: "timeout" };
    }
    console.error("[product] supabase fetch failed:", error.message);
    return {
      product: null,
      source: "supabase",
      state: "error",
      message: error.message,
    };
  }
  if (!data) {
    return { product: null, source: "supabase", state: "not_found" };
  }
  const row = data as unknown as ProductFullJoins;
  return { product: adaptProductDetail(row), source: "supabase", state: "ok" };
});

/**
 * Pull current user + initial saved state + own-seller flag from Supabase
 * when configured. Returns nulls in demo mode or when the visitor isn't
 * authenticated. We compute `isOwnSeller` here so the review submit button
 * can be suppressed without a second round-trip on the client.
 */
async function loadViewerState(
  productId: string | null,
  sellerId: string | null,
) {
  if (!isSupabaseConfigured() || !productId) {
    return { loggedIn: false, saved: false, isOwnSeller: false };
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { loggedIn: false, saved: false, isOwnSeller: false };
  const saved = await isProductSavedByProfile(user.id, productId);
  let isOwnSeller = false;
  if (sellerId) {
    const ownerRes = await supabase
      .from("sellers")
      .select("id")
      .eq("id", sellerId)
      .eq("profile_id", user.id)
      .maybeSingle();
    isOwnSeller = Boolean(ownerRes.data);
  }
  return { loggedIn: true, saved, isOwnSeller };
}

async function loadReviews(
  productId: string | null,
): Promise<ProductPageReview[]> {
  if (!isSupabaseConfigured() || !productId) return [];
  const { data } = await getApprovedReviewsForProduct(productId);
  return data.map((row) => ({
    id: row.id,
    reviewerDisplayName: row.reviewer?.display_name ?? null,
    reviewerAvatarUrl: row.reviewer?.avatar_url ?? null,
    rating: row.rating,
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: { productSlug: string };
}): Promise<Metadata> {
  const result = await loadProduct(params.productSlug);
  if (result.state === "ok" && result.product) {
    return buildProductMetadata(result.product, params.productSlug);
  }
  return buildNonIndexableMetadata(result.state);
}

export default async function ProductPage({
  params,
}: {
  params: { productSlug: string };
}) {
  const result = await loadProduct(params.productSlug);
  const [viewer, reviews, user] = await Promise.all([
    loadViewerState(
      result.product?.id ?? null,
      result.product?.sellerId ?? null,
    ),
    loadReviews(result.product?.id ?? null),
    getSessionUser(),
  ]);

  const jsonLdBlocks =
    result.state === "ok" && result.product
      ? buildProductJsonLd(result.product, params.productSlug)
      : [];

  return (
    <Shell>
      <Nav user={user} />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <Link href="/marketplace" className="text-sm text-slate-400 hover:text-white">← Back to marketplace</Link>
        <ProductPageClient
          slug={params.productSlug}
          initialProduct={result.product}
          loadState={result.state}
          loadMessage={"message" in result ? result.message : undefined}
          initialSaved={viewer.saved}
          loggedIn={viewer.loggedIn}
          reviews={reviews}
          isOwnSeller={viewer.isOwnSeller}
        />
      </section>
      {jsonLdBlocks.map((block, index) => (
        <script
          key={`product-jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </Shell>
  );
}
