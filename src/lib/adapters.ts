/**
 * Supabase row → UI shape adapters.
 *
 * The UI types in @/lib/data.ts were designed for the v3-v20 mock prototype and
 * carry presentation fields (gradients, vouch counts, "Recently active", FAQ
 * entries) that have no DB equivalent. These adapters pad those fields with
 * sensible defaults so the existing components can render Supabase-backed data
 * without changing their JSX.
 *
 * Naming convention reminder:
 *   - DB: lowercase snake_case enums  (e.g. "pending_verification")
 *   - UI: capitalized Title Case      (e.g. "Pending verification")
 * The mappers below own this conversion. Do not let DB strings leak into UI
 * components and do not let UI strings leak into DB writes.
 */

import type {
  PaymentMethod,
  PaymentProfile,
  PaymentVerificationStatus,
} from "@/lib/data";
import type { Database } from "@/lib/supabase/types";

// ---------- DB row aliases ---------------------------------------------------

type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

type ProductRow = Row<"products">;
type SellerRow = Row<"sellers">;
type ProductMediaRow = Row<"product_media">;
type PaymentMethodRow = Row<"payment_methods">;
type SellerPaymentMethodRow = Row<"seller_payment_methods">;
type PaymentVerificationRequestRow = Row<"payment_verification_requests">;
type ProviderTagRequestRow = Row<"provider_tag_requests">;
type TrustSignalRow = Row<"trust_signals">;

// Joined shapes returned by the repositories (using Supabase's nested select).
export type ProductWithJoins = ProductRow & {
  sellers: SellerRow | null;
  product_media: ProductMediaRow[] | null;
};

export type ProductFullJoins = ProductRow & {
  sellers: SellerRow | null;
  product_media: ProductMediaRow[] | null;
  trust_signals: TrustSignalRow[] | null;
  seller_payment_methods:
    | (SellerPaymentMethodRow & { payment_methods: PaymentMethodRow | null })[]
    | null;
};

export type PaymentVerificationRequestWithJoins =
  PaymentVerificationRequestRow & {
    sellers: SellerRow | null;
    products: ProductRow | null;
    payment_methods: PaymentMethodRow | null;
  };

export type ProviderTagRequestWithJoins = ProviderTagRequestRow & {
  sellers: SellerRow | null;
};

// ---------- Enum mappers -----------------------------------------------------

const PAYMENT_STATUS_DB_TO_UI: Record<
  Database["public"]["Enums"]["payment_verification_status"],
  PaymentVerificationStatus
> = {
  pending_verification: "Pending verification",
  verified: "Verified",
  rejected: "Rejected",
  needs_recheck: "Needs re-check",
};

export function mapPaymentStatusToUI(
  status: Database["public"]["Enums"]["payment_verification_status"],
): PaymentVerificationStatus {
  return PAYMENT_STATUS_DB_TO_UI[status];
}

// `payment_methods.name` in the DB is free-form. Coerce only when it matches a
// known UI PaymentMethod value; otherwise fall back to a safe default. This
// keeps the UI typing strict without crashing on unexpected DB rows.
const KNOWN_PAYMENT_METHODS: readonly string[] = [
  "Crypto",
  "PayPal G&S",
  "PayPal F&F",
  "Card",
  "CashApp",
  "Skrill",
  "Wise",
  "Gift Cards",
  "Bank Transfer",
];

export function coercePaymentMethod(name: string | null | undefined): PaymentMethod {
  if (name && (KNOWN_PAYMENT_METHODS as readonly string[]).includes(name)) {
    return name as PaymentMethod;
  }
  return "Card";
}

// ---------- Visual defaults for fields the DB doesn't store -----------------

// Rotates through gradients deterministically based on slug hash so the same
// product always gets the same accent across renders.
const ACCENTS: readonly string[] = [
  "from-violet-500/70 to-cyan-400/40",
  "from-fuchsia-500/70 to-orange-400/40",
  "from-emerald-500/70 to-cyan-400/40",
  "from-indigo-500/70 to-purple-500/40",
  "from-amber-500/70 to-rose-400/40",
];

