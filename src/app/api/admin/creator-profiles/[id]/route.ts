import { type NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, requireRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CREATOR_PROFILE_STATUSES,
  validateEnum,
} from "@/lib/creator-marketplace";
import type { Database } from "@/lib/supabase/types";

/**
 * Admin management of a creator profile.
 *
 *   PATCH /api/admin/creator-profiles/[id]
 *     body: { status?: creator_profile_status, is_featured?: boolean }
 *
 * Used to make a profile active / hidden / suspended and to feature /
 * unfeature it. Admin role required. No destructive delete — hiding or
 * suspending is preferred so the row + its portfolio + request history
 * survive for the audit trail.
 */

type Body = { status?: unknown; is_featured?: unknown };

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  await requireRole(["admin"]);
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const profileId = params.id;
  if (!profileId) {
    return NextResponse.json(
      { error: "missing creator profile id" },
      { status: 400 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  type ProfileUpdate =
    Database["public"]["Tables"]["creator_profiles"]["Update"];
  const update: ProfileUpdate = {};

  if (body.status !== undefined) {
    const parsed = validateEnum(
      body.status,
      CREATOR_PROFILE_STATUSES,
      "Status",
    );
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    update.status = parsed.value;
  }
  if (body.is_featured !== undefined) {
    if (typeof body.is_featured !== "boolean") {
      return NextResponse.json(
        { error: "is_featured must be a boolean" },
        { status: 400 },
      );
    }
    update.is_featured = body.is_featured;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("creator_profiles")
    .update(update as never)
    .eq("id", profileId);
  if (error) {
    console.error(
      "[admin/creator-profiles PATCH] update failed:",
      error.message,
    );
    return NextResponse.json(
      { error: "couldn't update creator profile" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
