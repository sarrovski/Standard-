import { Card, MiniStat, Nav, SectionHeader, Shell, Badge } from "@/components/ui";

export default function AccountPage() {
  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeader
          eyebrow="User account"
          title="Buyer workspace"
          text="Normal users get a simple account area for saved listings, reviews, alerts, and payment preferences."
        />

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
            <div className="mt-5 flex flex-wrap gap-2">
              {["Crypto", "Card", "PayPal G&S"].map((method) => (
                <span key={method} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-slate-300">
                  {method}
                </span>
              ))}
            </div>
          </Card>
        </section>
      </section>
    </Shell>
  );
}
