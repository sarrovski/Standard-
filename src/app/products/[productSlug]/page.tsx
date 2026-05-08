import Link from "next/link";
import { Nav, Shell } from "@/components/ui";
import { ProductPageClient } from "@/components/product-page-client";
import { isSupabaseConfigured } from "@/lib/roles";
import { getPublishedProductBySlug } from "@/lib/repositories/products";
import {
  adaptProductDetail,
  type ProductFullJoins,
  type UIProductDetail,
} from "@/lib/adapters";

type LoadResult =
  | { product: UIProductDetail; source: "supabase"; state: "ok" }
  | { product: null; source: "supabase"; state: "not_found" }
  | { product: null; source: "supabase"; state: "error"; message: string }
  | { product: null; source: "demo"; state: "demo" };

async function loadProduct(slug: string): Promise<LoadResult> {
  if (!isSupabaseConfigured()) {
    return { product: null, source: "demo", state: "demo" };
  }
  const { data, error } = await getPublishedProductBySlug(slug);
  if (error) {
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
}

export default async function ProductPage({
  params,
}: {
  params: { productSlug: string };
}) {
  const result = await loadProduct(params.productSlug);

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
        />
      </section>
    </Shell>
  );
}
