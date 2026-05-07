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

async function loadProduct(
  slug: string,
): Promise<{ product: UIProductDetail | null; source: "supabase" | "demo" }> {
  if (!isSupabaseConfigured()) {
    return { product: null, source: "demo" };
  }
  const { data, error } = await getPublishedProductBySlug(slug);
  if (error || !data) {
    if (error) console.error("[product] supabase fetch failed:", error.message);
    return { product: null, source: "demo" };
  }
  const row = data as unknown as ProductFullJoins;
  return { product: adaptProductDetail(row), source: "supabase" };
}

export default async function ProductPage({
  params,
}: {
  params: { productSlug: string };
}) {
  const { product } = await loadProduct(params.productSlug);

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <Link href="/marketplace" className="text-sm text-slate-400 hover:text-white">← Back to marketplace</Link>
        <ProductPageClient slug={params.productSlug} initialProduct={product} />
      </section>
    </Shell>
  );
}
