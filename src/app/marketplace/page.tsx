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
          title="Choose a game, then compare products"
          text="Game first, then product listings, providers, resellers, payment methods, and trust signals."
        />

        <Card className="mt-8 p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
            <div>
              <div className="text-sm font-semibold text-slate-300">Games</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["All", ...games].map((game) => (
                  <a key={game} href={`/marketplace${game === "All" ? "" : `?game=${encodeURIComponent(game)}`}`} className={`rounded-full border px-3 py-1.5 text-sm ${selectedGame === game ? "border-purple-400/40 bg-purple-500/15 text-purple-100" : "border-white/10 bg-white/[0.04] text-slate-300"}`}>
                    {game}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-300">Payment method</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {["All", "Pending", ...paymentMethods.slice(0, 5)].map((payment) => (
                  <a key={payment} href={`/marketplace?${selectedGame !== "All" ? `game=${encodeURIComponent(selectedGame)}&` : ""}payment=${encodeURIComponent(payment)}`} className={`rounded-full border px-3 py-1.5 text-sm ${selectedPayment === payment ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100" : "border-white/10 bg-white/[0.04] text-slate-300"}`}>
                    {payment}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-8 grid gap-4">
          {filtered.map((listing, index) => (
            <Card key={listing.slug} className="p-5">
              <div className="grid gap-5 lg:grid-cols-[60px_1fr_240px] lg:items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-500/10 text-lg font-black text-purple-200">
                  #{index + 1}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold">{listing.name}</h2>
                    <Badge tone={listing.listingStatus === "Verified" ? "green" : "amber"}>{listing.listingStatus}</Badge>
                    <Badge>{listing.sellerType}</Badge>
                    <Badge>{listing.architecture}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {listing.game} • {listing.category} • {listing.seller}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(listing.verifiedPayments.length ? listing.verifiedPayments : ["Payments pending"]).map((payment) => (
                      <span key={payment} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-300">
                        {payment}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="text-sm text-slate-400">Integrity</div>
                    <div className="mt-1 text-2xl font-black">{listing.integrity ?? "Pending"}</div>
                    <div className="mt-1 text-xs text-slate-500">{listing.confidence} confidence</div>
                  </div>
                  <Link href={`/listings/${listing.slug}`} className="mt-3 inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold">
                    View listing
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
