import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/roles";
import type { Database } from "@/lib/supabase/types";

/**
 * Public report submission endpoint.
 *
 *   POST /api/product-reports
 *     body: { product_id, reason, details? }
 *     reason ∈ "misleading_information" | "payment_issue" |
 *              "impersonation" | "broken_official_link" |
 *              "unsafe_or_prohibited" | "other"
 *
 * Anyone (anon or authenticated) can submit. We:
 *   1. Validate the reason against the closed list and cap details length.
 *   2. Look up the product to derive seller_id at insert time.
 *   3. Pull reporter_profile_id from the authenticated session if any.
 *   4. Compute a coarse, day-scoped visitor hash for dedupe / rate limit.
 *   5. Reject duplicates from the same visitor + product within 10 minutes
 *      (cheap spam guard — survives serverless cold starts because the
 *      check is a DB query, not in-memory).
 *   6. Insert via the service-role admin client so the seller_id and
 *      visitor_hash fields are written regardless of RLS.
 *
 * Demo mode (no Supabase env): short-circuit with { ok: true, demo: true }.
 */

const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_DETAILS_LENGTH = 2000;

type ReportReason =
  Database["public"]["Tables"]["product_reports"]["Row"]["reason"];

const VALID_REASONS: ReadonlySet<ReportReason> = new Set<ReportReason>([
  "misleading_information",
  "payment_issue",
  "impersonation",
  "broken_official_link",
  "unsafe_or_prohibited",
  "other",
]);

type Body = {
  product_id?: unknown;
  reason?: unknown;
  details?: unknown;
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isReason(value: string): value is ReportReason {
  return VALID_REASONS.has(value as ReportReason);
}

async function visitorHash(req: NextRequest): Promise<string> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = req.headers.get("user-agent") ?? "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const buf = new TextEncoder().encode(`${ip}|${ua}|${day}`);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest).slice(0, 16))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const productId = readString(body.product_id);
  const reasonRaw = readString(body.reason);
  const details = readOptionalString(body.details);

  if (!productId || !reasonRaw || !isReason(reasonRaw)) {
    return NextResponse.json(
      { error: "product_id and a valid reason are required" },
      { status: 400 },
    );
  }
  if (details && details.length > MAX_DETAILS_LENGTH) {
    return NextResponse.json(
      { error: `details must be ${MAX_DETAILS_LENGTH} characters or fewer` },
      { status: 400 },
    );
  }

  // Reporter profile (optional) — from the authenticated cookies-scoped
  // client. Failure here just means the report is recorded as anonymous.
  let reporterProfileId: string | null = null;
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    reporterProfileId = user?.id ?? null;
  } catch {
    reporterProfileId = null;
  }

  const admin = createAdminClient();

  // Look up product → seller_id. If the product doesn't exist, the report
  // is rejected (otherwise a malicious client could insert reports against
  // fake product IDs).
  const productRes = await admin
    .from("products")
    .select("id, seller_id")
    .eq("id", productId)
    .maybeSingle<{ id: string; seller_id: string }>();
  if (productRes.error || !productRes.data) {
    return NextResponse.json(
      { error: "product not found" },
      { status: 404 },
    );
  }
  const sellerId = productRes.data.seller_id;

  // Rate-limit / dedupe by (visitor_hash, product_id) inside a 10-minute
  // window.
  const hash = await visitorHash(request);
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
  const dupRes = await admin
    .from("product_reports")
    .select("id", { head: true, count: "exact" })
    .eq("product_id", productId)
    .eq("visitor_hash", hash)
    .gte("created_at", since);
  if ((dupRes.count ?? 0) > 0) {
    return NextResponse.json(
      { error: "You've already reported this listing recently. Thanks." },
      { status: 429 },
    );
  }

  type ReportInsert =
    Database["public"]["Tables"]["product_reports"]["Insert"];
  const payload: ReportInsert = {
    product_id: productId,
    seller_id: sellerId,
    reporter_profile_id: reporterProfileId,
    reason: reasonRaw,
    details,
    status: "open",
    visitor_hash: hash,
  };
  const { error } = await admin
    .from("product_reports")
    .insert(payload as never);
  if (error) {
    console.error("[product-reports] insert failed:", error.message);
    return NextResponse.json(
      { error: "couldn't submit report" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
