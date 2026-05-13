import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/roles";
import type { Database } from "@/lib/supabase/types";

type ProductEventInsert =
  Database["public"]["Tables"]["product_events"]["Insert"];

/**
 * Anonymous beacon: record a product page view or an outbound CTA click.
 *
 *   POST /api/product-events    body: { product_id, kind }
 *     kind ∈ "view" | "outbound_click"
 *
 * Auth: none required. Inserts are open to anon + authenticated per
 * migration 010's RLS policy.
 *
 * visitor_hash is a coarse, day-scoped hash of (ip, user-agent) computed
 * here so the DB doesn't have to know about request internals. It's not a
 * stable identity; aggregations can use it to dedupe refresh-spam later.
 */

type Body = { product_id?: unknown; kind?: unknown };

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function isKind(value: string): value is "view" | "outbound_click" {
  return value === "view" || value === "outbound_click";
}

async function hashVisitor(req: NextRequest): Promise<string> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = req.headers.get("user-agent") ?? "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const input = `${ip}|${ua}|${day}`;
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  // Truncate to 16 bytes (32 hex chars). Plenty for dedupe; not reversible.
  return Array.from(new Uint8Array(digest).slice(0, 16))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    // Demo mode: silently accept so the client doesn't spam errors.
    return NextResponse.json({ ok: true, demo: true });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const productId = readString(body.product_id);
  const kindRaw = readString(body.kind);
  if (!productId || !kindRaw || !isKind(kindRaw)) {
    return NextResponse.json(
      { error: "product_id and kind ('view' | 'outbound_click') required" },
      { status: 400 },
    );
  }

  const visitorHash = await hashVisitor(request);

  const supabase = createClient();
  const payload: ProductEventInsert = {
    product_id: productId,
    kind: kindRaw,
    visitor_hash: visitorHash,
  };
  const { error } = await supabase
    .from("product_events")
    .insert(payload as never);
  if (error) {
    // Don't 500 a beacon — it's best-effort tracking. Log and return ok so
    // the client doesn't retry-storm against a transient DB hiccup.
    console.error("[product-events] insert failed:", error.message);
    return NextResponse.json({ ok: false, code: "insert_failed" });
  }

  return NextResponse.json({ ok: true });
}
