import { Card, MiniStat, Nav, SectionHeader, Shell, Badge, ButtonLink } from "@/components/ui";

export default function AccountPage({
  searchParams,
}: {
  searchParams?: { view?: string };
}) {
  const sellView = searchParams?.view === "sell";

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeader
          eyebrow={sellView ? "Seller onboarding" : "User account"}
          title={sellView ? "Become a seller on Standard" : "Buyer workspace"}
          text={sellView ? "If you do not have an active seller subscription yet, start here. Choose a plan, then unlock the seller dashboard." : "Normal users get a simple account area for saved products, reviews, alerts, and payment preferences."}
        />

        {sellView ? (
          <div className="mt-8 space-y-8">
            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="p-6">
                <Badge tone="purple">Start Selling</Badge>
                <h2 className="mt-4 text-2xl font-black">How selling on Standard works</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Standard helps sellers create trusted product announcements, verify payment methods, and send qualified users to their own website.
                </p>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {[
                    ["1. Create your seller account", "Start from one Standard account and enable seller access."],
                    ["2. Choose a seller plan", "Unlock product announcements, builder access, payment verification, and analytics."],
                    ["3. Build your product page", "Use the builder to add product details, media, pricing, features, FAQ, and website CTA."],
                    ["4. Verify payment methods", "Submit proof before a payment method appears publicly as accepted."],
                    ["5. Request Provider / Developer tag", "Official developers can submit website, Discord, Telegram, and proof for admin review."],
                    ["6. Drive traffic to your site", "Your Standard page builds trust, then pushes buyers to your official website or offer page."],
                  ].map(([title, text]) => (
                    <div key={title} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <div className="font-bold">{title}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-400">{text}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <ButtonLink href="/plans">View plans</ButtonLink>
                  <ButtonLink href="/dashboard?tab=builder" variant="secondary">Preview builder</ButtonLink>
                </div>
              </Card>

              <Card className="p-6">
                <Badge tone="cyan">Seller tools</Badge>
                <h2 className="mt-4 text-2xl font-black">What you unlock</h2>
                <div className="mt-5 grid gap-3">
                  {[
                    "Product announcements",
                    "Advanced product page builder",
                    "Image upload placeholders / media gallery",
                    "Verified payment method workflow",
                    "Outbound click analytics",
                    "Featured category placement",
                    "Provider / Developer tag request",
                  ].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm">
                      {item}
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <Card className="p-6">
                <Badge tone="green">Featured slots</Badge>
                <h2 className="mt-4 text-2xl font-black">Pay to appear higher</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Sellers can reserve one featured placement per category when the slot is available.
                  If another product already owns the slot, it becomes unavailable until the placement expires.
                </p>
                <div className="mt-6">
                  <ButtonLink href="/plans#featured" variant="secondary">Check featured availability</ButtonLink>
                </div>
              </Card>

              <Card className="p-6">
                <Badge tone="amber">Important</Badge>
                <h2 className="mt-4 text-2xl font-black">Verification still matters</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Featured placement boosts visibility, but it does not replace verification. Seller tags, payment methods,
                  and trust signals are still reviewed separately by Standard.
                </p>
              </Card>
            </section>
          </div>
        ) : (
          <>
            <section className="mt-8 grid gap-4 md:grid-cols-4">
              <MiniStat label="Saved products" value="12" detail="3 updated recently" />
              <MiniStat label="Reviews posted" value="8" detail="2 verified" />
              <MiniStat label="Payment preferences" value="3" detail="Crypto, Card, PayPal" />
              <MiniStat label="Alerts" value="4" detail="Product changes" />
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-2">
              <Card className="p-6">
                <Badge tone="purple">Saved</Badge>
                <h2 className="mt-4 text-2xl font-black">Watchlist</h2>
                <div className="mt-5 space-y-3">
                  {["PhantomX Tracker", "Shadow Overlay", "NovaKeys Offer"].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <div className="font-semibold">{item}</div>
                      <div className="mt-1 text-xs text-slate-500">Notify me when verified facts change.</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <Badge tone="cyan">Payments</Badge>
                <h2 className="mt-4 text-2xl font-black">Payment preferences</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Users can filter marketplace results by payment methods they can actually use.
                </p>
                <div className="mt-5 flex gap-3">
                  <ButtonLink href="/marketplace">Browse marketplace</ButtonLink>
                  <ButtonLink href="/account?view=sell" variant="secondary">Become a seller</ButtonLink>
                </div>
              </Card>
            </section>
          </>
        )}
      </section>
    </Shell>
  );
}
