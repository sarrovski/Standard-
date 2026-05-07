import { type NextRequest, NextResponse } from "next/server";
import { stripe, getSiteUrl } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/roles";
import {
  getOrCreateStripeCustomer,
  isFeaturedSlotOccupied,
  userOwnsProduct,
} from "@/lib/stripe-helpers";

type FeaturedCheckoutBody = {
  product_id?: unknown;
  game?: unknown;
  category?: unknown;
};

function parseBody(body: FeaturedCheckoutBody): {
  product_id: string;
  game: string;
  category: string;
} | null {
  if (
    typeof body.product_id !== "string" ||
    typeof body.game !== "string" ||
    typeof body.category !== "string"
  ) {
    return null;
  }
  if (!body.product_id || !body.game || !body.category) return null;
  return {
    product_id: body.product_id,
    game: body.game,
    category: body.category,
  };
}

/**
 * Creates a one-time Stripe Checkout Session for a featured marketplace slot.
 *
 * Pre-flight checks (when Supabase configured):
 *   - User authenticated
 *   - User owns the product (products.seller -> sellers.profile_id)
 *   - No active featured slot already exists for the same (game, category)
 *
 * The actual featured_slots row is NOT inserted here. The webhook
 * (api/stripe/webhook, checkout.session.completed) does the insert after
 * successful payment. Activating before payment would be wrong.
 */
export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_FEATURED_SLOT_PRICE_ID) {
    return NextResponse.json(
      { error: "Stripe featured slot env vars are not configured." },
      { status: 500 },
    );
  }

  const siteUrl = getSiteUrl();

  let raw: FeaturedCheckoutBody;
  try {
    raw = (await request.json()) as FeaturedCheckoutBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseBody(raw);
  if (!parsed) {
    return NextResponse.json(
      { error: "Missing or invalid product_id, game, category." },
      { status: 400 },
    );
  }

  if (!isSupabaseConfigured()) {
    // Demo mode: skip ownership/availability checks (no DB to check against).
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        { price: process.env.STRIPE_FEATURED_SLOT_PRICE_ID, quantity: 1 },
      ],
      success_url: `${siteUrl}/dashboard/billing?featured=success`,
      cancel_url: `${siteUrl}/dashboard/billing?featured=cancelled`,
      metadata: {
        checkout_type: "featured_slot",
        product_id: parsed.product_id,
        game: parsed.game,
        category: parsed.category,
      },
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

  const owns = await userOwnsProduct({
    userId: user.id,
    productId: parsed.product_id,
  });
  if (owns === null) {
    return NextResponse.json(
      { error: "Could not verify product ownership." },
      { status: 500 },
    );
  }
  if (!owns) {
    return NextResponse.json(
      { error: "You do not own this product." },
      { status: 403 },
    );
  }

  const occupied = await isFeaturedSlotOccupied({
    game: parsed.game,
    category: parsed.category,
  });
  if (occupied) {
    return NextResponse.json(
      {
        error:
          "Featured slot for this game/category is already active. Try again after it expires.",
      },
      { status: 409 },
    );
  }

  let customerId: string | undefined;
  try {
    customerId = await getOrCreateStripeCustomer({
      profileId: user.id,
      email: user.email,
    });
  } catch (err) {
    console.error("[stripe/featured-checkout] customer error:", err);
    return NextResponse.json(
      { error: "Could not initialize Stripe customer." },
      { status: 500 },
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [
      { price: process.env.STRIPE_FEATURED_SLOT_PRICE_ID, quantity: 1 },
    ],
    success_url: `${siteUrl}/dashboard/billing?featured=success`,
    cancel_url: `${siteUrl}/dashboard/billing?featured=cancelled`,
    metadata: {
      checkout_type: "featured_slot",
      profile_id: user.id,
      product_id: parsed.product_id,
      game: parsed.game,
      category: parsed.category,
    },
  });

  return NextResponse.json({ url: session.url });
}
