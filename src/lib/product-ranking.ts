/**
 * MVP product-ranking helper used by every surface that needs to show
 * trust / visibility — the marketplace card pill, the product-page
 * trust panel, seller dashboard rows, the edit-page Visibility panel,
 * and the admin Products tab.
 *
 * Deterministic, explainable, no ML, no review weighting. Inputs are
 * the same fields the rest of the app already computes (status,
 * verified-payment count, media presence, summary length, feature
 * group / flat counts, FAQ count). Add data later, not magic.
 *
 * Scoring (max 100; each rule contributes only when it passes):
 *   - product is published                                  +20
 *   - seller tag is Verified Seller or Provider/Developer   +20
 *   - at least one verified payment method                  +20
 *   - has at least one image or video                       +15
 *   - summary >= 120 chars                                  +10
 *   - at least 3 FAQ items                                  +10
 *   - 5+ flat features OR 2+ feature groups                  +5
 *
 * If the product is NOT published, the score is hard-capped at 40 so
 * unpublished work can never claim "Trusted" even if every other rule
 * is satisfied. The seller's first suggestion in that case is always
 * "Publish to become eligible for marketplace visibility."
 *
 * The helper returns three audience-specific shapes:
 *   - publicSignals     — safe buyer-facing badges (no point values)
 *   - sellerSuggestions — prescriptive 1-line actions
 *   - adminNotes        — full per-rule breakdown for the admin Products tab
 */

export type RankingLevel = "low" | "medium" | "high";

export type RankingInput = {
  /** True when product.status === "published". */
  published: boolean;
  /** Raw seller tag string ("Verified Seller", "Provider / Developer", "Seller", etc.). */
  sellerTag: string;
  /** Count of seller_payment_methods rows with status="verified". */
  verifiedPaymentCount: number;
  /** True when the product has at least one image or video media row. */
  hasMedia: boolean;
  /** Raw product summary (untrimmed; helper trims). */
  summary: string;
  /** Count of feature_groups (post-parse). */
  featureGroupCount: number;
  /** Count of flat features (post-migration-008 some products still have these). */
  flatFeatureCount: number;
  /** Count of well-formed FAQ items (both q and a non-empty). */
  faqCount: number;
};

export type RankingResult = {
  score: number;
  level: RankingLevel;
  label: "Low trust" | "Building trust" | "Trusted";
  publicSignals: string[];
  sellerSuggestions: string[];
  adminNotes: string[];
};

const SUMMARY_MIN = 120;
const FAQ_MIN = 3;
const FLAT_FEATURE_MIN = 5;
const GROUP_MIN = 2;
const UNPUBLISHED_CAP = 40;

const POINTS = {
  published: 20,
  sellerVerified: 20,
  payment: 20,
  media: 15,
  summary: 10,
  faq: 10,
  features: 5,
} as const;

function isSellerVerifiedTag(tag: string): boolean {
  const trimmed = tag.trim();
  return trimmed === "Verified Seller" || trimmed === "Provider / Developer";
}

function classify(score: number): {
  level: RankingLevel;
  label: RankingResult["label"];
} {
  if (score < 40) return { level: "low", label: "Low trust" };
  if (score < 75) return { level: "medium", label: "Building trust" };
  return { level: "high", label: "Trusted" };
}

