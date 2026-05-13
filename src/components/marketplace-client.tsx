"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GameLogo } from "@/components/game-logo";
import { Badge, Card } from "@/components/ui";
import { featuredSlots as defaultSlots, games, productCategories, products as demoProducts, paymentMethods, sellerTags } from "@/lib/data";
import { cn } from "@/lib/helpers";
import { getPaymentVisualIdentity } from "@/lib/payment-identities";
import { getCategoryVisualIdentity, getGameVisualIdentity } from "@/lib/visual-identities";
import { evaluateProductRanking, isNewListing, type RankingInput } from "@/lib/product-ranking";
import { RankingPill } from "@/components/product-ranking-ui";

function readOrAll(
  value: string | null,
  allowed: ReadonlyArray<string>,
): string {
  if (value && allowed.includes(value)) return value;
  return "All";
}

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "most_trusted", label: "Most trusted" },
  { value: "most_viewed", label: "Most viewed" },
] as const;
type SortKey = (typeof SORT_OPTIONS)[number]["value"];
const DEFAULT_SORT: SortKey = "recommended";
const SORT_VALUES = new Set<SortKey>(SORT_OPTIONS.map((option) => option.value));

function readSort(value: string | null): SortKey {
  return value && SORT_VALUES.has(value as SortKey)
    ? (value as SortKey)
    : DEFAULT_SORT;
}

/**
 * Stable hash → ISO date in 2025, so demo products have distinct createdAt
 * values for the Newest sort without us hand-encoding them in data.ts.
 */
function synthCreatedAt(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  const base = Date.parse("2025-01-01T00:00:00Z");
  const offsetMs = (hash % 365) * 86_400_000;
  return new Date(base + offsetMs).toISOString();
}

type DemoLikeProduct = {
  slug: string;
  faq?: ReadonlyArray<{ q: string; a: string }>;
  gallery?: ReadonlyArray<{ title: string; accent: string }>;
};

function productHasMedia(product: UIProductCard | DemoLikeProduct): boolean {
  if ("coverImageUrl" in product && product.coverImageUrl) return true;
  // Demo products carry a `gallery` array of placeholder entries with at
  // least a title; treat any non-empty gallery as "has media" so the
  // filter is useful in demo mode too.
  if ("gallery" in product && Array.isArray(product.gallery)) {
    return product.gallery.length > 0;
  }
  return false;
}

function productHasFaq(product: UIProductCard | DemoLikeProduct): boolean {
  if ("hasFaq" in product) return Boolean(product.hasFaq);
  if ("faq" in product && Array.isArray(product.faq)) {
    return product.faq.some(
      (item) => item.q.trim() !== "" && item.a.trim() !== "",
    );
  }
  return false;
}

function productCreatedAt(product: UIProductCard | DemoLikeProduct): string {
  if ("createdAt" in product && typeof product.createdAt === "string") {
    return product.createdAt;
  }
  return synthCreatedAt(product.slug);
}

function productTrustScore(product: { integrity?: number | null }): number {
  return typeof product.integrity === "number" ? product.integrity : -1;
}

function productViews(product: { activity?: { views?: number } }): number {
  return product.activity?.views ?? 0;
}

type RankableProduct = UIProductCard | (DemoLikeProduct & {
  productStatus?: string;
  sellerTag?: string;
  verifiedPayments?: ReadonlyArray<unknown>;
  summary?: string;
  features?: ReadonlyArray<string>;
  featureGroups?: ReadonlyArray<{ features: ReadonlyArray<string> }>;
  faqCount?: number;
});

