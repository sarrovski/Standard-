import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/roles";
import { validateAppealReason } from "@/lib/product-reviews";
import type { Database } from "@/lib/supabase/types";

/**
 * Seller-side appeal endpoint.
 *
 *   POST /api/seller/product-reviews/[id]/appeal
 *     body: { reason }
 *
 * Auth: seller must be signed in AND own the seller record attached to
 * the review. We verify ownership server-side via the sellers table, then
 * use the service-role admin client to flip status `approved` → `appealed`
 * (RLS on UPDATE is admin-only, so a user-scoped client wouldn't be able
 * to do this directly).
 *
 * Only `approved` reviews can be appealed. Already-appealed or rejected
 * reviews return 409.
 */

type Body = { reason?: unknown };

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const reviewId = params.id;
  if (!reviewId) {
    return NextResponse.json({ error: "missing review id" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }

  let parsed: Body;
  try {
    parsed = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const reasonResult = validateAppealReason(parsed.reason);
  if (!reasonResult.ok) {
    return NextResponse.json({ error: reasonResult.error }, { status: 400 });
  }

  const admin = createAdminClient();

  // Load the review + seller for ownership verification.
  const reviewRes = await admin
    .from("product_reviews")
    .select("id, seller_id, status")
    .eq("id", reviewId)
    .maybeSingle<{
      id: string;
      seller_id: string;
      status: Database["public"]["Tables"]["product_reviews"]["Row"]["status"];
    }>();
  if (reviewRes.error || !reviewRes.data) {
    return NextResponse.json({ error: "review not found" }, { status: 404 });
  }
  const review = reviewRes.data;

  const ownerRes = await admin
    .from("sellers")
    .select("id")
    .eq("id", review.seller_id)
    .eq("profile_id", user.id)
    .maybeSingle<{ id: string }>();
  if (!ownerRes.data) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (review.status !== "approved") {
    return NextResponse.json(
      { error: "Only approved reviews can be appealed." },
      { status: 409 },
    );
  }

  type ReviewUpdate =
    Database["public"]["Tables"]["product_reviews"]["Update"];
  const update: ReviewUpdate = {
    status: "appealed",
    appeal_reason: reasonResult.value,
    // Reset prior admin stamps when an appeal lands so the queue UX is clean.
    reviewed_by: null,
    reviewed_at: null,
  };
  const { error } = await admin
    .from("product_reviews")
    .update(update as never)
    .eq("id", reviewId);
  if (error) {
    console.error(
      "[seller/product-reviews/appeal POST] update failed:",
      error.message,
    );
    return NextResponse.json(
      { error: "couldn't submit appeal" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
