import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/roles";
import type { Database } from "@/lib/supabase/types";

/**
 * Stripe webhook entry point.
 *
 * Auth model:
 *   - Stripe signs every webhook with STRIPE_WEBHOOK_SECRET. We verify the
 *     signature; if it fails, we return 400 and do nothing else.
 *   - Inside the handler we use the SERVICE-ROLE Supabase client (admin) so
 *     we can write to public.profiles, subscriptions, featured_slots etc.
 *     without a user session. The service role bypasses RLS — it must never
 *     leak into the browser. See lib/supabase/admin.ts.
 *
 * Idempotency:
 *   - We rely on Stripe deliveries being retryable. All our writes are
 *     either upserts keyed by stripe_subscription_id, or guarded inserts
 *     for featured_slots (we re-check the active-slot condition before
 *     inserting). We don't store an "events seen" log yet; if doubled rows
 *     ever appear in practice, that's where to extend.
 *
 * Promotion rule:
 *   - On a seller_subscription checkout completing, we set profile.role to
 *     'seller'. We never demote on cancellation; that would lock sellers
 *     out of their own products. The subscription row tracks status.
 */

// 30 days. If product wants a different duration we either change this or
// move it to env.
const FEATURED_SLOT_DURATION_DAYS = 30;

type SubscriptionStatusDb =
  Database["public"]["Enums"]["subscription_status"];

function mapStripeStatusToDb(stripeStatus: Stripe.Subscription.Status): SubscriptionStatusDb {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    case "incomplete":
    case "paused":
    default:
      return "inactive";
  }
}

