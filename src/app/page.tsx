import Link from "next/link";
import { Badge, ButtonLink, Card, Nav, SectionHeader, Shell } from "@/components/ui";
import { games, products } from "@/lib/data";

export default function HomePage() {
  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-12">
        <div className="mx-auto max-w-4xl text-center">
          <Badge tone="purple">Third-party seller verification for gaming tools</Badge>
          <h1 className="mt-6 text-5xl font-black leading-[1.04] tracking-tight md:text-7xl">
            Compare sellers before
            <span className="bg-gradient-to-r from-purple-400 to-cyan-300 bg-clip-text text-transparent"> you buy.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Standard acts as an independent trust layer where customers can compare sellers,
            payment methods, reviews, and verification status before making a purchase.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/marketplace">Open Marketplace</ButtonLink>
            <ButtonLink href="/trust" variant="secondary">How trust works</ButtonLink>
          </div>
        </div>

        <section className="mt-14 grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <h3 className="text-xl font-bold">1. Pick a game</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Users start from the marketplace, choose a game, and browse a gallery of products.
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-xl font-bold">2. Compare sellers</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Products show seller tags, payment methods, trust signals, delivery speed, and starting prices.
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-xl font-bold">3. Reduce scam risk</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Verified Sellers are manually reviewed by Standard. Reviews are designed to come from real customers and cannot be directly edited by sellers.
            </p>
          </Card>
        </section>

        <section className="mt-14">
          <SectionHeader
            eyebrow="Game hubs"
            title="Start with a game"
            text="Standard keeps the experience simple: choose a game, compare products, then choose the safest way to buy."
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
                  {products.filter((product) => product.game === game).length} products
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="trust" className="mt-14 scroll-mt-24">
          <SectionHeader
            eyebrow="Trust"
            title="A third-party layer between buyers and sellers"
            text="Standard does not simply list products. It helps buyers compare seller verification, payment risk, reviews, and public trust signals."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Card className="p-6">
              <h3 className="text-xl font-bold">Verified Sellers</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Every Verified Seller is reviewed and approved by the Standard team before receiving the badge.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-bold">Real customer reviews</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Reviews are designed to reflect real customer experiences. Sellers cannot edit, remove, or manipulate them.
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-bold">Clear limitations</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Standard helps reduce risk, but sellers remain responsible for their products, delivery, support, and payment policies.
              </p>
            </Card>
          </div>
        </section>
      </section>
    </Shell>
  );
}
