import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/roles";
import {
  LIMITS,
  validateEnum,
  validateOptionalText,
} from "@/lib/creator-marketplace";
import type { Database } from "@/lib/supabase/types";

/**
 * Creator updates a brief sent to them.
 *
 *   PATCH /api/creator/requests/[id]
 *     body: { status?: "responded" | "closed" | "declined",
 *             creator_notes?: string }
 *
 * The creator can move a brief through the responded / closed / declined
 * states and attach private notes. They cannot reopen a request to 'open'
 * (that's the requester-side initial state). Ownership is verified by
 * joining the request's creator profile and checking profile_id.
 */

const CREATOR_SETTABLE_STATUSES = [
  "responded",
  "closed",
  "declined",
] as const;

type Body = Record<string, unknown>;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, demo: true });
  }
  const requestId = params.id;
  if (!requestId) {
    return NextResponse.json({ error: "missing request id" }, { status: 400 });
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

  const admin = createAdminClient();
  const reqRes = await admin
    .from("creator_requests")
    .select("id, creator:creator_profiles(id, profile_id)")
    .eq("id", requestId)
    .maybeSingle<{
      id: string;
      creator: { id: string; profile_id: string | null } | null;
    }>();
  if (reqRes.error || !reqRes.data) {
    return NextResponse.json({ error: "request not found" }, { status: 404 });
  }
  if (reqRes.data.creator?.profile_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  type RequestUpdate =
    Database["public"]["Tables"]["creator_requests"]["Update"];
  const update: RequestUpdate = {};

  if (body.status !== undefined) {
    const parsed = validateEnum(
      body.status,
      CREATOR_SETTABLE_STATUSES,
      "Status",
    );
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    update.status = parsed.value;
  }
  if (body.creator_notes !== undefined) {
    const notes = validateOptionalText(
      body.creator_notes,
      "Notes",
      LIMITS.creatorNotes.max,
    );
    if (!notes.ok) {
      return NextResponse.json({ error: notes.error }, { status: 400 });
    }
    update.creator_notes = notes.value;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "nothing to update" },
      { status: 400 },
    );
  }

  const { error } = await admin
    .from("creator_requests")
    .update(update as never)
    .eq("id", requestId);
  if (error) {
    console.error("[creator/requests PATCH] update failed:", error.message);
    return NextResponse.json(
      { error: "couldn't update request" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
