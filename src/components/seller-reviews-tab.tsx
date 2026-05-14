"use client";

import { useState } from "react";
import { Badge, Card } from "@/components/ui";
import {
  REVIEW_APPEAL_REASON_MAX,
  REVIEW_RATING_MAX,
  REVIEW_STATUS_LABEL,
  type ReviewStatus,
} from "@/lib/product-reviews";

export type SellerReview = {
  id: string;
  productName: string;
  productSlug: string;
  reviewerDisplayName: string | null;
  rating: number;
  body: string;
  status: ReviewStatus;
  appealReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

type Props = {
  supabaseSourced: boolean;
  initialReviews: SellerReview[];
};

/**
 * Seller dashboard "Reviews" tab.
 *
 * Lists every review across the seller's products with status pills. The
 * seller can appeal any `approved` review they think is unfair — clicking
 * Appeal opens an inline form that POSTs to /api/seller/product-reviews/
 * [id]/appeal. Already-appealed and rejected rows are read-only.
 */
export function SellerReviewsTab({ supabaseSourced, initialReviews }: Props) {
  const [reviews, setReviews] = useState<SellerReview[]>(initialReviews);
  const [activeAppealId, setActiveAppealId] = useState<string | null>(null);
  const [appealReason, setAppealReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitAppeal = async (reviewId: string) => {
    if (!supabaseSourced) return;
    setError(null);
    setBusyId(reviewId);
    try {
      const response = await fetch(
        `/api/seller/product-reviews/${reviewId}/appeal`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: appealReason.trim() }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Couldn't submit appeal.");
        return;
      }
      setReviews((prev) =>
        prev.map((row) =>
          row.id === reviewId
            ? {
                ...row,
                status: "appealed",
                appealReason: appealReason.trim(),
                reviewedAt: null,
              }
            : row,
        ),
      );
      setActiveAppealId(null);
      setAppealReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-5">
        <div>
          <h2 className="text-xl font-bold">Reviews on your products</h2>
          <p className="mt-1 text-sm text-slate-400">
            {supabaseSourced
              ? "Buyers can post community reviews on any of your published products. Appeal anything that feels unfair — admins will take a look."
              : "Demo mode — connect Supabase to load real reviews."}
          </p>
        </div>
        <Badge tone={supabaseSourced ? "green" : "amber"}>
          {supabaseSourced
            ? `Live · ${reviews.length} review${reviews.length === 1 ? "" : "s"}`
            : "Demo only"}
        </Badge>
      </div>

      {error && (
        <div className="m-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="p-6 text-sm text-slate-500">
          {supabaseSourced
            ? "No reviews on your products yet. They'll appear here as buyers post them."
            : "Demo mode: no reviews to show."}
        </div>
      ) : (
        <ul className="divide-y divide-white/10">
          {reviews.map((review) => {
            const isBusy = busyId === review.id;
            const isAppealing = activeAppealId === review.id;
            const statusTone: "green" | "amber" | "red" | "default" =
              review.status === "approved"
                ? "green"
                : review.status === "appealed"
                  ? "amber"
                  : review.status === "rejected"
                    ? "red"
                    : "default";
            return (
              <li key={review.id} className="grid gap-3 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={statusTone}>
                    {REVIEW_STATUS_LABEL[review.status]}
                  </Badge>
                  <Badge tone="orange">
                    {review.rating} / {REVIEW_RATING_MAX}
                  </Badge>
                  <a
                    href={`/products/${review.productSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-sm font-semibold text-white transition hover:text-orange-200"
                  >
                    {review.productName} ↗
                  </a>
                  <span className="text-xs text-slate-500">
                    by {review.reviewerDisplayName ?? "Buyer"} ·{" "}
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm leading-6 text-slate-200 whitespace-pre-line">
                  {review.body}
                </p>
                {review.appealReason && (
                  <div className="rounded-2xl border border-amber-300/20 bg-amber-500/[0.06] p-3 text-xs text-amber-100">
                    <span className="font-semibold uppercase tracking-wide text-amber-200">
                      Your appeal:
                    </span>{" "}
                    {review.appealReason}
                  </div>
                )}

                {review.status === "approved" && supabaseSourced && (
                  <div>
                    {isAppealing ? (
                      <div className="grid gap-2 rounded-2xl border border-white/10 bg-black/30 p-3">
                        <label className="grid gap-1 text-xs font-semibold text-slate-300">
                          Why are you appealing this review?
                          <textarea
                            value={appealReason}
                            onChange={(event) =>
                              setAppealReason(event.target.value)
                            }
                            maxLength={REVIEW_APPEAL_REASON_MAX}
                            placeholder="Anything specific the admin should know."
                            className="min-h-20 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/50"
                          />
                          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            {appealReason.length} / {REVIEW_APPEAL_REASON_MAX}
                          </span>
                        </label>
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveAppealId(null);
                              setAppealReason("");
                            }}
                            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isBusy || appealReason.trim().length < 5}
                            onClick={() => submitAppeal(review.id)}
                            className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isBusy ? "Submitting…" : "Submit appeal"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveAppealId(review.id)}
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-orange-100"
                      >
                        Appeal this review
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
