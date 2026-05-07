import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing webhook signature or secret." }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${(error as Error).message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
      // TODO: Upsert stripe_customers/subscriptions or activate featured_slots based on session.metadata.purpose.
      break;
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      // TODO: Sync subscription_status and current_period_end.
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
