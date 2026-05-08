import { Nav, SectionHeader, Shell } from "@/components/ui";
import { MarketplaceClient } from "@/components/marketplace-client";
import { isSupabaseConfigured } from "@/lib/roles";
import { getPublishedProducts } from "@/lib/repositories/products";
import {
    adaptProductCard,
    type UIProductCard,
    type ProductWithJoins,
} from "@/lib/adapters";

type LoadResult =
    | { products: UIProductCard[]; source: "supabase"; state: "ok" | "empty" }
  | { products: null; source: "supabase"; state: "error"; message: string }
  | { products: null; source: "demo"; state: "demo" };

async function loadProducts(): Promise<LoadResult> {
    if (!isSupabaseConfigured()) {
          return { products: null, source: "demo", state: "demo" };
    }
    const { data, error } = await getPublishedProducts();
    if (error) {
          // Don't fall back to demo on an actual Supabase error in Supabase mode —
      // that hides the bug. Surface a real error state instead.
      console.error("[marketplace] supabase fetch failed:", error.message);
          return {
                  products: null,
                  source: "supabase",
                  state: "error",
                  message: error.message,
          };
    }
    const rows = (data ?? []) as unknown as ProductWithJoins[];
    if (rows.length === 0) {
          console.warn(
                  "[marketplace] no published products yet (Supabase configured, query OK, 0 rows).",
                );
          return { products: [], source: "supabase", state: "empty" };
    }
    return {
          products: rows.map((row) => {
                  // seller_payment_methods is now nested under sellers (FK path fix);
                                   // pluck the names so badges + the marketplace payment filter work.
                                   const sellerSpm = (row.sellers as { seller_payment_methods?: { payment_methods?: { name?: string } }[] } | null)?.seller_payment_methods ?? [];
                  const verifiedNames = sellerSpm
                    .map((spm) => spm.payment_methods?.name)
                    .filter((name): name is string => typeof name === "string");
                  return adaptProductCard(row, verifiedNames);
          }),
          source: "supabase",
          state: "ok",
    };
}

export default async function MarketplacePage() {
    const result = await loadProducts();

  return (
        <Shell>
              <Nav />
              <section className="mx-auto max-w-7xl px-6 py-10">
                      <SectionHeader
                                  eyebrow="Marketplace"
                                  title="Choose a game, then browse visually"
                                  text="A working marketplace: created seller products appear here, verified payments power filters, and featured slots appear first."
                                />
                {result.state === "error" && (
                    <div className="mb-6 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
                                Couldn&apos;t load marketplace from Supabase: {result.message}
                    </div>div>
                      )}
                {result.state === "empty" && (
                    <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                                No published products yet. Once a seller creates and publishes a
                                product, it&apos;ll appear here.
                    </div>div>
                      )}
                      <MarketplaceClient initialProducts={result.products} />
              </section>section>
        </Shell>Shell>
      );
}</Shell>
