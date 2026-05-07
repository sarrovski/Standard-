import { NextResponse } from "next/server";
import { stripe, getSiteUrl } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/roles";

export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_SELLER_SUBSCRIPTION_PRICE_ID) {
    return NextResponse.json({ error: "Stripe env vars are not configured." }, { status: 500 });
  }

  let customerEmail: string | undefined;
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    customerEmail = user.email || undefined;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: customerEmail,
    line_items: [{ price: process.env.STRIPE_SELLER_SUBSCRIPTION_PRICE_ID, quantity: 1 }],
    success_url: `${getSiteUrl()}/dashboard?tab=billing&checkout=success`,
    cancel_url: `${getSiteUrl()}/plans?checkout=cancelled`,
    metadata: { purpose: "seller_subscription" },
  });

  return NextResponse.json({ url: session.url });
}
