import Link from "next/link";
import { Badge, ButtonLink, Card, Nav, SectionHeader, Shell } from "@/components/ui";
import { games, listings } from "@/lib/data";

export default function HomePage() {
  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-12">
        <div className="mx-auto max-w-4xl text-center">
          <Badge tone="purple">One login. One marketplace. One seller system.</Badge>
          <h1 className="mt-6 text-5xl font-black leading-[1.04] tracking-tight md:text-7xl">
            The simplest marketplace for
            <span className="bg-gradient-to-r from-purple-400 to-cyan-300 bg-clip-text text-transparent"> gaming tools.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Standard helps users choose a game, compare trusted listings, and find sellers that support the payment methods they actually use.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/marketplace">Open Marketplace</ButtonLink>
            <ButtonLink href="/account?view=sell" variant="secondary">Sell on Standard</ButtonLink>
          </div>
        </div>

        <section id="how-it-works" className="mt-14 grid gap-4 scroll-mt-24 md:grid-cols-3">
          <Card className="p-6">
            <h3 className="text-xl font-bold">1. Pick a game</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Users start from the marketplace, choose a game, and browse a gallery of listings.
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-xl font-bold">2. Compare sellers</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Listings show seller tags, payment methods, trust signals, delivery speed, and starting prices.
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-xl font-bold">3. Sell on Standard</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Sellers subscribe, manage listings and offers, then request the Provider / Developer tag if they are official.
            </p>
          </Card>
        </section>

        <section className="mt-14">
          <SectionHeader
            eyebrow="Game hubs"
            title="Start with a game"
            text="Standard keeps the experience simple: choose a game, compare listings, then choose the safest way to buy."
          />
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {games.map((game) => (
              <Link
                key={game}
                href={`/marketplace?game=${encodeURIComponent(game)}`}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-purple-400/40"
              >
                <div className="font-bold">{game}</div>
                <div className="mt-1 text-sm text-slate-500">
                  {listings.filter((listing) => listing.game === game).length} listings
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="trust" className="mt-14 scroll-mt-24">
          <SectionHeader
            eyebrow="Trust"
            title="Why users can read listings faster"
            text="Standard is designed to make comparison easier: public seller tags, visual payment methods, and clear listing status."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Card className="p-6">
              <h3 className="text-xl font-bold">Seller tags</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Users can instantly distinguish between Seller, Verified Seller, and Provider / Developer.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-bold">Payment clarity</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Real payment methods are visualized clearly. Unverified payment information is shown separately.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-bold">Admin review</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Listings, provider tags, and risky payment profiles are reviewed from a dedicated admin workflow.
              </p>
            </Card>
          </div>
        </section>
      </section>
    </Shell>
  );
}
