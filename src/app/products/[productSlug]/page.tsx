import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Nav, Shell } from "@/components/ui";
import { ProductPageClient } from "@/components/product-page-client";
import { isSupabaseConfigured } from "@/lib/roles";
import { getPublishedProductBySlug } from "@/lib/repositories/products";
import { isTimeoutError } from "@/lib/repositories/query-timeout";
import { isProductSavedByProfile } from "@/lib/repositories/buyer";
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
 * Pull current user + initial saved state from Supabase, when configured.
 * Returns nulls in demo mode or when the visitor isn't authenticated.
 */
async function loadSaveState(productId: string | null) {
  if (!isSupabaseConfigured() || !productId) {
    return { loggedIn: false, saved: false };
  }
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { loggedIn: false, saved: false };
  const saved = await isProductSavedByProfile(user.id, productId);
  return { loggedIn: true, saved };
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
  const saveState = await loadSaveState(result.product?.id ?? null);

  const jsonLdBlocks =
    result.state === "ok" && result.product
      ? buildProductJsonLd(result.product, params.productSlug)
      : [];

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <Link href="/marketplace" className="text-sm text-slate-400 hover:text-white">← Back to marketplace</Link>
        <ProductPageClient
          slug={params.productSlug}
          initialProduct={result.product}
          loadState={result.state}
          loadMessage={"message" in result ? result.message : undefined}
          initialSaved={saveState.saved}
          loggedIn={saveState.loggedIn}
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
