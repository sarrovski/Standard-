import { Badge, Card, MiniStat, Nav, SectionHeader, Shell, Tabs } from "@/components/ui";
import { analytics, paymentMethods, plans, resellerOffers, sellerProducts, trafficSources } from "@/lib/data";

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "listings", label: "Listings" },
  { key: "builder", label: "Builder" },
  { key: "offers", label: "Offers" },
  { key: "payments", label: "Payments" },
  { key: "analytics", label: "Analytics" },
  { key: "billing", label: "Billing" },
];

export default function DashboardPage({
  searchParams,
}: {
  searchParams?: { role?: string; tab?: string };
}) {
  const role = searchParams?.role ?? "seller";
  const tab = searchParams?.tab ?? "overview";
  const isReseller = role === "reseller";

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeader
          eyebrow={isReseller ? "Reseller Dashboard" : "Seller Dashboard"}
          title={isReseller ? "Manage reseller offers" : "Manage products and seller operations"}
          text="A cleaner dashboard with focused sections instead of one long page. Access depends on active seller or reseller subscription."
        />

        <div className="mt-8">
          <Tabs items={tabs} active={tab} basePath="/dashboard" />
        </div>

        <div className="mt-8">
          {tab === "overview" && <Overview />}
          {tab === "listings" && <Listings />}
          {tab === "builder" && <Builder />}
          {tab === "offers" && <Offers />}
          {tab === "payments" && <Payments />}
          {tab === "analytics" && <Analytics />}
          {tab === "billing" && <Billing />}
        </div>
      </section>
    </Shell>
  );
}

function Overview() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        {analytics.map((item) => (
          <MiniStat key={item.label} label={item.label} value={item.value} detail={item.change} />
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6">
          <Badge tone="purple">Today</Badge>
          <h2 className="mt-4 text-2xl font-black">Priority actions</h2>
          <div className="mt-5 space-y-3">
            {["Submit proof for Shadow Overlay", "Verify PayPal G&S payment policy", "Respond to 2 buyer reviews", "Review reseller offer from NovaKeys"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <Badge tone="cyan">Status</Badge>
          <h2 className="mt-4 text-2xl font-black">Subscription access</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Active Pro Seller subscription. Product listing limit: 10. Reseller offers require Reseller Pro or Big Seller.
          </p>
        </Card>
      </section>
    </div>
  );
}

function Listings() {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-white/10 p-5">
        <h2 className="text-xl font-bold">Listings</h2>
        <p className="mt-1 text-sm text-slate-400">Manage products, statuses, features, and verification readiness.</p>
      </div>
      <div className="divide-y divide-white/10">
        {sellerProducts.map((product) => (
          <div key={product.name} className="p-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold">{product.name}</h3>
                  <Badge tone={product.status === "Verified" ? "green" : "amber"}>{product.status}</Badge>
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
              <div className="min-w-[240px] rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="text-sm text-slate-400">Next action</div>
                <div className="mt-1 text-sm font-semibold">{product.nextAction}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Builder() {
  return (
    <Card className="p-6">
      <Badge tone="cyan">Builder</Badge>
      <h2 className="mt-4 text-2xl font-black">Listing Builder</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        This is the seller flow for creating or updating a product listing.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {["Product name", "Game", "Category", "Architecture", "Features", "Price points", "Accepted payments", "Delivery time", "Refund policy", "Tool status"].map((field) => (
          <div key={field} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <div className="text-xs text-slate-500">{field}</div>
            <div className="mt-1 text-sm font-semibold">Required field</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Offers() {
  return (
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
  );
}

function Payments() {
  return (
    <Card className="p-6">
      <Badge tone="cyan">Payment profile</Badge>
      <h2 className="mt-4 text-2xl font-black">Accepted payment methods</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Payment methods are central to Standard. Sellers and resellers should clearly list what they accept.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {paymentMethods.map((method) => (
          <div key={method} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <div className="font-bold">{method}</div>
            <div className="mt-1 text-xs text-slate-500">
              {method === "Crypto" || method === "Gift Cards" || method === "PayPal F&F"
                ? "Higher risk, admin review recommended"
                : "Standard verification required"}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Analytics() {
  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <Card className="p-6">
        <Badge tone="green">Analytics</Badge>
        <h2 className="mt-4 text-2xl font-black">Performance</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {analytics.map((item) => (
            <MiniStat key={item.label} label={item.label} value={item.value} detail={item.change} />
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="text-2xl font-black">Traffic sources</h2>
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
  );
}

function Billing() {
  return (
    <Card className="p-6">
      <Badge tone="purple">Billing</Badge>
      <h2 className="mt-4 text-2xl font-black">Subscription plans</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
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
  );
}
