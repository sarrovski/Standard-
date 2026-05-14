import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured, requireRole } from "@/lib/roles";
import {
  LIMITS,
  baseCreatorSlug,
  dedupeCreatorSlug,
  validateOptionalText,
} from "@/lib/creator-marketplace";
import type { Database } from "@/lib/supabase/types";

/**
 * Admin review of a creator application.
 *
 *   PATCH /api/admin/creator-applications/[id]
 *     body: { action: "approve" | "reject", admin_notes?: string }
 *
 * On approve:
 *   - mark the application approved + stamp reviewed_by / reviewed_at
 *   - create a creator_profiles row (status 'active') if one doesn't
 *     already exist for this application — idempotent on re-approval
 *   - generate a unique slug from the creator name
 *   - copy the safe fields across (display_name, email, discord,
 *     platforms, content_types, games_covered, starting_rate,
 *     availability, bio)
 *
 * On reject:
 *   - mark the application rejected + store admin_notes + stamps
 *
 * Admin role required (requireRole). All writes use the service-role
 * admin client.
 */

type Body = { action?: unknown; admin_notes?: unknown };

type ApplicationRow =
  Database["public"]["Tables"]["creator_applications"]["Row"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  await requireRole(["admin"]);
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const applicationId = params.id;
  if (!applicationId) {
    return NextResponse.json(
      { error: "missing application id" },
      { status: 400 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const action = typeof body.action === "string" ? body.action : null;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { error: "action must be 'approve' or 'reject'" },
      { status: 400 },
    );
  }
  const adminNotes = validateOptionalText(
    body.admin_notes,
    "Admin notes",
    LIMITS.adminNotes.max,
  );
  if (!adminNotes.ok) {
    return NextResponse.json({ error: adminNotes.error }, { status: 400 });
  }

  // Capture the moderating admin for the audit trail.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const adminId = user?.id ?? null;
  const nowIso = new Date().toISOString();

  const admin = createAdminClient();
  const appRes = await admin
    .from("creator_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle<ApplicationRow>();
  if (appRes.error || !appRes.data) {
    return NextResponse.json(
      { error: "application not found" },
      { status: 404 },
    );
  }
  const application = appRes.data;

  if (action === "reject") {
    type AppUpdate =
      Database["public"]["Tables"]["creator_applications"]["Update"];
    const update: AppUpdate = {
      status: "rejected",
      admin_notes: adminNotes.value,
      reviewed_by: adminId,
      reviewed_at: nowIso,
    };
    const { error } = await admin
      .from("creator_applications")
      .update(update as never)
      .eq("id", applicationId);
    if (error) {
      console.error(
        "[admin/creator-applications] reject failed:",
        error.message,
      );
      return NextResponse.json(
        { error: "couldn't reject application" },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  }

  // action === "approve"
  // Idempotency: if a profile already exists for this application, just
  // re-stamp the application and return it.
  const existingProfileRes = await admin
    .from("creator_profiles")
    .select("id, slug")
    .eq("application_id", applicationId)
    .maybeSingle<{ id: string; slug: string }>();

  let createdSlug = existingProfileRes.data?.slug ?? null;

  if (!existingProfileRes.data) {
    // Generate a unique slug from the creator name.
    const slugsRes = await admin.from("creator_profiles").select("slug");
    const taken = new Set<string>(
      ((slugsRes.data as { slug: string }[] | null) ?? []).map(
        (r) => r.slug,
      ),
    );
    const slug = dedupeCreatorSlug(
      baseCreatorSlug(application.creator_name),
      taken,
    );
    createdSlug = slug;

    type ProfileInsert =
      Database["public"]["Tables"]["creator_profiles"]["Insert"];
    const profilePayload: ProfileInsert = {
      profile_id: application.profile_id,
      application_id: application.id,
      slug,
      display_name: application.creator_name,
      email: application.email,
      discord: application.discord,
      platforms: application.platforms,
      content_types: application.content_types,
      games_covered: application.games_covered,
      starting_rate: application.starting_rate,
      availability: application.availability,
      bio: application.bio,
      status: "active",
    };
    const { error: insertError } = await admin
      .from("creator_profiles")
      .insert(profilePayload as never);
    if (insertError) {
      console.error(
        "[admin/creator-applications] profile insert failed:",
        insertError.message,
      );
      return NextResponse.json(
        { error: "couldn't create creator profile" },
        { status: 500 },
      );
    }
  }

  type AppUpdate =
    Database["public"]["Tables"]["creator_applications"]["Update"];
  const update: AppUpdate = {
    status: "approved",
    admin_notes: adminNotes.value,
    reviewed_by: adminId,
    reviewed_at: nowIso,
  };
  const { error } = await admin
    .from("creator_applications")
    .update(update as never)
    .eq("id", applicationId);
  if (error) {
    console.error(
      "[admin/creator-applications] approve stamp failed:",
      error.message,
    );
    return NextResponse.json(
      { error: "profile created but couldn't stamp application" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, slug: createdSlug });
}
