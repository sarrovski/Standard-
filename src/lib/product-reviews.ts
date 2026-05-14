/**
 * Shared helpers for the product-review MVP.
 *
 * Until purchase verification exists, public-facing copy must NOT say
 * "verified buyer". We use "Community review" / "Buyer review" everywhere
 * the public sees a review — see `REVIEW_PUBLIC_LABEL`.
 *
 * Validation here is the source of truth. Both the API route and the
 * client-side modal call into these functions so the rules can't drift.
 * RLS column CHECKs enforce the same bounds at the DB layer as
 * defense-in-depth.
 */

import type { Database } from "@/lib/supabase/types";

export type ReviewStatus =
  Database["public"]["Tables"]["product_reviews"]["Row"]["status"];

export const REVIEW_PUBLIC_LABEL = "Community review" as const;
export const REVIEW_PUBLIC_LABEL_PLURAL = "Community reviews" as const;

export const REVIEW_RATING_MIN = 1;
export const REVIEW_RATING_MAX = 5;
export const REVIEW_BODY_MIN = 1;
export const REVIEW_BODY_MAX = 1200;
export const REVIEW_APPEAL_REASON_MAX = 1000;

export type ReviewValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function validateRating(value: unknown): ReviewValidationResult<number> {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n)) {
    return { ok: false, error: "Rating must be a whole number." };
  }
  if (n < REVIEW_RATING_MIN || n > REVIEW_RATING_MAX) {
    return {
      ok: false,
      error: `Rating must be between ${REVIEW_RATING_MIN} and ${REVIEW_RATING_MAX}.`,
    };
  }
  return { ok: true, value: n };
}

export function validateBody(value: unknown): ReviewValidationResult<string> {
  if (typeof value !== "string") {
    return { ok: false, error: "Review body is required." };
  }
  const trimmed = value.trim();
  if (trimmed.length < REVIEW_BODY_MIN) {
    return { ok: false, error: "Write a few words about your experience." };
  }
  if (trimmed.length > REVIEW_BODY_MAX) {
    return {
      ok: false,
      error: `Review body must be ${REVIEW_BODY_MAX} characters or fewer.`,
    };
  }
  return { ok: true, value: trimmed };
}

export function validateAppealReason(
  value: unknown,
): ReviewValidationResult<string> {
  if (typeof value !== "string") {
    return { ok: false, error: "Tell us why you're appealing this review." };
  }
  const trimmed = value.trim();
  if (trimmed.length < 5) {
    return { ok: false, error: "Tell us why you're appealing this review." };
  }
  if (trimmed.length > REVIEW_APPEAL_REASON_MAX) {
    return {
      ok: false,
      error: `Appeal reason must be ${REVIEW_APPEAL_REASON_MAX} characters or fewer.`,
    };
  }
  return { ok: true, value: trimmed };
}

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  approved: "Approved",
  appealed: "Under admin review",
  rejected: "Removed",
};
