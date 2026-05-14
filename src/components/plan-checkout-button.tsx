"use client";

import { useState } from "react";

/**
 * Subscription CTA on /plans. POSTs to /api/stripe/create-checkout-session,
 * then follows the Stripe Checkout URL it returns.
 *
 * There is a single seller plan, so this button carries no plan/price
 * identifier — the checkout route always uses the one Stripe Price behind
 * STRIPE_SELLER_SUBSCRIPTION_PRICE_ID, which is also the Price the /plans
 * page reads its displayed amount from. Display and charge are the same
 * Price object; they can't drift.
 *
 * If the user isn't authenticated, the API returns 401 and we redirect to
 * /login with a ?next= so they come back here after signing in.
 *
 * If Stripe env vars aren't configured, the API returns 500. We surface
 * that error inline so the page stays usable in demo mode.
 */
export function PlanCheckoutButton({
  label,
  variant = "primary",
}: {
  label: string;
  variant?: "primary" | "secondary";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
      });
      if (response.status === 401) {
        window.location.href = "/login?next=/plans";
        return;
      }
      const payload = (await response.json()) as { url?: string; error?: string };
      if (response.ok && payload.url) {
        window.location.href = payload.url;
        return;
      }
      setError(payload.error ?? "Could not start checkout.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusy(false);
    }
  };

  const className =
    variant === "primary"
      ? "inline-flex w-full justify-center rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      : "inline-flex w-full justify-center rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60";

  return (
    <div>
      <button onClick={start} disabled={busy} className={className}>
        {busy ? "Starting checkout..." : label}
      </button>
      {error && (
        <div className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 p-2 text-xs text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
