"use client";

import Link from "next/link";
import { Badge, Card, MiniStat } from "@/components/ui";
import { ListingStrengthBadge } from "@/components/listing-strength";
import { evaluateListingStrength } from "@/lib/listing-strength";
import type { UISellerProductCard } from "@/lib/adapters";

const SUMMARY_MIN_CHARS = 120;
const TOP_PRODUCTS_LIMIT = 5;
const LOW_PRODUCTS_LIMIT = 5;
const RECOMMENDATIONS_LIMIT = 6;

type ProductRecommendation = { key: string; action: string };

function recommendationsForProduct(p: UISellerProductCard): ProductRecommendation[] {
  const recs: ProductRecommendation[] = [];
  const imageCount = p.media.filter((m) => m.type === "image").length;
  const videoCount = p.media.filter((m) => m.type === "youtube").length;
  if (imageCount + videoCount === 0) {
    recs.push({ key: "media", action: "Upload at least one image or video" });
  }
  if (p.summary.trim().length < SUMMARY_MIN_CHARS) {
    recs.push({
      key: "summary",
      action: `Add a stronger summary (${SUMMARY_MIN_CHARS}+ characters)`,
    });
  }
  const validFaq = p.faq.filter(
    (item) => item.q.trim() !== "" && item.a.trim() !== "",
  ).length;
  if (validFaq === 0) {
    recs.push({ key: "faq", action: "Add at least one FAQ answer" });
  }
  if (p.rawStatus !== "published") {
    recs.push({
      key: "status",
      action:
        p.rawStatus === "draft"
          ? "Publish when ready"
          : "Restore from archived to make this visible",
    });
  }
  return recs;
}

