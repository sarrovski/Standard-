import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireRole, isSupabaseConfigured } from "@/lib/roles";
import type { Database } from "@/lib/supabase/types";

/**
 * Admin status updates for product reports.
 *
 *   PATCH /api/admin/product-reports/[id]
 *     body: { status: "open" | "reviewed" | "resolved" }
 *
 * Auth: admin role required (requireRole). RLS on product_reports.UPDATE
 * also gates this to admins as a defense-in-depth check, but we redirect
 * from the route guard so non-admins never reach the body parsing.
 */

type ReportStatus =
  Database["public"]["Tables"]["product_reports"]["Row"]["status"];

const VALID_STATUS: ReadonlySet<ReportStatus> = new Set<ReportStatus>([
  "open",
  "reviewed",
  "resolved",
]);

type Body = { status?: unknown };

function isStatus(value: string): value is ReportStatus {
  return VALID_STATUS.has(value as ReportStatus);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  await requireRole(["admin"]);
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const reportId = params.id;
  if (!reportId) {
    return NextResponse.json({ error: "missing report id" }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const status = typeof body.status === "string" ? body.status : null;
  if (!status || !isStatus(status)) {
    return NextResponse.json(
      { error: "status must be one of: open, reviewed, resolved" },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  type ReportUpdate =
    Database["public"]["Tables"]["product_reports"]["Update"];
  const update: ReportUpdate = {
    status,
    reviewed_by: status === "open" ? null : user?.id ?? null,
    reviewed_at: status === "open" ? null : new Date().toISOString(),
  };

  const { error } = await supabase
    .from("product_reports")
    .update(update as never)
    .eq("id", reportId);
  if (error) {
    console.error(
      "[admin/product-reports PATCH] update failed:",
      error.message,
    );
    return NextResponse.json(
      { error: "couldn't update report" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
