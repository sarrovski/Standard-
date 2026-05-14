import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import { withTimeout } from "@/lib/repositories/query-timeout";
import type {
  UICreatorApplication,
  UICreatorCard,
  UICreatorPortfolioItem,
  UICreatorProfile,
  UICreatorRequest,
} from "@/lib/creator-marketplace";

/**
 * Creator Marketplace repositories.
 *
 * - Public reads (active profiles, public portfolio items) use the
 *   user-scoped client — RLS already scopes them to active/public rows.
 * - Owner reads (a creator's own profile / applications / requests, a
 *   seller's sent requests) also use the user-scoped client — RLS scopes
 *   them via auth.uid().
 * - Admin reads use the service-role admin client so the cross-row joins
 *   work regardless of RLS; the admin route guard is always upstream.
 *
 * Row → UI adapters live at the bottom of this file.
 */

type CreatorApplicationRow =
  Database["public"]["Tables"]["creator_applications"]["Row"];
type CreatorProfileRow =
  Database["public"]["Tables"]["creator_profiles"]["Row"];
type CreatorPortfolioItemRow =
  Database["public"]["Tables"]["creator_portfolio_items"]["Row"];
type CreatorRequestRow =
  Database["public"]["Tables"]["creator_requests"]["Row"];

type RepoResult<T> = { data: T; error: { message: string } | null };

function errShape(error: { message: string } | null): { message: string } | null {
  return error ? { message: error.message } : null;
}

export type CreatorFilters = {
  game?: string | null;
  contentType?: string | null;
  platform?: string | null;
  availability?: string | null;
  search?: string | null;
};

// --------------------------------------------------------------------------
// Public reads
// --------------------------------------------------------------------------

/**
 * All active creator profiles, featured first, with a portfolio count and
 * a single public preview item attached. Filters are applied in-app by
 * the caller (the /creators page does client-side filtering) — this just
 * returns the full active set.
 */
export async function getPublicCreators(): Promise<RepoResult<UICreatorCard[]>> {
  const supabase = createClient();
  const profilesRes = await withTimeout(
    supabase
      .from("creator_profiles")
      .select("*")
      .eq("status", "active")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false }),
    { label: "getPublicCreators.profiles" },
  );
  if (profilesRes.error || !profilesRes.data) {
    return { data: [], error: errShape(profilesRes.error) };
  }
  const profiles = profilesRes.data as unknown as CreatorProfileRow[];
  if (profiles.length === 0) return { data: [], error: null };

  const itemsRes = await withTimeout(
    supabase
      .from("creator_portfolio_items")
      .select("*")
      .in(
        "creator_id",
        profiles.map((p) => p.id),
      )
      .eq("is_public", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    { label: "getPublicCreators.items" },
  );
  const items = (itemsRes.data as unknown as CreatorPortfolioItemRow[] | null) ?? [];
  const byCreator = new Map<string, CreatorPortfolioItemRow[]>();
  for (const item of items) {
    const list = byCreator.get(item.creator_id) ?? [];
    list.push(item);
    byCreator.set(item.creator_id, list);
  }

  return {
    data: profiles.map((profile) =>
      adaptCreatorCard(profile, byCreator.get(profile.id) ?? []),
    ),
    error: null,
  };
}

/**
 * A single active creator profile by slug, with all its public portfolio
 * items. Returns { data: null } when no active profile matches — the page
 * renders a 404 in that case.
 */
