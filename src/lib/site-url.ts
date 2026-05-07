/**
 * Returns the canonical site URL used for OAuth redirects, magic-link callbacks,
 * Stripe success/cancel URLs, and any absolute URL we hand to a third party.
 *
 * Reads NEXT_PUBLIC_SITE_URL when set (e.g. https://standard.example.com on
 * Vercel). Falls back to http://localhost:3000 for local dev.
 */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}
