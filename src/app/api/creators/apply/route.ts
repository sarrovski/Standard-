import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/roles";
import {
  LIMITS,
  validateOptionalText,
  validateRequiredText,
  validateStringArray,
  validateUrlArray,
} from "@/lib/creator-marketplace";
import type { Database } from "@/lib/supabase/types";

/**
 * Creator application submission.
 *
 *   POST /api/creators/apply
 *     body: { creator_name, email, discord?, starting_rate?, platforms[],
 *             content_types[], games_covered[], portfolio_links[],
 *             availability?, bio? }
 *
 * Auth required — no anonymous applications. We:
 *   1. Reject if the user already has a pending OR approved application
 *      (no spamming duplicates).
 *   2. Validate every field server-side via the shared lib helpers.
 *   3. Insert with status 'pending'; the user can never set status /
 *      admin_notes / reviewed_by — RLS enforces this too.
 *
 * Demo mode: returns { ok: true, demo: true }.
 */

type Body = Record<string, unknown>;

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to apply as a creator." },
      { status: 401 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  // Dedupe: one live application per user.
  const existingRes = await supabase
    .from("creator_applications")
    .select("id, status")
    .eq("profile_id", user.id)
    .in("status", ["pending", "approved"])
    .limit(1);
  if (existingRes.data && existingRes.data.length > 0) {
    const status = (existingRes.data[0] as { status: string }).status;
    return NextResponse.json(
      {
        error:
          status === "approved"
            ? "You already have an approved creator profile."
            : "You already have an application under review.",
      },
      { status: 409 },
    );
  }

  const creatorName = validateRequiredText(
    body.creator_name,
    "Creator name",
    LIMITS.creatorName,
  );
  if (!creatorName.ok) {
    return NextResponse.json({ error: creatorName.error }, { status: 400 });
  }
  const email = validateRequiredText(body.email, "Email", LIMITS.email);
  if (!email.ok) {
    return NextResponse.json({ error: email.error }, { status: 400 });
  }
  const discord = validateOptionalText(body.discord, "Discord", LIMITS.discord.max);
  if (!discord.ok) {
    return NextResponse.json({ error: discord.error }, { status: 400 });
  }
  const startingRate = validateOptionalText(
    body.starting_rate,
    "Starting rate",
    LIMITS.startingRate.max,
  );
  if (!startingRate.ok) {
    return NextResponse.json({ error: startingRate.error }, { status: 400 });
  }
  const availability = validateOptionalText(
    body.availability,
    "Availability",
    LIMITS.availability.max,
  );
  if (!availability.ok) {
    return NextResponse.json({ error: availability.error }, { status: 400 });
  }
  const bio = validateOptionalText(body.bio, "Bio", LIMITS.bio.max);
  if (!bio.ok) {
    return NextResponse.json({ error: bio.error }, { status: 400 });
  }
  const platforms = validateStringArray(
    body.platforms,
    "Platforms",
    LIMITS.platforms,
  );
  if (!platforms.ok) {
    return NextResponse.json({ error: platforms.error }, { status: 400 });
  }
  const contentTypes = validateStringArray(
    body.content_types,
    "Content types",
    LIMITS.contentTypes,
  );
  if (!contentTypes.ok) {
    return NextResponse.json({ error: contentTypes.error }, { status: 400 });
  }
  const gamesCovered = validateStringArray(
    body.games_covered,
    "Games covered",
    LIMITS.gamesCovered,
  );
  if (!gamesCovered.ok) {
    return NextResponse.json({ error: gamesCovered.error }, { status: 400 });
  }
  const portfolioLinks = validateUrlArray(
    body.portfolio_links,
    "Portfolio links",
    LIMITS.portfolioLinks,
  );
  if (!portfolioLinks.ok) {
    return NextResponse.json({ error: portfolioLinks.error }, { status: 400 });
  }

  type ApplicationInsert =
    Database["public"]["Tables"]["creator_applications"]["Insert"];
  const payload: ApplicationInsert = {
    profile_id: user.id,
    creator_name: creatorName.value,
    email: email.value,
    discord: discord.value,
    starting_rate: startingRate.value,
    platforms: platforms.value,
    content_types: contentTypes.value,
    games_covered: gamesCovered.value,
    portfolio_links: portfolioLinks.value,
    availability: availability.value,
    bio: bio.value,
    status: "pending",
  };

  const { error } = await supabase
    .from("creator_applications")
    .insert(payload as never);
  if (error) {
    console.error("[creators/apply] insert failed:", error.message);
    return NextResponse.json(
      { error: "couldn't submit application" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
