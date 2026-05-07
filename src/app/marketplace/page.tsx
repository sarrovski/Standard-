import Link from "next/link";
import { Badge, Card, Nav, SectionHeader, Shell } from "@/components/ui";
import { games, listings, paymentMethods } from "@/lib/data";

export default function MarketplacePage({
  searchParams,
}: {
  searchParams?: { game?: string; payment?: string };
}) {
  const selectedGame = searchParams?.game ?? "All";
  const selectedPayment = searchParams?.payment ?? "All";

  const filtered = listings.filter((listing) => {
    const matchesGame = selectedGame === "All" || listing.game === selectedGame;
    const matchesPayment =
      selectedPayment === "All" ||
      listing.verifiedPayments.includes(selectedPayment) ||
      (selectedPayment === "Pending" && listing.verifiedPayments.length === 0);
    return matchesGame && matchesPayment;
  });

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeader
          eyebrow="Marketplace"
          title="Choose a game, then browse visually"
          text="A simpler and more visual marketplace: pick a game, refine with quick filters, and explore products in a gallery grid."
        />

        <Card className="mt-8 p-5">
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <div>
              <div className="text-sm font-semibold text-slate-300">Games</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["All", ...games].map((game) => (
                  <a
                    key={game}
                    href={`/marketplace${game === "All" ? "" : `?game=${encodeURIComponent(game)}`}`}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      selectedGame === game
                        ? "border-purple-400/40 bg-purple-500/15 text-purple-100"
                        : "border-white/10 bg-white/[0.04] text-slate-300"
                    }`}
                  >
                    {game}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-300">Payment method</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["All", "Pending", ...paymentMethods.slice(0, 5)].map((payment) => (
                  <a
                    key={payment}
                    href={`/marketplace?${selectedGame !== "All" ? `game=${encodeURIComponent(selectedGame)}&` : ""}payment=${encodeURIComponent(payment)}`}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      selectedPayment === payment
                        ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                        : "border-white/10 bg-white/[0.04] text-slate-300"
                    }`}
                  >
                    {payment}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-8 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">Results</h2>
            <p className="mt-1 text-sm text-slate-500">{filtered.length} listings found</p>
          </div>
          <div className="hidden gap-2 md:flex">
            <Badge tone="green">Verified</Badge>
            <Badge tone="cyan">Provider / Developer</Badge>
            <Badge tone="amber">Pending Review</Badge>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((listing, index) => (
            <Card key={listing.slug} className="overflow-hidden">
              <div className={`h-36 bg-gradient-to-br ${listing.accent} p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-2xl border border-white/20 bg-black/20 px-3 py-2 text-sm font-black text-white">
                    #{index + 1}
                  </div>
                  <Badge tone={listing.listingStatus === "Verified" ? "green" : "amber"}>{listing.listingStatus}</Badge>
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
                  {(listing.verifiedPayments.length ? listing.verifiedPayments.slice(0, 3) : ["Payments pending"]).map((payment) => (
                    <span key={payment} className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-100">
                      {payment}
                    </span>
                  ))}
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
          ))}
        </div>
      </section>
    </Shell>
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
