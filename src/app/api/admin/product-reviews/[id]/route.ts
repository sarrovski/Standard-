import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured, requireRole } from "@/lib/roles";
import type { Database } from "@/lib/supabase/types";

/**
 * Admin moderation endpoint for appealed product reviews.
 *
 *   PATCH /api/admin/product-reviews/[id]
 *     body: { action: "approve" | "reject" }
 *
 * - "approve" re-publishes the review (status → 'approved').
 * - "reject" hides it from public surfaces (status → 'rejected').
 *
 * Auth: admin role required. The RLS UPDATE policy on product_reviews
 * is admin-only as defense-in-depth, but we use the service-role admin
 * client here to bypass any future RLS tightening.
 */

type Action = "approve" | "reject";
type Body = { action?: unknown };

const VALID_ACTIONS: ReadonlySet<Action> = new Set<Action>([
  "approve",
  "reject",
]);

function isAction(value: string): value is Action {
  return VALID_ACTIONS.has(value as Action);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  await requireRole(["admin"]);
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const reviewId = params.id;
  if (!reviewId) {
    return NextResponse.json({ error: "missing review id" }, { status: 400 });
  }

  let parsed: Body;
  try {
    parsed = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const action =
    typeof parsed.action === "string" ? parsed.action.trim() : null;
  if (!action || !isAction(action)) {
    return NextResponse.json(
      { error: "action must be 'approve' or 'reject'" },
      { status: 400 },
    );
  }

  // Capture the moderator's profile id for the audit trail.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  type ReviewUpdate =
    Database["public"]["Tables"]["product_reviews"]["Update"];
  const update: ReviewUpdate = {
    status: action === "approve" ? "approved" : "rejected",
    reviewed_by: user?.id ?? null,
    reviewed_at: new Date().toISOString(),
  };

  const admin = createAdminClient();
  const { error } = await admin
    .from("product_reviews")
    .update(update as never)
    .eq("id", reviewId);
  if (error) {
    console.error(
      "[admin/product-reviews PATCH] update failed:",
      error.message,
    );
    return NextResponse.json(
      { error: "couldn't update review" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
