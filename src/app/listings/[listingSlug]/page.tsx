import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, Nav, Shell } from "@/components/ui";
import { listings } from "@/lib/data";
import { NoVerifiedPayments, PaymentPill } from "@/components/payment-pill";

export default function ListingPage({ params }: { params: { listingSlug: string } }) {
  const listing = listings.find((item) => item.slug === params.listingSlug);
  if (!listing) notFound();

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-6xl px-6 py-10">
        <Link href="/marketplace" className="text-sm text-slate-400 hover:text-white">← Back to marketplace</Link>

        <Card className="mt-6 overflow-hidden border-purple-400/30">
          <div className={`h-48 bg-gradient-to-br ${listing.accent} p-8`}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={listing.listingStatus === "Verified" ? "green" : "amber"}>{listing.listingStatus}</Badge>
              <Badge tone={listing.sellerTag === "Provider / Developer" ? "cyan" : listing.sellerTag === "Verified Seller" ? "green" : "default"}>{listing.sellerTag}</Badge>
              <Badge>{listing.game}</Badge>
            </div>
            <h1 className="mt-6 text-4xl font-black">{listing.name}</h1>
            <p className="mt-3 max-w-2xl text-white/80">
              Product listing with seller status, payment methods, delivery, pricing, and trust signals.
            </p>
          </div>

          <div className="p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-6">
                <Panel title="Overview">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Fact label="Seller" value={listing.seller} />
                    <Fact label="Category" value={listing.category} />
                    <Fact label="Architecture" value={listing.architecture} />
                    <Fact label="Integrity" value={String(listing.integrity ?? "Pending")} />
                  </div>
                </Panel>

                <Panel title="Features">
                  <div className="grid gap-3 md:grid-cols-2">
                    {listing.features.map((feature) => (
                      <div key={feature} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm">
                        {feature}
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel title="Payment methods">
                  <div className="flex flex-wrap gap-2">
                    {listing.verifiedPayments.length ? (
                      listing.verifiedPayments.map((payment) => <PaymentPill key={payment} method={payment} />)
                    ) : (
                      <NoVerifiedPayments />
                    )}
                  </div>
                </Panel>

                <Panel title="Price points">
                  <div className="flex flex-wrap gap-2">
                    {(listing.pricePoints.length ? listing.pricePoints : ["Pending verification"]).map((price) => (
                      <Badge key={price}>{price}</Badge>
                    ))}
                  </div>
                </Panel>
              </div>

              <aside className="space-y-6">
                <Panel title="Activity">
                  <Fact label="Vouches" value={String(listing.activity.vouches)} />
                  <Fact label="Views" value={String(listing.activity.views)} />
                  <Fact label="Replies" value={String(listing.activity.replies)} />
                  <Fact label="Last seen" value={listing.activity.lastSeen} />
                </Panel>

                <Panel title="Delivery / Refund">
                  <Fact label="Delivery" value={listing.delivery} />
                  <Fact label="Refund policy" value={listing.refundPolicy} />
                </Panel>

                <Link href="/login" className="inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold">
                  Login to manage / review
                </Link>
              </aside>
            </div>
          </div>
        </Card>
      </section>
    </Shell>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <h2 className="mb-5 text-xl font-bold">{title}</h2>
      {children}
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