function accentForSlug(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return ACCENTS[hash % ACCENTS.length] ?? ACCENTS[0]!;
}

// ---------- Product card adapter (used by marketplace) ----------------------

export type UIProductCard = {
  slug: string;
  name: string;
  seller: string;
  sellerTag: string;
  game: string;
  category: string;
  architecture: string;
  productStatus: string;
  integrity: number | null;
  confidence: string;
  activity: { vouches: number; views: number; replies: number; lastSeen: string };
  verifiedPayments: PaymentMethod[];
  features: string[];
  pricePoints: string[];
  delivery: string;
  accent: string;
  summary: string;
  // Extra fields tolerated by the UI components but defaulted here:
  websiteUrl?: string;
  websiteLabel?: string;
  paymentProfiles: PaymentProfile[];
  // First product media image when available, used as the marketplace card
  // background. Falls back to the gradient accent when null.
  coverImageUrl: string | null;
};

function tagFromProviderStatus(
  status: Database["public"]["Enums"]["provider_tag_status"] | null | undefined,
): string {
  if (status === "approved") return "Provider / Developer";
  return "Seller";
}

export function adaptProductCard(
  row: ProductWithJoins,
  verifiedMethodNames: string[] = [],
): UIProductCard {
  const seller = row.sellers;
  const sortedMedia = (row.product_media ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
  const coverImageUrl = sortedMedia[0]?.public_url ?? null;
  return {
    slug: row.slug,
    name: row.name,
    seller: seller?.seller_name ?? "Unknown seller",
    sellerTag: tagFromProviderStatus(seller?.provider_tag_status),
    game: row.game,
    category: row.category,
    architecture: "External",
    productStatus: row.status === "published" ? "Verified" : "Pending review",
    integrity: row.trust_score,
    confidence: row.trust_score && row.trust_score >= 70 ? "High" : "Medium",
    activity: { vouches: 0, views: 0, replies: 0, lastSeen: "Recently active" },
    verifiedPayments: verifiedMethodNames.map(coercePaymentMethod),
    features: row.features ?? [],
    pricePoints: row.price_points ?? [],
    delivery: "Instant",
    accent: accentForSlug(row.slug),
    summary: row.summary ?? "",
    websiteUrl: row.website_url ?? undefined,
    websiteLabel: row.website_url ? "Visit official website" : undefined,
    paymentProfiles: [],
    coverImageUrl,
  };
}

// ---------- Full product detail adapter (used by /products/[slug]) ---------

export type UIProductDetail = UIProductCard & {
  refundPolicy: string;
  websiteUrl: string;
  websiteLabel: string;
  discord: string;
  telegram: string;
  trustSignals: string[];
  gallery: { title: string; accent: string; imageUrl: string | null }[];
  faq: { q: string; a: string }[];
};

export function adaptProductDetail(row: ProductFullJoins): UIProductDetail {
  const seller = row.sellers;

  // Build PaymentProfile list from joined seller_payment_methods. Verified rows
  // make it into verifiedPayments; everything else stays in paymentProfiles for
  // the "under review" panel.
  const profiles: PaymentProfile[] = (row.seller_payment_methods ?? []).map(
    (spm) => ({
      method: coercePaymentMethod(spm.payment_methods?.name),
      status: mapPaymentStatusToUI(spm.status),
      processor: spm.processor ?? "—",
      proofType: "Verified by Standard team",
      proofNote: "Proof on file with Standard.",
      checkoutUrl: spm.checkout_url ?? undefined,
      refundPolicy: spm.refund_policy_url ?? undefined,
      verifiedAt: spm.verified_at ?? undefined,
      expiresAt: spm.expires_at ?? undefined,
    }),
  );

  const verifiedPayments: PaymentMethod[] = profiles
    .filter((p) => p.status === "Verified")
    .map((p) => p.method);

  const trustSignals: string[] = [];
  if (seller?.provider_tag_status === "approved") {
    trustSignals.push("Provider / Developer");
  }
  if (verifiedPayments.length > 0) {
    trustSignals.push("Payment profile reviewed");
  }
  for (const ts of row.trust_signals ?? []) {
    if (ts.is_public && ts.label) trustSignals.push(ts.label);
  }

  const gallery = (row.product_media ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m, idx) => ({
      title: m.alt_text ?? `Media ${idx + 1}`,
      accent: ACCENTS[idx % ACCENTS.length] ?? ACCENTS[0]!,
      imageUrl: m.public_url,
    }));

  const card = adaptProductCard(row, verifiedPayments);

  return {
    ...card,
    paymentProfiles: profiles,
    refundPolicy: "See seller's official site",
    websiteUrl: row.website_url ?? "",
    websiteLabel: row.website_url ? "Visit official website" : "Website not provided",
    discord: seller?.discord_handle ?? "",
    telegram: seller?.telegram_handle ?? "",
    trustSignals,
    gallery,
    faq: [],
  };
}

