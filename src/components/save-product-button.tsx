"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/helpers";

/**
 * Heart-style "save product" toggle for the public product page.
 *
 * Initial saved state is provided by the server. On click we optimistically
 * flip the local state, then POST or DELETE /api/saved-products. If the
 * network call fails we roll the optimistic flip back.
 *
 * `loggedIn=false` makes the button a static link to `/login?next=...`
 * instead of dispatching API calls — keeps the unauth path simple without
 * stuffing auth logic into the API.
 */
export function SaveProductButton({
  productId,
  productSlug,
  initialSaved,
  loggedIn,
}: {
  productId: string;
  productSlug: string;
  initialSaved: boolean;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (busy) return;
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(`/products/${productSlug}`)}`);
      return;
    }
    setError(null);
    const nextSaved = !saved;
    setSaved(nextSaved);
    setBusy(true);
    try {
      const response = await fetch("/api/saved-products", {
        method: nextSaved ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Could not update saved products.");
        setSaved(!nextSaved);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
      setSaved(!nextSaved);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-stretch gap-1">
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={saved}
        aria-label={saved ? "Remove from saved products" : "Save product"}
        disabled={busy}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-60",
          saved
            ? "border-orange-400/60 bg-orange-500/15 text-orange-100 hover:bg-orange-500/25"
            : "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]",
        )}
      >
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
        {saved ? "Saved" : "Save product"}
      </button>
      {error ? (
        <p className="text-[11px] text-red-200">{error}</p>
      ) : null}
    </div>
  );
}
