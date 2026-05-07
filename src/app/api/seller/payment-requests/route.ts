import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/roles";
import { getSellerByProfileId } from "@/lib/repositories/seller";
import type { Database } from "@/lib/supabase/types";

type PaymentVerificationInsert =
  Database["public"]["Tables"]["payment_verification_requests"]["Insert"];

type Body = {
  product_id?: unknown;
  payment_method_id?: unknown;
  external_proof_url?: unknown;
  seller_notes?: unknown;
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/**
 * POST /api/seller/payment-requests
 *
 * Submits a payment method for admin verification. The new row is always
 * status='pending_verification'. Admin approval lives in a future batch.
 *
 * Body:
 *   - product_id (optional, but recommended)
 *   - payment_method_id (required - foreign key to payment_methods)
 *   - external_proof_url (optional)
 *   - seller_notes (optional)
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

  let raw: Body;
  try {
    raw = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const paymentMethodId = readString(raw.payment_method_id);
  if (!paymentMethodId) {
    return NextResponse.json(
      { error: "payment_method_id is required." },
      { status: 400 },
    );
  }

  const productId = readString(raw.product_id);
  if (productId) {
    // Verify the seller owns the product.
    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .eq("seller_id", seller.id)
      .maybeSingle<{ id: string }>();
    if (!product) {
      return NextResponse.json(
        { error: "Product not found or you don't own it." },
        { status: 403 },
      );
    }
  }

  const insertRow: PaymentVerificationInsert = {
    seller_id: seller.id,
    product_id: productId,
    payment_method_id: paymentMethodId,
    status: "pending_verification",
    external_proof_url: readString(raw.external_proof_url),
    seller_notes: readString(raw.seller_notes),
  };

  const { data, error } = await supabase
    .from("payment_verification_requests")
    .insert(insertRow as never)
    .select("id, status")
    .single<{ id: string; status: string }>();

  if (error) {
    console.error("[api/seller/payment-requests POST] insert failed:", error.message);
    return NextResponse.json(
      { error: "Could not submit payment verification request." },
      { status: 500 },
    );
  }

  return NextResponse.json({ request: data });
}
