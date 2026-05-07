import { NextResponse } from "next/server";
import { stripe, getSiteUrl } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/roles";

export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
  }

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: Load the seller's Stripe customer id from stripe_customers by Supabase auth user.
  const customer: string | undefined = undefined;
  if (!customer) return NextResponse.json({ error: "No Stripe customer mapped yet." }, { status: 400 });

  const session = await stripe.billingPortal.sessions.create({
    customer,
    return_url: `${getSiteUrl()}/dashboard?tab=billing`,
  });
  return NextResponse.json({ url: session.url });
}