export async function getPublicCreatorBySlug(slug: string): Promise<{
  data: { profile: UICreatorProfile; items: UICreatorPortfolioItem[] } | null;
  error: { message: string } | null;
}> {
  if (!slug) return { data: null, error: null };
  const supabase = createClient();
  const profileRes = await withTimeout(
    supabase
      .from("creator_profiles")
      .select("*")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle(),
    { label: "getPublicCreatorBySlug.profile" },
  );
  if (profileRes.error) return { data: null, error: errShape(profileRes.error) };
  if (!profileRes.data) return { data: null, error: null };
  const profile = profileRes.data as unknown as CreatorProfileRow;

  const itemsRes = await withTimeout(
    supabase
      .from("creator_portfolio_items")
      .select("*")
      .eq("creator_id", profile.id)
      .eq("is_public", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    { label: "getPublicCreatorBySlug.items" },
  );
  const items = (itemsRes.data as unknown as CreatorPortfolioItemRow[] | null) ?? [];

  return {
    data: {
      profile: adaptCreatorProfile(profile, items),
      items: items.map(adaptCreatorPortfolioItem),
    },
    error: null,
  };
}

// --------------------------------------------------------------------------
// Owner reads (creator dashboard)
// --------------------------------------------------------------------------

/** The creator profile owned by `profileId`, in any status. */
export async function getCreatorProfileByProfileId(
  profileId: string,
): Promise<{
  data: { profile: UICreatorProfile; items: UICreatorPortfolioItem[] } | null;
  error: { message: string } | null;
}> {
  if (!profileId) return { data: null, error: null };
  const supabase = createClient();
  const profileRes = await withTimeout(
    supabase
      .from("creator_profiles")
      .select("*")
      .eq("profile_id", profileId)
      .maybeSingle(),
    { label: "getCreatorProfileByProfileId.profile" },
  );
  if (profileRes.error) return { data: null, error: errShape(profileRes.error) };
  if (!profileRes.data) return { data: null, error: null };
  const profile = profileRes.data as unknown as CreatorProfileRow;

  const itemsRes = await withTimeout(
    supabase
      .from("creator_portfolio_items")
      .select("*")
      .eq("creator_id", profile.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    { label: "getCreatorProfileByProfileId.items" },
  );
  const items = (itemsRes.data as unknown as CreatorPortfolioItemRow[] | null) ?? [];

  return {
    data: {
      profile: adaptCreatorProfile(profile, items),
      items: items.map(adaptCreatorPortfolioItem),
    },
    error: null,
  };
}

/** Every creator application submitted by `profileId`, newest first. */
export async function getCreatorApplicationsForProfile(
  profileId: string,
): Promise<RepoResult<UICreatorApplication[]>> {
  if (!profileId) return { data: [], error: null };
  const supabase = createClient();
  const res = await withTimeout(
    supabase
      .from("creator_applications")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false }),
    { label: "getCreatorApplicationsForProfile" },
  );
  if (res.error || !res.data) return { data: [], error: errShape(res.error) };
  return {
    data: (res.data as unknown as CreatorApplicationRow[]).map(
      adaptCreatorApplication,
    ),
    error: null,
  };
}

/** Requests sent to the creator profile `creatorId`, newest first. */
export async function getCreatorRequestsForCreator(
  creatorId: string,
): Promise<RepoResult<UICreatorRequest[]>> {
  if (!creatorId) return { data: [], error: null };
  const supabase = createClient();
  const res = await withTimeout(
    supabase
      .from("creator_requests")
      .select("*, creator:creator_profiles(display_name, slug)")
      .eq("creator_id", creatorId)
      .order("created_at", { ascending: false }),
    { label: "getCreatorRequestsForCreator" },
  );
  if (res.error || !res.data) return { data: [], error: errShape(res.error) };
  return {
    data: (res.data as unknown as CreatorRequestJoinRow[]).map(
      adaptCreatorRequest,
    ),
    error: null,
  };
}

/** Requests sent by the seller `sellerId`, newest first. */
export async function getCreatorRequestsForSeller(
  sellerId: string,
): Promise<RepoResult<UICreatorRequest[]>> {
  if (!sellerId) return { data: [], error: null };
  const supabase = createClient();
  const res = await withTimeout(
    supabase
      .from("creator_requests")
      .select("*, creator:creator_profiles(display_name, slug)")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false }),
    { label: "getCreatorRequestsForSeller" },
  );
  if (res.error || !res.data) return { data: [], error: errShape(res.error) };
  return {
    data: (res.data as unknown as CreatorRequestJoinRow[]).map(
      adaptCreatorRequest,
    ),
    error: null,
  };
}

