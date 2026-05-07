import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/roles";
import type { Database } from "@/lib/supabase/types";

/**
 * Admin moderation endpoint for Provider / Developer tag requests.
 *
 * PATCH /api/admin/provider-tag/[id]
 *   body: { action: 'approve' | 'reject', admin_notes?: string }
 *
 * Auth: requires admin role.
 *
 * On approve:
 *   - request.status = approved
 *   - sellers.provider_tag_status = approved
 *
 * On reject:
 *   - request.status = rejected
 *   - sellers.provider_tag_status = rejected
 *
 * Provider / Developer is a tag, not a role — profiles.role is never
 * touched here. Visibility on public product cards is driven by
 * sellers.provider_tag_status.
 *
 * Every action writes an audit row to admin_actions (best-effort).
 */

type RequestRow = Database["public"]["Tables"]["provider_tag_requests"]["Row"];
type RequestUpdate =
  Database["public"]["Tables"]["provider_tag_requests"]["Update"];
type SellerUpdate = Database["public"]["Tables"]["sellers"]["Update"];
type AdminActionInsert =
  Database["public"]["Tables"]["admin_actions"]["Insert"];
type ProviderTagStatus = Database["public"]["Enums"]["provider_tag_status"];

type Body = {
  action?: unknown;
  admin_notes?: unknown;
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parseAction(raw: unknown): "approve" | "reject" | null {
  if (raw === "approve" || raw === "reject") return raw;
  return null;
}

function statusForAction(action: "approve" | "reject"): ProviderTagStatus {
  return action === "approve" ? "approved" : "rejected";
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase not configured." },
      { status: 503 },
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: "user" | "seller" | "admin" }>();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const requestId = params.id;
  if (!requestId) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  let raw: Body;
  try {
    raw = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = parseAction(raw.action);
  if (!action) {
    return NextResponse.json(
      { error: "action must be one of: approve | reject." },
      { status: 400 },
    );
  }

  const adminNotes = readString(raw.admin_notes);

  const { data: requestRow, error: loadError } = await supabase
    .from("provider_tag_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle<RequestRow>();
  if (loadError) {
    console.error(
      "[api/admin/provider-tag PATCH] load failed:",
      loadError.message,
    );
    return NextResponse.json(
      { error: "Could not load request." },
      { status: 500 },
    );
  }
  if (!requestRow) {
    return NextResponse.json(
      { error: "Provider tag request not found." },
      { status: 404 },
    );
  }

  const nextStatus = statusForAction(action);
  const nowIso = new Date().toISOString();

  const requestUpdate: RequestUpdate = {
    status: nextStatus,
    reviewed_at: nowIso,
    reviewed_by: user.id,
  };
  if (adminNotes !== null) requestUpdate.admin_notes = adminNotes;

  const { error: updateError } = await supabase
    .from("provider_tag_requests")
    .update(requestUpdate as never)
    .eq("id", requestId);
  if (updateError) {
    console.error(
      "[api/admin/provider-tag PATCH] update failed:",
      updateError.message,
    );
    return NextResponse.json(
      { error: "Could not update request." },
      { status: 500 },
    );
  }

  const sellerUpdate: SellerUpdate = {
    provider_tag_status: nextStatus,
  };
  const { error: sellerError } = await supabase
    .from("sellers")
    .update(sellerUpdate as never)
    .eq("id", requestRow.seller_id);
  if (sellerError) {
    console.error(
      "[api/admin/provider-tag PATCH] sellers update failed:",
      sellerError.message,
    );
    return NextResponse.json(
      {
        warning:
          "Request updated, but the sellers.provider_tag_status could not be saved.",
        error: sellerError.message,
      },
      { status: 207 },
    );
  }

  // Audit log.
  const audit: AdminActionInsert = {
    admin_profile_id: user.id,
    action_type: `provider_tag.${action}`,
    target_table: "provider_tag_requests",
    target_id: requestId,
    notes: adminNotes,
    metadata: {
      seller_id: requestRow.seller_id,
    },
  };
  const { error: auditError } = await supabase
    .from("admin_actions")
    .insert(audit as never);
  if (auditError) {
    console.error(
      "[api/admin/provider-tag PATCH] audit insert failed:",
      auditError.message,
    );
  }

  return NextResponse.json({
    request_id: requestId,
    status: nextStatus,
  });
}
