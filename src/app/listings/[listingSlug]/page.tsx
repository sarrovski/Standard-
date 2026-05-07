import Link from "next/link";
import { Nav, Shell } from "@/components/ui";
import { ProductPageClient } from "@/components/product-page-client";

export default function ListingPage({ params }: { params: { listingSlug: string } }) {
  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <Link href="/marketplace" className="text-sm text-slate-400 hover:text-white">← Back to marketplace</Link>
        <ProductPageClient slug={params.listingSlug} />
      </section>
    </Shell>
  );
}
