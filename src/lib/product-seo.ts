import type { Metadata } from "next";
import type { UIProductDetail } from "@/lib/adapters";
import { getSiteUrl } from "@/lib/site-url";
import { toSlug } from "@/lib/slugs";

const FALLBACK_DESCRIPTION =
  "Verified seller information, payment methods, and trust signals on Standard.";

function truncate(value: string, max = 160): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function firstImageUrl(product: UIProductDetail): string | null {
  if (product.coverImageUrl) return product.coverImageUrl;
  for (const item of product.gallery) {
    if (item.type === "image" && item.imageUrl) return item.imageUrl;
  }
  for (const item of product.gallery) {
    if (item.type === "youtube" && item.thumbnailUrl) return item.thumbnailUrl;
  }
  return null;
}

/**
 * Build SEO metadata for a public, published product page.
 * Caller is responsible for only calling this when the product is published.
 */
export function buildProductMetadata(
  product: UIProductDetail,
  slug: string,
): Metadata {
  const title = `${product.name} — ${product.game} gaming tool on Standard`;
  const description = truncate(
    product.summary && product.summary.trim().length > 0
      ? product.summary
      : `${product.name} from ${product.seller} on Standard. ${FALLBACK_DESCRIPTION}`,
  );
  const canonical = `/products/${slug}`;
  const image = firstImageUrl(product);

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: "website",
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

/**
 * Build noindex metadata for product page states that should never appear in
 * search results: not_found, error, timeout, and demo previews.
 */
export function buildNonIndexableMetadata(
  reason: "not_found" | "error" | "timeout" | "demo",
): Metadata {
  const titles: Record<typeof reason, string> = {
    not_found: "Product not found — Standard",
    error: "Product unavailable — Standard",
    timeout: "Product unavailable — Standard",
    demo: "Standard product preview",
  };
  return {
    title: titles[reason],
    robots: { index: false, follow: false },
  };
}

/**
 * Build JSON-LD structured-data blocks for a published product page:
 *   - Product
 *   - BreadcrumbList (Home → Marketplace → Game → Product)
 *   - FAQPage (only when product.faq has at least one entry)
 *
 * Returns one object per @type so each can be emitted as its own <script>.
 */
export function buildProductJsonLd(
  product: UIProductDetail,
  slug: string,
): unknown[] {
  const siteUrl = getSiteUrl();
  const productUrl = `${siteUrl}/products/${slug}`;
  const image = firstImageUrl(product);

  const productSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description:
      product.summary && product.summary.trim().length > 0
        ? product.summary
        : `${product.name} on Standard.`,
    category: product.category,
    brand: { "@type": "Organization", name: product.seller },
    url: productUrl,
  };
  if (image) productSchema.image = image;

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
        name: product.game,
        item: `${siteUrl}/games/${toSlug(product.game)}`,
      },
      { "@type": "ListItem", position: 4, name: product.name, item: productUrl },
    ],
  };

  const schemas: unknown[] = [productSchema, breadcrumbSchema];

  if (product.faq && product.faq.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: product.faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    });
  }

  return schemas;
}
