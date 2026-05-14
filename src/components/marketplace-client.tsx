"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import {
  featuredSlots as defaultSlots,
  games,
  paymentMethods,
  products as demoProducts,
  sellerTags,
} from "@/lib/data";
import { getFeaturedSlots, getLocalProducts } from "@/lib/product-store";
import type { LocalFeaturedSlot, LocalProduct } from "@/lib/product-types";
import type { UIProductCard } from "@/lib/adapters";
import { NoVerifiedPayments, PaymentPill } from "@/components/payment-pill";

// Combined status list so the filter works for both demo data ("Verified")
// and Supabase data ("Published"). data.ts is left unchanged so existing
// demo content keeps its labels; this local list is what the UI shows.
const allProductStatuses = [
  "All",
  "Published",
  "Verified",
  "Pending Review",
] as const;

// `initialProducts`:
//   - non-null => Supabase-sourced (server fetched). Demo product-store is
//     ignored to keep the public marketplace pure.
//   - null     => demo mode. Combine in-memory LocalProducts (builder output)
//     with the data.ts fixture, like before.
type MarketplaceClientProps = {
  initialProducts: UIProductCard[] | null;
  initialFeaturedProducts: UIProductCard[] | null;
};

export function MarketplaceClient({
  initialProducts,
  initialFeaturedProducts,
}: MarketplaceClientProps) {
  const supabaseSourced = initialProducts !== null;

  const [localProducts, setLocalProducts] = useState<LocalProduct[]>([]);
  const [slots, setSlots] = useState<LocalFeaturedSlot[]>([]);
  const [selectedGame, setSelectedGame] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPayment, setSelectedPayment] = useState("All");
  const [selectedTag, setSelectedTag] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  useEffect(() => {
    // Only hydrate the demo store when we're not already showing real data.
    if (supabaseSourced) return;
    setLocalProducts(getLocalProducts());
    const localSlots = getFeaturedSlots();
    setSlots(
      localSlots.length
        ? localSlots
        : (defaultSlots.map((slot) => ({
            ...slot,
            productSlug: null,
          })) as LocalFeaturedSlot[]),
    );
  }, [supabaseSourced]);

  const allProducts = useMemo(() => {
    if (supabaseSourced) return initialProducts ?? [];
    return [...localProducts, ...demoProducts];
  }, [supabaseSourced, initialProducts, localProducts]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(allProducts.map((product) => product.category)),
      ).sort(),
    [allProducts],
  );

  const matchesFilters = (product: UIProductCard | LocalProduct) => {
    const matchesGame = selectedGame === "All" || product.game === selectedGame;
    const matchesCategory =
      selectedCategory === "All" || product.category === selectedCategory;
    const matchesPayment =
      selectedPayment === "All" ||
      product.verifiedPayments.includes(selectedPayment as never);
    const matchesTag = selectedTag === "All" || product.sellerTag === selectedTag;
    const matchesStatus =
      selectedStatus === "All" || product.productStatus === selectedStatus;
    return (
      matchesGame &&
      matchesCategory &&
      matchesPayment &&
      matchesTag &&
      matchesStatus
    );
  };

  const filtered = allProducts.filter(matchesFilters);

  const demoFeaturedProducts = allProducts.filter((product) =>
    slots.some(
      (slot) =>
        slot.status === "Occupied" &&
        ((slot.productSlug && slot.productSlug === product.slug) ||
          (!slot.productSlug &&
            slot.category === product.game &&
            slot.product === product.name)),
    ),
  );
  const featuredSource = supabaseSourced
    ? initialFeaturedProducts ?? []
    : demoFeaturedProducts;
  const featuredProducts = featuredSource.filter(matchesFilters);
  const featuredSlugs = new Set(featuredProducts.map((product) => product.slug));
  const regularProducts = filtered.filter(
    (product) => !featuredSlugs.has(product.slug),
  );

  return (
    <>
      <Card className="mt-8 p-5">
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-5">
          <FilterBlock title="Games">
            {(["All", ...games] as const).map((game) => (
              <FilterButton
                key={game}
                active={selectedGame === game}
                onClick={() => setSelectedGame(game)}
              >
                {game}
              </FilterButton>
            ))}
          </FilterBlock>
          <FilterBlock title="Categories">
            {(["All", ...categories] as const).map((category) => (
              <FilterButton
                key={category}
                active={selectedCategory === category}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </FilterButton>
            ))}
          </FilterBlock>
          <FilterBlock title="Payments">
            {(["All", ...paymentMethods] as const).map((payment) => (
              <FilterButton
                key={payment}
                active={selectedPayment === payment}
                onClick={() => setSelectedPayment(payment)}
              >
                {payment}
              </FilterButton>
            ))}
          </FilterBlock>
          <FilterBlock title="Seller tag">
            {sellerTags.map((tag) => (
              <FilterButton
                key={tag}
                active={selectedTag === tag}
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </FilterButton>
            ))}
          </FilterBlock>
          <FilterBlock title="Status">
            {allProductStatuses.map((status) => (
              <FilterButton
                key={status}
                active={selectedStatus === status}
                onClick={() => setSelectedStatus(status)}
              >
                {status}
              </FilterButton>
            ))}
          </FilterBlock>
        </div>
      </Card>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black">Results</h2>
          <p className="mt-1 text-sm text-slate-500">
            {filtered.length} products found
          </p>
        </div>
        <div className="hidden gap-2 md:flex">
          <Badge tone="green">Verified</Badge>
          <Badge tone="cyan">Provider / Developer</Badge>
        </div>
      </div>

      {featuredProducts.length > 0 && (
        <FeaturedCarousel
          products={featuredProducts}
          selectedGame={selectedGame}
          selectedCategory={selectedCategory}
        />
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {regularProducts.map((product, index) => (
          <ProductCard key={product.slug} product={product} index={index} />
        ))}
      </div>
      {regularProducts.length === 0 && filtered.length > 0 && (
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400">
          All matching products are featured above.
        </div>
      )}
    </>
  );
}

function FeaturedCarousel({
  products,
  selectedGame,
  selectedCategory,
}: {
  products: Array<UIProductCard | LocalProduct>;
  selectedGame: string;
  selectedCategory: string;
}) {
  const title =
    selectedCategory !== "All" && selectedGame !== "All"
      ? `Featured in ${selectedGame} / ${selectedCategory}`
      : selectedCategory !== "All"
        ? `Featured in ${selectedCategory}`
        : selectedGame !== "All"
          ? `Featured in ${selectedGame}`
          : "Featured products";

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-black">{title}</h2>
        <Badge tone="purple">Featured</Badge>
      </div>
      <div className="-mx-6 mt-4 overflow-x-auto px-6 pb-3">
        <div className="flex snap-x gap-5">
          {products.map((product, index) => (
            <ProductCard
              key={product.slug}
              product={product}
              index={index}
              isFeatured
              className="w-[min(82vw,22rem)] shrink-0 snap-start sm:w-[22rem]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({
  product,
  index,
  isFeatured = false,
  className = "",
}: {
  product: UIProductCard | LocalProduct;
  index: number;
  isFeatured?: boolean;
  className?: string;
}) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <div
        className={`relative h-36 overflow-hidden ${
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
            <div className="rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-sm font-black text-white">
              #{index + 1}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Badge
                tone={product.productStatus === "Published" ? "green" : "amber"}
              >
                {product.productStatus}
              </Badge>
              {isFeatured && <Badge tone="purple">Featured</Badge>}
            </div>
          </div>
          <div className="mt-8">
            <div className="text-xs uppercase tracking-[0.24em] text-white/70">
              {product.game}
            </div>
            <h3 className="mt-2 break-words text-xl font-black leading-tight text-white">
              {product.name}
            </h3>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            tone={
              product.sellerTag === "Provider / Developer"
                ? "cyan"
                : product.sellerTag === "Verified Seller"
                  ? "green"
                  : "default"
            }
          >
            {product.sellerTag}
          </Badge>
          <Badge>{product.architecture}</Badge>
        </div>

        <p className="mt-3 text-sm text-slate-400">
          {product.seller} • {product.category}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
          <StatTile value={String(product.integrity ?? "-")} label="Integrity" />
          <StatTile value={String(product.activity.vouches)} label="Vouches" />
          <StatTile value={product.delivery} label="Delivery" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {product.features.slice(0, 3).map((feature) => (
            <span
              key={feature}
              className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-300"
            >
              {feature}
            </span>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {product.verifiedPayments.length ? (
            product.verifiedPayments
              .slice(0, 3)
              .map((payment) => (
                <PaymentPill key={payment} method={payment} compact />
              ))
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
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold"
          >
            View product
          </Link>
        </div>
      </div>
    </Card>
  );
}

function FilterBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-slate-300">{title}</div>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm ${
        active
          ? "border-purple-400/40 bg-purple-500/15 text-purple-100"
          : "border-white/10 bg-white/[0.04] text-slate-300"
      }`}
    >
      {children}
    </button>
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
