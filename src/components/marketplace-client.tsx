"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { featuredSlots as defaultSlots, games, listingStatuses, listings, paymentMethods, sellerTags } from "@/lib/data";
import { getFeaturedSlots, getLocalProducts } from "@/lib/local-store";
import type { LocalFeaturedSlot, LocalProduct } from "@/lib/local-types";
import { NoVerifiedPayments, PaymentPill } from "@/components/payment-pill";

export function MarketplaceClient() {
  const [localProducts, setLocalProducts] = useState<LocalProduct[]>([]);
  const [slots, setSlots] = useState<LocalFeaturedSlot[]>([]);
  const [selectedGame, setSelectedGame] = useState("All");
  const [selectedPayment, setSelectedPayment] = useState("All");
  const [selectedTag, setSelectedTag] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  useEffect(() => {
    setLocalProducts(getLocalProducts());
    const localSlots = getFeaturedSlots();
    setSlots(localSlots.length ? localSlots : defaultSlots.map((slot) => ({ ...slot, productSlug: null })) as LocalFeaturedSlot[]);
  }, []);

  const allListings = useMemo(() => [...localProducts, ...listings], [localProducts]);

  const filtered = allListings.filter((listing) => {
    const matchesGame = selectedGame === "All" || listing.game === selectedGame;
    const matchesPayment = selectedPayment === "All" || listing.verifiedPayments.includes(selectedPayment as never);
    const matchesTag = selectedTag === "All" || listing.sellerTag === selectedTag;
    const matchesStatus = selectedStatus === "All" || listing.listingStatus === selectedStatus;
    return matchesGame && matchesPayment && matchesTag && matchesStatus;
  });

  const activeFeaturedSlots = slots.filter((slot) => slot.status === "Occupied");
  const featuredListings = filtered.filter((listing) =>
    activeFeaturedSlots.some(
      (slot) =>
        (slot.productSlug && slot.productSlug === listing.slug) ||
        (!slot.productSlug && slot.category === listing.game && slot.product === listing.name),
    ),
  );
  const regularListings = filtered.filter((listing) => !featuredListings.includes(listing));
  const orderedListings = [...featuredListings, ...regularListings];

  return (
    <>
      <Card className="mt-8 p-5">
        <div className="grid gap-6 xl:grid-cols-4">
          <FilterBlock title="Games">
            {(["All", ...games] as const).map((game) => (
              <FilterButton key={game} active={selectedGame === game} onClick={() => setSelectedGame(game)}>
                {game}
              </FilterButton>
            ))}
          </FilterBlock>
          <FilterBlock title="Payments">
            {(["All", ...paymentMethods] as const).map((payment) => (
              <FilterButton key={payment} active={selectedPayment === payment} onClick={() => setSelectedPayment(payment)}>
                {payment}
              </FilterButton>
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
            {listingStatuses.map((status) => (
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
          <p className="mt-1 text-sm text-slate-500">{orderedListings.length} listings found</p>
        </div>
        <div className="hidden gap-2 md:flex">
          <Badge tone="purple">Featured first</Badge>
          <Badge tone="green">Verified</Badge>
          <Badge tone="cyan">Provider / Developer</Badge>
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {orderedListings.map((listing, index) => {
          const isFeatured = featuredListings.includes(listing);
          return (
            <Card key={listing.slug} className="overflow-hidden">
              <div className={`h-36 bg-gradient-to-br ${listing.accent} p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-2xl border border-white/20 bg-black/20 px-3 py-2 text-sm font-black text-white">
                    #{index + 1}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Badge tone={listing.listingStatus === "Verified" ? "green" : "amber"}>{listing.listingStatus}</Badge>
                    {isFeatured && <Badge tone="purple">Featured</Badge>}
                  </div>
                </div>
                <div className="mt-8">
                  <div className="text-xs uppercase tracking-[0.24em] text-white/70">{listing.game}</div>
                  <h3 className="mt-2 text-2xl font-black text-white">{listing.name}</h3>
                </div>
              </div>

              <div className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={listing.sellerTag === "Provider / Developer" ? "cyan" : listing.sellerTag === "Verified Seller" ? "green" : "default"}>
                    {listing.sellerTag}
                  </Badge>
                  <Badge>{listing.architecture}</Badge>
                </div>

                <p className="mt-3 text-sm text-slate-400">{listing.seller} • {listing.category}</p>

                <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                  <StatTile value={String(listing.integrity ?? "-")} label="Integrity" />
                  <StatTile value={String(listing.activity.vouches)} label="Vouches" />
                  <StatTile value={listing.delivery} label="Delivery" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {listing.features.slice(0, 3).map((feature) => (
                    <span key={feature} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-300">
                      {feature}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {listing.verifiedPayments.length ? (
                    listing.verifiedPayments.slice(0, 3).map((payment) => <PaymentPill key={payment} method={payment} compact />)
                  ) : (
                    <NoVerifiedPayments />
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-500">Starting at</div>
                    <div className="text-lg font-black">{listing.pricePoints[0] ?? "Pending"}</div>
                  </div>
                  <Link
                    href={`/listings/${listing.slug}`}
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold"
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

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm ${
        active ? "border-purple-400/40 bg-purple-500/15 text-purple-100" : "border-white/10 bg-white/[0.04] text-slate-300"
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
