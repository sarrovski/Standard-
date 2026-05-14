import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { Badge, ButtonLink, Card, Nav, Shell } from "@/components/ui";
import { PaymentPill, NoVerifiedPayments } from "@/components/payment-pill";
import { TrustSignalsList } from "@/components/product-ranking-ui";
import {
  adaptProductCard,
  coercePaymentMethod,
  type UIProductCard,
} from "@/lib/adapters";
import { isSupabaseConfigured } from "@/lib/roles";
import { isTimeoutError } from "@/lib/repositories/query-timeout";
import {
  getPublicSellerBySlug,
  getPublishedProductsForSeller,
  type PublicSellerProfile,
} from "@/lib/repositories/sellers";
import { getSessionUser } from "@/lib/session";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Public seller profile page — `/sellers/[sellerSlug]`.
 *
 * Indexable. Surfaces:
 *   - Seller name (h1), seller tag (Seller / Provider / Developer)
 *   - Member-since date + avatar + short tagline (no bio column yet)
 *   - Verified payment methods (PaymentPill chips)
 *   - Public trust signals
 *   - Published products from this seller (cards link to /products/...)
 *   - CTA back to /marketplace
 *
 * Privacy:
 *   - Never exposes `profiles.email`. Only display_name + avatar_url.
 *   - Only `status = 'published'` products appear in the grid.
 *   - Only `is_public = true` trust signals appear.
 *
 * SEO:
 *   - generateMetadata pulls the seller name + tag into title + description.
 *   - canonical = /sellers/<slug>.
 *   - noindex on not_found / error / timeout / demo states.
 *   - ProfilePage JSON-LD with embedded Organization mainEntity +
 *     BreadcrumbList.
 *
 * Slug model (MVP):
 *   The sellers table has no `slug` column. We derive the slug from
 *   `seller_name` via `toSlug` at request time. Lookups are O(N) over
 *   the sellers table, capped at 1000 rows. Collisions on the same
 *   derived slug resolve to the oldest seller. When seller volume grows
 *   we should add a `sellers.slug` text column with a unique index and
 *   backfill from the existing names (with collision suffixes). See
 *   `supabase/migrations/0XX_sellers_slug_TODO.sql` (not written yet —
 *   deliberately deferred per the request).
 */

type SellerLoadResult =
  | { kind: "ok"; seller: PublicSellerProfile; products: UIProductCard[] }
  | { kind: "not_found" }
  | { kind: "error"; message: string }
  | { kind: "timeout" }
  | { kind: "demo" };

const loadSeller = cache(async (slug: string): Promise<SellerLoadResult> => {
  if (!isSupabaseConfigured()) return { kind: "demo" };

  const sellerRes = await getPublicSellerBySlug(slug);
  if (sellerRes.error) {
    return { kind: "error", message: sellerRes.error.message };
  }
  if (!sellerRes.data) return { kind: "not_found" };

  const productsRes = await getPublishedProductsForSeller(sellerRes.data.id);
  if (productsRes.error) {
    if (isTimeoutError(productsRes.error)) {
      return { kind: "timeout" };
    }
    return { kind: "error", message: productsRes.error.message };
  }

  // All products in this grid share the same seller — so the same set
  // of verified payment-method names applies to every card.
  const verifiedMethodNames = sellerRes.data.verified_payment_methods
    .map((row) => row.payment_methods?.name)
    .filter((name): name is string => Boolean(name));

  const products: UIProductCard[] = productsRes.data.map((row) =>
    adaptProductCard(row, verifiedMethodNames),
  );

  return { kind: "ok", seller: sellerRes.data, products };
});

function tagLabel(
  status: PublicSellerProfile["provider_tag_status"],
): "Seller" | "Provider / Developer" {
  return status === "approved" ? "Provider / Developer" : "Seller";
}

function tagTone(
  status: PublicSellerProfile["provider_tag_status"],
): "green" | "orange" | "default" {
  if (status === "approved") return "green";
  if (status === "pending") return "orange";
  return "default";
}

function buildNoindex(reason: string): Metadata {
  const titles: Record<string, string> = {
    not_found: "Seller not found — Standard",
    error: "Seller unavailable — Standard",
    timeout: "Seller unavailable — Standard",
    demo: "Standard seller preview",
  };
  return {
    title: titles[reason] ?? "Seller — Standard",
    robots: { index: false, follow: false },
  };
}