// ---------- Admin queue adapters ------------------------------------------

export type UIAdminPaymentRequest = {
  id: string;
  seller: string;
  product: string;
  productSlug: string | null;
  method: PaymentMethod;
  status: PaymentVerificationStatus;
  risk: "Low" | "Medium" | "High";
  submittedProof: string;
  checkoutUrl: string;
  refundPolicy: string;
};

export function adaptAdminPaymentRequest(
  row: PaymentVerificationRequestWithJoins,
): UIAdminPaymentRequest {
  return {
    id: row.id,
    seller: row.sellers?.seller_name ?? "Unknown seller",
    product: row.products?.name ?? "—",
    productSlug: row.products?.slug ?? null,
    method: coercePaymentMethod(row.payment_methods?.name),
    status: mapPaymentStatusToUI(row.status),
    risk: "Medium",
    submittedProof: row.seller_notes ?? row.external_proof_url ?? "Proof submitted via Standard.",
    checkoutUrl: row.external_proof_url ?? "—",
    refundPolicy: "See seller submission",
  };
}

export type UIAdminProviderTagRequest = {
  id: string;
  seller: string;
  product: string;
  status: "Pending" | "Approved" | "Rejected";
};

export function adaptAdminProviderTagRequest(
  row: ProviderTagRequestWithJoins,
): UIAdminProviderTagRequest {
  const statusMap: Record<
    Database["public"]["Enums"]["provider_tag_status"],
    "Pending" | "Approved" | "Rejected"
  > = {
    none: "Pending",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
  };
  return {
    id: row.id,
    seller: row.sellers?.seller_name ?? "Unknown seller",
    product: row.website_url ?? row.discord_handle ?? "Provider tag request",
    status: statusMap[row.status],
  };
}

// ---------- Seller dashboard adapters --------------------------------------

/**
 * Shape used by the seller "Produits" tab card. Mirrors the demo
 * sellerProducts[] from data.ts so the existing JSX renders unchanged.
 */
/**
 * Single piece of product media surfaced in the UI.
 */
export type UIProductMedia = {
  id: string;
  storagePath: string;
  publicUrl: string | null;
  altText: string | null;
  sortOrder: number;
};

export type UISellerProductCard = {
  id: string;
  slug: string;
  name: string;
  status: string;
  toolStatus: string;
  game: string;
  category: string;
  features: string[];
  views: number;
  outboundClicks: number;
  outboundCtr: string;
  integrity: string;
  pageTemplate: string;
  mediaAssets: number;
  website: string;
  nextAction: string;
  // Raw DB status — the UI uses `status` for the human label, this for the
  // publish/archive button logic.
  rawStatus: "draft" | "published" | "archived";
  // Sorted list of attached media (Supabase mode). Empty array in demo mode.
  media: UIProductMedia[];
};

