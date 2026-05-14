/**
 * Returns the canonical site URL used for OAuth redirects, magic-link callbacks,
 * Stripe success/cancel URLs, SEO canonicals, and any absolute URL we hand to
 * a third party.
 *
 * Order of preference:
 *   1. NEXT_PUBLIC_SITE_URL — explicit, set in env for production deploys.
 *   2. VERCEL_URL           — auto-populated on every Vercel deployment.
 *   3. http://localhost:3000 — local-dev fallback.
 *
 * Trailing slashes are stripped so callers can safely append `/path`.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}
