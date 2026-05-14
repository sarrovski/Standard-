"use client";

import { useState } from "react";

export function BillingActions({ hasStripeCustomer }: { hasStripeCustomer: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPortal = async () => {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/stripe/billing-portal", { method: "POST" });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (response.ok && payload.url) {
        window.location.href = payload.url;
        return;
      }
      setError(payload.error ?? "Could not open billing portal.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        onClick={openPortal}
        disabled={busy || !hasStripeCustomer}
        className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        title={!hasStripeCustomer ? "No Stripe customer linked yet — subscribe first" : undefined}
      >
        {busy ? "Opening…" : "Open billing portal"}
      </button>
      {error && (
        <div className="mt-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
