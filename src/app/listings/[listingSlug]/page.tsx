import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, Nav, Shell } from "@/components/ui";
import { listings } from "@/lib/data";

export default function ListingPage({ params }: { params: { listingSlug: string } }) {
  const listing = listings.find((item) => item.slug === params.listingSlug);
  if (!listing) notFound();

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-6xl px-6 py-10">
        <Link href="/marketplace" className="text-sm text-slate-400 hover:text-white">← Back to marketplace</Link>

        <Card className="mt-6 border-purple-400/30 p-8">
          <div className="flex flex-col justify-between gap-8 lg:flex-row">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-4xl font-black">{listing.name}</h1>
                <Badge tone={listing.listingStatus === "Verified" ? "green" : "amber"}>{listing.listingStatus}</Badge>
              </div>
              <p className="mt-3 max-w-2xl text-slate-400">
                Product listing with seller status, reseller availability, payment methods, delivery, and trust signals.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="purple">{listing.game}</Badge>
                <Badge>{listing.category}</Badge>
                <Badge>{listing.architecture}</Badge>
                <Badge>{listing.sellerType}</Badge>
              </div>
            </div>
            <div className="min-w-[260px]">
              <Card className="p-5">
                <div className="text-sm text-slate-400">Integrity Index</div>
                <div className="mt-2 text-4xl font-black">{listing.integrity ?? "Pending"}</div>
                <div className="mt-1 text-xs text-slate-500">{listing.confidence} confidence</div>
              </Card>
              <Link href="/login" className="mt-3 inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold">
                Login to manage / review
              </Link>
            </div>
          </div>
        </Card>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
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
                {(listing.verifiedPayments.length ? listing.verifiedPayments : ["Pending verification"]).map((payment) => (
                  <Badge key={payment} tone={payment === "Pending verification" ? "amber" : "cyan"}>
                    {payment}
                  </Badge>
                ))}
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
          </aside>
        </section>
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
    <div className="mb-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
