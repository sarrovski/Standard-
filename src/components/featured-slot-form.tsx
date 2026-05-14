"use client";

import { useState } from "react";

/**
 * Featured slot purchase UI, lives on /dashboard/billing only.
 *
 * The seller picks a published product and we POST to
 * /api/stripe/create-featured-checkout-session, which derives game +
 * category from the product server-side. On success we redirect to
 * Stripe Checkout. On 409 the slot for that game/category is already
 * taken, and we surface that inline.
 *
 * Featured purchases never modify trust score or bypass payment
 * verification — that's communicated up the page in a notes card.
 */

export type FeaturedProductOption = {
  id: string;
  name: string;
  game: string;
  category: string;
};

export function FeaturedSlotForm({
  products,
}: {
  products: FeaturedProductOption[];
}) {
  const [selected, setSelected] = useState<string>(
    products[0]?.id ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setError(null);
    if (!selected) {
      setError("Pick a product first.");
      return;
    }
    const product = products.find((p) => p.id === selected);
    if (!product) {
      setError("Product not found in the list.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(
        "/api/stripe/create-featured-checkout-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: product.id,
            game: product.game,
            category: product.category,
          }),
        },
      );
      const payload = (await response.json()) as { url?: string; error?: string };
      if (response.status === 409) {
        setError("Featured slot unavailable for this game/category.");
        return;
      }
      if (response.ok && payload.url) {
        window.location.href = payload.url;
        return;
      }
      setError(payload.error ?? "Could not start featured checkout.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusy(false);
    }
  };

  if (products.length === 0) {
    return (
      <p className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
        Publish a product before reserving a featured slot.
      </p>
    );
  }

  const current = products.find((p) => p.id === selected);

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-xs text-slate-500">Product</span>
        <select
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      {current && (
        <p className="text-xs text-slate-500">
          Featured slot will cover{" "}
          <span className="font-semibold text-slate-300">{current.game}</span>{" "}
          /{" "}
          <span className="font-semibold text-slate-300">{current.category}</span>
          . One active slot per game/category.
        </p>
      )}

      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Starting checkout..." : "Reserve featured slot"}
      </button>

      {error && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