export async function generateMetadata({
  params,
}: {
  params: { sellerSlug: string };
}): Promise<Metadata> {
  const result = await loadSeller(params.sellerSlug);
  if (result.kind !== "ok") return buildNoindex(result.kind);

  const { seller, products } = result;
  const tag = tagLabel(seller.provider_tag_status);
  const verifiedCount = seller.verified_payment_methods.length;
  const productCount = products.length;
  const canonical = `/sellers/${params.sellerSlug}`;

  const titleBase = `${seller.seller_name} — ${tag} on Standard`;
  const title =
    titleBase.length > 60
      ? `${seller.seller_name} on Standard`
      : titleBase;

  const description = (() => {
    const parts: string[] = [];
    parts.push(
      `${seller.seller_name} is a ${tag.toLowerCase()} on Standard`,
    );
    if (productCount > 0) {
      parts.push(
        `${productCount} published ${productCount === 1 ? "product" : "products"}`,
      );
    }
    if (verifiedCount > 0) {
      parts.push(
        `${verifiedCount} verified payment ${verifiedCount === 1 ? "method" : "methods"}`,
      );
    }
    const joined = parts.join(" · ");
    return joined.length > 160 ? `${joined.slice(0, 159)}…` : joined;
  })();

  const image = seller.profile?.avatar_url ?? null;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: "profile",
      url: canonical,
      siteName: "Standard",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

function buildSellerJsonLd(
  slug: string,
  seller: PublicSellerProfile,
  productCount: number,
): unknown[] {
  const siteUrl = getSiteUrl();
  const sellerUrl = `${siteUrl}/sellers/${slug}`;

  const profileSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${seller.seller_name} on Standard`,
    url: sellerUrl,
    mainEntity: {
      "@type": "Organization",
      name: seller.seller_name,
      url: sellerUrl,
      ...(seller.website_url ? { sameAs: [seller.website_url] } : {}),
      ...(seller.profile?.avatar_url
        ? { image: seller.profile.avatar_url }
        : {}),
      description:
        productCount > 0
          ? `${seller.seller_name} publishes ${productCount} gaming tool${
              productCount === 1 ? "" : "s"
            } on Standard.`
          : `${seller.seller_name} on Standard.`,
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Marketplace",
        item: `${siteUrl}/marketplace`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: seller.seller_name,
        item: sellerUrl,
      },
    ],
  };

  return [profileSchema, breadcrumbSchema];
}

function buildPublicTrustSignals(seller: PublicSellerProfile): string[] {
  const signals: string[] = [];
  if (seller.provider_tag_status === "approved") {
    signals.push("Provider / Developer");
  }
  if (seller.verified_payment_methods.length > 0) {
    signals.push("Payment profile reviewed");
  }
  for (const row of seller.trust_signals) {
    if (row.is_public && row.label) signals.push(row.label);
  }
  return signals;
}

export default async function SellerProfilePage({
  params,
}: {
  params: { sellerSlug: string };
}) {
  const result = await loadSeller(params.sellerSlug);
  const user = await getSessionUser();

  // Non-ok states get a stripped-down shell so the layout is consistent.
  if (result.kind !== "ok") {
    const message =
      result.kind === "not_found"
        ? "We couldn't find that seller."
        : result.kind === "demo"
          ? "Seller profiles only load when Supabase is connected."
          : result.kind === "timeout"
            ? "The seller profile took too long to load. Please try again."
            : "Couldn't load the seller profile.";
    return (
      <Shell>
        <Nav user={user} />
        <section className="mx-auto max-w-3xl px-6 py-16 text-center">
          <Link
            href="/marketplace"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back to marketplace
          </Link>
          <h1 className="mt-6 text-3xl font-black tracking-tight">
            Seller unavailable
          </h1>
          <p className="mt-3 text-sm text-slate-400">{message}</p>
          <div className="mt-6 flex justify-center">
            <ButtonLink href="/marketplace">Browse marketplace</ButtonLink>
          </div>
        </section>
      </Shell>
    );
  }

  const { seller, products } = result;
  const tag = tagLabel(seller.provider_tag_status);
  const tone = tagTone(seller.provider_tag_status);
  const signals = buildPublicTrustSignals(seller);
  const memberSince = new Date(seller.created_at).toLocaleDateString(
    undefined,
    { year: "numeric", month: "short" },
  );

  // PaymentPill takes a UI-facing PaymentMethod literal. coercePaymentMethod
  // collapses any unknown DB name to "Other" so we render safely.
  const verifiedMethods = seller.verified_payment_methods
    .map((row) => row.payment_methods?.name ?? null)
    .filter((name): name is string => Boolean(name))
    .map(coercePaymentMethod);

  const jsonLdBlocks = buildSellerJsonLd(
    params.sellerSlug,
    seller,
    products.length,
  );

  return (
    <Shell>
      <Nav user={user} />
      <section className="mx-auto max-w-5xl px-6 py-10">
        <Link
          href="/marketplace"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Back to marketplace
        </Link>

        {/* Hero ----------------------------------------------------------- */}
        <header className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-orange-400 to-orange-600 text-3xl font-black text-white">
            {seller.profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={seller.profile.avatar_url}
                alt={`${seller.seller_name} avatar`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{seller.seller_name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl font-black tracking-tight">
              {seller.seller_name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={tone}>{tag}</Badge>
              <span className="text-xs text-slate-500">
                On Standard since {memberSince}
              </span>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Seller profile on Standard. Browse this seller&apos;s
              published gaming tools, verified payment methods, and
              public trust signals. Standard does not process payments —
              all checkouts happen on the seller&apos;s official site.
            </p>
            {seller.website_url && (
              <div className="mt-4">
                <a
                  href={seller.website_url}
                  target="_blank"
                  rel="noreferrer nofollow"
                  className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-400"
                >
                  Visit official site
                </a>
              </div>
            )}
          </div>
        </header>

        {/* Trust panel --------------------------------------------------- */}
        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-lg font-bold">Verified payment methods</h2>
            <p className="mt-1 text-sm text-slate-400">
              Payment methods Standard has reviewed proof for. We don&apos;t
              process payments — this is signal, not a guarantee.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {verifiedMethods.length === 0 ? (
                <NoVerifiedPayments />
              ) : (
                verifiedMethods.map((method, index) => (
                  <PaymentPill key={`${method}-${index}`} method={method} />
                ))
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-bold">Trust signals</h2>
            <p className="mt-1 text-sm text-slate-400">
              Public signals Standard surfaces about this seller.
            </p>
            <div className="mt-4">
              {signals.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-5 text-sm text-slate-400">
                  No public trust signals yet.
                </div>
              ) : (
                <TrustSignalsList signals={signals} />
              )}
            </div>
          </Card>
        </section>

        {/* Products grid ------------------------------------------------- */}
        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">Published products</h2>
              <p className="mt-1 text-sm text-slate-500">
                {products.length === 0
                  ? "No products published yet."
                  : products.length === 1
                    ? "1 published product."
                    : `${products.length} published products.`}
              </p>
            </div>
            <Link
              href="/marketplace"
              className="hidden text-sm font-semibold text-orange-300 underline-offset-2 hover:underline sm:inline"
            >
              Browse marketplace →
            </Link>
          </div>

          {products.length === 0 ? (
            <Card className="mt-6 p-6 text-sm text-slate-400">
              This seller hasn&apos;t published anything yet. Check back
              soon, or head to the{" "}
              <Link
                href="/marketplace"
                className="text-orange-300 hover:underline"
              >
                marketplace
              </Link>{" "}
              to keep exploring.
            </Card>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <Link
                  key={product.slug}
                  href={`/products/${product.slug}`}
                  className="group"
                >
                  <Card className="h-full overflow-hidden transition group-hover:border-orange-400/30">
                    <div
                      className={`relative aspect-video overflow-hidden ${
                        product.coverImageUrl
                          ? "bg-slate-950"
                          : `bg-gradient-to-br ${product.accent}`
                      }`}
                    >
                      {product.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.coverImageUrl}
                          alt={product.name}
                          className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.02]"
                        />
                      ) : null}
                    </div>
                    <div className="p-5">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-orange-200/80">
                        <span>{product.game}</span>
                        <span aria-hidden="true">·</span>
                        <span>{product.category}</span>
                      </div>
                      <h3 className="mt-2 text-lg font-bold text-white">
                        {product.name}
                      </h3>
                      {product.summary && (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                          {product.summary}
                        </p>
                      )}
                      {product.pricePoints.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {product.pricePoints.slice(0, 3).map((point, idx) => (
                            <span
                              key={`${point}-${idx}`}
                              className="rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1 text-[11px] text-slate-300"
                            >
                              {point}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Footer CTAs -------------------------------------------------- */}
        <section className="mt-12 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <Card className="p-5 text-sm text-slate-300">
            See something off about this seller or one of their listings?{" "}
            <Link
              href="/trust/report-a-seller"
              className="font-semibold text-orange-300 underline-offset-2 hover:underline"
            >
              Report to the trust team
            </Link>
            .
          </Card>
          <ButtonLink href="/marketplace">Browse marketplace</ButtonLink>
        </section>
      </section>

      {jsonLdBlocks.map((block, index) => (
        <script
          key={`seller-jsonld-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </Shell>
  );
}
