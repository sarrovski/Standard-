/**
 * Shared types, validation, and copy for the Creator Marketplace MVP.
 *
 * Standard helps sellers DISCOVER media creators and SEND briefs. It does
 * not process creator payments, hold escrow, run chat, or handle
 * contracts — the seller/creator deal happens externally.
 *
 * Validation here is the single source of truth: API routes and client
 * forms both call into these helpers so the rules can't drift. The DB
 * column CHECKs in migration 017 enforce the same bounds as a last line
 * of defense.
 */

import type { Database } from "@/lib/supabase/types";

// --------------------------------------------------------------------------
// Enum value sets (mirror migration 017)
// --------------------------------------------------------------------------

export type CreatorApplicationStatus =
  Database["public"]["Tables"]["creator_applications"]["Row"]["status"];
export type CreatorProfileStatus =
  Database["public"]["Tables"]["creator_profiles"]["Row"]["status"];
export type CreatorRequestStatus =
  Database["public"]["Tables"]["creator_requests"]["Row"]["status"];
export type PortfolioItemType =
  Database["public"]["Tables"]["creator_portfolio_items"]["Row"]["item_type"];

export const CREATOR_APPLICATION_STATUSES: readonly CreatorApplicationStatus[] =
  ["pending", "approved", "rejected"];
export const CREATOR_PROFILE_STATUSES: readonly CreatorProfileStatus[] = [
  "draft",
  "active",
  "hidden",
  "suspended",
];
export const CREATOR_REQUEST_STATUSES: readonly CreatorRequestStatus[] = [
  "open",
  "responded",
  "closed",
  "declined",
];
export const PORTFOLIO_ITEM_TYPES: readonly PortfolioItemType[] = [
  "video",
  "image",
  "thumbnail",
  "trailer",
  "short_form",
  "review",
  "promo",
  "other",
];

export const PORTFOLIO_ITEM_TYPE_LABEL: Record<PortfolioItemType, string> = {
  video: "Video",
  image: "Image",
  thumbnail: "Thumbnail",
  trailer: "Trailer",
  short_form: "Short-form",
  review: "Review",
  promo: "Promo",
  other: "Other",
};

export const CREATOR_REQUEST_STATUS_LABEL: Record<
  CreatorRequestStatus,
  string
> = {
  open: "Open",
  responded: "Responded",
  closed: "Closed",
  declined: "Declined",
};

export const CREATOR_PROFILE_STATUS_LABEL: Record<
  CreatorProfileStatus,
  string
> = {
  draft: "Draft — awaiting review",
  active: "Active",
  hidden: "Hidden",
  suspended: "Suspended",
};

// Suggested option chips for the apply form / dashboards. Free text is
// still allowed server-side; these are just convenient presets.
export const PLATFORM_OPTIONS = [
  "TikTok",
  "YouTube",
  "YouTube Shorts",
  "Instagram",
  "Twitch",
  "X",
] as const;
export const CONTENT_TYPE_OPTIONS = [
  "Showcases",
  "Trailers",
  "Thumbnails",
  "Short-form",
  "Reviews",
  "Promos",
] as const;

// --------------------------------------------------------------------------
// Length + count limits (mirror migration 017 column CHECKs)
// --------------------------------------------------------------------------

export const LIMITS = {
  creatorName: { min: 2, max: 80 },
  email: { min: 3, max: 160 },
  discord: { max: 80 },
  startingRate: { max: 80 },
  availability: { max: 160 },
  bio: { max: 1200 },
  profileBio: { max: 1600 },
  headline: { max: 140 },
  websiteUrl: { max: 500 },
  adminNotes: { max: 2000 },
  creatorNotes: { max: 2000 },
  // portfolio items
  itemTitle: { min: 2, max: 100 },
  itemDescription: { max: 1000 },
  itemGame: { max: 80 },
  itemPlatform: { max: 80 },
  itemUrl: { max: 500 },
  // requests
  requestTitle: { min: 2, max: 120 },
  requestBrief: { min: 10, max: 3000 },
  budget: { max: 80 },
  timeline: { max: 120 },
  // arrays
  platforms: 10,
  contentTypes: 10,
  gamesCovered: 20,
  portfolioLinks: 10,
} as const;

// --------------------------------------------------------------------------
// Validation primitives
// --------------------------------------------------------------------------

export type Validated<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/** Trim a string input; returns null when not a non-empty string. */
export function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function validateRequiredText(
  value: unknown,
  label: string,
  bounds: { min?: number; max: number },
): Validated<string> {
  const str = readString(value);
  if (!str) return { ok: false, error: `${label} is required.` };
  if (bounds.min && str.length < bounds.min) {
    return {
      ok: false,
      error: `${label} must be at least ${bounds.min} characters.`,
    };
  }
  if (str.length > bounds.max) {
    return {
      ok: false,
      error: `${label} must be ${bounds.max} characters or fewer.`,
    };
  }
  return { ok: true, value: str };
}

export function validateOptionalText(
  value: unknown,
  label: string,
  max: number,
): Validated<string | null> {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null };
  }
  const str = readString(value);
  if (!str) return { ok: true, value: null };
  if (str.length > max) {
    return {
      ok: false,
      error: `${label} must be ${max} characters or fewer.`,
    };
  }
  return { ok: true, value: str };
}

