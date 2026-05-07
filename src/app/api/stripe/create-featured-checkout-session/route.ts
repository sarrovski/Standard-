import { NextRequest, NextResponse } from "next/server";
import { stripe, getSiteUrl } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_FEATURED_SLOT_PRICE_ID) {
    return NextResponse.json({ error: "Stripe featured slot env vars are not configured." }, { status: 500 });
  }

  const { slotId, productId, game, category } = await request.json();
  // TODO: Before checkout, query featured_slots and reject if an active slot exists for game/category.
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: process.env.STRIPE_FEATURED_SLOT_PRICE_ID, quantity: 1 }],
    success_url: `${getSiteUrl()}/dashboard?tab=products&featured=success`,
    cancel_url: `${getSiteUrl()}/dashboard?tab=products&featured=cancelled`,
    metadata: { purpose: "featured_slot", slotId, productId, game, category },
  });

  return NextResponse.json({ url: session.url });
}