export function evaluateProductRanking(input: RankingInput): RankingResult {
  const summaryLen = input.summary.trim().length;
  const summaryOk = summaryLen >= SUMMARY_MIN;
  const featuresOk =
    input.flatFeatureCount >= FLAT_FEATURE_MIN ||
    input.featureGroupCount >= GROUP_MIN;
  const faqOk = input.faqCount >= FAQ_MIN;
  const sellerVerified = isSellerVerifiedTag(input.sellerTag);
  const hasVerifiedPayment = input.verifiedPaymentCount >= 1;

  let raw = 0;
  if (input.published) raw += POINTS.published;
  if (sellerVerified) raw += POINTS.sellerVerified;
  if (hasVerifiedPayment) raw += POINTS.payment;
  if (input.hasMedia) raw += POINTS.media;
  if (summaryOk) raw += POINTS.summary;
  if (faqOk) raw += POINTS.faq;
  if (featuresOk) raw += POINTS.features;

  let score = Math.min(raw, 100);
  if (!input.published) score = Math.min(score, UNPUBLISHED_CAP);

  const { level, label } = classify(score);

  // publicSignals: only emit the safe buyer-facing badges, in display order.
  const publicSignals: string[] = [];
  if (sellerVerified) publicSignals.push("Seller profile reviewed");
  if (hasVerifiedPayment) publicSignals.push("Verified payment method");
  if (input.hasMedia) publicSignals.push("Media added");
  if (summaryOk) publicSignals.push("Product details complete");
  if (faqOk) publicSignals.push("Buyer questions answered");
  if (featuresOk) publicSignals.push("Feature list detailed");

  // sellerSuggestions: short, prescriptive. Publish suggestion always first
  // when unpublished so sellers know that unlocks visibility.
  const sellerSuggestions: string[] = [];
  if (!input.published) {
    sellerSuggestions.push(
      "Publish to become eligible for marketplace visibility",
    );
  }
  if (!sellerVerified) {
    sellerSuggestions.push(
      "Apply for the Verified Seller or Provider / Developer tag",
    );
  }
  if (!hasVerifiedPayment) {
    sellerSuggestions.push("Verify a payment method on your seller profile");
  }
  if (!input.hasMedia) {
    sellerSuggestions.push("Add at least one image or video");
  }
  if (!summaryOk) {
    sellerSuggestions.push(
      `Add a stronger summary (${SUMMARY_MIN}+ characters)`,
    );
  }
  if (!faqOk) {
    sellerSuggestions.push(`Add at least ${FAQ_MIN} FAQ answers`);
  }
  if (!featuresOk) {
    sellerSuggestions.push(
      `Add more features (${GROUP_MIN} groups or ${FLAT_FEATURE_MIN} flat features)`,
    );
  }

  // adminNotes: full breakdown including raw counts so admins can quickly
  // see what's missing without computing it themselves.
  const adminNotes: string[] = [
    `Status: ${input.published ? "published" : "not published"} (${input.published ? `+${POINTS.published}` : "0"})`,
    `Seller tag: ${input.sellerTag || "—"} (${sellerVerified ? `+${POINTS.sellerVerified}` : "0"})`,
    `Verified payment methods: ${input.verifiedPaymentCount} (${hasVerifiedPayment ? `+${POINTS.payment}` : "0"})`,
    `Media: ${input.hasMedia ? "yes" : "no"} (${input.hasMedia ? `+${POINTS.media}` : "0"})`,
    `Summary: ${summaryLen} chars (${summaryOk ? `+${POINTS.summary}` : "0"})`,
    `FAQ items: ${input.faqCount} (${faqOk ? `+${POINTS.faq}` : "0"})`,
    `Features: ${input.flatFeatureCount} flat / ${input.featureGroupCount} grouped (${featuresOk ? `+${POINTS.features}` : "0"})`,
  ];
  if (!input.published) {
    adminNotes.push(`Hard cap at ${UNPUBLISHED_CAP} because not published`);
  }
  adminNotes.push(`Total: ${score}/100 (${label})`);

  return { score, level, label, publicSignals, sellerSuggestions, adminNotes };
}

/**
 * Whether a product should be badged "New listing" instead of "Low trust"
 * when its computed level is low. Newness is defined as < 14 days from
 * createdAt; we'd rather encourage exploration than dunk on a fresh listing.
 */
export function isNewListing(createdAtIso: string): boolean {
  const created = Date.parse(createdAtIso);
  if (!Number.isFinite(created)) return false;
  return Date.now() - created < 14 * 24 * 60 * 60 * 1000;
}
