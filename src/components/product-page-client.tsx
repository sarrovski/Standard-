"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GameLogo } from "@/components/game-logo";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { products as demoProducts } from "@/lib/data";
import { getLocalProducts } from "@/lib/product-store";
import type { UIProductDetail, UIProductMedia } from "@/lib/adapters";
import type { PaymentMethod, PaymentProfile } from "@/lib/data";
import { NoVerifiedPayments, PaymentPill } from "@/components/payment-pill";
import { SaveProductButton } from "@/components/save-product-button";
import { TrustBox } from "@/components/trust-box";
import { ReportListingButton } from "@/components/report-listing-button";
import { recordRecentlyViewed } from "@/lib/recently-viewed";
import {
  evaluateProductRanking,
  type RankingInput,
} from "@/lib/product-ranking";
import { RankingPill, TrustSignalsList } from "@/components/product-ranking-ui";

/**
 * Best-effort beacon to the product-events API. Uses sendBeacon so the
 * request survives navigation (outbound CTA clicks), falls back to a
 * keepalive fetch when sendBeacon isn't available. Failures are swallowed
 * — tracking is never allowed to block the buyer.
 */
function trackProductEvent(
  productId: string,
  kind: "view" | "outbound_click",
): void {
  try {
    const payload = JSON.stringify({ product_id: productId, kind });
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      const blob = new Blob([payload], { type: "application/json" });
      const sent = navigator.sendBeacon("/api/product-events", blob);
      if (sent) return;
    }
    fetch("/api/product-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // ignore — beacons are best-effort
    });
  } catch {
    // ignore
  }
}

// Shape the page actually renders. UIProductDetail (Supabase-sourced) and the
// demo products (data.ts) both satisfy this. Fields the UI uses but neither
// source guarantees are made optional.
type RenderableProduct = {
  id?: string;
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
  featureGroups?: Array<{ name: string; features: string[] }>;
  pricePoints: string[];
  verifiedPayments: PaymentMethod[];
  paymentProfiles?: PaymentProfile[];
  trustSignals?: string[];
  gallery?: Array<UIProductMedia | DemoMediaItem>;
  faq?: { q: string; a: string }[];
};

type DemoMediaItem = {
  title: string;
  accent: string;
  imageUrl?: string | null;
};

type DisplayMedia = UIProductMedia & { accent?: string };

type ProductLoadState = "ok" | "not_found" | "error" | "timeout" | "demo";

type ProductPageClientProps = {
  slug: string;
  initialProduct: UIProductDetail | null;
  loadState?: ProductLoadState;
  loadMessage?: string;
  initialSaved?: boolean;
  loggedIn?: boolean;
};

function normalizeGallery(
  gallery: NonNullable<RenderableProduct["gallery"]>,
): DisplayMedia[] {
  return gallery
    .map((item, index): DisplayMedia | null => {
      if ("type" in item) return item;
      return {
        id: `demo-${index}-${item.title}`,
        type: "image",
        storagePath: null,
        publicUrl: item.imageUrl ?? null,
        imageUrl: item.imageUrl ?? null,
        thumbnailUrl: item.imageUrl ?? null,
        embedUrl: null,
        externalUrl: null,
        altText: item.title,
        title: item.title,
        sortOrder: index,
        accent: item.accent,
      };
    })
    .filter((item): item is DisplayMedia => Boolean(item));
}