/** Portfolio items for a creator. `publicOnly` filters to public items. */
export async function getCreatorPortfolioItems(
  creatorId: string,
  opts: { publicOnly?: boolean } = {},
): Promise<RepoResult<UICreatorPortfolioItem[]>> {
  if (!creatorId) return { data: [], error: null };
  const supabase = createClient();
  let query = supabase
    .from("creator_portfolio_items")
    .select("*")
    .eq("creator_id", creatorId);
  if (opts.publicOnly) query = query.eq("is_public", true);
  const res = await withTimeout(
    query
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false }),
    { label: "getCreatorPortfolioItems" },
  );
  if (res.error || !res.data) return { data: [], error: errShape(res.error) };
  return {
    data: (res.data as unknown as CreatorPortfolioItemRow[]).map(
      adaptCreatorPortfolioItem,
    ),
    error: null,
  };
}

// --------------------------------------------------------------------------
// Admin reads
// --------------------------------------------------------------------------

/** All creator applications for the admin queue, pending first. */
export async function getCreatorApplicationsForAdmin(): Promise<
  RepoResult<UICreatorApplication[]>
> {
  const admin = createAdminClient();
  const res = await withTimeout(
    admin
      .from("creator_applications")
      .select("*")
      .order("status", { ascending: true })
      .order("created_at", { ascending: false }),
    { label: "getCreatorApplicationsForAdmin" },
  );
  if (res.error || !res.data) return { data: [], error: errShape(res.error) };
  // status asc puts 'approved' < 'pending' < 'rejected' alphabetically,
  // which isn't what we want — re-sort so pending is first.
  const rows = (res.data as unknown as CreatorApplicationRow[])
    .map(adaptCreatorApplication)
    .sort((a, b) => statusRank(a.status) - statusRank(b.status));
  return { data: rows, error: null };
}

function statusRank(status: CreatorApplicationRow["status"]): number {
  if (status === "pending") return 0;
  if (status === "approved") return 1;
  return 2;
}

/** Applications + profiles for the admin Creators tab. */
export async function getCreatorAdminQueue(): Promise<{
  applications: UICreatorApplication[];
  profiles: Array<
    UICreatorProfile & { portfolioCount: number; requestCount: number }
  >;
  error: { message: string } | null;
}> {
  const admin = createAdminClient();
  const [applicationsRes, profilesRes, itemsRes, requestsRes] =
    await Promise.all([
      withTimeout(
        admin
          .from("creator_applications")
          .select("*")
          .order("created_at", { ascending: false }),
        { label: "getCreatorAdminQueue.applications" },
      ),
      withTimeout(
        admin
          .from("creator_profiles")
          .select("*")
          .order("created_at", { ascending: false }),
        { label: "getCreatorAdminQueue.profiles" },
      ),
      withTimeout(
        admin.from("creator_portfolio_items").select("id, creator_id"),
        { label: "getCreatorAdminQueue.items" },
      ),
      withTimeout(
        admin.from("creator_requests").select("id, creator_id"),
        { label: "getCreatorAdminQueue.requests" },
      ),
    ]);

  const firstError =
    applicationsRes.error ||
    profilesRes.error ||
    itemsRes.error ||
    requestsRes.error;

  const applications = (
    (applicationsRes.data as unknown as CreatorApplicationRow[] | null) ?? []
  )
    .map(adaptCreatorApplication)
    .sort((a, b) => statusRank(a.status) - statusRank(b.status));

  const itemCounts = new Map<string, number>();
  for (const row of (itemsRes.data as unknown as Array<{
    creator_id: string;
  }> | null) ?? []) {
    itemCounts.set(row.creator_id, (itemCounts.get(row.creator_id) ?? 0) + 1);
  }
  const requestCounts = new Map<string, number>();
  for (const row of (requestsRes.data as unknown as Array<{
    creator_id: string;
  }> | null) ?? []) {
    requestCounts.set(
      row.creator_id,
      (requestCounts.get(row.creator_id) ?? 0) + 1,
    );
  }

  const profiles = (
    (profilesRes.data as unknown as CreatorProfileRow[] | null) ?? []
  ).map((row) => ({
    ...adaptCreatorProfile(row, []),
    portfolioCount: itemCounts.get(row.id) ?? 0,
    requestCount: requestCounts.get(row.id) ?? 0,
  }));

  return {
    applications,
    profiles,
    error: firstError ? { message: firstError.message } : null,
  };
}

