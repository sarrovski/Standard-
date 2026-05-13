import type { FeatureGroup } from "@/lib/product-features";
import type { FaqItem } from "@/lib/product-faq";

/**
 * Inputs for evaluating a product's seller-facing "Listing strength" score.
 *
 * verifiedPaymentMethodCount is optional: when omitted (e.g. on a surface
 * where seller-level payment data isn't in scope), that check is excluded
 * from both the numerator AND the denominator so the resulting score stays
 * comparable across surfaces.
 */
export type ListingStrengthInput = {
  name: string;
  game: string;
  category: string;
  websiteUrl: string;
  summary: string;
  featureGroups: FeatureGroup[];
  /**
   * Legacy flat features array. When provided, used as a fallback so a
   * product still hits the "6+ features" threshold even if it hasn't been
   * migrated into grouped features yet.
   */
  flatFeatures?: string[];
  faq: FaqItem[];
  imageCount: number;
  videoCount: number;
  verifiedPaymentMethodCount?: number;
  status: "draft" | "published" | "archived";
};

export type ListingStrengthCheck = {
  key: string;
  label: string;
  passed: boolean;
  action: string;
};

export type ListingStrengthResult = {
  score: number;
  checks: ListingStrengthCheck[];
  missing: ListingStrengthCheck[];
};

const SUMMARY_MIN_CHARS = 120;
const FEATURE_GROUP_TARGET = 3;
const FEATURE_TOTAL_TARGET = 6;
const FAQ_TARGET = 4;

export function evaluateListingStrength(
  input: ListingStrengthInput,
): ListingStrengthResult {
  const groupedTotal = input.featureGroups.reduce(
    (sum, group) => sum + group.features.length,
    0,
  );
  const totalFeatures =
    groupedTotal > 0 ? groupedTotal : input.flatFeatures?.length ?? 0;
  const validFaq = input.faq.filter(
    (item) => item.q.trim() !== "" && item.a.trim() !== "",
  ).length;

  const checks: ListingStrengthCheck[] = [
    {
      key: "name",
      label: "Product name",
      passed: input.name.trim() !== "",
      action: "Add a product name",
    },
    {
      key: "game",
      label: "Game",
      passed: input.game.trim() !== "",
      action: "Pick a game",
    },
    {
      key: "category",
      label: "Category",
      passed: input.category.trim() !== "",
      action: "Pick a category",
    },
    {
      key: "website",
      label: "Website URL",
      passed: input.websiteUrl.trim() !== "",
      action: "Add your official website URL",
    },
    {
      key: "summary",
      label: "Summary",
      passed: input.summary.trim().length >= SUMMARY_MIN_CHARS,
      action: `Add a stronger summary (at least ${SUMMARY_MIN_CHARS} characters)`,
    },
    {
      key: "features",
      label: "Features",
      passed:
        input.featureGroups.length >= FEATURE_GROUP_TARGET ||
        totalFeatures >= FEATURE_TOTAL_TARGET,
      action: `Add more features (${FEATURE_GROUP_TARGET} categories or ${FEATURE_TOTAL_TARGET} features total)`,
    },
    {
      key: "faq",
      label: "FAQ",
      passed: validFaq >= FAQ_TARGET,
      action:
        validFaq === 0
          ? `Add at least ${FAQ_TARGET} FAQ answers`
          : `Add ${FAQ_TARGET - validFaq} more FAQ answer${FAQ_TARGET - validFaq === 1 ? "" : "s"}`,
    },
    {
      key: "image",
      label: "Image",
      passed: input.imageCount >= 1,
      action: "Upload at least one product image",
    },
    {
      key: "video",
      label: "Video",
      passed: input.videoCount >= 1,
      action: "Embed at least one product video",
    },
  ];

  if (input.verifiedPaymentMethodCount !== undefined) {
    checks.push({
      key: "payment",
      label: "Verified payment method",
      passed: input.verifiedPaymentMethodCount >= 1,
      action: "Verify a payment method on your seller profile",
    });
  }

  checks.push({
    key: "published",
    label: "Published",
    passed: input.status === "published",
    action: "Publish when ready",
  });

  const passed = checks.filter((check) => check.passed).length;
  const score = Math.round((passed / checks.length) * 100);
  const missing = checks.filter((check) => !check.passed);

  return { score, checks, missing };
}

export type ListingStrengthTone = "red" | "amber" | "green" | "orange";

export function listingStrengthTone(score: number): ListingStrengthTone {
  if (score < 40) return "red";
  if (score < 70) return "amber";
  if (score < 90) return "green";
  return "orange";
}
