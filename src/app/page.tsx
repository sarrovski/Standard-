import Link from "next/link";
import { Badge, ButtonLink, Card, Nav, SectionHeader, Shell } from "@/components/ui";
import { games, listings } from "@/lib/data";

export default function HomePage() {
  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-12">
        <div className="mx-auto max-w-4xl text-center">
          <Badge tone="purple">One login for users, sellers, resellers, and admins</Badge>
          <h1 className="mt-6 text-5xl font-black leading-[1.04] tracking-tight md:text-7xl">
            The simplest way to find and verify
            <span className="bg-gradient-to-r from-purple-400 to-cyan-300 bg-clip-text text-transparent"> gaming tools.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Standard helps users compare marketplace references, seller trust, payment methods,
            reseller offers, and verified product facts before buying.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/marketplace">Open Marketplace</ButtonLink>
            <ButtonLink href="/login" variant="secondary">Login / Claim access</ButtonLink>
          </div>
        </div>

        <section className="mt-14 grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <h3 className="text-xl font-bold">Marketplace first</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Users pick a game, then see references, claimed sellers, resellers, payment options, and trust signals.
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-xl font-bold">Seller subscriptions</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Sellers unlock a full dashboard only when they have an active seller or reseller subscription.
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-xl font-bold">Payment transparency</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Resellers can list accepted payment methods, delivery time, stock, and refund policy after verification.
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
                  {listings.filter((listing) => listing.game === game).length} references
                </div>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </Shell>
  );
}
