"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { products } from "@/lib/data";
import { getLocalProducts } from "@/lib/product-store";
import type { LocalProduct } from "@/lib/product-types";
import { NoVerifiedPayments, PaymentPill, PaymentStatusPill } from "@/components/payment-pill";

export function ProductPageClient({ slug }: { slug: string }) {
  const [product, setProduct] = useState<any | null>(products.find((item) => item.slug === slug) || null);

  useEffect(() => {
    const local = getLocalProducts().find((item) => item.slug === slug);
    if (local) setProduct(local);
  }, [slug]);

  if (!product) {
    return (
      <Card className="mt-6 p-8">
        <h1 className="text-3xl font-black">Product not found</h1>
        <p className="mt-3 text-slate-400">This product is not available in the demo fallback yet.</p>
        <Link href="/marketplace" className="mt-6 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950">
          Back to marketplace
        </Link>
      </Card>
    );
  }

  return (
    <>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="overflow-hidden border-purple-400/30">
          <div className={`bg-gradient-to-br ${product.accent} p-8`}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={product.productStatus === "Verified" ? "green" : "amber"}>{product.productStatus}</Badge>
              <Badge tone={product.sellerTag === "Provider / Developer" ? "cyan" : product.sellerTag === "Verified Seller" ? "green" : "default"}>{product.sellerTag}</Badge>
              <Badge>{product.game}</Badge>
              <Badge>{product.architecture}</Badge>
            </div>
            <h1 className="mt-6 text-4xl font-black md:text-5xl">{product.name}</h1>
            <p className="mt-4 max-w-3xl text-white/85">{product.summary}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href={product.websiteUrl}>{product.websiteLabel}</ButtonLink>
              <ButtonLink href="/login" variant="secondary">Follow seller</ButtonLink>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <Badge tone="purple">Seller conversion panel</Badge>
          <h2 className="mt-4 text-2xl font-black">Continue to seller website</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Standard gives the buyer context. The next step is to continue on the seller’s official website.
          </p>
          <div className="mt-5 grid gap-3">
            <Fact label="Seller" value={product.seller} />
            <Fact label="Official website" value={product.websiteUrl} />
            <Fact label="Discord" value={product.discord} />
            <Fact label="Telegram" value={product.telegram} />
          </div>
          <a href={product.websiteUrl} className="mt-6 inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white">
            Go to official website
          </a>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Panel title="Media gallery" subtitle="Seller-managed visuals from the product builder.">
            <div className="grid gap-4 md:grid-cols-2">
              {product.gallery.map((item: any) => (
                <div key={item.title} className={`h-44 rounded-3xl border border-white/10 bg-gradient-to-br ${item.accent} p-5`}>
                  <div className="text-xs uppercase tracking-[0.22em] text-white/65">Media block</div>
                  <div className="mt-20 text-lg font-bold text-white">{item.title}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Features">
            <div className="grid gap-3 md:grid-cols-2">
              {product.features.map((feature: string) => (
                <div key={feature} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm">
                  {feature}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="FAQ">
            <div className="space-y-3">
              {product.faq.map((item: any) => (
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
              {product.trustSignals.map((signal: string) => (
                <Badge key={signal} tone={signal.includes("Verified") || signal.includes("Provider") ? "green" : "default"}>
                  {signal}
                </Badge>
              ))}
            </div>
          </Panel>

          <Panel title="Verified payment methods">
            <div className="flex flex-wrap gap-2">
              {product.verifiedPayments.length ? (
                product.verifiedPayments.map((payment: any) => <PaymentPill key={payment} method={payment} />)
              ) : (
                <NoVerifiedPayments />
              )}
            </div>
          </Panel>

          <Panel title="Payment methods under review">
            <div className="space-y-3">
              {product.paymentProfiles
                .filter((payment: any) => payment.status === "Pending verification" || payment.status === "Needs re-check")
                .map((payment: any) => (
                  <div key={payment.method} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <PaymentPill method={payment.method} />
                      <PaymentStatusPill status={payment.status} />
                    </div>
                  </div>
                ))}
              {product.paymentProfiles.filter((payment: any) => payment.status === "Pending verification" || payment.status === "Needs re-check").length === 0 && (
                <p className="text-sm text-slate-500">No payment methods under review.</p>
              )}
            </div>
          </Panel>

          <Panel title="Price points">
            <div className="space-y-2">
              {product.pricePoints.map((price: string) => (
                <div key={price} className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm font-medium">
                  {price}
                </div>
              ))}
            </div>
          </Panel>
        </aside>
      </section>
    </>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
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
