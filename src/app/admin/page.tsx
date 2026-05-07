import { Badge, Card, MiniStat, Nav, SectionHeader, Shell } from "@/components/ui";
import { adminSignals, listings, paymentVerificationQueue, providerTagRequests, sellerOffers, submissionQueue } from "@/lib/data";
import { PaymentPill, PaymentStatusPill } from "@/components/payment-pill";

export default function AdminPage() {
  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeader
          eyebrow="Admin"
          title="Control sellers, provider tags, payments, and moderation"
          text="Everyone who sells is a Seller. Admin reviews seller submissions, provider / developer tag requests, payment risk, and listing moderation."
        />

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <MiniStat label="Open submissions" value={String(submissionQueue.length)} detail="Need review" />
          <MiniStat label="Provider requests" value={String(providerTagRequests.filter((item) => item.status === "Pending").length)} detail="Waiting approval" />
          <MiniStat label="Seller offers" value={String(sellerOffers.length)} detail="Payment profiles" />
          <MiniStat label="Risk signals" value={String(adminSignals.length)} detail="Watchlist" />
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <Panel title="Submission queue">
            <div className="space-y-3">
              {submissionQueue.map((item) => (
                <Row
                  key={item.listing}
                  title={item.listing}
                  meta={`${item.type} • ${item.requester}`}
                  right={<Badge tone="amber">{item.status}</Badge>}
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

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Panel title="Provider / Developer tag requests">
            <div className="space-y-3">
              {providerTagRequests.map((request) => (
                <Card key={request.seller + request.product} className="p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-bold">{request.product}</div>
                      <div className="mt-1 text-sm text-slate-500">{request.seller}</div>
                      <div className="mt-3 grid gap-2 text-sm text-slate-300">
                        <div><span className="text-slate-500">Website:</span> {request.website}</div>
                        <div><span className="text-slate-500">Discord:</span> {request.discord}</div>
                        <div><span className="text-slate-500">Telegram:</span> {request.telegram}</div>
                        <div><span className="text-slate-500">Proof:</span> {request.proof}</div>
                      </div>
                    </div>
                    <div className="flex min-w-[180px] flex-col items-end gap-2">
                      <Badge tone={request.status === "Approved" ? "green" : "amber"}>{request.status}</Badge>
                      <div className="flex gap-2">
                        <button className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">Approve</button>
                        <button className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300">Request more</button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Panel>

          <Panel title="Payment Risk Center">
            <div className="grid gap-4">
              {sellerOffers.map((offer) => (
                <Card key={offer.tool + offer.seller} className="p-5">
                  <div className="flex justify-between gap-4">
                    <div>
                      <h3 className="font-bold">{offer.seller}</h3>
                      <p className="mt-1 text-sm text-slate-500">{offer.tool}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {offer.payments.map((payment) => (
                          <PaymentPill key={payment} method={payment} compact />
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


        <section className="mt-6">
          <Panel title="Payment Verification Queue">
            <div className="grid gap-4 md:grid-cols-2">
              {paymentVerificationQueue.map((item) => (
                <Card key={item.seller + item.listing + item.method} className="p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold">{item.seller}</h3>
                        <p className="mt-1 text-sm text-slate-500">{item.listing}</p>
                      </div>
                      <PaymentStatusPill status={item.status} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <PaymentPill method={item.method} />
                      <Badge tone={item.risk === "High" ? "red" : item.risk === "Medium" ? "amber" : "green"}>{item.risk} risk</Badge>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
                      <div><span className="text-slate-500">Proof:</span> {item.submittedProof}</div>
                      <div className="mt-2"><span className="text-slate-500">Checkout:</span> {item.checkoutUrl}</div>
                      <div className="mt-2"><span className="text-slate-500">Refund policy:</span> {item.refundPolicy}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">Approve</button>
                      <button className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300">Request more proof</button>
                      <button className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">Reject</button>
                    </div>
                  </div>
                </Card>
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
                    <th className="px-4 py-3">Tag</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Payments</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing) => (
                    <tr key={listing.slug} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-4 font-semibold">{listing.name}</td>
                      <td className="px-4 py-4 text-slate-400">{listing.seller}</td>
                      <td className="px-4 py-4"><Badge tone={listing.sellerTag === "Provider / Developer" ? "cyan" : listing.sellerTag === "Verified Seller" ? "green" : "default"}>{listing.sellerTag}</Badge></td>
                      <td className="px-4 py-4"><Badge tone={listing.listingStatus === "Verified" ? "green" : "amber"}>{listing.listingStatus}</Badge></td>
                      <td className="px-4 py-4 text-slate-400">{listing.verifiedPayments.length || "None"}</td>
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
