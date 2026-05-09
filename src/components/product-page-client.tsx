"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { products as demoProducts } from "@/lib/data";
import { getLocalProducts } from "@/lib/product-store";
import type { UIProductDetail } from "@/lib/adapters";
import type { PaymentMethod, PaymentProfile } from "@/lib/data";
import { NoVerifiedPayments, PaymentPill } from "@/components/payment-pill";

/**
 * Public product detail page. Storefront-style layout:
 *   - Top: title + seller meta + badges
 *   - Two-column: media gallery (left) + sticky purchase card (right)
 *   - Below: features / trust signals / FAQ in tabs
 *
 * Public surface rules (Batch 15B):
 *   - Only verified payment methods are rendered.
 *   - The "Payment methods under review" panel is gone — pending state is
 *     a seller/admin workflow detail, not a public storefront signal.
 *   - The CTA wording makes it clear that purchase happens on the seller's
 *     external site; Standard does not process the transaction.
 */

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
  coverImageUrl?: string | null;
};

type ProductLoadState = "ok" | "not_found" | "error" | "timeout" | "demo";

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
    const demo = demoProducts.find((item) => item.slug === slug);
    return demo ? (demo as unknown as RenderableProduct) : null;
  });

  useEffect(() => {
    if (supabaseSourced) return;
    const local = getLocalProducts().find((item) => item.slug === slug);
    if (local) setProduct(local as unknown as RenderableProduct);
  }, [slug, supabaseSourced]);

  // Final defensive filter: even if upstream forgets to scrub, only verified
  // payment profiles are renderable here. Pending/rejected/needs_recheck are
  // never public.
  const verifiedProfiles = useMemo<PaymentProfile[]>(() => {
    if (!product) return [];
    return product.paymentProfiles.filter((p) => p.status === "Verified");
  }, [product]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const fromGallery = (product.gallery ?? [])
      .map((item) => ({
        title: item.title,
        accent: item.accent,
        imageUrl: item.imageUrl ?? null,
      }))
      .filter((item) => Boolean(item.imageUrl));
    if (fromGallery.length > 0) return fromGallery;
    if (product.coverImageUrl) {
      return [
        {
          title: product.name,
          accent: product.accent,
          imageUrl: product.coverImageUrl,
        },
      ];
    }
    // No images at all: render one accent placeholder so the gallery slot
    // doesn't collapse.
    return [
      {
        title: product.name,
        accent: product.accent,
        imageUrl: null,
      },
    ];
  }, [product]);

  const [activeImageIdx, setActiveImageIdx] = useState(0);

  if (!product) {
    let title = "Product not found";
    let body = "We couldn't find a product with that slug.";
    if (loadState === "error") {
      title = "Could not load this product";
      body = loadMessage
        ? `Supabase error: ${loadMessage}`
        : "An unexpected database error occurred.";
    } else if (loadState === "timeout") {
      title = "Product page timed out";
      body = "The database is slow or unreachable. Please retry in a moment.";
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
        <Link
          href="/marketplace"
          className="mt-6 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950"
        >
          Back to marketplace
        </Link>
      </Card>
    );
  }

  const trustSignals = product.trustSignals ?? [];
  const faq = product.faq ?? [];
  const websiteUrl = product.websiteUrl ?? "";
  const hasWebsite = Boolean(websiteUrl);
  const isProvider = product.sellerTag === "Provider / Developer";
  const activeImage = galleryImages[activeImageIdx] ?? galleryImages[0]!;

  return (
    <div className="mt-4">
      {/* ── Header strip ── */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link href="/marketplace" className="hover:text-white">
          Marketplace
        </Link>
        <span>/</span>
        <span>{product.game}</span>
        <span>/</span>
        <span>{product.category}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black md:text-4xl">{product.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <span>by</span>
            <span className="font-semibold text-white">{product.seller}</span>
            {isProvider && <Badge tone="cyan">Provider / Developer</Badge>}
            <Badge tone={product.productStatus === "Published" ? "green" : "amber"}>
              {product.productStatus}
            </Badge>
          </div>
        </div>
      </div>

      {/* ── Two columns ── */}
      <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_400px]">
        {/* Gallery */}
        <div>
          <Card className="overflow-hidden p-0">
            <div
              className={`relative aspect-[16/10] w-full ${
                activeImage.imageUrl
                  ? "bg-slate-950"
                  : `bg-gradient-to-br ${activeImage.accent}`
              }`}
            >
              {activeImage.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeImage.imageUrl}
                  alt={activeImage.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-8">
                  <div className="text-center">
                    <div className="text-xs uppercase tracking-[0.22em] text-white/65">
                      {product.game}
                    </div>
                    <div className="mt-3 text-2xl font-black text-white">
                      {product.name}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {galleryImages.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {galleryImages.map((img, idx) => (
                <button
                  key={`${img.title}-${idx}`}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`relative aspect-square overflow-hidden rounded-xl border transition ${
                    idx === activeImageIdx
                      ? "border-purple-400/60"
                      : "border-white/10 hover:border-white/30"
                  } ${img.imageUrl ? "bg-slate-950" : `bg-gradient-to-br ${img.accent}`}`}
                  aria-label={`View image ${idx + 1}`}
                >
                  {img.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.imageUrl}
                      alt={img.title}
                      className="h-full w-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Summary directly under gallery */}
          <Card className="mt-6 p-6">
            <h2 className="text-lg font-bold">About this product</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {product.summary || "No description provided yet."}
            </p>
          </Card>

          {product.features.length > 0 && (
            <Card className="mt-4 p-6">
              <h2 className="text-lg font-bold">Features</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {product.features.map((feature) => (
                  <div
                    key={feature}
                    className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm"
                  >
                    {feature}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {trustSignals.length > 0 && (
            <Card className="mt-4 p-6">
              <h2 className="text-lg font-bold">Trust signals</h2>
              <p className="mt-1 text-xs text-slate-500">
                Reviewed independently by Standard. Trust signals are not a
                guarantee of safety.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {trustSignals.map((signal) => (
                  <Badge
                    key={signal}
                    tone={
                      signal.includes("Verified") || signal.includes("Provider")
                        ? "green"
                        : "default"
                    }
                  >
                    {signal}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {faq.length > 0 && (
            <Card className="mt-4 p-6">
              <h2 className="text-lg font-bold">FAQ</h2>
              <div className="mt-4 space-y-3">
                {faq.map((item) => (
                  <div
                    key={item.q}
                    className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                  >
                    <div className="font-semibold">{item.q}</div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{item.a}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ── Right: sticky purchase card ── */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="border-purple-400/30 bg-gradient-to-br from-slate-950 to-slate-900 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="purple">{product.category}</Badge>
              {isProvider && <Badge tone="cyan">Provider</Badge>}
            </div>

            {product.pricePoints.length > 0 && (
              <div className="mt-5">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Price points
                </div>
                <div className="mt-2 space-y-2">
                  {product.pricePoints.map((price) => (
                    <div
                      key={price}
                      className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-semibold"
                    >
                      {price}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5">
              {hasWebsite ? (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-3 text-center text-sm font-bold text-white"
                >
                  Visit seller site →
                </a>
              ) : (
                <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  Seller has not provided an external website yet.
                </div>
              )}
              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                Purchase happens on the seller&apos;s external site. Standard
                does not process this transaction.
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Verified payment methods</div>
              {verifiedProfiles.length > 0 && <Badge tone="green">Reviewed</Badge>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {verifiedProfiles.length > 0 ? (
                verifiedProfiles.map((p) => (
                  <PaymentPill key={p.method} method={p.method} />
                ))
              ) : (
                <NoVerifiedPayments />
              )}
            </div>
            {verifiedProfiles.length > 0 && (
              <p className="mt-3 text-[11px] leading-5 text-slate-500">
                Payment methods shown here were submitted by the seller and
                reviewed by Standard.
              </p>
            )}
          </Card>

          <Card className="p-5">
            <div className="text-sm font-semibold">Seller</div>
            <div className="mt-3 space-y-2 text-xs text-slate-400">
              <Field label="Name" value={product.seller} />
              <Field label="Tag" value={product.sellerTag} />
              {product.discord && <Field label="Discord" value={product.discord} />}
              {product.telegram && <Field label="Telegram" value={product.telegram} />}
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-sm font-semibold">A note on safety</div>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              Standard reviews payment methods and provider status. We do not
              guarantee transactions or escrow funds. Always read refund policies
              before purchasing.
            </p>
          </Card>
        </aside>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <div className="text-slate-500">{label}</div>
      <div className="font-medium text-slate-200">{value}</div>
    </div>
  );
}
