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

/**
 * Public marketplace client.
 *
 * Cards are commerce-grade: cover image dominates the top half, clean
 * hierarchy underneath (title → seller meta → trust badges → verified
 * payments → CTA). Featured products are listed first.
 *
 * Filters: search by name + game, payment method, and seller tag. The
 * old "Status" filter has been retired — every visible product on the
 * public marketplace is by definition published, so a Status filter
 * was redundant noise.
 *
 * initialProducts:
 *   - non-null  Supabase-sourced (server fetched). Demo product-store
 *               is ignored to keep the public marketplace pure.
 *   - null      demo mode. Combine in-memory LocalProducts (builder
 *               output) with the data.ts fixture.
 */

type MarketplaceClientProps = {
  initialProducts: UIProductCard[] | null;
};

type AnyProductCard = UIProductCard | LocalProduct;

export function MarketplaceClient({ initialProducts }: MarketplaceClientProps) {
  const supabaseSourced = initialProducts !== null;

  const [localProducts, setLocalProducts] = useState<LocalProduct[]>([]);
  const [slots, setSlots] = useState<LocalFeaturedSlot[]>([]);
  const [search, setSearch] = useState("");
  const [selectedGame, setSelectedGame] = useState("All");
  const [selectedPayment, setSelectedPayment] = useState("All");
  const [selectedTag, setSelectedTag] = useState("All");

  useEffect(() => {
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

  const allProducts = useMemo<AnyProductCard[]>(() => {
    if (supabaseSourced) return initialProducts ?? [];
    return [...localProducts, ...demoProducts];
  }, [supabaseSourced, initialProducts, localProducts]);

  const normalizedSearch = search.trim().toLowerCase();

  const filtered = allProducts.filter((product) => {
    const matchesSearch =
      !normalizedSearch ||
      product.name.toLowerCase().includes(normalizedSearch) ||
      product.seller.toLowerCase().includes(normalizedSearch) ||
      product.summary.toLowerCase().includes(normalizedSearch);
    const matchesGame = selectedGame === "All" || product.game === selectedGame;
    const matchesPayment =
      selectedPayment === "All" ||
      product.verifiedPayments.includes(selectedPayment as never);
    const matchesTag = selectedTag === "All" || product.sellerTag === selectedTag;
    return matchesSearch && matchesGame && matchesPayment && matchesTag;
  });

  const activeFeaturedSlots = slots.filter((slot) => slot.status === "Occupied");
  const featuredProducts = filtered.filter((product) =>
    activeFeaturedSlots.some(
      (slot) =>
        (slot.productSlug && slot.productSlug === product.slug) ||
        (!slot.productSlug &&
          slot.category === product.game &&
          slot.product === product.name),
    ),
  );
  const regularProducts = filtered.filter(
    (product) => !featuredProducts.includes(product),
  );
  const orderedProducts = [...featuredProducts, ...regularProducts];

  return (
    <>
      {/* ── Filter bar ── */}
      <Card className="mt-8 p-5">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by product name, seller, or summary…"
          className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-purple-400/40"
        />
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <FilterBlock title="Game">
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
          <FilterBlock title="Verified payments">
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
        </div>
      </Card>

      {/* ── Results header ── */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Results</h2>
          <p className="mt-1 text-sm text-slate-500">
            {orderedProducts.length}{" "}
            {orderedProducts.length === 1 ? "product" : "products"}
            {orderedProducts.length > 0 && featuredProducts.length > 0 && (
              <>
                {" "}
                — {featuredProducts.length} featured
              </>
            )}
          </p>
        </div>
        <div className="hidden gap-2 md:flex">
          <Badge tone="purple">Featured first</Badge>
          <Badge tone="green">Verified payments</Badge>
          <Badge tone="cyan">Provider tag</Badge>
        </div>
      </div>

      {orderedProducts.length === 0 && (
        <Card className="mt-6 p-8 text-center">
          <p className="text-slate-400">
            No products match these filters. Try clearing the search or picking a
            different game.
          </p>
        </Card>
      )}

      {/* ── Product grid ── */}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {orderedProducts.map((product) => {
          const isFeatured = featuredProducts.includes(product);
          const isProvider = product.sellerTag === "Provider / Developer";
          const coverImageUrl =
            "coverImageUrl" in product && product.coverImageUrl
              ? product.coverImageUrl
              : null;
          const startingPrice = product.pricePoints[0] ?? null;

          return (
            <Link
              key={product.slug}
              href={`/products/${product.slug}`}
              className="group block"
            >
              <Card className="overflow-hidden p-0 transition group-hover:border-purple-400/40 group-hover:shadow-[0_0_0_1px_rgba(168,85,247,0.15)]">
                {/* Cover */}
                <div
                  className={`relative aspect-[16/10] w-full ${
                    coverImageUrl
                      ? "bg-slate-950"
                      : `bg-gradient-to-br ${product.accent}`
                  }`}
                >
                  {coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverImageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-6">
                      <div className="text-center">
                        <div className="text-[10px] uppercase tracking-[0.24em] text-white/65">
                          {product.game}
                        </div>
                        <div className="mt-2 line-clamp-2 text-lg font-black text-white">
                          {product.name}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Top-left badges */}
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    {isFeatured && (
                      <span className="rounded-md border border-purple-300/40 bg-purple-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
                        Featured
                      </span>
                    )}
                  </div>

                  {/* Top-right badges */}
                  {isProvider && (
                    <div className="absolute right-3 top-3">
                      <span className="rounded-md border border-cyan-300/40 bg-cyan-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
                        Provider
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-black text-white">
                        {product.name}
                      </h3>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        by {product.seller}
                      </p>
                    </div>
                    <div className="flex-none text-right">
                      {startingPrice ? (
                        <>
                          <div className="text-[10px] uppercase tracking-wide text-slate-500">
                            From
                          </div>
                          <div className="text-sm font-black text-white">
                            {startingPrice}
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge>{product.game}</Badge>
                    <Badge>{product.category}</Badge>
                  </div>

                  {product.summary && (
                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-400">
                      {product.summary}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    {product.verifiedPayments.length ? (
                      product.verifiedPayments
                        .slice(0, 4)
                        .map((payment) => (
                          <PaymentPill key={payment} method={payment} compact />
                        ))
                    ) : (
                      <NoVerifiedPayments />
                    )}
                    {product.verifiedPayments.length > 4 && (
                      <span className="text-[10px] text-slate-500">
                        +{product.verifiedPayments.length - 4}
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      View product →
                    </span>
                    <span className="rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-3 py-1.5 text-xs font-semibold text-white opacity-90 transition group-hover:opacity-100">
                      Open
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
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
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>
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
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs transition ${
        active
          ? "border-purple-400/40 bg-purple-500/15 text-purple-100"
          : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
