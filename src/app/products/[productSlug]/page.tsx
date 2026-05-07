import Link from "next/link";
import { Nav, Shell } from "@/components/ui";
import { ProductPageClient } from "@/components/product-page-client";

export default function ProductPage({ params }: { params: { productSlug: string } }) {
  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <Link href="/marketplace" className="text-sm text-slate-400 hover:text-white">← Back to marketplace</Link>
        <ProductPageClient slug={params.productSlug} />
      </section>
    </Shell>
  );
}
