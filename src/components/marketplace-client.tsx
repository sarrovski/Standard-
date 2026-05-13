"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GameLogo } from "@/components/game-logo";
import { Badge, Card } from "@/components/ui";
import { featuredSlots as defaultSlots, games, productCategories, products as demoProducts, paymentMethods, sellerTags } from "@/lib/data";
import { cn } from "@/lib/helpers";
import { getPaymentVisualIdentity } from "@/lib/payment-identities";
import { getCategoryVisualIdentity, getGameVisualIdentity } from "@/lib/visual-identities";

// Supabase marketplace results are already constrained to published products.
// Pending review and draft products are never shown publicly.
const publicProductStatuses = ["All", "Published"] as const;
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
    const matchesStatus = selectedStatus === "All" || product.productStatus === selectedStatus;
    return matchesGame && matchesCategory && matchesPayment && matchesTag && matchesStatus;
  });

  const activeFeaturedSlots = slots.filter((slot) => slot.status === "Occupied");
  const featuredProducts = filtered.filter((product) =>
    activeFeaturedSlots.some(
      (slot) =>
        (slot.productSlug && slot.productSlug === product.slug) ||
        (!slot.productSlug && slot.category === product.game && slot.product === product.name),
    ),
  );
  const regularProducts = filtered.filter((product) => !featuredProducts.includes(product));
  const orderedProducts = [...featuredProducts, ...regularProducts];

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
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
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
          <FilterBlock title="Status">
            {publicProductStatuses.map((status) => (
              <FilterButton key={status} active={selectedStatus === status} onClick={() => setSelectedStatus(status)}>
                {status}
              </FilterButton>
            ))}
          </FilterBlock>
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
    </>
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
    case "Aim Assist":
      return (
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" {...stroke}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      );
    case "ESP / Visuals":
      return (
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" {...stroke}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "Stat Tracker / Analytics":
      return (
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" {...stroke}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
    case "Overlay / HUD":
      return (
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" {...stroke}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      );
    case "Coaching":
      return (
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" {...stroke}>
          <path d="M22 10L12 5 2 10l10 5 10-5z" />
          <path d="M6 12v5c3 2 9 2 12 0v-5" />
        </svg>
      );
    case "Macros / Scripts":
      return (
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" {...stroke}>
          <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 4l-4 16" />
        </svg>
      );
    case "Utility":
      return (
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" {...stroke}>
          <path d="M14.7 6.3a4 4 0 1 1 3 3l-8 8a2.5 2.5 0 1 1-3.5-3.5l8-8z" />
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
