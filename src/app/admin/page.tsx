import { Badge, Card, MiniStat, Nav, SectionHeader, Shell } from "@/components/ui";
import { adminSignals, claimQueue, listings, resellerOffers } from "@/lib/data";

export default function AdminPage() {
  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeader
          eyebrow="Admin"
          title="Control claims, sellers, resellers, and payments"
          text="Admin reviews claim requests, seller subscriptions, risky payment profiles, reseller offers, and integrity signals."
        />

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <MiniStat label="Open claims" value={String(claimQueue.length)} detail="Need review" />
          <MiniStat label="Unclaimed listings" value={String(listings.filter((l) => l.claimStatus === "Unclaimed").length)} detail="Outreach targets" />
          <MiniStat label="Reseller offers" value={String(resellerOffers.length)} detail="Payment profiles" />
          <MiniStat label="Risk signals" value={String(adminSignals.length)} detail="Watchlist" />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <Panel title="Claim requests">
            <div className="space-y-3">
              {claimQueue.map((claim) => (
                <Row
                  key={claim.listing}
                  title={claim.listing}
                  meta={`${claim.type} • ${claim.requester}`}
                  right={<Badge tone="amber">{claim.status}</Badge>}
                />
              ))}
            </div>
          </Panel>

          <Panel title="Signal Center">
            <div className="space-y-3">
              {adminSignals.map((signal) => (
                <Row
                  key={signal.title}
                  title={signal.title}
                  meta={signal.meta}
                  right={<Badge tone={signal.risk === "High" ? "red" : "amber"}>{signal.risk}</Badge>}
                />
              ))}
            </div>
          </Panel>
        </section>

        <section className="mt-6">
          <Panel title="Listing moderation">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Listing</th>
                    <th className="px-4 py-3">Seller</th>
                    <th className="px-4 py-3">Game</th>
                    <th className="px-4 py-3">Claim</th>
                    <th className="px-4 py-3">Payments</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing) => (
                    <tr key={listing.slug} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-4 font-semibold">{listing.name}</td>
                      <td className="px-4 py-4 text-slate-400">{listing.seller}</td>
                      <td className="px-4 py-4 text-slate-400">{listing.game}</td>
                      <td className="px-4 py-4"><Badge tone="amber">{listing.claimStatus}</Badge></td>
                      <td className="px-4 py-4 text-slate-400">{listing.verifiedPayments.length || "Pending"}</td>
                      <td className="px-4 py-4 text-right">
                        <button className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>

        <section className="mt-6">
          <Panel title="Payment Risk Center">
            <div className="grid gap-4 md:grid-cols-2">
              {resellerOffers.map((offer) => (
                <Card key={offer.tool} className="p-5">
                  <div className="flex justify-between gap-4">
                    <div>
                      <h3 className="font-bold">{offer.reseller}</h3>
                      <p className="mt-1 text-sm text-slate-500">{offer.tool}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {offer.payments.map((payment) => (
                          <Badge key={payment} tone={payment === "Gift Cards" ? "red" : payment === "Crypto" ? "amber" : "default"}>
                            {payment}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-sm text-slate-400">
                      <div>{offer.status}</div>
                      <div className="mt-1 text-xs text-slate-500">{offer.disputes}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Panel>
        </section>
      </section>
    </Shell>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-white/10 p-5">
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

function Row({ title, meta, right }: { title: string; meta: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div>
        <div className="font-semibold">{title}</div>
        <div className="mt-1 text-xs text-slate-500">{meta}</div>
      </div>
      {right}
    </div>
  );
}
