import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/roles";
import {
  LIMITS,
  readString,
  validateOptionalText,
  validateRequiredText,
} from "@/lib/creator-marketplace";
import type { Database } from "@/lib/supabase/types";

/**
 * Send a creator brief (a "seller request").
 *
 *   POST /api/creator-requests
 *     body: { creator_slug, title, brief, budget?, timeline?,
 *             requester_email?, requester_discord? }
 *
 * Auth required. We:
 *   1. Resolve the creator by slug and require status 'active'.
 *   2. Attach seller_id automatically when the requester owns a seller.
 *   3. Rate-limit: reject a duplicate (same requester + creator + title)
 *      within a 10-minute window.
 *   4. Insert with status 'open' via the user-scoped client so RLS
 *      double-checks requester_profile_id = auth.uid().
 *
 * No messaging is built — the creator responds externally using the
 * contact details on the brief.
 */

const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
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
      { error: "Sign in to send a creator brief." },
      { status: 401 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const creatorSlug = readString(body.creator_slug);
  if (!creatorSlug) {
    return NextResponse.json(
      { error: "creator_slug is required" },
      { status: 400 },
    );
  }

  const title = validateRequiredText(body.title, "Title", LIMITS.requestTitle);
  if (!title.ok) {
    return NextResponse.json({ error: title.error }, { status: 400 });
  }
  const brief = validateRequiredText(body.brief, "Brief", LIMITS.requestBrief);
  if (!brief.ok) {
    return NextResponse.json({ error: brief.error }, { status: 400 });
  }
  const budget = validateOptionalText(body.budget, "Budget", LIMITS.budget.max);
  if (!budget.ok) {
    return NextResponse.json({ error: budget.error }, { status: 400 });
  }
  const timeline = validateOptionalText(
    body.timeline,
    "Timeline",
    LIMITS.timeline.max,
  );
  if (!timeline.ok) {
    return NextResponse.json({ error: timeline.error }, { status: 400 });
  }
  const requesterEmail = validateOptionalText(
    body.requester_email,
    "Contact email",
    LIMITS.email.max,
  );
  if (!requesterEmail.ok) {
    return NextResponse.json({ error: requesterEmail.error }, { status: 400 });
  }
  const requesterDiscord = validateOptionalText(
    body.requester_discord,
    "Contact Discord",
    LIMITS.discord.max,
  );
  if (!requesterDiscord.ok) {
    return NextResponse.json(
      { error: requesterDiscord.error },
      { status: 400 },
    );
  }
  if (!requesterEmail.value && !requesterDiscord.value) {
    return NextResponse.json(
      { error: "Add at least one contact method (email or Discord)." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Resolve the creator. Must exist and be active.
  const creatorRes = await admin
    .from("creator_profiles")
    .select("id, status")
    .eq("slug", creatorSlug)
    .maybeSingle<{ id: string; status: string }>();
  if (creatorRes.error || !creatorRes.data) {
    return NextResponse.json({ error: "creator not found" }, { status: 404 });
  }
  if (creatorRes.data.status !== "active") {
    return NextResponse.json(
      { error: "This creator isn't accepting briefs right now." },
      { status: 409 },
    );
  }
  const creatorId = creatorRes.data.id;

  // Attach seller_id when the requester owns a seller record.
  const sellerRes = await admin
    .from("sellers")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle<{ id: string }>();
  const sellerId = sellerRes.data?.id ?? null;

  // Rate-limit: same requester + creator + title within 10 minutes.
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
  const dupRes = await admin
    .from("creator_requests")
    .select("id", { head: true, count: "exact" })
    .eq("creator_id", creatorId)
    .eq("requester_profile_id", user.id)
    .eq("title", title.value)
    .gte("created_at", since);
  if ((dupRes.count ?? 0) > 0) {
    return NextResponse.json(
      { error: "You just sent this brief — give the creator a moment." },
      { status: 429 },
    );
  }

  type RequestInsert =
    Database["public"]["Tables"]["creator_requests"]["Insert"];
  const payload: RequestInsert = {
    creator_id: creatorId,
    seller_id: sellerId,
    requester_profile_id: user.id,
    requester_email: requesterEmail.value,
    requester_discord: requesterDiscord.value,
    title: title.value,
    brief: brief.value,
    budget: budget.value,
    timeline: timeline.value,
    status: "open",
  };

  const { error } = await supabase
    .from("creator_requests")
    .insert(payload as never);
  if (error) {
    console.error("[creator-requests] insert failed:", error.message);
    return NextResponse.json(
      { error: "couldn't send brief" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
