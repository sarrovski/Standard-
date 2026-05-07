import { NextResponse } from "next/server";
import { stripe, getSiteUrl } from "@/lib/stripe";

export async function POST() {
  // TODO: Load the seller's Stripe customer id from stripe_customers by Supabase auth user.
  const customer: string | undefined = undefined;
  if (!customer) return NextResponse.json({ error: "No Stripe customer mapped yet." }, { status: 400 });

  const session = await stripe.billingPortal.sessions.create({
    customer,
    return_url: `${getSiteUrl()}/dashboard?tab=billing`,
  });
  return NextResponse.json({ url: session.url });
}