function parseCtr(ctr: string): number | null {
  const match = ctr.match(/^(-?\d+(?:\.\d+)?)\s*%$/);
  if (!match || !match[1]) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

export function SellerAnalytics({
  supabaseSourced,
  products,
  verifiedPaymentMethodCount,
}: {
  supabaseSourced: boolean;
  products: UISellerProductCard[];
  /** Seller-level. undefined in demo mode (no real account); a number in Supabase mode. */
  verifiedPaymentMethodCount: number | undefined;
}) {
  const totalViews = products.reduce((sum, p) => sum + p.views, 0);
  const totalClicks = products.reduce((sum, p) => sum + p.outboundClicks, 0);
  const overallCtr =
    totalViews > 0 ? `${((totalClicks / totalViews) * 100).toFixed(2)}%` : "—";
  const trackingActive = totalViews > 0 || totalClicks > 0;

  const byViews = [...products].sort((a, b) => b.views - a.views);
  const topProducts = byViews.filter((p) => p.views > 0).slice(0, TOP_PRODUCTS_LIMIT);
  const published = products.filter((p) => p.rawStatus === "published");
  // Visibility without conversion ranks first, then published with no traffic.
  const noConversion = published
    .filter((p) => p.views > 0 && p.outboundClicks === 0)
    .sort((a, b) => b.views - a.views);
  const noTraffic = published.filter((p) => p.views === 0);
  const lowSeen = new Set<string>();
  const lowPerformers: UISellerProductCard[] = [];
  for (const product of [...noConversion, ...noTraffic]) {
    if (lowSeen.has(product.id)) continue;
    lowSeen.add(product.id);
    lowPerformers.push(product);
    if (lowPerformers.length >= LOW_PRODUCTS_LIMIT) break;
  }

  const recommendationsByProduct = products
    .map((p) => ({ product: p, recs: recommendationsForProduct(p) }))
    .filter(({ recs }) => recs.length > 0)
    .sort((a, b) => b.recs.length - a.recs.length);
  const visibleRecommendations = recommendationsByProduct.slice(0, RECOMMENDATIONS_LIMIT);

  const accountRecommendations: ProductRecommendation[] = [];
  if (verifiedPaymentMethodCount !== undefined && verifiedPaymentMethodCount === 0) {
    accountRecommendations.push({
      key: "payment",
      action: "Verify at least one payment method on your seller profile",
    });
  }

  return (
    <section className="grid gap-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge tone="orange">Analytics</Badge>
            <h2 className="mt-3 text-2xl font-black">Performance overview</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              How buyers interact with your product pages on Standard. Views,
              outbound clicks, and CTR are aggregated across all your products.
            </p>
          </div>
        </div>

        {supabaseSourced && !trackingActive && (
          <div className="mt-5 rounded-2xl border border-orange-400/20 bg-orange-500/10 p-4 text-sm text-orange-100">
            Per-product traffic tracking is not yet wired up to the database.
            Views and outbound clicks will appear here once the tracking
            tables and instrumentation land. Listing-quality recommendations
            below remain accurate.
          </div>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <MiniStat
            label="Products"
            value={String(products.length)}
            detail={products.length === 0 ? "none yet" : undefined}
          />
          <MiniStat
            label="Views"
            value={trackingActive ? totalViews.toLocaleString() : "—"}
            detail={trackingActive ? undefined : "no traffic yet"}
          />
          <MiniStat
            label="Outbound clicks"
            value={trackingActive ? totalClicks.toLocaleString() : "—"}
            detail={trackingActive ? undefined : "no traffic yet"}
          />
          <MiniStat
            label="Overall CTR"
            value={overallCtr}
            detail={trackingActive ? undefined : "needs traffic"}
          />
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-black">Product performance</h3>
            <p className="mt-1 text-sm text-slate-400">
              Per-product views, outbound clicks, and CTR. Sorted by views.
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <EmptyState
            title="No products yet"
            body="Create your first product to start seeing analytics here."
            cta={{ label: "Create product", href: "/dashboard/products/new" }}
          />
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <th className="pb-3 pr-4">Product</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4 text-right">Views</th>
                  <th className="pb-3 pr-4 text-right">Outbound</th>
                  <th className="pb-3 text-right">CTR</th>
                </tr>
              </thead>
              <tbody>
                {byViews.map((product) => {
                  const ctrValue = parseCtr(product.outboundCtr);
                  const ctrDisplay =
                    product.views === 0
                      ? "—"
                      : ctrValue != null
                        ? `${ctrValue.toFixed(2)}%`
                        : product.outboundCtr;
                  return (
                    <tr
                      key={product.id}
                      className="border-t border-white/5 align-top text-slate-200"
                    >
                      <td className="border-t border-white/5 py-3 pr-4">
                        <Link
                          href={`/dashboard/products/${product.id}/edit`}
                          className="font-semibold transition hover:text-orange-200"
                        >
                          {product.name}
                        </Link>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {product.game}
                          {product.category ? ` · ${product.category}` : ""}
                        </div>
                      </td>
                      <td className="border-t border-white/5 py-3 pr-4">
                        <Badge
                          tone={
                            product.rawStatus === "published" ? "green" : "default"
                          }
                        >
                          {product.rawStatus === "published" ? "Published" : "Private"}
                        </Badge>
                      </td>
                      <td className="border-t border-white/5 py-3 pr-4 text-right tabular-nums">
                        {product.views > 0 ? product.views.toLocaleString() : "—"}
                      </td>
                      <td className="border-t border-white/5 py-3 pr-4 text-right tabular-nums">
                        {product.outboundClicks > 0
                          ? product.outboundClicks.toLocaleString()
                          : "—"}
                      </td>
                      <td className="border-t border-white/5 py-3 text-right tabular-nums">
                        {ctrDisplay}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-xl font-black">Top products</h3>
          <p className="mt-1 text-sm text-slate-400">
            Your highest-traffic listings on Standard.
          </p>
          {topProducts.length === 0 ? (
            <EmptyState
              compact
              title={
                supabaseSourced
                  ? "No traffic yet"
                  : "Top products will appear here"
              }
              body="Once buyers start visiting your product pages, the highest-traffic products will be highlighted here."
            />
          ) : (
            <ul className="mt-4 grid gap-2">
              {topProducts.map((product, index) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-orange-300/80">
                        #{index + 1}
                      </span>
                      <Link
                        href={`/dashboard/products/${product.id}/edit`}
                        className="truncate font-semibold transition hover:text-orange-200"
                      >
                        {product.name}
                      </Link>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {product.game}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold tabular-nums">
                      {product.views.toLocaleString()}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                      views
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-xl font-black">Low-performing products</h3>
          <p className="mt-1 text-sm text-slate-400">
            Published products with visibility but no outbound clicks, or no
            traffic yet at all.
          </p>
          {lowPerformers.length === 0 ? (
            <EmptyState
              compact
              title={
                supabaseSourced
                  ? "Nothing flagged yet"
                  : "Low performers will appear here"
              }
              body="Once products are published and have a few impressions, the ones that aren't converting will surface here so you can iterate."
            />
          ) : (
            <ul className="mt-4 grid gap-2">
              {lowPerformers.map((product) => {
                const reason =
                  product.views === 0
                    ? "No impressions yet"
                    : product.outboundClicks === 0
                      ? "Views but no outbound clicks"
                      : "";
                return (
                  <li
                    key={product.id}
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Link
                        href={`/dashboard/products/${product.id}/edit`}
                        className="truncate font-semibold transition hover:text-orange-200"
                      >
                        {product.name}
                      </Link>
                      <span className="text-xs text-amber-200/90">{reason}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {product.views.toLocaleString()} views ·{" "}
                      {product.outboundClicks.toLocaleString()} outbound
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <div>
          <h3 className="text-xl font-black">Recommendations</h3>
          <p className="mt-1 text-sm text-slate-400">
            Quick fixes that strengthen product pages. Listing-quality
            improvements help conversion regardless of how much traffic a page
            has.
          </p>
        </div>

        {accountRecommendations.length > 0 && (
          <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">
              Account-level
            </p>
            <ul className="mt-2 grid gap-1.5">
              {accountRecommendations.map((rec) => (
                <li key={rec.key} className="flex items-start gap-2">
                  <span aria-hidden="true" className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-current opacity-70" />
                  <span>{rec.action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {recommendationsByProduct.length === 0 ? (
          <EmptyState
            compact
            title="Every product looks complete"
            body="Nothing to improve right now. Recommendations will reappear if anything regresses (missing media, short summary, no FAQ, etc.)."
          />
        ) : (
          <ul className="mt-5 grid gap-3">
            {visibleRecommendations.map(({ product, recs }) => {
              const strength = evaluateListingStrength({
                name: product.name,
                game: product.game,
                category: product.category,
                websiteUrl: product.websiteUrl,
                summary: product.summary,
                featureGroups: product.featureGroups,
                flatFeatures: product.features,
                faq: product.faq,
                imageCount: product.media.filter((m) => m.type === "image").length,
                videoCount: product.media.filter((m) => m.type === "youtube").length,
                verifiedPaymentMethodCount: supabaseSourced
                  ? verifiedPaymentMethodCount
                  : undefined,
                status: product.rawStatus,
              });
              return (
                <li
                  key={product.id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                      href={`/dashboard/products/${product.id}/edit`}
                      className="font-semibold transition hover:text-orange-200"
                    >
                      {product.name}
                    </Link>
                    <ListingStrengthBadge
                      score={strength.score}
                      missingCount={strength.missing.length}
                    />
                  </div>
                  <ul className="mt-3 grid gap-1.5 text-sm text-slate-200">
                    {recs.map((rec) => (
                      <li key={rec.key} className="flex items-start gap-2">
                        <span aria-hidden="true" className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-orange-300/80" />
                        <span>{rec.action}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
            {recommendationsByProduct.length > visibleRecommendations.length && (
              <li className="text-xs text-slate-500">
                +{recommendationsByProduct.length - visibleRecommendations.length}{" "}
                more product
                {recommendationsByProduct.length - visibleRecommendations.length === 1
                  ? ""
                  : "s"}{" "}
                with smaller items to address. Open each from the Produits tab.
              </li>
            )}
          </ul>
        )}
      </Card>
    </section>
  );
}

function EmptyState({
  title,
  body,
  cta,
  compact,
}: {
  title: string;
  body: string;
  cta?: { label: string; href: string };
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-white/15 bg-slate-950/40 text-center ${compact ? "mt-4 p-5" : "mt-5 p-8"}`}
    >
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
        {body}
      </p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_-12px_rgba(249,115,22,0.65)] transition hover:bg-orange-400"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