export function adaptSellerProductCard(
  row: ProductRow & { product_media?: ProductMediaRow[] | null },
): UISellerProductCard {
  const websiteHost = row.website_url
    ? row.website_url.replace(/^https?:\/\//, "")
    : "—";
  const statusLabel =
    row.status === "published"
      ? "Verified"
      : row.status === "draft"
        ? "Pending Review"
        : "Archived";
  const media: UIProductMedia[] = (row.product_media ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => ({
      id: m.id,
      storagePath: m.storage_path,
      publicUrl: m.public_url,
      altText: m.alt_text,
      sortOrder: m.sort_order,
    }));
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: statusLabel,
    rawStatus: row.status,
    toolStatus: "Saved to database",
    game: row.game,
    category: row.category,
    features: row.features ?? [],
    views: 0,
    outboundClicks: 0,
    outboundCtr: "0%",
    integrity: row.trust_score != null ? String(row.trust_score) : "Pending",
    pageTemplate: "Hero Spotlight",
    mediaAssets: media.length,
    website: websiteHost,
    nextAction:
      row.status === "draft"
        ? "Submit for review and verify payment methods"
        : row.status === "published"
          ? "Drive traffic from your website"
          : "Reactivate from the Builder",
    media,
  };
}

/**
 * Seller-side payment verification request, used in the "Your payment status"
 * panel of the Payment Verification tab.
 */
export type UISellerPaymentRequest = {
  id: string;
  productName: string;
  productSlug: string | null;
  method: PaymentMethod;
  status: PaymentVerificationStatus;
  proofNote: string;
};

export function adaptSellerPaymentRequest(
  row: PaymentVerificationRequestRow & {
    payment_methods?: PaymentMethodRow | null;
    products?: ProductRow | null;
  },
): UISellerPaymentRequest {
  return {
    id: row.id,
    productName: row.products?.name ?? "—",
    productSlug: row.products?.slug ?? null,
    method: coercePaymentMethod(row.payment_methods?.name),
    status: mapPaymentStatusToUI(row.status),
    proofNote: row.seller_notes ?? row.external_proof_url ?? "—",
  };
}

/** Provider tag request status as the UI displays it. */
export type UISellerProviderTagStatus = "Not requested" | "Pending" | "Approved" | "Rejected";

export function adaptProviderTagStatus(
  row: ProviderTagRequestRow | null,
): UISellerProviderTagStatus {
  if (!row) return "Not requested";
  switch (row.status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "pending":
      return "Pending";
    case "none":
    default:
      return "Not requested";
  }
}

/**
 * Payment method dropdown option. Carries the DB id (UUID) so the seller's
 * verification request submit can post a real payment_method_id.
 */
export type UISellerPaymentMethodOption = {
  id: string;
  name: string;
};

export function adaptPaymentMethodOption(
  row: PaymentMethodRow,
): UISellerPaymentMethodOption {
  return { id: row.id, name: row.name };
}

/**
 * Subscription summary used on the Billing page. The UI cares about a small
 * subset of fields; everything else stays in the DB row.
 */
export type UISellerSubscription = {
  status: string;
  currentPeriodEnd: string | null;
  stripeSubscriptionId: string | null;
};

const SUB_STATUS_LABELS: Record<
  Database["public"]["Enums"]["subscription_status"],
  string
> = {
  active: "Active",
  trialing: "Trialing",
  past_due: "Past due",
  canceled: "Canceled",
  inactive: "Inactive",
};

export function adaptSellerSubscription(
  row: Database["public"]["Tables"]["subscriptions"]["Row"] | null,
): UISellerSubscription | null {
  if (!row) return null;
  return {
    status: SUB_STATUS_LABELS[row.status] ?? row.status,
    currentPeriodEnd: row.current_period_end,
    stripeSubscriptionId: row.stripe_subscription_id,
  };
}
