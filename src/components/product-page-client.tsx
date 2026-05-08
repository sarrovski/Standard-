"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { products as demoProducts } from "@/lib/data";
import { getLocalProducts } from "@/lib/product-store";
import type { UIProductDetail } from "@/lib/adapters";
import type { PaymentMethod, PaymentProfile } from "@/lib/data";
import { NoVerifiedPayments, PaymentPill, PaymentStatusPill } from "@/components/payment-pill";

// Shape the page actually renders. UIProductDetail (Supabase-sourced) and the
// demo products (data.ts) both satisfy this. Fields the UI uses but neither
// source guarantees are made optional.
type RenderableProduct = {
  slug: string;
  name: string;
  seller: string;
  sellerTag: string;
  game: string;
  category: string;
  architecture: string;
  productStatus: string;
  summary: string;
  accent: string;
  websiteUrl?: string;
  websiteLabel?: string;
  discord?: string;
  telegram?: string;
  features: string[];
  pricePoints: string[];
  verifiedPayments: PaymentMethod[];
  paymentProfiles: PaymentProfile[];
  trustSignals?: string[];
  gallery?: { title: string; accent: string; imageUrl?: string | null }[];
  faq?: { q: string; a: string }[];
};

type ProductLoadState = "ok" | "not_found" | "error" | "demo";

type ProductPageClientProps = {
  slug: string;
  initialProduct: UIProductDetail | null;
  loadState?: ProductLoadState;
  loadMessage?: string;
};

export function ProductPageClient({
  slug,
  initialProduct,
  loadState = "ok",
  loadMessage,
}: ProductPageClientProps) {
  const supabaseSourced = initialProduct !== null;

  const [product, setProduct] = useState<RenderableProduct | null>(() => {
    if (initialProduct) return initialProduct;
    // Demo path: data.ts fixture.
    const demo = demoProducts.find((item) => item.slug === slug);
    return demo ? (demo as unknown as RenderableProduct) : null;
  });

  useEffect(() => {
    // Only fall back to the local builder products in demo mode.
    if (supabaseSourced) return;
    const local = getLocalProducts().find((item) => item.slug === slug);
    if (local) setProduct(local as unknown as RenderableProduct);
  }, [slug, supabaseSourced]);

  if (!product) {
    // Tailor the empty state to what actually happened. Previously this
    // always said "not available in the demo fallback", which was misleading
    // when a real Supabase product simply wasn't found or the query errored.
    let title = "Product not found";
    let body = "We couldn't find a product with that slug.";
    if (loadState === "error") {
      title = "Could not load this product";
      body = loadMessage
        ? `Supabase error: ${loadMessage}`
        : "An unexpected database error occurred.";
    } else if (loadState === "not_found") {
      title = "Product not found";
      body = `No published product matches "${slug}".`;
    } else if (loadState === "demo") {
      title = "Product not found";
      body = "This product is not available in the demo fallback yet.";
    }
    return (
      <Card className="mt-6 p-8">
        <h1 className="text-3xl font-black">{title}</h1>
        <p className="mt-3 text-slate-400">{body}</p>
        <Link href="/marketplace" className="mt-6 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950">
          Back to marketplace
        </Link>
      </Card>
    );
  }

  const gallery = product.gallery ?? [];
  const faq = product.faq ?? [];
  const trustSignals = product.trustSignals ?? [];
  const websiteUrl = product.websiteUrl ?? "";
  const websiteLabel = product.websiteLabel ?? "Visit official website";
  const discord = product.discord ?? "";
  const telegram = product.telegram ?? "";

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
              {websiteUrl ? <ButtonLink href={websiteUrl}>{websiteLabel}</ButtonLink> : null}
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
            <Fact label="Official website" value={websiteUrl || "—"} />
            <Fact label="Discord" value={discord || "—"} />
            <Fact label="Telegram" value={telegram || "—"} />
          </div>
          {websiteUrl ? (
            <a href={websiteUrl} className="mt-6 inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white">
              Go to official website
            </a>
          ) : null}
        </Card>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {gallery.length > 0 && (
            <Panel title="Media gallery" subtitle="Seller-managed visuals from the product builder.">
              <div className="grid gap-4 md:grid-cols-2">
                {gallery.map((item) => (
                  <div
                    key={item.title}
                    className={`relative h-44 overflow-hidden rounded-3xl border border-white/10 ${
                      item.imageUrl ? "bg-slate-950" : `bg-gradient-to-br ${item.accent}`
                    }`}
                  >
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="p-5">
                        <div className="text-xs uppercase tracking-[0.22em] text-white/65">
                          Media block
                        </div>
                        <div className="mt-20 text-lg font-bold text-white">{item.title}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel title="Features">
            <div className="grid gap-3 md:grid-cols-2">
              {product.features.map((feature) => (
                <div key={feature} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm">
                  {feature}
                </div>
              ))}
            </div>
          </Panel>

          {faq.length > 0 && (
            <Panel title="FAQ">
              <div className="space-y-3">
                {faq.map((item) => (
                  <div key={item.q} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="font-semibold">{item.q}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-400">{item.a}</div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>

        <aside className="space-y-6">
          <Panel title="Trust signals">
            <div className="flex flex-wrap gap-2">
              {trustSignals.length > 0 ? (
                trustSignals.map((signal) => (
                  <Badge key={signal} tone={signal.includes("Verified") || signal.includes("Provider") ? "green" : "default"}>
                    {signal}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-slate-500">No trust signals yet.</p>
              )}
            </div>
          </Panel>

          <Panel title="Verified payment methods">
            <div className="flex flex-wrap gap-2">
              {product.verifiedPayments.length ? (
                product.verifiedPayments.map((payment) => <PaymentPill key={payment} method={payment} />)
              ) : (
                <NoVerifiedPayments />
              )}
            </div>
          </Panel>

          <Panel title="Payment methods under review">
            <div className="space-y-3">
              {product.paymentProfiles
                .filter((payment) => payment.status === "Pending verification" || payment.status === "Needs re-check")
                .map((payment) => (
                  <div key={payment.method} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <PaymentPill method={payment.method} />
                      <PaymentStatusPill status={payment.status} />
                    </div>
                  </div>
                ))}
              {product.paymentProfiles.filter((payment) => payment.status === "Pending verification" || payment.status === "Needs re-check").length === 0 && (
                <p className="text-sm text-slate-500">No payment methods under review.</p>
              )}
            </div>
          </Panel>

          <Panel title="Price points">
            <div className="space-y-2">
              {product.pricePoints.map((price) => (
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
