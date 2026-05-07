import { Badge, Card, MiniStat, Nav, SectionHeader, Shell } from "@/components/ui";
import { analytics, resellerOffers, sellerProducts, trafficSources, plans } from "@/lib/data";

export default function DashboardPage({
  searchParams,
}: {
  searchParams?: { role?: string };
}) {
  const role = searchParams?.role ?? "seller";
  const isReseller = role === "reseller";

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeader
          eyebrow={isReseller ? "Reseller Dashboard" : "Seller Dashboard"}
          title={isReseller ? "Manage reseller offers and payment methods" : "Manage listings, claims, payments, and analytics"}
          text="This dashboard is available to accounts with an active seller or reseller subscription. It is designed to be useful before backend is connected."
        />

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {analytics.map((item) => (
            <MiniStat key={item.label} label={item.label} value={item.value} detail={item.change} />
          ))}
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="overflow-hidden">
            <div className="border-b border-white/10 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">Product listings</h2>
                  <p className="mt-1 text-sm text-slate-400">Claim, verify, update, and track listing facts.</p>
                </div>
                <Badge tone="purple">Pro Seller</Badge>
              </div>
            </div>
            <div className="divide-y divide-white/10">
              {sellerProducts.map((product) => (
                <div key={product.name} className="p-5">
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold">{product.name}</h3>
                        <Badge tone="amber">{product.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{product.game} • {product.toolStatus}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {product.features.map((feature) => (
                          <span key={feature} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-300">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="min-w-[220px] rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <div className="text-sm text-slate-400">Next action</div>
                      <div className="mt-1 text-sm font-semibold">{product.nextAction}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <Badge tone="cyan">Builder</Badge>
            <h2 className="mt-4 text-2xl font-black">Listing Builder</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Sellers submit technical facts, prices, accepted payments, delivery, refund policy, and proof.
            </p>
            <div className="mt-5 grid gap-3">
              {["Claim type", "Architecture", "Features", "Price points", "Accepted payments", "Delivery", "Refund policy"].map((field) => (
                <div key={field} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="text-sm font-semibold">{field}</div>
                  <div className="mt-1 text-xs text-slate-500">Required for verification</div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <Card className="p-6">
            <Badge tone="cyan">Reseller offers</Badge>
            <h2 className="mt-4 text-2xl font-black">Offer management</h2>
            <div className="mt-5 space-y-3">
              {resellerOffers.map((offer) => (
                <div key={offer.tool} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <div className="font-bold">{offer.tool}</div>
                      <div className="mt-1 text-xs text-slate-500">{offer.status} • {offer.stock} • {offer.delivery}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {offer.payments.map((payment) => (
                          <Badge key={payment}>{payment}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-bold">{offer.price}</div>
                      <div className="text-xs text-slate-500">{offer.disputes}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <Badge tone="green">Analytics</Badge>
            <h2 className="mt-4 text-2xl font-black">Traffic sources</h2>
            <div className="mt-6 space-y-4">
              {trafficSources.map(([source, share]) => (
                <div key={source}>
                  <div className="flex justify-between text-sm">
                    <span>{source}</span>
                    <span>{share}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-purple-400" style={{ width: `${share}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <Card className="p-6">
            <Badge tone="amber">Reviews / Appeals</Badge>
            <h2 className="mt-4 text-2xl font-black">Trust queue</h2>
            <div className="mt-5 space-y-3 text-sm text-slate-400">
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">2 reviews need provider response.</div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">1 appeal is waiting for admin review.</div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">Payment proof missing on one reseller offer.</div>
            </div>
          </Card>

          <Card className="p-6">
            <Badge tone="purple">Billing</Badge>
            <h2 className="mt-4 text-2xl font-black">Subscription access</h2>
            <div className="mt-5 grid gap-3">
              {plans.map((plan) => (
                <div key={plan.name} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <div className="font-bold">{plan.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{plan.limit}</div>
                    </div>
                    <div className="font-black">{plan.price}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </section>
    </Shell>
  );
}
