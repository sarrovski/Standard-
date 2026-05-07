import { NextResponse } from "next/server";
import { stripe, getSiteUrl } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/roles";

/**
 * Creates a Stripe Billing Portal session for the authenticated user.
 *
 * The user must already have a stripe_customers row (created by the
 * subscription checkout flow). If missing, returns 400 with a hint to start
 * a subscription first — the portal can't be opened for a customer that
 * doesn't exist yet in Stripe.
 */
export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 500 },
    );
  }

  const siteUrl = getSiteUrl();

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Billing portal is unavailable in demo mode." },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: customerRow, error: lookupError } = await supabase
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("profile_id", user.id)
    .maybeSingle<{ stripe_customer_id: string }>();

  if (lookupError) {
    console.error("[stripe/billing-portal] lookup error:", lookupError.message);
    return NextResponse.json(
      { error: "Could not look up Stripe customer." },
      { status: 500 },
    );
  }

  if (!customerRow?.stripe_customer_id) {
    return NextResponse.json(
      {
        error:
          "No Stripe customer for this account yet. Start a subscription before opening the billing portal.",
      },
      { status: 400 },
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerRow.stripe_customer_id,
    return_url: `${siteUrl}/dashboard/billing`,
  });

  return NextResponse.json({ url: session.url });
}
