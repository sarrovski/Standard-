"use client";

import { useState } from "react";

/**
 * Subscription CTA used on /plans. POSTs to the existing
 * /api/stripe/create-checkout-session route, then follows the Stripe Checkout
 * URL it returns.
 *
 * If the user isn't authenticated, the API returns 401 and we redirect to
 * /login with a ?next= so they come back here after signing in.
 *
 * If Stripe env vars aren't configured, the API returns 500. We surface
 * that error inline so the page stays usable in demo mode (the buttons
 * themselves still render).
 *
 * TODO: The current backend has one STRIPE_SELLER_SUBSCRIPTION_PRICE_ID, so
 * every plan CTA starts the same checkout route for now. Add dedicated
 * STRIPE_LAUNCH_PRICE_ID, STRIPE_GROWTH_PRICE_ID, and
 * STRIPE_DOMINION_PRICE_ID before wiring plan-specific Stripe prices.
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
      ? "inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      : "inline-flex w-full justify-center rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60";

  return (
    <div>
      <button onClick={start} disabled={busy} className={className}>
        {busy ? "Starting checkout…" : label}
      </button>
      {error && (
        <div className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 p-2 text-xs text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
