"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Card, MiniStat, Tabs } from "@/components/ui";
import {
  analytics,
  builderSections,
  featuredSlots as defaultSlots,
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
import { addLocalProduct, addPaymentRequest, getFeaturedSlots, getLocalProducts, saveFeaturedSlots, slugify } from "@/lib/local-store";
import type { LocalFeaturedSlot, LocalPaymentRequest, LocalProduct } from "@/lib/local-types";
import type { PaymentMethod } from "@/lib/data";
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

export function DashboardClient({ initialTab = "products" }: { initialTab?: string }) {
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    const url = new URL(window.location.href);
    const current = url.searchParams.get("tab") || "products";
    setTab(current);
  }, []);

  return (
    <>
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
    </>
  );
}

function Products() {
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [slots, setSlots] = useState<LocalFeaturedSlot[]>([]);

  useEffect(() => {
    setProducts(getLocalProducts());
    setSlots(getFeaturedSlots());
  }, []);

  const displayProducts = useMemo(() => {
    const localCards = products.map((product) => ({
      name: product.name,
      status: product.listingStatus,
      toolStatus: "Draft / local MVP",
      game: product.game,
      features: product.features,
      views: product.activity.views,
      outboundClicks: 0,
      outboundCtr: "0%",
      integrity: String(product.integrity ?? "Pending"),
      pageTemplate: "Hero Spotlight",
      mediaAssets: product.gallery.length,
      website: product.websiteUrl.replace("https://", ""),
      nextAction: "Submit for review and verify payment methods",
      slug: product.slug,
    }));
    return [...localCards, ...sellerProducts.map((item) => ({ ...item, slug: "phantomx-tracker" }))];
  }, [products]);

  const reserveSlot = (slot: LocalFeaturedSlot) => {
    const firstProduct = products[0];
    if (!firstProduct) {
      alert("Create a product first before reserving a featured slot.");
      return;
    }

    if (slot.status !== "Available") return;

    const updated = slots.map((item) =>
      item.category === slot.category
        ? {
            ...item,
            status: "Occupied" as const,
            product: firstProduct.name,
            productSlug: firstProduct.slug,
            seller: firstProduct.seller,
            startsAt: new Date().toISOString().slice(0, 10),
            endsAt: "2026-06-01",
          }
        : item,
    );
    saveFeaturedSlots(updated);
    setSlots(updated);
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <MiniStat label="Produits en ligne" value={String(displayProducts.length)} detail="local + demo" />
        <MiniStat label="Views produits" value="35.2K" detail="+16.4%" />
        <MiniStat label="Outbound clicks" value="1.7K" detail="website traffic" />
        <MiniStat label="Avg outbound CTR" value="4.93%" detail="+0.8 pts" />
      </section>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Produits / annonces en ligne</h2>
            <p className="mt-1 text-sm text-slate-400">
              Products created in the builder now appear here and in the marketplace.
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
          {displayProducts.map((product) => (
            <div key={product.name + product.website} className="p-5">
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
                    <Link href={`/listings/${product.slug}`} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-semibold">
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
          Only one product can be featured per category. If available, your newest created product can reserve the slot.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {slots.map((slot) => (
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
                onClick={() => reserveSlot(slot)}
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
    </div>
  );
}

function Builder() {
  const [form, setForm] = useState({
    name: "My New Product",
    game: "Valorant",
    category: "Analytics / Overlay",
    architecture: "External",
    price: "$49 monthly",
    websiteUrl: "https://example.com",
    cta: "Visit official website",
    discord: "discord.gg/example",
    telegram: "@example",
    summary: "A polished product announcement built with Standard.",
    features: "Fast setup, Clean dashboard, Payment clarity",
  });

  const [createdSlug, setCreatedSlug] = useState("");

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const createProduct = () => {
    const slug = slugify(form.name || "new-product");
    const product: LocalProduct = {
      slug,
      name: form.name,
      seller: "Local Seller",
      sellerTag: "Seller",
      game: form.game,
      category: form.category,
      architecture: form.architecture,
      listingStatus: "Pending Review",
      integrity: null,
      confidence: "Pending",
      verifiedPayments: [],
      paymentProfiles: [],
      features: form.features.split(",").map((item) => item.trim()).filter(Boolean),
      pricePoints: [form.price],
      delivery: "Pending verification",
      refundPolicy: "Pending verification",
      accent: "from-violet-500/70 to-cyan-400/40",
      summary: form.summary,
      websiteUrl: form.websiteUrl,
      websiteLabel: form.cta,
      discord: form.discord,
      telegram: form.telegram,
      trustSignals: ["Seller-submitted listing"],
      gallery: [
        { title: "Hero image placeholder", accent: "from-violet-500/60 to-fuchsia-500/40" },
        { title: "Product screenshot placeholder", accent: "from-slate-700 to-cyan-500/30" },
      ],
      benefits: ["Created in the Standard builder", "Ready for media and payment verification"],
      faq: [{ q: "What happens next?", a: "Submit the product for review, verify payment methods, then drive traffic to your website." }],
      activity: { vouches: 0, views: 0, replies: 0, lastSeen: "Just created" },
    };

    addLocalProduct(product);
    setCreatedSlug(slug);
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6">
          <Badge tone="purple">Product builder</Badge>
          <h2 className="mt-4 text-2xl font-black">Create a product announcement</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            This builder now creates a real local product that appears in your dashboard and marketplace.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <BuilderInput label="Product name" value={form.name} onChange={(value) => update("name", value)} />
            <BuilderInput label="Game" value={form.game} onChange={(value) => update("game", value)} />
            <BuilderInput label="Category" value={form.category} onChange={(value) => update("category", value)} />
            <BuilderInput label="Architecture" value={form.architecture} onChange={(value) => update("architecture", value)} />
            <BuilderInput label="Starting price" value={form.price} onChange={(value) => update("price", value)} />
            <BuilderInput label="Features, comma-separated" value={form.features} onChange={(value) => update("features", value)} />
          </div>
        </Card>

        <Card className="p-6">
          <Badge tone="cyan">Conversion</Badge>
          <h2 className="mt-4 text-2xl font-black">Website traffic goal</h2>
          <div className="mt-6 grid gap-4">
            <BuilderInput label="Official website / offer URL" value={form.websiteUrl} onChange={(value) => update("websiteUrl", value)} />
            <BuilderInput label="Primary CTA label" value={form.cta} onChange={(value) => update("cta", value)} />
            <BuilderInput label="Discord" value={form.discord} onChange={(value) => update("discord", value)} />
            <BuilderInput label="Telegram" value={form.telegram} onChange={(value) => update("telegram", value)} />
          </div>
        </Card>
      </section>

      <Card className="p-6">
        <Badge tone="green">Media upload</Badge>
        <h2 className="mt-4 text-2xl font-black">Upload product visuals</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Uploads are represented as placeholders in this MVP. Real storage comes next.
        </p>

        <div className="mt-6 rounded-3xl border border-dashed border-purple-400/30 bg-purple-500/10 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl">+</div>
          <h3 className="mt-4 text-lg font-bold">Drop images here</h3>
          <p className="mt-2 text-sm text-slate-400">Hero image, screenshots, thumbnails, feature visuals</p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
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
          <Badge tone="amber">Publishing</Badge>
          <h2 className="mt-4 text-2xl font-black">Save product</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            After saving, the product appears in Produits and Marketplace. Then you can verify payments or reserve featured slots.
          </p>
          <button
            onClick={createProduct}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold"
          >
            Save product locally
          </button>
          {createdSlug && (
            <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              Product created. <Link href={`/listings/${createdSlug}`} className="font-bold underline">Open product page</Link>
            </div>
          )}
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
  const [requests, setRequests] = useState<LocalPaymentRequest[]>([]);
  const [method, setMethod] = useState<PaymentMethod>("Card");
  const [productSlug, setProductSlug] = useState("");
  const [processor, setProcessor] = useState("Stripe");
  const [checkoutUrl, setCheckoutUrl] = useState("https://example.com/checkout");
  const [refundPolicy, setRefundPolicy] = useState("https://example.com/refunds");
  const [proofNote, setProofNote] = useState("Payment method visible at checkout.");
  const [products, setProducts] = useState<LocalProduct[]>([]);

  useEffect(() => {
    setProducts(getLocalProducts());
    setRequests(JSON.parse(localStorage.getItem("standard.paymentRequests") || "[]"));
  }, []);

  const submit = () => {
    const product = products.find((item) => item.slug === productSlug) || products[0];
    if (!product) {
      alert("Create a product first.");
      return;
    }

    const request: LocalPaymentRequest = {
      id: crypto.randomUUID(),
      seller: product.seller,
      productSlug: product.slug,
      productName: product.name,
      method,
      processor,
      checkoutUrl,
      refundPolicy,
      proofNote,
      status: "Pending verification",
      risk: method === "Gift Cards" || method === "PayPal F&F" ? "High" : method === "Crypto" ? "Medium" : "Low",
      createdAt: new Date().toISOString(),
    };

    addPaymentRequest(request);
    setRequests([request, ...requests]);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <Badge tone="cyan">Payment verification</Badge>
        <h2 className="mt-4 text-2xl font-black">Prove the payment methods you accept</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Payment methods stay private or under review until admin approves them.
        </p>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6">
          <h2 className="text-2xl font-black">Add payment method</h2>
          <div className="mt-5 grid gap-4">
            <label className="block rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <span className="text-xs text-slate-500">Product</span>
              <select value={productSlug} onChange={(event) => setProductSlug(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
                <option value="">Latest product</option>
                {products.map((product) => <option key={product.slug} value={product.slug}>{product.name}</option>)}
              </select>
            </label>
            <label className="block rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <span className="text-xs text-slate-500">Payment method</span>
              <select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
                {paymentMethods.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <BuilderInput label="Processor / account label" value={processor} onChange={setProcessor} />
            <BuilderInput label="Checkout URL" value={checkoutUrl} onChange={setCheckoutUrl} />
            <BuilderInput label="Refund policy" value={refundPolicy} onChange={setRefundPolicy} />
            <BuilderInput label="Proof note" value={proofNote} onChange={setProofNote} />
          </div>
          <button onClick={submit} className="mt-6 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold">
            Submit payment verification
          </button>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-black">Your payment status</h2>
          <div className="mt-5 space-y-3">
            {[...requests, ...paymentVerificationQueue].map((item) => (
              <div key={(item as any).id || item.seller + ("listing" in item ? item.listing : item.productName) + item.method} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <PaymentPill method={item.method} />
                  <PaymentStatusPill status={item.status} />
                </div>
                <div className="mt-3 text-sm font-semibold">{"productName" in item ? item.productName : item.listing}</div>
                <div className="mt-1 text-xs text-slate-500">{"submittedProof" in item ? item.submittedProof : item.proofNote}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>
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

function BuilderInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none" />
    </label>
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
