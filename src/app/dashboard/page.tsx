import Link from "next/link";
import { Badge, Card, MiniStat, Nav, SectionHeader, Shell, Tabs } from "@/components/ui";
import {
  analytics,
  builderSections,
  mediaUploadGuide,
  pageTemplates,
  paymentMethods,
  paymentVerificationQueue,
  plans,
  providerTagRequests,
  sellerOffers,
  sellerProducts,
  trafficSources,
} from "@/lib/data";
import { PaymentPill, PaymentStatusPill } from "@/components/payment-pill";

const tabs = [
  { key: "overview", label: "Overview" },
  { key: "listings", label: "Listings" },
  { key: "builder", label: "Page Builder" },
  { key: "offers", label: "Offers" },
  { key: "payments", label: "Payment Verification" },
  { key: "analytics", label: "Analytics" },
  { key: "verification", label: "Provider Tag" },
  { key: "billing", label: "Billing" },
];

export default function DashboardPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const tab = searchParams?.tab ?? "overview";

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeader
          eyebrow="Seller Dashboard"
          title="Build beautiful product pages that send traffic to your website"
          text="Standard is not only a directory. Your seller dashboard helps you package your product professionally, add media, explain features clearly, and drive qualified visitors to your own website."
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
          {tab === "verification" && <Verification />}
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

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="p-6">
          <Badge tone="purple">Seller goal</Badge>
          <h2 className="mt-4 text-2xl font-black">What you are optimizing for</h2>
          <div className="mt-5 grid gap-3">
            {[
              "Present your product professionally",
              "Show enough visuals and proof to build trust",
              "Make pricing, features, and payments easy to scan",
              "Drive qualified outbound clicks to your website",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <Badge tone="cyan">This week</Badge>
          <h2 className="mt-4 text-2xl font-black">Priority actions</h2>
          <div className="mt-5 space-y-3">
            {[
              "Upload one new hero image for PhantomX Tracker",
              "Improve CTA copy on the pricing block",
              "Submit more media for Shadow Overlay",
              "Review outbound click performance by template",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                {item}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge tone="green">Top product</Badge>
              <h2 className="mt-4 text-2xl font-black">PhantomX Tracker</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Best-performing product page. Strong media coverage, strong outbound CTR, and clear trust presentation.
              </p>
            </div>
            <Link href="/listings/phantomx-tracker" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold">
              View page
            </Link>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <MetricCard label="Views" value="28.4K" />
            <MetricCard label="Outbound clicks" value="1,320" />
            <MetricCard label="Outbound CTR" value="4.64%" />
          </div>
        </Card>

        <Card className="p-6">
          <Badge tone="purple">Builder health</Badge>
          <h2 className="mt-4 text-2xl font-black">Publishing checklist</h2>
          <div className="mt-5 grid gap-3">
            {[
              ["Hero image", "Complete"],
              ["Gallery assets", "Complete"],
              ["Features", "Complete"],
              ["Pricing", "Complete"],
              ["Official website CTA", "Complete"],
              ["FAQ", "Needs update"],
            ].map(([label, state]) => (
              <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <span className="text-sm">{label}</span>
                <Badge tone={state === "Complete" ? "green" : "amber"}>{state}</Badge>
              </div>
            ))}
          </div>
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
        <p className="mt-1 text-sm text-slate-400">Manage products, product-page quality, and outbound website performance.</p>
      </div>
      <div className="divide-y divide-white/10">
        {sellerProducts.map((product) => (
          <div key={product.name} className="p-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold">{product.name}</h3>
                  <Badge tone={product.status === "Verified" ? "green" : "amber"}>{product.status}</Badge>
                  <Badge tone="cyan">{product.pageTemplate}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{product.game} • {product.toolStatus} • {product.website}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.features.map((feature) => (
                    <span key={feature} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-300">
                      {feature}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-sm text-slate-400">Next action: {product.nextAction}</p>
              </div>

              <div className="grid min-w-[320px] grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm xl:max-w-[360px]">
                <div>
                  <div className="text-slate-500">Views</div>
                  <div className="font-bold">{product.views}</div>
                </div>
                <div>
                  <div className="text-slate-500">Outbound clicks</div>
                  <div className="font-bold">{product.outboundClicks}</div>
                </div>
                <div>
                  <div className="text-slate-500">Outbound CTR</div>
                  <div className="font-bold">{product.outboundCtr}</div>
                </div>
                <div>
                  <div className="text-slate-500">Media assets</div>
                  <div className="font-bold">{product.mediaAssets}</div>
                </div>
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
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="p-6">
          <Badge tone="purple">Advanced builder</Badge>
          <h2 className="mt-4 text-2xl font-black">Create a beautiful product page</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            A strong Standard page should look premium, explain the product clearly, and push the user toward the official website.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <BuilderField label="Product name" value="PhantomX Tracker" />
            <BuilderField label="Official website" value="https://phantomx.example" />
            <BuilderField label="Headline" value="Professional Valorant analytics and overlay" />
            <BuilderField label="Primary CTA" value="Visit official website" />
            <BuilderField label="Secondary CTA" value="Join Discord" />
            <BuilderField label="Template" value="Hero Spotlight" />
          </div>
        </Card>

        <Card className="p-6">
          <Badge tone="cyan">Conversion focus</Badge>
          <h2 className="mt-4 text-2xl font-black">Outbound traffic settings</h2>
          <div className="mt-5 grid gap-3">
            {[
              ["Primary goal", "Send traffic to official website"],
              ["Secondary goal", "Join Discord / Telegram"],
              ["CTA placement", "Hero + sticky sidebar + final section"],
              ["Tracking", "Outbound clicks and CTR enabled"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="text-xs text-slate-500">{label}</div>
                <div className="mt-1 text-sm font-semibold">{value}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6">
          <Badge tone="green">Media library</Badge>
          <h2 className="mt-4 text-2xl font-black">Upload product images</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Sellers can upload hero images, screenshots, thumbnails, and feature visuals to build a richer page.
          </p>

          <div className="mt-6 rounded-3xl border border-dashed border-purple-400/30 bg-purple-500/10 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl">+</div>
            <h3 className="mt-4 text-lg font-bold">Drop images here or upload manually</h3>
            <p className="mt-2 text-sm text-slate-400">PNG, JPG, WEBP • organized per product page section</p>
          </div>

          <div className="mt-6 grid gap-3">
            {mediaUploadGuide.map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div>
                  <div className="font-semibold">{item.label}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.note}</div>
                </div>
                <div className="text-xs text-slate-400">{item.size}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <Badge tone="purple">Live structure</Badge>
          <h2 className="mt-4 text-2xl font-black">Page sections</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Turn sections on or off to build the ideal landing page for your product.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {builderSections.map((section) => (
              <div key={section} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <span className="text-sm">{section}</span>
                <Badge tone="green">Enabled</Badge>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="p-6">
          <Badge tone="cyan">Templates</Badge>
          <h2 className="mt-4 text-2xl font-black">Choose a page template</h2>
          <div className="mt-5 grid gap-3">
            {pageTemplates.map((template, index) => (
              <div key={template.name} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-bold">{template.name}</div>
                    <div className="mt-1 text-sm text-slate-400">{template.description}</div>
                  </div>
                  <Badge tone={index === 0 ? "green" : "default"}>{index === 0 ? "Selected" : "Available"}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <Badge tone="cyan">Preview</Badge>
          <h2 className="mt-4 text-2xl font-black">Page preview map</h2>
          <div className="mt-6 space-y-3">
            {[
              "Hero with headline, badges, and CTA",
              "Screenshot gallery",
              "Feature block",
              "Trust signals and payment methods",
              "Pricing cards",
              "FAQ",
              "Final website CTA",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.04] to-transparent p-4 text-sm text-slate-300">
                {item}
              </div>
            ))}
          </div>
          <Link href="/listings/phantomx-tracker" className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold">
            Open example product page
          </Link>
        </Card>
      </section>
    </div>
  );
}

function Offers() {
  return (
    <Card className="p-6">
      <Badge tone="cyan">Seller offers</Badge>
      <h2 className="mt-4 text-2xl font-black">Offer management</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Sellers can also publish offers for existing products. This covers what used to be separate reseller behavior.
      </p>
      <div className="mt-5 space-y-3">
        {sellerOffers.map((offer) => (
          <div key={offer.tool + offer.seller} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <div className="font-bold">{offer.tool}</div>
                <div className="mt-1 text-xs text-slate-500">{offer.seller} • {offer.status} • {offer.stock} • {offer.delivery}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {offer.payments.map((payment) => (
                    <PaymentPill key={payment} method={payment} compact />
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
    <div className="space-y-6">
      <Card className="p-6">
        <Badge tone="cyan">Payment verification</Badge>
        <h2 className="mt-4 text-2xl font-black">Prove the payment methods you accept</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          You cannot publicly advertise a payment method until Standard verifies it. This protects buyers from bait-and-switch payment claims.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            ["Select method", "Choose Card, Crypto, PayPal, Wise, Gift Cards, or another supported method."],
            ["Submit proof", "Add checkout URL, processor/account label, refund policy, and screenshots."],
            ["Admin review", "Standard approves, rejects, or requests more proof."],
            ["Public display", "Only verified methods appear on marketplace cards, filters, and product pages."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="font-bold">{title}</div>
              <div className="mt-2 text-sm leading-6 text-slate-400">{text}</div>
            </div>
          ))}
        </div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6">
          <h2 className="text-2xl font-black">Add payment method</h2>
          <div className="mt-5 grid gap-4">
            {[
              ["Payment method", "Card / Crypto / PayPal G&S / Wise"],
              ["Processor or account label", "Stripe, PayPal merchant, Coinbase Commerce, etc."],
              ["Checkout or payment URL", "Where buyers can confirm this method exists"],
              ["Refund policy", "Required for higher buyer trust"],
              ["Proof note", "Explain what proof you are submitting"],
              ["Screenshot upload", "Upload proof image when storage is connected"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="text-xs text-slate-500">{label}</div>
                <div className="mt-1 text-sm font-semibold">{value}</div>
              </div>
            ))}
          </div>
          <button className="mt-6 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold">
            Submit payment verification
          </button>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-black">Your payment status</h2>
          <div className="mt-5 space-y-3">
            {paymentVerificationQueue.map((item) => (
              <div key={item.seller + item.listing + item.method} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <PaymentPill method={item.method} />
                  <PaymentStatusPill status={item.status} />
                </div>
                <div className="mt-3 text-sm font-semibold">{item.listing}</div>
                <div className="mt-1 text-xs text-slate-500">{item.submittedProof}</div>
                <div className="mt-3 text-xs text-slate-400">Admin action: {item.adminAction}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card className="p-6">
        <h2 className="text-2xl font-black">Supported methods</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Sellers can request any supported method, but it stays private or under review until approved.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {paymentMethods.map((method) => (
            <div key={method} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <PaymentPill method={method} />
              <div className="mt-3 text-xs text-slate-500">
                {method === "Crypto" || method === "Gift Cards" || method === "PayPal F&F"
                  ? "Higher risk, stricter review required"
                  : "Standard verification required"}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
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

function Verification() {
  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <Card className="p-6">
        <Badge tone="purple">Provider tag request</Badge>
        <h2 className="mt-4 text-2xl font-black">Request Provider / Developer tag</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          If you are the official developer or provider, submit your public proof here. Admin reviews requests manually.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            ["Product name", "PhantomX Tracker"],
            ["Official website", "https://your-site.com"],
            ["Discord", "your-discord"],
            ["Telegram", "@yourtelegram"],
            ["Proof note", "Explain why you are the official developer"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="text-xs text-slate-500">{label}</div>
              <div className="mt-1 text-sm font-semibold">{value}</div>
            </div>
          ))}
        </div>
        <button className="mt-6 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold">
          Submit provider request
        </button>
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl font-black">Existing requests</h2>
        <div className="mt-5 space-y-3">
          {providerTagRequests.map((request) => (
            <div key={request.seller + request.product} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold">{request.product}</div>
                  <div className="mt-1 text-xs text-slate-500">{request.seller}</div>
                </div>
                <Badge tone={request.status === "Approved" ? "green" : "amber"}>{request.status}</Badge>
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

function BuilderField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}