function productToRankingInput(product: RankableProduct): RankingInput {
  const productStatus =
    "productStatus" in product && typeof product.productStatus === "string"
      ? product.productStatus
      : "";
  const summary =
    "summary" in product && typeof product.summary === "string"
      ? product.summary
      : "";
  const features = Array.isArray((product as { features?: unknown }).features)
    ? ((product as { features: ReadonlyArray<string> }).features)
    : [];
  const groups = Array.isArray((product as { featureGroups?: unknown }).featureGroups)
    ? ((product as { featureGroups: ReadonlyArray<{ features: ReadonlyArray<string> }> }).featureGroups)
    : [];
  const verifiedPaymentCount = Array.isArray(
    (product as { verifiedPayments?: unknown }).verifiedPayments,
  )
    ? ((product as { verifiedPayments: ReadonlyArray<unknown> }).verifiedPayments).length
    : 0;
  const faqCountRaw =
    "faqCount" in product && typeof product.faqCount === "number"
      ? product.faqCount
      : "faq" in product && Array.isArray((product as { faq?: unknown }).faq)
        ? ((product as { faq: ReadonlyArray<{ q?: string; a?: string }> }).faq).filter(
            (item) => (item.q ?? "").trim() !== "" && (item.a ?? "").trim() !== "",
          ).length
        : 0;
  return {
    published: productStatus === "Published" || productStatus === "published",
    sellerTag: (product as { sellerTag?: string }).sellerTag ?? "",
    verifiedPaymentCount,
    hasMedia: productHasMedia(product),
    summary,
    featureGroupCount: groups.length,
    flatFeatureCount: features.length,
    faqCount: faqCountRaw,
  };
}

// Supabase marketplace results are already constrained to published products
// at the server, so there's no need for a UI "Status" filter — every row
// here is already public.
const publicVisibleStatuses = new Set<string>(["Published"]);

import { getFeaturedSlots, getLocalProducts } from "@/lib/product-store";
import type { LocalFeaturedSlot, LocalProduct } from "@/lib/product-types";
import type { UIProductCard } from "@/lib/adapters";
import { NoVerifiedPayments, PaymentPill } from "@/components/payment-pill";

// `initialProducts`:
//   - non-null => Supabase-sourced (server fetched). Demo product-store is
//     ignored to keep the public marketplace pure.
//   - null     => demo mode. Combine in-memory LocalProducts (builder output)
//     with the data.ts fixture, like before.
type MarketplaceClientProps = {
  initialProducts: UIProductCard[] | null;
};

