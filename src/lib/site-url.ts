/**
 * Returns the canonical site URL used for OAuth redirects, magic-link callbacks,
 * Stripe success/cancel URLs, SEO canonicals, OpenGraph/Twitter URLs, JSON-LD
 * URLs, and any absolute URL we hand to a third party.
 *
 * This is the ONE place the site origin is resolved — every canonical in the
 * app is relative and resolves against `metadataBase` (set from this in
 * src/app/layout.tsx), and every absolute-URL builder calls this helper. To
 * change the production domain, change `PRODUCTION_SITE_URL` below (or set the
 * `NEXT_PUBLIC_SITE_URL` env var) — nothing else.
 *
 * Order of preference:
 *   1. NEXT_PUBLIC_SITE_URL — explicit override. Recommended to set in every
 *      Vercel environment. Production should be https://stnd.cc.
 *   2. Production fallback — when VERCEL_ENV === "production" and no explicit
 *      override is set, fall back to PRODUCTION_SITE_URL so canonicals / OG /
 *      auth + Stripe redirects stay correct even if the env var is missing.
 *   3. VERCEL_URL — the per-deployment hostname. Used for preview / branch
 *      deploys so their canonicals point at themselves, not production.
 *   4. http://localhost:3000 — local-dev fallback.
 *
 * `getSiteUrl()` is only ever called server-side (layout `metadataBase`, page
 * `generateMetadata`, JSON-LD builders, the auth callback, and the Stripe
 * routes). VERCEL_ENV / VERCEL_URL aren't exposed to the client bundle, but
 * that's fine here — client components receive the already-resolved string as
 * a prop (see login/signup pages).
 *
 * Trailing slashes are stripped so callers can safely append `/path`.
 */

/** The live production domain. Update here if the domain ever changes. */
export const PRODUCTION_SITE_URL = "https://stnd.cc";

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  // On the production deployment, default to the real domain even if the
  // explicit env var was never set — protects canonicals / redirects from
  // silently falling through to the ugly *.vercel.app hostname.
  if (process.env.VERCEL_ENV === "production") return PRODUCTION_SITE_URL;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}
