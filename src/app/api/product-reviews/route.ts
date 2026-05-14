import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/roles";
import {
  validateBody,
  validateRating,
} from "@/lib/product-reviews";
import type { Database } from "@/lib/supabase/types";

/**
 * Public review submission endpoint.
 *
 *   POST /api/product-reviews
 *     body: { product_id, rating, body }
 *
 * Auth required (no anonymous reviews). We:
 *   1. Reject unauthenticated callers up front.
 *   2. Validate rating (1..5) + body (1..1200) via the shared lib helpers.
 *   3. Look up the product → derive seller_id.
 *   4. Reject if the caller is the seller of the product (own-product
 *      check). RLS enforces this too as defense-in-depth.
 *   5. Insert via the user-scoped client so RLS evaluates the
 *      reviewer_profile_id == auth.uid() invariant.
 *
 * Auto-publish: status defaults to `approved`. Admin moderation kicks in
 * only after a seller appeal.
 *
 * Demo mode: returns { ok: true, demo: true } and skips the DB write.
 */

type Body = {
  product_id?: unknown;
  rating?: unknown;
  body?: unknown;
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to leave a review." },
      { status: 401 },
    );
  }

  let parsed: Body;
  try {
    parsed = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const productId = readString(parsed.product_id);
  if (!productId) {
    return NextResponse.json(
      { error: "product_id is required" },
      { status: 400 },
    );
  }

  const ratingResult = validateRating(parsed.rating);
  if (!ratingResult.ok) {
    return NextResponse.json({ error: ratingResult.error }, { status: 400 });
  }
  const bodyResult = validateBody(parsed.body);
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: 400 });
  }

  // Look up product → seller_id. Admin client so we don't depend on the
  // public read policy returning the row (it does today, but this also
  // avoids a join in the user-scoped client).
  const admin = createAdminClient();
  const productRes = await admin
    .from("products")
    .select("id, seller_id")
    .eq("id", productId)
    .maybeSingle<{ id: string; seller_id: string }>();
  if (productRes.error || !productRes.data) {
    return NextResponse.json({ error: "product not found" }, { status: 404 });
  }
  const sellerId = productRes.data.seller_id;

  // Own-product check: does the caller own the seller record for this product?
  const ownerRes = await admin
    .from("sellers")
    .select("id")
    .eq("id", sellerId)
    .eq("profile_id", user.id)
    .maybeSingle<{ id: string }>();
  if (ownerRes.data) {
    return NextResponse.json(
      { error: "You can't review your own product." },
      { status: 403 },
    );
  }

  type ReviewInsert =
    Database["public"]["Tables"]["product_reviews"]["Insert"];
  const payload: ReviewInsert = {
    product_id: productId,
    seller_id: sellerId,
    reviewer_profile_id: user.id,
    rating: ratingResult.value,
    body: bodyResult.value,
    status: "approved",
  };

  const { error } = await supabase
    .from("product_reviews")
    .insert(payload as never);
  if (error) {
    console.error("[product-reviews POST] insert failed:", error.message);
    return NextResponse.json(
      { error: "couldn't submit review" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
