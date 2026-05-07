import { Nav, SectionHeader, Shell } from "@/components/ui";
import { MarketplaceClient } from "@/components/marketplace-client";
import { isSupabaseConfigured } from "@/lib/roles";
import { getPublishedProducts } from "@/lib/repositories/products";
import {
  adaptProductCard,
  type UIProductCard,
  type ProductWithJoins,
} from "@/lib/adapters";

async function loadProducts(): Promise<{
  products: UIProductCard[] | null;
  source: "supabase" | "demo";
}> {
  if (!isSupabaseConfigured()) {
    return { products: null, source: "demo" };
  }
  const { data, error } = await getPublishedProducts();
  if (error || !data) {
    // If a Supabase error occurs (RLS issue, schema mismatch), fall back to
    // demo so the page still renders. Logged for observability.
    console.error("[marketplace] supabase fetch failed:", error?.message);
    return { products: null, source: "demo" };
  }
  // The select string returns joined rows; cast to our adapter input type.
  const rows = data as unknown as ProductWithJoins[];
  return {
    products: rows.map((row) => adaptProductCard(row)),
    source: "supabase",
  };
}

export default async function MarketplacePage() {
  const { products } = await loadProducts();

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeader
          eyebrow="Marketplace"
          title="Choose a game, then browse visually"
          text="A working marketplace: created seller products appear here, verified payments power filters, and featured slots appear first."
        />
        <MarketplaceClient initialProducts={products} />
      </section>
    </Shell>
  );
}
