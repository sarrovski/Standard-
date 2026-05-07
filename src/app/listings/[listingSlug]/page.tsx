import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, Nav, Shell, ButtonLink } from "@/components/ui";
import { listings } from "@/lib/data";
import { NoVerifiedPayments, PaymentPill, PaymentStatusPill } from "@/components/payment-pill";

export default function ListingPage({ params }: { params: { listingSlug: string } }) {
  const listing = listings.find((item) => item.slug === params.listingSlug);
  if (!listing) notFound();

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <Link href="/marketplace" className="text-sm text-slate-400 hover:text-white">← Back to marketplace</Link>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="overflow-hidden border-purple-400/30">
            <div className={`bg-gradient-to-br ${listing.accent} p-8`}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={listing.listingStatus === "Verified" ? "green" : "amber"}>{listing.listingStatus}</Badge>
                <Badge tone={listing.sellerTag === "Provider / Developer" ? "cyan" : listing.sellerTag === "Verified Seller" ? "green" : "default"}>{listing.sellerTag}</Badge>
                <Badge>{listing.game}</Badge>
                <Badge>{listing.architecture}</Badge>
              </div>
              <h1 className="mt-6 text-4xl font-black md:text-5xl">{listing.name}</h1>
              <p className="mt-4 max-w-3xl text-white/85">{listing.summary}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href={listing.websiteUrl}>{listing.websiteLabel}</ButtonLink>
                <ButtonLink href="/login" variant="secondary">Follow seller</ButtonLink>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <Badge tone="purple">Why this page exists</Badge>
            <h2 className="mt-4 text-2xl font-black">Seller conversion panel</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              This product page is built to help the seller present the product beautifully and move qualified users toward the official website.
            </p>
            <div className="mt-5 grid gap-3">
              <Fact label="Seller" value={listing.seller} />
              <Fact label="Official website" value={listing.websiteUrl} />
              <Fact label="Discord" value={listing.discord} />
              <Fact label="Telegram" value={listing.telegram} />
            </div>
            <a href={listing.websiteUrl} className="mt-6 inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white">
              Go to official website
            </a>
          </Card>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Panel title="Media gallery" subtitle="Beautiful visuals help sellers advertise better and increase outbound intent.">
              <div className="grid gap-4 md:grid-cols-2">
                {listing.gallery.map((item) => (
                  <div key={item.title} className={`h-44 rounded-3xl border border-white/10 bg-gradient-to-br ${item.accent} p-5`}>
                    <div className="text-xs uppercase tracking-[0.22em] text-white/65">Media block</div>
                    <div className="mt-20 text-lg font-bold text-white">{item.title}</div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Features" subtitle="Features are displayed as clear selling points before users leave Standard.">
              <div className="grid gap-3 md:grid-cols-2">
                {listing.features.map((feature) => (
                  <div key={feature} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm">
                    {feature}
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Why buyers click through" subtitle="A good Standard page makes the product understandable in a few seconds.">
              <div className="grid gap-3 md:grid-cols-2">
                {listing.benefits.map((benefit) => (
                  <div key={benefit} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                    {benefit}
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="FAQ" subtitle="Seller-controlled FAQ keeps objections low and trust high.">
              <div className="space-y-3">
                {listing.faq.map((item) => (
                  <div key={item.q} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="font-semibold">{item.q}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-400">{item.a}</div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <aside className="space-y-6">
            <Panel title="Trust signals">
              <div className="flex flex-wrap gap-2">
                {listing.trustSignals.map((signal) => (
                  <Badge key={signal} tone={signal.includes("Verified") || signal.includes("Provider") ? "green" : "default"}>
                    {signal}
                  </Badge>
                ))}
              </div>
            </Panel>

            <Panel title="Verified payment methods">
              <p className="mb-4 text-sm leading-6 text-slate-400">
                Only payment methods approved by Standard appear here as accepted.
              </p>
              <div className="flex flex-wrap gap-2">
                {listing.verifiedPayments.length ? (
                  listing.verifiedPayments.map((payment) => <PaymentPill key={payment} method={payment} />)
                ) : (
                  <NoVerifiedPayments />
                )}
              </div>
            </Panel>

            <Panel title="Payment methods under review">
              <div className="space-y-3">
                {listing.paymentProfiles
                  .filter((payment) => payment.status === "Pending verification" || payment.status === "Needs re-check")
                  .map((payment) => (
                    <div key={payment.method} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <PaymentPill method={payment.method} />
                        <PaymentStatusPill status={payment.status} />
                      </div>
                      <p className="mt-3 text-xs leading-5 text-slate-500">{payment.proofNote}</p>
                    </div>
                  ))}
                {listing.paymentProfiles.filter((payment) => payment.status === "Pending verification" || payment.status === "Needs re-check").length === 0 && (
                  <p className="text-sm text-slate-500">No payment methods are currently under review.</p>
                )}
              </div>
            </Panel>

            <Panel title="Price points">
              <div className="space-y-2">
                {(listing.pricePoints.length ? listing.pricePoints : ["Pending verification"]).map((price) => (
                  <div key={price} className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm font-medium">
                    {price}
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Delivery / Refund">
              <Fact label="Delivery" value={listing.delivery} />
              <div className="mt-3" />
              <Fact label="Refund policy" value={listing.refundPolicy} />
            </Panel>

            <Card className="border-cyan-400/20 bg-cyan-500/10 p-6">
              <div className="text-sm font-semibold text-cyan-100">Official action</div>
              <h3 className="mt-2 text-xl font-black">Continue on seller website</h3>
              <p className="mt-2 text-sm leading-6 text-cyan-100/90">
                Standard gives the buyer the main context. The next step is to continue on the seller’s official website.
              </p>
              <a href={listing.websiteUrl} className="mt-5 inline-flex w-full justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950">
                {listing.websiteLabel}
              </a>
            </Card>
          </aside>
        </section>
      </section>
    </Shell>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold">{title}</h2>
      {subtitle && <p className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
