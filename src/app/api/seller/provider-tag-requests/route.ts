import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/roles";
import { getSellerByProfileId } from "@/lib/repositories/seller";
import type { Database } from "@/lib/supabase/types";

type ProviderTagRequestInsert =
  Database["public"]["Tables"]["provider_tag_requests"]["Insert"];

type Body = {
  website_url?: unknown;
  discord_handle?: unknown;
  telegram_handle?: unknown;
  proof_url?: unknown;
  seller_notes?: unknown;
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/**
 * POST /api/seller/provider-tag-requests
 *
 * Submits a Provider/Developer tag request. Status starts pending. Admin
 * approval lives in a future batch.
 *
 * Only one open (pending) request per seller. If one already exists, returns
 * 409 with the existing request id so the UI can show its current state.
 */
export async function POST(request: NextRequest) {
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

  const { data: seller, error: sellerError } = await getSellerByProfileId(user.id);
  if (sellerError || !seller) {
    return NextResponse.json(
      { error: "No seller account. Subscribe first." },
      { status: 403 },
    );
  }

  // Reject if an open (pending) request already exists.
  const { data: existing } = await supabase
    .from("provider_tag_requests")
    .select("id, status")
    .eq("seller_id", seller.id)
    .eq("status", "pending")
    .maybeSingle<{ id: string; status: string }>();
  if (existing) {
    return NextResponse.json(
      {
        error: "A pending provider tag request already exists.",
        existing_request_id: existing.id,
      },
      { status: 409 },
    );
  }

  let raw: Body;
  try {
    raw = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const insertRow: ProviderTagRequestInsert = {
    seller_id: seller.id,
    status: "pending",
    website_url: readString(raw.website_url),
    discord_handle: readString(raw.discord_handle),
    telegram_handle: readString(raw.telegram_handle),
    proof_url: readString(raw.proof_url),
    seller_notes: readString(raw.seller_notes),
  };

  const { data, error } = await supabase
    .from("provider_tag_requests")
    .insert(insertRow as never)
    .select("id, status")
    .single<{ id: string; status: string }>();

  if (error) {
    console.error(
      "[api/seller/provider-tag-requests POST] insert failed:",
      error.message,
    );
    return NextResponse.json(
      { error: "Could not submit provider tag request." },
      { status: 500 },
    );
  }

  return NextResponse.json({ request: data });
}
