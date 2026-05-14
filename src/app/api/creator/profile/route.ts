import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/roles";
import {
  LIMITS,
  validateOptionalText,
  validateOptionalUrl,
  validateStringArray,
} from "@/lib/creator-marketplace";
import type { Database } from "@/lib/supabase/types";

/**
 * Creator-owned profile read + edit.
 *
 *   GET   /api/creator/profile  -> the caller's own creator profile row
 *   PATCH /api/creator/profile  -> edit the caller's own profile
 *
 * Editable fields only: headline, bio, avatar_url, banner_url,
 * website_url, email, discord, platforms, content_types, games_covered,
 * starting_rate, availability. `status`, `is_featured`, `slug`, and
 * `display_name` are NOT editable here — those are admin-controlled.
 *
 * The write goes through the service-role admin client AFTER we resolve
 * the caller's own profile id, so a malicious payload can't target
 * someone else's row and can't smuggle protected fields.
 */

type Body = Record<string, unknown>;

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ profile: null, demo: true });
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }
  const res = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (res.error) {
    return NextResponse.json(
      { error: "couldn't load creator profile" },
      { status: 500 },
    );
  }
  return NextResponse.json({ profile: res.data ?? null });
}

export async function PATCH(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  // Resolve the caller's own profile id — never trust an id from the body.
  const admin = createAdminClient();
  const ownRes = await admin
    .from("creator_profiles")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle<{ id: string }>();
  if (!ownRes.data) {
    return NextResponse.json(
      { error: "no creator profile for this account" },
      { status: 404 },
    );
  }
  const creatorId = ownRes.data.id;

  const headline = validateOptionalText(
    body.headline,
    "Headline",
    LIMITS.headline.max,
  );
  if (!headline.ok)
    return NextResponse.json({ error: headline.error }, { status: 400 });
  const bio = validateOptionalText(body.bio, "Bio", LIMITS.profileBio.max);
  if (!bio.ok) return NextResponse.json({ error: bio.error }, { status: 400 });
  const avatarUrl = validateOptionalUrl(
    body.avatar_url,
    "Avatar URL",
    LIMITS.websiteUrl.max,
  );
  if (!avatarUrl.ok)
    return NextResponse.json({ error: avatarUrl.error }, { status: 400 });
  const bannerUrl = validateOptionalUrl(
    body.banner_url,
    "Banner URL",
    LIMITS.websiteUrl.max,
  );
  if (!bannerUrl.ok)
    return NextResponse.json({ error: bannerUrl.error }, { status: 400 });
  const websiteUrl = validateOptionalUrl(
    body.website_url,
    "Website URL",
    LIMITS.websiteUrl.max,
  );
  if (!websiteUrl.ok)
    return NextResponse.json({ error: websiteUrl.error }, { status: 400 });
  const email = validateOptionalText(body.email, "Email", LIMITS.email.max);
  if (!email.ok)
    return NextResponse.json({ error: email.error }, { status: 400 });
  const discord = validateOptionalText(
    body.discord,
    "Discord",
    LIMITS.discord.max,
  );
  if (!discord.ok)
    return NextResponse.json({ error: discord.error }, { status: 400 });
  const startingRate = validateOptionalText(
    body.starting_rate,
    "Starting rate",
    LIMITS.startingRate.max,
  );
  if (!startingRate.ok)
    return NextResponse.json({ error: startingRate.error }, { status: 400 });
  const availability = validateOptionalText(
    body.availability,
    "Availability",
    LIMITS.availability.max,
  );
  if (!availability.ok)
    return NextResponse.json({ error: availability.error }, { status: 400 });
  const platforms = validateStringArray(
    body.platforms,
    "Platforms",
    LIMITS.platforms,
  );
  if (!platforms.ok)
    return NextResponse.json({ error: platforms.error }, { status: 400 });
  const contentTypes = validateStringArray(
    body.content_types,
    "Content types",
    LIMITS.contentTypes,
  );
  if (!contentTypes.ok)
    return NextResponse.json({ error: contentTypes.error }, { status: 400 });
  const gamesCovered = validateStringArray(
    body.games_covered,
    "Games covered",
    LIMITS.gamesCovered,
  );
  if (!gamesCovered.ok)
    return NextResponse.json({ error: gamesCovered.error }, { status: 400 });

  type ProfileUpdate =
    Database["public"]["Tables"]["creator_profiles"]["Update"];
  const update: ProfileUpdate = {
    headline: headline.value,
    bio: bio.value,
    avatar_url: avatarUrl.value,
    banner_url: bannerUrl.value,
    website_url: websiteUrl.value,
    email: email.value,
    discord: discord.value,
    starting_rate: startingRate.value,
    availability: availability.value,
    platforms: platforms.value,
    content_types: contentTypes.value,
    games_covered: gamesCovered.value,
  };

  const { error } = await admin
    .from("creator_profiles")
    .update(update as never)
    .eq("id", creatorId);
  if (error) {
    console.error("[creator/profile PATCH] update failed:", error.message);
    return NextResponse.json(
      { error: "couldn't save profile" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