export function ProductPageClient({
  slug,
  initialProduct,
  loadState = "ok",
  loadMessage,
  initialSaved = false,
  loggedIn = false,
}: ProductPageClientProps) {
  const supabaseSourced = initialProduct !== null;

  const [product, setProduct] = useState<RenderableProduct | null>(() => {
    if (initialProduct) return initialProduct;
    // Demo path: data.ts fixture.
    const demo = demoProducts.find((item) => item.slug === slug);
    return demo && demo.productStatus === "Published"
      ? (demo as unknown as RenderableProduct)
      : null;
  });
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  useEffect(() => {
    // Only fall back to the local builder products in demo mode.
    if (supabaseSourced) return;
    const local = getLocalProducts().find((item) => item.slug === slug);
    if (local && local.productStatus === "Published") {
      setProduct(local as unknown as RenderableProduct);
    }
  }, [slug, supabaseSourced]);

  useEffect(() => {
    setActiveMediaIndex(0);
  }, [product?.slug]);

  // Record the view for the localStorage-backed "Recently viewed" list on
  // the buyer dashboard. Skip until we have a product so we don't pollute
  // the list with not-found visits.
  useEffect(() => {
    if (!product) return;
    const firstMedia = product.gallery?.find(
      (item): item is UIProductMedia =>
        "type" in item && (item.imageUrl !== null || item.thumbnailUrl !== null),
    );
    const demoMedia = product.gallery?.find(
      (item): item is { title: string; accent: string; imageUrl?: string | null } =>
        !("type" in item),
    );
    const thumbnailUrl =
      firstMedia?.imageUrl ??
      firstMedia?.thumbnailUrl ??
      demoMedia?.imageUrl ??
      null;
    recordRecentlyViewed({
      slug: product.slug,
      name: product.name,
      game: product.game,
      thumbnailUrl,
    });
  }, [product]);

  // Fire a 'view' beacon once per mount per product. We only have a real
  // product_id from Supabase; demo products use slug-as-id and don't
  // correspond to a row, so we skip recording for them.
  useEffect(() => {
    if (!product || !supabaseSourced) return;
    if (!product.id) return;
    trackProductEvent(product.id, "view");
  }, [product, supabaseSourced]);

  const trackOutboundClick = () => {
    if (!supabaseSourced || !product?.id) return;
    trackProductEvent(product.id, "outbound_click");
  };

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
    } else if (loadState === "timeout") {
      title = "Product page timed out";
      body =
        "The database is slow or unreachable. Please retry in a moment.";
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
  const mediaItems = normalizeGallery(gallery);
  const activeMedia = mediaItems[activeMediaIndex] ?? mediaItems[0] ?? null;
  const faq = product.faq ?? [];
  const trustSignals = product.trustSignals ?? [];
  // Compute the ranking from the same data we render — keeps the
  // marketplace pill, dashboard pill, and this product page in sync.
  const productGallery = product.gallery ?? [];
  const validFaqCount = (product.faq ?? []).filter(
    (item) => item.q.trim() !== "" && item.a.trim() !== "",
  ).length;
  const rankingInput: RankingInput = {
    published: product.productStatus === "Published",
    sellerTag: product.sellerTag ?? "",
    verifiedPaymentCount: product.verifiedPayments?.length ?? 0,
    hasMedia: productGallery.length > 0,
    summary: product.summary ?? "",
    featureGroupCount: product.featureGroups?.length ?? 0,
    flatFeatureCount: product.features?.length ?? 0,
    faqCount: validFaqCount,
  };
  const ranking = evaluateProductRanking(rankingInput);
  const websiteUrl = product.websiteUrl ?? "";
  const websiteLabel = product.websiteLabel ?? "Visit official website";
  const discord = product.discord ?? "";
  const telegram = product.telegram ?? "";

  const featureGroupsToRender =
    product.featureGroups && product.featureGroups.length > 0
      ? product.featureGroups
      : product.features.length > 0
        ? [{ name: "Features", features: product.features }]
        : [];

  return (
    <div className="mx-auto max-w-5xl">
      {/* 1. Hero ---------------------------------------------------------- */}
      <section className="mt-6">
        <Card className="overflow-hidden border-orange-400/30">
          <div className={`bg-gradient-to-br ${product.accent} p-7 md:p-10`}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="default">
                <span className="inline-flex items-center gap-1.5">
                  <GameLogo
                    game={product.game}
                    className="h-4 min-w-4 rounded-full px-1 text-[8px] font-black text-white"
                    imageClassName="p-0.5"
                  />
                  {product.game}
                </span>
              </Badge>
              <Badge>{product.category}</Badge>
              <Badge
                tone={
                  product.sellerTag === "Provider / Developer"
                    ? "cyan"
                    : product.sellerTag === "Verified Seller"
                      ? "green"
                      : "default"
                }
              >
                {product.sellerTag}
              </Badge>
              <RankingPill result={ranking} />
            </div>

            <h1 className="mt-6 text-4xl font-black md:text-5xl">
              {product.name}
            </h1>
            {product.summary && (
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/85 md:text-lg">
                {product.summary}
              </p>
            )}

            {product.pricePoints.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {product.pricePoints.map((price) => (
                  <span
                    key={price}
                    className="rounded-full border border-white/20 bg-black/30 px-3 py-1 text-xs font-bold text-white"
                  >
                    {price}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {websiteUrl ? (
                <ButtonLink href={websiteUrl} onClick={trackOutboundClick}>
                  {websiteLabel}
                </ButtonLink>
              ) : (
                <span className="inline-flex items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-300">
                  Official website not added yet
                </span>
              )}
              {product.id ? (
                <SaveProductButton
                  productId={product.id}
                  productSlug={product.slug}
                  initialSaved={initialSaved}
                  loggedIn={loggedIn}
                />
              ) : null}
            </div>
          </div>
        </Card>
      </section>

      {/* 2. Showcase media ----------------------------------------------- */}
      <section className="mt-10">
        <MediaCarousel
          accent={product.accent}
          activeIndex={activeMediaIndex}
          activeMedia={activeMedia}
          mediaItems={mediaItems}
          onSelect={setActiveMediaIndex}
        />
      </section>

      {/* 3. Features ----------------------------------------------------- */}
      {featureGroupsToRender.length > 0 && (
        <section className="mt-10">
          <FeaturesPanel groups={featureGroupsToRender} />
        </section>
      )}

      {/* 4. Trust + seller ----------------------------------------------- */}
      <section className="mt-10">
        <Panel title="Trust &amp; seller">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-200/80">
                Seller
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold text-white">
                    {product.seller}
                  </span>
                  <Badge
                    tone={
                      product.sellerTag === "Provider / Developer"
                        ? "cyan"
                        : product.sellerTag === "Verified Seller"
                          ? "green"
                          : "default"
                    }
                  >
                    {product.sellerTag}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-400">
                  <Fact label="Official website" value={websiteUrl || "—"} />
                  <Fact label="Discord" value={discord || "—"} />
                  <Fact label="Telegram" value={telegram || "—"} />
                </div>
              </div>

              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-200/80">
                Verified payment methods
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex flex-wrap gap-2">
                  {product.verifiedPayments.length ? (
                    product.verifiedPayments.map((payment) => (
                      <PaymentPill key={payment} method={payment} />
                    ))
                  ) : (
                    <NoVerifiedPayments />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-200/80">
                Trust signals
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <RankingPill result={ranking} />
                {ranking.publicSignals.length > 0 ? (
                  <div className="mt-4">
                    <TrustSignalsList signals={ranking.publicSignals} />
                  </div>
                ) : null}
                {trustSignals.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                    {trustSignals.map((signal) => (
                      <Badge
                        key={signal}
                        tone={
                          signal.includes("Verified") ||
                          signal.includes("Provider")
                            ? "green"
                            : "default"
                        }
                      >
                        {signal}
                      </Badge>
                    ))}
                  </div>
                )}
                {ranking.publicSignals.length === 0 &&
                  trustSignals.length === 0 && (
                    <p className="mt-3 text-sm text-slate-500">
                      No trust signals yet — the seller is still completing
                      this listing.
                    </p>
                  )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <TrustBox
                  paymentProfiles={product.paymentProfiles ?? []}
                  websiteUrl={websiteUrl || undefined}
                  discord={discord || undefined}
                  telegram={telegram || undefined}
                  sellerTag={product.sellerTag}
                />
              </div>
            </div>
          </div>
        </Panel>
      </section>

      {/* 5. Reviews / reputation ----------------------------------------- */}
      <section className="mt-10">
        <ReviewsSection />
      </section>

      {/* 6. FAQ ---------------------------------------------------------- */}
      {faq.length > 0 && (
        <section className="mt-10">
          <FaqAccordion items={faq} />
        </section>
      )}

      {/* 7. Final CTA ---------------------------------------------------- */}
      <section className="mt-10">
        <FinalCta
          websiteUrl={websiteUrl || null}
          websiteLabel={websiteLabel}
          onOutboundClick={trackOutboundClick}
        />
      </section>

      {product.id && supabaseSourced && (
        <div className="mt-6 mb-2 flex justify-end">
          <ReportListingButton productId={product.id} />
        </div>
      )}
    </div>
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

function MediaCarousel({
  accent,
  activeIndex,
  activeMedia,
  mediaItems,
  onSelect,
}: {
  accent: string;
  activeIndex: number;
  activeMedia: DisplayMedia | null;
  mediaItems: DisplayMedia[];
  onSelect: (index: number) => void;
}) {
  return (
    <Panel title="Media gallery" subtitle="Seller-managed images and embedded videos.">
      {activeMedia ? (
        <div className="space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-3xl border border-white/10 bg-slate-950">
            {activeMedia.type === "youtube" && activeMedia.embedUrl ? (
              <iframe
                src={activeMedia.embedUrl}
                title={activeMedia.title ?? "Product video"}
                className="h-full w-full"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            ) : activeMedia.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeMedia.imageUrl}
                alt={activeMedia.altText ?? activeMedia.title ?? ""}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className={`flex h-full items-end bg-gradient-to-br ${activeMedia.accent ?? accent} p-6`}>
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-white/65">
                    Media block
                  </div>
                  <div className="mt-2 text-xl font-bold text-white">
                    {activeMedia.title}
                  </div>
                </div>
              </div>
            )}
            <div className="absolute left-3 top-3 rounded-full border border-white/20 bg-black/55 px-3 py-1 text-xs font-bold text-white">
              {activeMedia.type === "youtube" ? "YouTube" : "Image"}
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1">
            {mediaItems.map((item, index) => {
              const thumb = item.type === "youtube"
                ? item.thumbnailUrl
                : item.thumbnailUrl ?? item.imageUrl;
              const active = index === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(index)}
                  className={`relative h-20 w-28 flex-none overflow-hidden rounded-2xl border text-left transition ${
                    active ? "border-orange-300" : "border-white/10 hover:border-white/30"
                  }`}
                  aria-pressed={active}
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={item.altText ?? item.title ?? ""}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className={`h-full w-full bg-gradient-to-br ${item.accent ?? accent}`} />
                  )}
                  {item.type === "youtube" ? (
                    <span className="absolute bottom-1 left-1 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
                      Video
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={`rounded-3xl border border-dashed border-white/15 bg-gradient-to-br ${accent} p-8`}>
          <div className="text-xs uppercase tracking-[0.22em] text-white/65">Media</div>
          <p className="mt-16 max-w-md text-lg font-bold text-white">
            This seller has not added product images or videos yet.
          </p>
        </div>
      )}
    </Panel>
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

function FeaturesPanel({
  groups,
}: {
  groups: Array<{ name: string; features: string[] }>;
}) {
  if (groups.length === 0) return null;
  // Compact + organised: groups laid out 2-up on md+, features rendered
  // as small chips inside each group so even long lists stay scannable.
  return (
    <Panel title="Features">
      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        {groups.map((group, groupIndex) => (
          <div key={`${group.name}-${groupIndex}`}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-200/80">
              {group.name || "Features"}
            </div>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {group.features.length === 0 ? (
                <li className="text-xs text-slate-500">No items yet.</li>
              ) : (
                group.features.map((feature, featureIndex) => (
                  <li
                    key={`${feature}-${featureIndex}`}
                    className="rounded-lg border border-white/10 bg-slate-950/40 px-2.5 py-1 text-xs text-slate-200"
                  >
                    {feature}
                  </li>
                ))
              )}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/**
 * Reviews / reputation section. Reviews aren't modelled in Supabase yet
 * (no public.reviews table — see the post-PR notes). Until then this
 * surface is honest about its state instead of inventing fake content.
 *
 * Future shape (sketch for when the table lands):
 *   type Review = {
 *     id: string;
 *     productId: string;
 *     reviewerDisplayName: string | null;
 *     rating: 1 | 2 | 3 | 4 | 5;
 *     body: string;
 *     createdAt: string;
 *   };
 * The component already accepts an optional `reviews` array so wiring
 * the real data later is a one-line prop change in the parent.
 */
function ReviewsSection({
  reviews,
}: {
  reviews?: ReadonlyArray<{
    id: string;
    reviewerDisplayName: string | null;
    rating: number;
    body: string;
    createdAt: string;
  }>;
}) {
  return (
    <Panel title="Reviews">
      {reviews && reviews.length > 0 ? (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white">
                  {review.reviewerDisplayName ?? "Buyer"}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="mt-1 text-xs font-semibold text-orange-200/80">
                {review.rating} / 5
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {review.body}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-5 text-sm text-slate-400">
          Verified buyer reviews are coming soon. Once buyers can leave
          reviews on Standard, they&apos;ll appear here.
        </div>
      )}
    </Panel>
  );
}

/**
 * Native-details accordion for FAQ. Keyboard-accessible, no JS hydration
 * required — also schema.org/FAQPage-friendly because each Q/A is its
 * own structured node.
 */
function FaqAccordion({
  items,
}: {
  items: ReadonlyArray<{ q: string; a: string }>;
}) {
  return (
    <Panel title="FAQ">
      <div className="space-y-2">
        {items.map((item, index) => (
          <details
            key={`${item.q}-${index}`}
            className="group rounded-2xl border border-white/10 bg-slate-950/40 p-4 transition open:border-orange-400/30 open:bg-orange-500/[0.04]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-white">
              <span>{item.q}</span>
              <span
                aria-hidden="true"
                className="text-orange-300 transition group-open:rotate-180"
              >
                ▾
              </span>
            </summary>
            <p className="mt-3 text-sm leading-6 text-slate-300">{item.a}</p>
          </details>
        ))}
      </div>
    </Panel>
  );
}

function FinalCta({
  websiteUrl,
  websiteLabel,
  onOutboundClick,
}: {
  websiteUrl: string | null;
  websiteLabel: string;
  onOutboundClick: () => void;
}) {
  return (
    <Card className="border-orange-400/30 bg-gradient-to-br from-orange-500/15 via-slate-950 to-slate-950 p-8 text-center">
      <h2 className="text-2xl font-black tracking-tight md:text-3xl">
        Ready to continue?
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-300">
        Standard helps you compare trust signals before you leave for the
        seller&apos;s official site. When you&apos;re ready, the seller
        handles checkout, delivery, and support on their own site.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {websiteUrl ? (
          <a
            href={websiteUrl}
            onClick={onOutboundClick}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-400"
          >
            {websiteLabel}
          </a>
        ) : (
          <span className="inline-flex items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-300">
            Official website not added yet
          </span>
        )}
      </div>
    </Card>
  );
}
