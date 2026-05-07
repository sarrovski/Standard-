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
          text={sellView ? "If you do not have an active seller subscription yet, start here. Choose a plan, then unlock the seller dashboard." : "Normal users get a simple account area for saved listings, reviews, alerts, and payment preferences."}
        />

        {sellView ? (
          <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="p-6">
              <Badge tone="purple">Seller onboarding</Badge>
              <h2 className="mt-4 text-2xl font-black">What you unlock</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {[
                  "Product listings",
                  "Seller offers",
                  "Payment profile",
                  "Analytics",
                  "Billing controls",
                  "Provider / Developer tag request",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm">
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-6 flex gap-3">
                <ButtonLink href="/dashboard">Preview dashboard</ButtonLink>
                <ButtonLink href="/dashboard?tab=billing" variant="secondary">View plans</ButtonLink>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-2xl font-black">Access logic</h2>
              <div className="mt-5 space-y-3 text-sm text-slate-400">
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">1. Create or log into your Standard account.</div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">2. Activate a seller subscription.</div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">3. Get access to the full Seller Dashboard.</div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">4. If you are the official developer, request the Provider / Developer tag.</div>
              </div>
            </Card>
          </section>
        ) : (
          <>
            <section className="mt-8 grid gap-4 md:grid-cols-4">
              <MiniStat label="Saved listings" value="12" detail="3 updated recently" />
              <MiniStat label="Reviews posted" value="8" detail="2 verified" />
              <MiniStat label="Payment preferences" value="3" detail="Crypto, Card, PayPal" />
              <MiniStat label="Alerts" value="4" detail="Listing changes" />
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
