"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import {
  REVIEW_BODY_MAX,
  REVIEW_RATING_MAX,
  REVIEW_RATING_MIN,
} from "@/lib/product-reviews";

/**
 * "Leave a review" CTA on the product page.
 *
 * - Logged out → renders an inline link prompting sign-in.
 * - Logged in as the product's seller-owner → hidden (the parent passes
 *   `disabled` in that case so we don't even render the trigger).
 * - Logged in otherwise → opens a small modal with rating picker +
 *   textarea + character counter and POSTs to /api/product-reviews.
 *
 * Validation is mirrored from src/lib/product-reviews.ts so the same
 * rules apply on both ends.
 */

type Props = {
  productId: string;
  productSlug: string;
  loggedIn: boolean;
};

export function ReviewSubmitButton({ productId, productSlug, loggedIn }: Props) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!loggedIn) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
        <Link
          href={`/login?next=/products/${productSlug}`}
          className="font-semibold text-orange-300 underline-offset-2 hover:underline"
        >
          Sign in
        </Link>{" "}
        to leave a review.
      </div>
    );
  }

  const reset = () => {
    setRating(5);
    setBody("");
    setError(null);
    setDone(false);
  };

  const close = () => {
    setOpen(false);
    setTimeout(reset, 200);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (body.trim().length === 0) {
      setError("Write a few words about your experience.");
      return;
    }
    if (body.length > REVIEW_BODY_MAX) {
      setError(`Review must be ${REVIEW_BODY_MAX} characters or fewer.`);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/product-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, rating, body: body.trim() }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Couldn't submit review. Try again.");
        return;
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-3.5 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_-12px_rgba(249,115,22,0.65)] transition hover:bg-orange-400"
      >
        Leave a review
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-review-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="Close review dialog"
            onClick={close}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/40">
            <h2
              id="leave-review-title"
              className="text-xl font-black tracking-tight"
            >
              Leave a community review
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Share what you saw, what worked, what didn&apos;t. Reviews go
              live immediately. The seller can appeal a review for admin
              review if they think it&apos;s unfair.
            </p>

            {done ? (
              <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                Thanks — your review is live.
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-400"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-5 grid gap-4">
                <fieldset className="grid gap-2 text-sm font-semibold text-slate-200">
                  <legend>Rating</legend>
                  <div className="flex items-center gap-2">
                    {Array.from(
                      { length: REVIEW_RATING_MAX - REVIEW_RATING_MIN + 1 },
                      (_, i) => REVIEW_RATING_MIN + i,
                    ).map((value) => {
                      const active = value <= rating;
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={value === rating}
                          aria-label={`${value} out of ${REVIEW_RATING_MAX}`}
                          onClick={() => setRating(value)}
                          className={
                            "h-9 w-9 rounded-xl border text-base transition " +
                            (active
                              ? "border-orange-400/50 bg-orange-500/20 text-orange-100"
                              : "border-white/10 bg-white/[0.03] text-slate-500 hover:border-white/20 hover:text-slate-300")
                          }
                        >
                          {value}
                        </button>
                      );
                    })}
                    <span className="ml-2 text-xs font-medium text-slate-400">
                      {rating} / {REVIEW_RATING_MAX}
                    </span>
                  </div>
                </fieldset>

                <label className="grid gap-2 text-sm font-semibold text-slate-200">
                  Review
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    maxLength={REVIEW_BODY_MAX}
                    placeholder="What worked, what didn't, would you recommend it?"
                    className="min-h-32 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/50"
                  />
                  <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    {body.length} / {REVIEW_BODY_MAX}
                  </span>
                </label>

                {error && (
                  <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white shadow-[0_8px_24px_-12px_rgba(249,115,22,0.65)] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Submitting…" : "Submit review"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
