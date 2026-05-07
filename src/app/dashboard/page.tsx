import Link from "next/link";
import { Badge, Card, MiniStat, Nav, SectionHeader, Shell, Tabs } from "@/components/ui";
import {
  analytics,
  builderSections,
  featuredSlots,
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
  { key: "products", label: "Produits" },
  { key: "builder", label: "Builder" },
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
  const tab = searchParams?.tab ?? "products";

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeader
          eyebrow="Seller Dashboard"
          title="Manage your products and build better announcements"
          text="Your dashboard starts with the products you have online. From there, use the builder to create polished product pages that drive qualified visitors to your website."
        />

        <div className="mt-8">
          <Tabs items={tabs} active={tab} basePath="/dashboard" />
        </div>

        <div className="mt-8">
          {tab === "products" && <Products />}
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

function Products() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <MiniStat label="Produits en ligne" value="2" detail="1 verified, 1 pending" />
        <MiniStat label="Views produits" value="35.2K" detail="+16.4%" />
        <MiniStat label="Outbound clicks" value="1.7K" detail="website traffic" />
        <MiniStat label="Avg outbound CTR" value="4.93%" detail="+0.8 pts" />
      </section>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Produits / annonces en ligne</h2>
            <p className="mt-1 text-sm text-slate-400">
              Ici tu gères les annonces produit visibles sur Standard : status, media, paiements, website CTA et performance.
            </p>
          </div>
          <Link
            href="/dashboard?tab=builder"
            className="inline-flex justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold"
          >
            Create new product
          </Link>
        </div>

        <div className="divide-y divide-white/10">
          {sellerProducts.map((product) => (
            <div key={product.name} className="p-5">
              <div className="grid gap-5 xl:grid-cols-[1fr_360px] xl:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-black">{product.name}</h3>
                    <Badge tone={product.status === "Verified" ? "green" : "amber"}>{product.status}</Badge>
                    <Badge tone="cyan">{product.pageTemplate}</Badge>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {product.game} • {product.toolStatus} • {product.website}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {product.features.map((feature) => (
                      <span key={feature} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-300">
                        {feature}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <ProductMini label="Media assets" value={String(product.mediaAssets)} />
                    <ProductMini label="Page template" value={product.pageTemplate} />
                    <ProductMini label="Integrity" value={product.integrity} />
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="text-xs text-slate-500">Next action</div>
                    <div className="mt-1 text-sm font-semibold text-white">{product.nextAction}</div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard label="Views" value={String(product.views)} />
                    <MetricCard label="Clicks" value={String(product.outboundClicks)} />
                    <MetricCard label="CTR" value={product.outboundCtr} />
                    <MetricCard label="Status" value={product.status} />
                  </div>

                  <div className="mt-5 grid gap-2">
                    <Link href="/listings/phantomx-tracker" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-semibold">
                      View public page
                    </Link>
                    <Link href="/dashboard?tab=builder" className="rounded-xl border border-purple-400/20 bg-purple-500/10 px-4 py-3 text-center text-sm font-semibold text-purple-200">
                      Edit in builder
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>


      <Card className="p-6">
        <Badge tone="purple">Featured placement</Badge>
        <h2 className="mt-4 text-2xl font-black">Boost a product to the top of a category</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Sellers can pay to appear at the top of a game category. The option is only available if no other product is currently featured in that category.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {featuredSlots.map((slot) => (
            <div key={slot.category} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-bold">{slot.category}</div>
                <Badge tone={slot.status === "Available" ? "green" : "amber"}>{slot.status}</Badge>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {slot.status === "Available"
                  ? `Slot available now • ${slot.price}`
                  : `${slot.product} is featured until ${slot.endsAt}`}
              </p>
              <button
                className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold ${
                  slot.status === "Available"
                    ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-white"
                    : "border border-white/10 bg-white/[0.04] text-slate-500"
                }`}
              >
                {slot.status === "Available" ? "Buy featured slot" : "Already taken"}
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <Badge tone="purple">Publishing rules</Badge>
        <h2 className="mt-4 text-2xl font-black">Before a product goes live</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            ["Product basics", "Name, game, category, status"],
            ["Website CTA", "Official URL or seller offer URL"],
            ["Media", "Hero, screenshots, thumbnails"],
            ["Payments", "Only verified methods are public"],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="font-bold">{title}</div>
              <div className="mt-2 text-sm text-slate-400">{text}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Builder() {
  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6">
          <Badge tone="purple">Product builder</Badge>
          <h2 className="mt-4 text-2xl font-black">Create a product announcement</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Build the full public product page: details, media, pricing, CTA, trust signals, sections, and payment verification.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <BuilderInput label="Product name" placeholder="Ex: PhantomX Tracker" />
            <BuilderInput label="Game" placeholder="Valorant, CS2, Fortnite..." />
            <BuilderInput label="Category" placeholder="Analytics / Overlay / Seller Offer" />
            <BuilderInput label="Architecture" placeholder="External / Internal / Cloud / Unknown" />
            <BuilderInput label="Product status" placeholder="Working / Updating / Pending Review" />
            <BuilderInput label="Starting price" placeholder="$49 monthly" />
          </div>
        </Card>

        <Card className="p-6">
          <Badge tone="cyan">Conversion</Badge>
          <h2 className="mt-4 text-2xl font-black">Website traffic goal</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            The seller goal is simple: use Standard to build trust, then send qualified users to your own website.
          </p>

          <div className="mt-6 grid gap-4">
            <BuilderInput label="Official website / offer URL" placeholder="https://your-site.com" />
            <BuilderInput label="Primary CTA label" placeholder="Visit official website" />
            <BuilderInput label="Discord" placeholder="discord.gg/yourserver" />
            <BuilderInput label="Telegram" placeholder="@yourchannel" />
          </div>

          <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
            <div className="font-bold text-cyan-100">CTA preview</div>
            <div className="mt-3 rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-slate-950">
              Visit official website
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-6">
          <Badge tone="green">Media upload</Badge>
          <h2 className="mt-4 text-2xl font-black">Upload product visuals</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Upload images to make the product page feel premium. This is a frontend placeholder until real storage is connected.
          </p>

          <div className="mt-6 rounded-3xl border border-dashed border-purple-400/30 bg-purple-500/10 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl">+</div>
            <h3 className="mt-4 text-lg font-bold">Drop images here</h3>
            <p className="mt-2 text-sm text-slate-400">Hero image, screenshots, thumbnails, feature visuals</p>
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
          <Badge tone="purple">Page structure</Badge>
          <h2 className="mt-4 text-2xl font-black">Choose sections</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Turn sections on or off depending on how detailed your product announcement needs to be.
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
          <h2 className="mt-4 text-2xl font-black">Pick a template</h2>
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
          <Badge tone="amber">Publishing checklist</Badge>
          <h2 className="mt-4 text-2xl font-black">Ready to publish?</h2>
          <div className="mt-5 grid gap-3">
            {[
              ["Product details", "Complete"],
              ["Hero image", "Needed"],
              ["Website CTA", "Complete"],
              ["Payment methods", "Needs verification"],
              ["Pricing", "Complete"],
              ["FAQ", "Optional"],
            ].map(([label, state]) => (
              <div key={label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <span className="text-sm">{label}</span>
                <Badge tone={state === "Complete" ? "green" : "amber"}>{state}</Badge>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold">
              Save draft
            </button>
            <button className="rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold">
              Submit for review
            </button>
          </div>
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
        Sellers can publish offers for existing products while keeping pricing, stock, delivery, and payment methods clear.
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

function BuilderInput({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-400">
        {placeholder}
      </div>
    </label>
  );
}

function ProductMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 truncate text-lg font-black">{value}</div>
    </div>
  );
}