/**
 * Loose URL validation: must parse as http(s) and stay under the length
 * cap. We never render user URLs as raw HTML — they're only ever used as
 * `href` / `src` attributes — so this guards against javascript: schemes
 * and absurd lengths without being pedantic about the rest.
 */
export function validateOptionalUrl(
  value: unknown,
  label: string,
  max = LIMITS.itemUrl.max,
): Validated<string | null> {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null };
  }
  const str = readString(value);
  if (!str) return { ok: true, value: null };
  if (str.length > max) {
    return { ok: false, error: `${label} must be ${max} characters or fewer.` };
  }
  let parsed: URL;
  try {
    parsed = new URL(str);
  } catch {
    return { ok: false, error: `${label} must be a valid URL.` };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: `${label} must start with http:// or https://.` };
  }
  return { ok: true, value: str };
}

/**
 * Parse a string array from unknown input. Accepts a real array or a
 * comma / newline separated string (the apply form sends both shapes).
 * Trims, drops empties, dedupes, caps item count + per-item length.
 */
export function validateStringArray(
  value: unknown,
  label: string,
  maxItems: number,
  maxItemLength = 120,
): Validated<string[]> {
  let raw: unknown[];
  if (Array.isArray(value)) {
    raw = value;
  } else if (typeof value === "string") {
    raw = value.split(/[\n,]/);
  } else if (value === undefined || value === null) {
    return { ok: true, value: [] };
  } else {
    return { ok: false, error: `${label} is invalid.` };
  }
  const cleaned: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.length > maxItemLength) {
      return {
        ok: false,
        error: `Each ${label} entry must be ${maxItemLength} characters or fewer.`,
      };
    }
    if (!cleaned.includes(trimmed)) cleaned.push(trimmed);
  }
  if (cleaned.length > maxItems) {
    return {
      ok: false,
      error: `${label}: keep it to ${maxItems} entries or fewer.`,
    };
  }
  return { ok: true, value: cleaned };
}

/** Same as validateStringArray but every entry must be a valid http(s) URL. */
export function validateUrlArray(
  value: unknown,
  label: string,
  maxItems: number,
): Validated<string[]> {
  const arr = validateStringArray(value, label, maxItems, LIMITS.itemUrl.max);
  if (!arr.ok) return arr;
  for (const entry of arr.value) {
    const urlCheck = validateOptionalUrl(entry, label);
    if (!urlCheck.ok) return { ok: false, error: urlCheck.error };
  }
  return arr;
}

export function validateEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string,
): Validated<T> {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) {
    return { ok: true, value: value as T };
  }
  return {
    ok: false,
    error: `${label} must be one of: ${allowed.join(", ")}.`,
  };
}

// --------------------------------------------------------------------------
// Slug helper — derive a URL-safe creator slug + collision suffix
// --------------------------------------------------------------------------

/** Base slug from a creator name (lowercase, hyphenated, ascii-ish). */
export function baseCreatorSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return slug.length > 0 ? slug : "creator";
}

/**
 * Given a base slug and the set of slugs already taken, return a free
 * slug — appends `-2`, `-3`, … until it's unique.
 */
export function dedupeCreatorSlug(
  base: string,
  taken: ReadonlySet<string>,
): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

// --------------------------------------------------------------------------
// UI types (row → UI adapters live in repositories/creators.ts)
// --------------------------------------------------------------------------

export type UICreatorPortfolioItem = {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  itemType: PortfolioItemType;
  game: string | null;
  platform: string | null;
  externalUrl: string | null;
  thumbnailUrl: string | null;
  sortOrder: number;
  isPublic: boolean;
  createdAt: string;
};

export type UICreatorCard = {
  id: string;
  slug: string;
  displayName: string;
  headline: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  platforms: string[];
  contentTypes: string[];
  gamesCovered: string[];
  startingRate: string | null;
  availability: string | null;
  isFeatured: boolean;
  portfolioCount: number;
  /** First public portfolio item, when one exists — used for the card preview. */
  previewItem: UICreatorPortfolioItem | null;
};

export type UICreatorProfile = UICreatorCard & {
  bio: string | null;
  email: string | null;
  discord: string | null;
  websiteUrl: string | null;
  status: CreatorProfileStatus;
  createdAt: string;
  /** Set only for the owner / admin view. */
  profileId: string | null;
};

export type UICreatorRequest = {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorSlug: string;
  sellerId: string | null;
  requesterProfileId: string | null;
  requesterEmail: string | null;
  requesterDiscord: string | null;
  title: string;
  brief: string;
  budget: string | null;
  timeline: string | null;
  status: CreatorRequestStatus;
  creatorNotes: string | null;
  createdAt: string;
};

export type UICreatorApplication = {
  id: string;
  profileId: string | null;
  creatorName: string;
  email: string;
  discord: string | null;
  startingRate: string | null;
  platforms: string[];
  contentTypes: string[];
  gamesCovered: string[];
  portfolioLinks: string[];
  availability: string | null;
  bio: string | null;
  status: CreatorApplicationStatus;
  adminNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

// --------------------------------------------------------------------------
// Safe public copy
// --------------------------------------------------------------------------

export const CREATOR_COPY = {
  tagline:
    "Creators help sellers make product showcases, thumbnails, trailers, reviews, and promos.",
  discovery:
    "Standard helps sellers discover creators and send briefs.",
  externalPayments:
    "Payments and delivery are handled externally — Standard doesn't process creator payments in this MVP.",
  reviewNotice:
    "Creator profiles are reviewed before appearing publicly.",
} as const;