function endsAtIso(durationDays: number): string {
  const ms = durationDays * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms).toISOString();
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing webhook signature or secret." },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${(error as Error).message}` },
      { status: 400 },
    );
  }

  if (!isSupabaseConfigured()) {
    // Webhook hit but Supabase isn't wired. Acknowledge so Stripe doesn't
    // keep retrying, but we can't persist anything.
    console.warn("[stripe/webhook] Supabase not configured; event acknowledged without persistence:", event.type);
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionEvent(event.data.object);
        break;
      default:
        // Unhandled event types are fine; we just acknowledge.
        break;
    }
  } catch (error) {
    console.error(`[stripe/webhook] handler failed for ${event.type}:`, error);
    // Return 500 so Stripe retries. If a handler bug is causing repeated
    // failures, we want to know about it via Stripe's dashboard.
    return NextResponse.json(
      { error: `Handler failed for ${event.type}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const checkoutType = session.metadata?.checkout_type;
  if (checkoutType === "seller_subscription") {
    await handleSellerSubscriptionCheckout(session);
    return;
  }
  if (checkoutType === "featured_slot") {
    await handleFeaturedSlotCheckout(session);
    return;
  }
  console.warn(
    "[stripe/webhook] checkout.session.completed without recognized checkout_type metadata:",
    checkoutType,
  );
}

async function handleSellerSubscriptionCheckout(session: Stripe.Checkout.Session) {
  const profileId = session.metadata?.profile_id;
  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!profileId || !stripeCustomerId) {
    console.warn(
      "[stripe/webhook] seller_subscription session missing profile_id or customer:",
      { profileId, stripeCustomerId },
    );
    return;
  }

  const supabase = createAdminClient();

  // 1. Make sure stripe_customers row exists (might not, if the row was lost
  //    or the customer was created out-of-band).
  await supabase
    .from("stripe_customers")
    .upsert(
      {
        profile_id: profileId,
        stripe_customer_id: stripeCustomerId,
      },
      { onConflict: "profile_id" },
    );

  // 2. Make sure a sellers row exists for this profile. seller_name is
  //    required by the schema; we seed it from display_name.
  const { data: existingSeller } = await supabase
    .from("sellers")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle<{ id: string }>();

  let sellerId = existingSeller?.id;
  if (!sellerId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", profileId)
      .maybeSingle<{ display_name: string | null; email: string | null }>();

    const sellerName =
      profile?.display_name || profile?.email?.split("@")[0] || "New seller";

    const { data: newSeller, error: sellerInsertError } = await supabase
      .from("sellers")
      .insert({
        profile_id: profileId,
        seller_name: sellerName,
      })
      .select("id")
      .single<{ id: string }>();

    if (sellerInsertError) {
      throw new Error(`sellers insert failed: ${sellerInsertError.message}`);
    }
    sellerId = newSeller.id;
  }

  // 3. Promote profile to seller role.
  await supabase.from("profiles").update({ role: "seller" }).eq("id", profileId);

  // 4. If the subscription id is present already, upsert the row. The
  //    subscription.created event will normally arrive later and reconcile
  //    status / current_period_end.
  if (stripeSubscriptionId && sellerId) {
    await supabase
      .from("subscriptions")
      .upsert(
        {
          seller_id: sellerId,
          stripe_subscription_id: stripeSubscriptionId,
          status: "active",
        },
        { onConflict: "stripe_subscription_id" },
      );
  }
}

async function handleFeaturedSlotCheckout(session: Stripe.Checkout.Session) {
  const productId = session.metadata?.product_id;
  const profileId = session.metadata?.profile_id;
  const game = session.metadata?.game;
  const category = session.metadata?.category;

  if (!productId || !game || !category) {
    console.warn(
      "[stripe/webhook] featured_slot session missing required metadata:",
      { productId, profileId, game, category },
    );
    return;
  }

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();
  const endsAt = endsAtIso(FEATURED_SLOT_DURATION_DAYS);

  // Re-check availability inside the webhook in case two checkouts raced.
  // If a slot is already active for this (game, category), we DO NOT insert.
  // This means the user who paid second loses the slot — Stripe charges them
  // anyway, and we'll need to refund manually. Logged loudly so we notice.
  const { data: clash } = await supabase
    .from("featured_slots")
    .select("id, ends_at, status")
    .eq("game", game)
    .eq("category", category)
    .eq("status", "active")
    .gt("ends_at", nowIso)
    .limit(1);

  if (clash && clash.length > 0) {
    console.error(
      "[stripe/webhook] featured_slot clash detected — paid checkout cannot be activated:",
      { sessionId: session.id, game, category },
    );
    return;
  }

  // Resolve the seller_id from the product_id so the slot is attributed.
  const { data: product } = await supabase
    .from("products")
    .select("seller_id")
    .eq("id", productId)
    .maybeSingle<{ seller_id: string }>();

  const sellerId = product?.seller_id ?? null;

  const { error: insertError } = await supabase.from("featured_slots").insert({
    game,
    category,
    product_id: productId,
    seller_id: sellerId,
    status: "active",
    starts_at: nowIso,
    ends_at: endsAt,
    stripe_checkout_session_id: session.id,
  });

  if (insertError) {
    throw new Error(`featured_slots insert failed: ${insertError.message}`);
  }
}

// ---------------------------------------------------------------------------

async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  const stripeCustomerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const supabase = createAdminClient();

  // Resolve seller_id via stripe_customers -> profiles -> sellers.
  const { data: customerRow } = await supabase
    .from("stripe_customers")
    .select("profile_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle<{ profile_id: string }>();

  if (!customerRow?.profile_id) {
    console.warn(
      "[stripe/webhook] subscription event for unknown customer:",
      stripeCustomerId,
    );
    return;
  }

  const { data: sellerRow } = await supabase
    .from("sellers")
    .select("id")
    .eq("profile_id", customerRow.profile_id)
    .maybeSingle<{ id: string }>();

  if (!sellerRow?.id) {
    console.warn(
      "[stripe/webhook] subscription event but no sellers row yet for profile:",
      customerRow.profile_id,
    );
    // Don't bail: we still want to record the subscription so a later
    // checkout completion / sellers insert can stitch things together.
  }

  const status = mapStripeStatusToDb(subscription.status);
  const currentPeriodEnd =
    typeof subscription.current_period_end === "number"
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

  if (sellerRow?.id) {
    await supabase
      .from("subscriptions")
      .upsert(
        {
          seller_id: sellerRow.id,
          stripe_subscription_id: subscription.id,
          status,
          current_period_end: currentPeriodEnd,
        },
        { onConflict: "stripe_subscription_id" },
      );
  }

  // Promotion path: if the subscription becomes active or trialing and we
  // know who this customer is, make sure profile.role is 'seller'. This
  // covers the case where the subscription transitions to active outside
  // of a fresh checkout (e.g. after a trial, after a recovered payment).
  // The checkout completion handler does the same for the first checkout;
  // this is the catch-all for everything else.
  //
  // We never demote on canceled/past_due (per business rule). Authoritative
  // "currently active" signal is subscriptions.status, not profiles.role.
  if (status === "active" || status === "trialing") {
    // Ensure a sellers row exists. If the checkout handler already created
    // one, this is a no-op.
    let resolvedSellerId = sellerRow?.id;
    if (!resolvedSellerId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("id", customerRow.profile_id)
        .maybeSingle<{ display_name: string | null; email: string | null }>();
      const sellerName =
        profile?.display_name || profile?.email?.split("@")[0] || "New seller";
      const { data: newSeller } = await supabase
        .from("sellers")
        .insert({
          profile_id: customerRow.profile_id,
          seller_name: sellerName,
        } as never)
        .select("id")
        .single<{ id: string }>();
      resolvedSellerId = newSeller?.id;

      // Now that the seller exists, finally write the subscriptions row that
      // we couldn't write earlier (we returned without one above).
      if (resolvedSellerId) {
        await supabase
          .from("subscriptions")
          .upsert(
            {
              seller_id: resolvedSellerId,
              stripe_subscription_id: subscription.id,
              status,
              current_period_end: currentPeriodEnd,
            } as never,
            { onConflict: "stripe_subscription_id" },
          );
      }
    }

    await supabase
      .from("profiles")
      .update({ role: "seller" } as never)
      .eq("id", customerRow.profile_id);
  }
}