// --------------------------------------------------------------------------
// Adapters: DB row → UI type
// --------------------------------------------------------------------------

type CreatorRequestJoinRow = CreatorRequestRow & {
  creator: { display_name: string; slug: string } | null;
};

export function adaptCreatorPortfolioItem(
  row: CreatorPortfolioItemRow,
): UICreatorPortfolioItem {
  return {
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    description: row.description,
    itemType: row.item_type,
    game: row.game,
    platform: row.platform,
    externalUrl: row.external_url,
    thumbnailUrl: row.thumbnail_url,
    sortOrder: row.sort_order,
    isPublic: row.is_public,
    createdAt: row.created_at,
  };
}

export function adaptCreatorCard(
  row: CreatorProfileRow,
  portfolioItems: CreatorPortfolioItemRow[],
): UICreatorCard {
  const publicItems = portfolioItems.filter((item) => item.is_public);
  const preview = publicItems[0] ?? null;
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    headline: row.headline,
    avatarUrl: row.avatar_url,
    bannerUrl: row.banner_url,
    platforms: row.platforms ?? [],
    contentTypes: row.content_types ?? [],
    gamesCovered: row.games_covered ?? [],
    startingRate: row.starting_rate,
    availability: row.availability,
    isFeatured: row.is_featured,
    portfolioCount: publicItems.length,
    previewItem: preview ? adaptCreatorPortfolioItem(preview) : null,
  };
}

export function adaptCreatorProfile(
  row: CreatorProfileRow,
  portfolioItems: CreatorPortfolioItemRow[],
): UICreatorProfile {
  return {
    ...adaptCreatorCard(row, portfolioItems),
    bio: row.bio,
    email: row.email,
    discord: row.discord,
    websiteUrl: row.website_url,
    status: row.status,
    createdAt: row.created_at,
    profileId: row.profile_id,
  };
}

export function adaptCreatorRequest(
  row: CreatorRequestJoinRow,
): UICreatorRequest {
  return {
    id: row.id,
    creatorId: row.creator_id,
    creatorName: row.creator?.display_name ?? "Creator",
    creatorSlug: row.creator?.slug ?? "",
    sellerId: row.seller_id,
    requesterProfileId: row.requester_profile_id,
    requesterEmail: row.requester_email,
    requesterDiscord: row.requester_discord,
    title: row.title,
    brief: row.brief,
    budget: row.budget,
    timeline: row.timeline,
    status: row.status,
    creatorNotes: row.creator_notes,
    createdAt: row.created_at,
  };
}

export function adaptCreatorApplication(
  row: CreatorApplicationRow,
): UICreatorApplication {
  return {
    id: row.id,
    profileId: row.profile_id,
    creatorName: row.creator_name,
    email: row.email,
    discord: row.discord,
    startingRate: row.starting_rate,
    platforms: row.platforms ?? [],
    contentTypes: row.content_types ?? [],
    gamesCovered: row.games_covered ?? [],
    portfolioLinks: row.portfolio_links ?? [],
    availability: row.availability,
    bio: row.bio,
    status: row.status,
    adminNotes: row.admin_notes,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}
