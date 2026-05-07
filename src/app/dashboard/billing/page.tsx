import { redirect } from "next/navigation";

/**
 * Stripe success/cancel URLs from Batch 4 land here:
 *   /dashboard/billing?checkout=success
 *   /dashboard/billing?checkout=cancelled
 *   /dashboard/billing?featured=success
 *   /dashboard/billing?featured=cancelled
 *
 * We forward to /dashboard?tab=billing while preserving the query string so
 * the Billing tab can show a confirmation banner if desired (not implemented
 * yet — this is the lightest possible no-404 fix).
 */
export default function BillingRedirect({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();
  params.set("tab", "billing");
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (typeof value === "string") {
      params.set(key, value);
    }
  }
  redirect(`/dashboard?${params.toString()}`);
}