export function MarketplaceClient({ initialProducts }: MarketplaceClientProps) {
  const supabaseSourced = initialProducts !== null;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [localProducts, setLocalProducts] = useState<LocalProduct[]>([]);
  const [slots, setSlots] = useState<LocalFeaturedSlot[]>([]);
  // Seed filters from URL params on first render so the landing-page CTAs
  // (/marketplace?game=Valorant&category=Internal) actually pre-filter.
  const [selectedGame, setSelectedGame] = useState(() =>
    readOrAll(searchParams.get("game"), games),
  );
  const [selectedCategory, setSelectedCategory] = useState(() =>
    readOrAll(searchParams.get("category"), productCategories),
  );
  const [selectedPayment, setSelectedPayment] = useState(() =>
    readOrAll(searchParams.get("payment"), paymentMethods),
  );
  const [selectedTag, setSelectedTag] = useState(() =>
    readOrAll(searchParams.get("tag"), sellerTags),
  );
  const [hasMedia, setHasMedia] = useState(
    () => searchParams.get("has_media") === "1",
  );
  const [hasFaq, setHasFaq] = useState(
    () => searchParams.get("has_faq") === "1",
  );
  const [sortKey, setSortKey] = useState<SortKey>(() =>
    readSort(searchParams.get("sort")),
  );

  const clearAllFilters = () => {
    setSelectedGame("All");
    setSelectedCategory("All");
    setSelectedPayment("All");
    setSelectedTag("All");
    setHasMedia(false);
    setHasFaq(false);
    setSortKey(DEFAULT_SORT);
  };

  // Write filter changes back to the URL so the resulting state is
  // shareable / bookmarkable. Skip the very first sync since state was
  // seeded from the URL we already have.
  const firstSync = useRef(true);
  useEffect(() => {
    if (firstSync.current) {
      firstSync.current = false;
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    const apply = (key: string, value: string) => {
      if (value === "All") params.delete(key);
      else params.set(key, value);
    };
    apply("game", selectedGame);
    apply("category", selectedCategory);
    apply("payment", selectedPayment);
    apply("tag", selectedTag);
    if (hasMedia) params.set("has_media", "1");
    else params.delete("has_media");
    if (hasFaq) params.set("has_faq", "1");
    else params.delete("has_faq");
    if (sortKey !== DEFAULT_SORT) params.set("sort", sortKey);
    else params.delete("sort");
    const next = params.toString();
    const current = searchParams.toString();
    if (next === current) return;
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGame, selectedCategory, selectedPayment, selectedTag, hasMedia, hasFaq, sortKey]);

  useEffect(() => {
    // Only hydrate the demo store when we're not already showing real data.
    if (supabaseSourced) return;
    setLocalProducts(getLocalProducts());
    const localSlots = getFeaturedSlots();
    setSlots(localSlots.length ? localSlots : defaultSlots.map((slot) => ({ ...slot, productSlug: null })) as LocalFeaturedSlot[]);
  }, [supabaseSourced]);

  const allProducts = useMemo(() => {
    if (supabaseSourced) return initialProducts ?? [];
    return [...localProducts, ...demoProducts].filter((product) =>
      publicVisibleStatuses.has(product.productStatus),
    );
  }, [supabaseSourced, initialProducts, localProducts]);

  const filtered = allProducts.filter((product) => {
    const matchesGame = selectedGame === "All" || product.game === selectedGame;
    const matchesCategory =
      selectedCategory === "All" || product.category === selectedCategory;
    const matchesPayment = selectedPayment === "All" || product.verifiedPayments.includes(selectedPayment as never);
    const matchesTag = selectedTag === "All" || product.sellerTag === selectedTag;
    const matchesMedia = !hasMedia || productHasMedia(product);
    const matchesFaq = !hasFaq || productHasFaq(product);
    return matchesGame && matchesCategory && matchesPayment && matchesTag && matchesMedia && matchesFaq;
  });

  // Memoise per-product ranking so the sort + pill share one computation.
  const rankings = new Map<string, ReturnType<typeof evaluateProductRanking>>();
  for (const product of filtered) {
    rankings.set(product.slug, evaluateProductRanking(productToRankingInput(product)));
  }

  const sortFn = (a: typeof filtered[number], b: typeof filtered[number]) => {
    switch (sortKey) {
      case "newest": {
        const aDate = productCreatedAt(a);
        const bDate = productCreatedAt(b);
        return bDate.localeCompare(aDate);
      }
      case "most_viewed":
        return productViews(b) - productViews(a);
      case "most_trusted":
        return productTrustScore(b) - productTrustScore(a);
      case "recommended":
      default: {
        const aScore = rankings.get(a.slug)?.score ?? 0;
        const bScore = rankings.get(b.slug)?.score ?? 0;
        if (aScore !== bScore) return bScore - aScore;
        // Tiebreak: newer products surface higher within the same level.
        return productCreatedAt(b).localeCompare(productCreatedAt(a));
      }
    }
  };
  const sorted = [...filtered].sort(sortFn);

  const activeFeaturedSlots = slots.filter((slot) => slot.status === "Occupied");
  const featuredProducts = sorted.filter((product) =>
    activeFeaturedSlots.some(
      (slot) =>
        (slot.productSlug && slot.productSlug === product.slug) ||
        (!slot.productSlug && slot.category === product.game && slot.product === product.name),
    ),
  );
  const regularProducts = sorted.filter((product) => !featuredProducts.includes(product));
  const orderedProducts = [...featuredProducts, ...regularProducts];

  const filtersActive =
    selectedGame !== "All" ||
    selectedCategory !== "All" ||
    selectedPayment !== "All" ||
    selectedTag !== "All" ||
    hasMedia ||
    hasFaq;
  const sortActive = sortKey !== DEFAULT_SORT;

  return (
    <>
      <Card className="mt-8 p-5">
        <div className="grid gap-6 xl:grid-cols-2">
          <FilterBlock title="Games">
            {(["All", ...games] as const).map((game) => (
              <GameFilterButton key={game} game={game} active={selectedGame === game} onClick={() => setSelectedGame(game)} />
            ))}
          </FilterBlock>
          <FilterBlock title="Category">
            {(["All", ...productCategories] as const).map((category) => (
              <CategoryFilterButton
                key={category}
                category={category}
                active={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
              />
            ))}
          </FilterBlock>
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
          <FilterBlock title="Payments">
            {(["All", ...paymentMethods] as const).map((payment) => (
              <PaymentFilterButton
                key={payment}
                payment={payment}
                active={selectedPayment === payment}
                onClick={() => setSelectedPayment(payment)}
              />
            ))}
          </FilterBlock>
          <FilterBlock title="Seller tag">
            {sellerTags.map((tag) => (
              <FilterButton key={tag} active={selectedTag === tag} onClick={() => setSelectedTag(tag)}>
                {tag}
              </FilterButton>
            ))}
          </FilterBlock>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <span className="text-slate-300">Sort by</span>
              <select
                value={sortKey}
                onChange={(event) => setSortKey(readSort(event.target.value))}
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1.5 text-sm text-white outline-none focus:border-orange-400/50"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <FilterToggle
              label="Has media"
              active={hasMedia}
              onChange={() => setHasMedia((v) => !v)}
            />
            <FilterToggle
              label="Has FAQ"
              active={hasFaq}
              onChange={() => setHasFaq((v) => !v)}
            />
          </div>
          {(filtersActive || sortActive) && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-orange-100"
            >
              Clear filters
            </button>
          )}
        </div>
      </Card>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black">Results</h2>
          <p className="mt-1 text-sm text-slate-500">{orderedProducts.length} products found</p>
        </div>
        <div className="hidden gap-2 md:flex">
          <Badge tone="orange">Featured first</Badge>
          <Badge tone="green">Verified</Badge>
          <Badge tone="default">Provider / Developer</Badge>
        </div>
      </div>

      {orderedProducts.length === 0 ? (
        <MarketplaceEmptyState
          filtersActive={filtersActive}
          selectedGame={selectedGame}
          selectedCategory={selectedCategory}
          onClear={clearAllFilters}
        />
      ) : (
      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {orderedProducts.map((product, index) => {
          const isFeatured = featuredProducts.includes(product);
          return (
            <Card key={product.slug} className="overflow-hidden">
              <div
                className={`relative h-44 overflow-hidden ${
                  "coverImageUrl" in product && product.coverImageUrl
                    ? "bg-slate-950"
                    : `bg-gradient-to-br ${product.accent}`
                }`}
              >
                {"coverImageUrl" in product && product.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.coverImageUrl}
                    alt={product.name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                <div className="relative p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="rounded-2xl border border-white/20 bg-black/20 px-3 py-2 text-sm font-black text-white">
                        #{index + 1}
                      </div>
                      <GameMark game={product.game} />
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Badge tone={product.productStatus === "Published" ? "green" : "amber"}>{product.productStatus}</Badge>
                      {isFeatured && <Badge tone="orange">Featured</Badge>}
                      {(() => {
                        const ranking = rankings.get(product.slug);
                        if (!ranking) return null;
                        const isNew = isNewListing(productCreatedAt(product));
                        // Skip the "Low trust" pill on cards (we don't want
                        // to publicly badge a low-trust listing); only show
                        // the warmer "New listing" override for fresh
                        // low-level products. Medium + high always render.
                        if (ranking.level === "low" && !isNew) return null;
                        return <RankingPill result={ranking} isNew={isNew} />;
                      })()}
                    </div>
                  </div>
                  <div className="mt-7">
                    <GameBadge game={product.game} />
                    <h3 className="mt-3 text-2xl font-black text-white">{product.name}</h3>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={product.sellerTag === "Provider / Developer" ? "cyan" : product.sellerTag === "Verified Seller" ? "green" : "default"}>
                    {product.sellerTag}
                  </Badge>
                  <Badge>{product.architecture}</Badge>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-400">{product.seller}</span>
                  <CategoryBadge category={product.category} />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                  <StatTile value={String(product.integrity ?? "-")} label="Integrity" />
                  <StatTile value={String(product.activity.vouches)} label="Vouches" />
                  <StatTile value={product.delivery} label="Delivery" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {product.features.slice(0, 3).map((feature) => (
                    <span key={feature} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-300">
                      {feature}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {product.verifiedPayments.length ? (
                    product.verifiedPayments.slice(0, 3).map((payment) => <PaymentPill key={payment} method={payment} compact />)
                  ) : (
                    <NoVerifiedPayments />
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-500">Starting at</div>
                    <div className="text-lg font-black">{product.pricePoints[0] ?? "Pending"}</div>
                  </div>
                  <Link
                    href={`/products/${product.slug}`}
                    className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold"
                  >
                    View product
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      )}
    </>
  );
}

function MarketplaceEmptyState({
  filtersActive,
  selectedGame,
  selectedCategory,
  onClear,
}: {
  filtersActive: boolean;
  selectedGame: string;
  selectedCategory: string;
  onClear: () => void;
}) {
  const game = selectedGame !== "All" ? selectedGame : null;
  const category = selectedCategory !== "All" ? selectedCategory : null;
  const headline = filtersActive
    ? game && category
      ? `No products in ${game} · ${category} yet`
      : game
        ? `No products in ${game} yet`
        : category
          ? `No products in the ${category} category yet`
          : "No products match your filters"
    : "No products yet";
  return (
    <div className="mt-6 rounded-3xl border border-dashed border-white/15 bg-slate-950/40 p-10 text-center">
      <h3 className="text-2xl font-black tracking-tight">{headline}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
        {filtersActive
          ? "Try clearing one or two filters, or browse the full marketplace."
          : "Once sellers publish products, they'll appear here."}
      </p>
      {filtersActive && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onClear}
            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_-12px_rgba(249,115,22,0.65)] transition hover:bg-orange-400"
          >
            Clear filters
          </button>
          <Link
            href="/marketplace"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
          >
            View all products
          </Link>
        </div>
      )}
    </div>
  );
}

function FilterToggle({
  label,
  active,
  onChange,
}: {
  label: string;
  active: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition",
        active
          ? "border-orange-400/60 bg-orange-500/15 text-white shadow-[0_8px_24px_-16px_rgba(249,115,22,0.7)]"
          : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.07] hover:text-white",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border",
          active
            ? "border-orange-300/70 bg-orange-400/30"
            : "border-white/20 bg-transparent",
        )}
      >
        {active && (
          <span aria-hidden="true" className="block h-1.5 w-1.5 rounded-full bg-orange-200" />
        )}
      </span>
      {label}
    </button>
  );
}

function FilterBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-semibold text-slate-300">{title}</div>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function GameFilterButton({ game, active, onClick }: { game: string; active: boolean; onClick: () => void }) {
  const identity =
    game === "All"
      ? {
          mark: "All",
          label: "All games",
          className: "from-white/70 via-slate-400/70 to-slate-950",
        }
      : getGameVisualIdentity(game);

  return (
    <button
      onClick={onClick}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-sm transition",
        active
          ? "border-orange-400/60 bg-orange-500/15 text-white shadow-[0_8px_24px_-16px_rgba(249,115,22,0.7)]"
          : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.07] hover:text-white",
      )}
    >
      <GameLogo
        identity={identity}
        className={cn(
          "h-6 min-w-6 rounded-full border border-white/20 px-1.5 text-[10px] font-black text-white shadow-inner shadow-white/10",
          active && "ring-2 ring-white/15",
        )}
        imageClassName="p-1"
      />
      <span>{game === "All" ? "All" : identity.label}</span>
    </button>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition",
        active
          ? "border-orange-400/60 bg-orange-500/15 text-white shadow-[0_8px_24px_-16px_rgba(249,115,22,0.7)]"
          : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.07] hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function PaymentFilterButton({ payment, active, onClick }: { payment: string; active: boolean; onClick: () => void }) {
  const identity =
    payment === "All"
      ? {
          mark: "All",
          label: "All",
          className: "border-white/10 bg-white/[0.04] text-slate-300",
          markClassName: "from-white/70 via-slate-400/70 to-slate-950",
        }
      : getPaymentVisualIdentity(payment);

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 text-sm transition",
        active
          ? "border-orange-400/60 bg-orange-500/15 text-white shadow-[0_8px_24px_-16px_rgba(249,115,22,0.7)]"
          : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.07] hover:text-white",
      )}
    >
      <span
        className={cn(
          "inline-flex h-6 min-w-7 items-center justify-center rounded-full bg-gradient-to-br px-1.5 text-[8px] font-black text-white shadow-inner shadow-white/15",
          identity.markClassName,
          active && "ring-2 ring-white/15",
        )}
      >
        {identity.mark}
      </span>
      <span>{identity.label}</span>
    </button>
  );
}

