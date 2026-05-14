import { Nav, SectionHeader, Shell } from "@/components/ui";
import { MarketplaceClient } from "@/components/marketplace-client";
import { isSupabaseConfigured } from "@/lib/roles";
import {
  getActiveFeaturedProductIds,
  getPublishedProducts,
} from "@/lib/repositories/products";
import { isTimeoutError } from "@/lib/repositories/query-timeout";
import {
  adaptProductCard,
  type UIProductCard,
  type ProductWithJoins,
} from "@/lib/adapters";

type LoadResult =
  | {
      products: UIProductCard[];
      featuredProducts: UIProductCard[];
      source: "supabase";
      state: "ok" | "empty";
    }
  | { products: null; source: "supabase"; state: "error"; message: string }
  | { products: null; source: "supabase"; state: "timeout" }
  | { products: null; source: "demo"; state: "demo" };

function adaptRowsToCards(rows: ProductWithJoins[]): UIProductCard[] {
  return rows.map((row) => {
    const verifiedNames = (row.seller_payment_methods ?? [])
      .map((spm) => spm.payment_methods?.name)
      .filter((name): name is string => typeof name === "string");
    return adaptProductCard(row, verifiedNames);
  });
}

async function loadProducts(): Promise<LoadResult> {
  if (!isSupabaseConfigured()) {
    return { products: null, source: "demo", state: "demo" };
  }
  const [{ data, error }, featuredResult] = await Promise.all([
    getPublishedProducts(),
    getActiveFeaturedProductIds(),
  ]);
  if (error) {
    if (isTimeoutError(error)) {
      console.error("[marketplace] supabase query timed out");
      return { products: null, source: "supabase", state: "timeout" };
    }
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
    return {
      products: [],
      featuredProducts: [],
      source: "supabase",
      state: "empty",
    };
  }
  if (featuredResult.error) {
    console.error(
      "[marketplace] featured products fetch failed:",
      featuredResult.error.message,
    );
  }
  const activeFeaturedIds = featuredResult.error
    ? []
    : featuredResult.data ?? [];
  const activeFeaturedIdSet = new Set(activeFeaturedIds);
  const orderedFeaturedRows = activeFeaturedIds
    .map((productId) => rows.find((row) => row.id === productId))
    .filter((row): row is ProductWithJoins => Boolean(row));
  const remainingFeaturedRows = rows.filter(
    (row) =>
      activeFeaturedIdSet.has(row.id) &&
      !orderedFeaturedRows.some((featuredRow) => featuredRow.id === row.id),
  );
  return {
    products: adaptRowsToCards(rows),
    featuredProducts: adaptRowsToCards([
      ...orderedFeaturedRows,
      ...remainingFeaturedRows,
    ]),
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
          text="A working marketplace: created seller products appear here, verified payments power filters, and active featured slots get a premium carousel row."
        />
        {result.state === "error" && (
          <div className="mb-6 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
            Couldn&apos;t load marketplace from Supabase: {result.message}
          </div>
        )}
        {result.state === "timeout" && (
          <div className="mb-6 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
            Marketplace query timed out. The database is slow or unreachable —
            please retry in a moment.
          </div>
        )}
        {result.state === "empty" && (
          <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            No published products yet. Once a seller creates and publishes a
            product, it&apos;ll appear here.
          </div>
        )}
        <MarketplaceClient
          initialProducts={result.products}
          initialFeaturedProducts={
            "featuredProducts" in result ? result.featuredProducts : null
          }
        />
      </section>
    </Shell>
  );
}
