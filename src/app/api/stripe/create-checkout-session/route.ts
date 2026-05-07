import { NextResponse } from "next/server";
import { stripe, getSiteUrl } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/roles";
import { getOrCreateStripeCustomer } from "@/lib/stripe-helpers";

/**
 * Creates a Stripe Checkout Session for the seller subscription.
 *
 * Flow:
 *   1. Require an authenticated user (when Supabase is configured).
 *   2. Get-or-create the Stripe customer mapped to the user's profile_id.
 *   3. Create a subscription Checkout Session with metadata used by the
 *      webhook to promote the user to seller and write the subscriptions
 *      row.
 *
 * The webhook (api/stripe/webhook) is what actually flips profile.role and
 * writes subscriptions. This route only creates the session.
 */
export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_SELLER_SUBSCRIPTION_PRICE_ID) {
    return NextResponse.json(
      { error: "Stripe env vars are not configured." },
      { status: 500 },
    );
  }

  const siteUrl = getSiteUrl();

  // Demo mode: no Supabase, no customer, no metadata. Still creates a session
  // so the rest of the flow stays explorable on preview deploys.
  if (!isSupabaseConfigured()) {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        { price: process.env.STRIPE_SELLER_SUBSCRIPTION_PRICE_ID, quantity: 1 },
      ],
      success_url: `${siteUrl}/dashboard/billing?checkout=success`,
      cancel_url: `${siteUrl}/plans?checkout=cancelled`,
      metadata: { checkout_type: "seller_subscription" },
    });
    return NextResponse.json({ url: session.url });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let customerId: string;
  try {
    customerId = await getOrCreateStripeCustomer({
      profileId: user.id,
      email: user.email,
    });
  } catch (err) {
    console.error("[stripe/create-checkout-session] customer error:", err);
    return NextResponse.json(
      { error: "Could not initialize Stripe customer." },
      { status: 500 },
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      { price: process.env.STRIPE_SELLER_SUBSCRIPTION_PRICE_ID, quantity: 1 },
    ],
    success_url: `${siteUrl}/dashboard/billing?checkout=success`,
    cancel_url: `${siteUrl}/plans?checkout=cancelled`,
    metadata: {
      checkout_type: "seller_subscription",
      profile_id: user.id,
    },
    subscription_data: {
      metadata: {
        checkout_type: "seller_subscription",
        profile_id: user.id,
      },
    },
  });

  return NextResponse.json({ url: session.url });
}