function GameMark({ game }: { game: string }) {
  const identity = getGameVisualIdentity(game);

  return (
    <GameLogo
      identity={identity}
      className="h-10 min-w-10 rounded-2xl border border-white/20 px-2 text-xs font-black text-white shadow-lg shadow-black/20"
      imageClassName="p-2"
    />
  );
}

function GameBadge({ game }: { game: string }) {
  const identity = getGameVisualIdentity(game);

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/25 py-1 pl-1 pr-3 text-xs font-bold uppercase tracking-[0.16em] text-white/85">
      <GameLogo
        identity={identity}
        className="h-5 min-w-5 rounded-full px-1 text-[9px] font-black text-white"
        imageClassName="p-0.5"
      />
      {identity.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const identity = getCategoryVisualIdentity(category);

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", identity.className)}>
      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-white/10 bg-black/15 px-1 text-[8px] font-black">
        {identity.mark}
      </span>
      {category}
    </span>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3">
      <div className="truncate text-sm font-bold text-white">{value}</div>
      <div className="mt-1 text-[11px] text-slate-500">{label}</div>
    </div>
  );
}

function CategoryFilterButton({
  category,
  active,
  onClick,
}: {
  category: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
        active
          ? "border-orange-400/60 bg-orange-500/15 text-white shadow-[0_8px_24px_-16px_rgba(249,115,22,0.7)]"
          : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.07] hover:text-white",
      )}
    >
      <CategoryIcon name={category} />
      <span>{category}</span>
    </button>
  );
}

function CategoryIcon({ name }: { name: string }) {
  const stroke = {
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "All":
      return (
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" {...stroke}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case "Internal":
      return (
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" {...stroke}>
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" />
          <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
        </svg>
      );
    case "External":
      return (
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" {...stroke}>
          <rect x="2" y="4" width="20" height="13" rx="2" />
          <path d="M8 20h8M12 17v3" />
        </svg>
      );
    case "DMA":
      return (
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" {...stroke}>
          <rect x="3" y="6" width="18" height="12" rx="1.5" />
          <circle cx="8" cy="12" r="1.2" />
          <circle cx="16" cy="12" r="1.2" />
          <path d="M9.2 12H14.8M8 9.5V8M16 9.5V8M8 14.5V16M16 14.5V16" />
        </svg>
      );
    case "Scripts":
      return (
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" {...stroke}>
          <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 4l-4 16" />
        </svg>
      );
    case "Spoofer":
      return (
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" {...stroke}>
          <path d="M12 3l8 3v5c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-3z" />
          <path d="M9 13a3 3 0 0 0 6-1M15 11a3 3 0 0 0-6 1" />
        </svg>
      );
    case "Other":
      return (
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      );
    default:
      return (
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" {...stroke}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        </svg>
      );
  }
}
