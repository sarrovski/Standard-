import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, requireRole } from "@/lib/roles";
import type { Database } from "@/lib/supabase/types";

/**
 * Admin moderation endpoint for payment verification requests.
 *
 * PATCH /api/admin/payment-verification/[id]
 *   body: { action: 'approve' | 'reject' | 'needs_recheck', admin_notes?: string,
 *           processor?: string, checkout_url?: string }
 *
 * Auth: requires admin role (requireRole(['admin'])).
 *
 * On approve:
 *   - request.status = verified
 *   - upsert seller_payment_methods (seller_id, payment_method_id)
 *     status = verified, processor + checkout_url applied
 *   - reviewed_at, reviewed_by, admin_notes set
 *
 * On reject:
 *   - request.status = rejected
 *   - upsert seller_payment_methods status = rejected (so the seller's
 *     dashboard reflects the verdict consistently with the request status)
 *
 * On needs_recheck:
 *   - request.status = needs_recheck
 *   - upsert seller_payment_methods status = needs_recheck
 *
 * Every action writes an audit row to admin_actions. The audit insert is
 * best-effort (logged on failure) so a failed audit never blocks the
 * moderation decision itself.
 */

type RequestRow =
  Database["public"]["Tables"]["payment_verification_requests"]["Row"];
type RequestUpdate =
  Database["public"]["Tables"]["payment_verification_requests"]["Update"];
type SellerPaymentMethodInsert =
  Database["public"]["Tables"]["seller_payment_methods"]["Insert"];
type AdminActionInsert =
  Database["public"]["Tables"]["admin_actions"]["Insert"];
type PaymentVerificationStatus =
  Database["public"]["Enums"]["payment_verification_status"];

type Body = {
  action?: unknown;
  admin_notes?: unknown;
  processor?: unknown;
  checkout_url?: unknown;
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function parseAction(
  raw: unknown,
): "approve" | "reject" | "needs_recheck" | null {
  if (raw === "approve" || raw === "reject" || raw === "needs_recheck") return raw;
  return null;
}

function statusForAction(
  action: "approve" | "reject" | "needs_recheck",
): PaymentVerificationStatus {
  switch (action) {
    case "approve":
      return "verified";
    case "reject":
      return "rejected";
    case "needs_recheck":
      return "needs_recheck";
  }
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

  // Authoritative auth check. requireRole redirects in server components, but
  // here it would throw — so we replicate the check inline using the user
  // session and the profiles role.
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
      { error: "action must be one of: approve | reject | needs_recheck." },
      { status: 400 },
    );
  }

  const adminNotes = readString(raw.admin_notes);
  const processor = readString(raw.processor);
  const checkoutUrl = readString(raw.checkout_url);

  // Load the request row so we can read seller_id + payment_method_id for
  // the seller_payment_methods upsert.
  const { data: requestRow, error: loadError } = await supabase
    .from("payment_verification_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle<RequestRow>();

  if (loadError) {
    console.error(
      "[api/admin/payment-verification PATCH] load failed:",
      loadError.message,
    );
    return NextResponse.json(
      { error: "Could not load request." },
      { status: 500 },
    );
  }
  if (!requestRow) {
    return NextResponse.json(
      { error: "Payment verification request not found." },
      { status: 404 },
    );
  }

  const nextStatus = statusForAction(action);
  const nowIso = new Date().toISOString();

  const update: RequestUpdate = {
    status: nextStatus,
    reviewed_at: nowIso,
    reviewed_by: user.id,
  };
  if (adminNotes !== null) update.admin_notes = adminNotes;

  const { error: updateError } = await supabase
    .from("payment_verification_requests")
    .update(update as never)
    .eq("id", requestId);

  if (updateError) {
    console.error(
      "[api/admin/payment-verification PATCH] update failed:",
      updateError.message,
    );
    return NextResponse.json(
      { error: "Could not update request." },
      { status: 500 },
    );
  }

  // Mirror the verdict on seller_payment_methods so the public-side
  // visibility matches. Only verified rows surface in marketplace filters /
  // product pages (per project rules).
  const spmInsert: SellerPaymentMethodInsert = {
    seller_id: requestRow.seller_id,
    payment_method_id: requestRow.payment_method_id,
    status: nextStatus,
    processor,
    checkout_url: checkoutUrl,
    verified_at: action === "approve" ? nowIso : null,
  };

  const { error: spmError } = await supabase
    .from("seller_payment_methods")
    .upsert(spmInsert as never, {
      onConflict: "seller_id,payment_method_id",
    });

  if (spmError) {
    console.error(
      "[api/admin/payment-verification PATCH] seller_payment_methods upsert failed:",
      spmError.message,
    );
    // The request row is already updated. Surface the partial-failure to the
    // admin so they can retry; the next click is idempotent.
    return NextResponse.json(
      {
        warning:
          "Request updated, but the seller_payment_methods row could not be saved.",
        error: spmError.message,
      },
      { status: 207 },
    );
  }

  // Audit log. Best-effort.
  const audit: AdminActionInsert = {
    admin_profile_id: user.id,
    action_type: `payment_verification.${action}`,
    target_table: "payment_verification_requests",
    target_id: requestId,
    notes: adminNotes,
    metadata: {
      seller_id: requestRow.seller_id,
      payment_method_id: requestRow.payment_method_id,
      product_id: requestRow.product_id,
      processor,
      checkout_url: checkoutUrl,
    },
  };
  const { error: auditError } = await supabase
    .from("admin_actions")
    .insert(audit as never);
  if (auditError) {
    console.error(
      "[api/admin/payment-verification PATCH] audit insert failed:",
      auditError.message,
    );
  }

  return NextResponse.json({
    request_id: requestId,
    status: nextStatus,
  });
}
