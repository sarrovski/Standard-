import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

/**
 * Server-side helpers used by Stripe API routes. None of these run on the
 * browser. They use the user-scoped Supabase server client (RLS enforced),
 * not the service role.
 */

/**
 * Get-or-create the Stripe customer mapped to the given Supabase profile id.
 *
 * Looks up `stripe_customers` by `profile_id`. If found, returns the existing
 * `stripe_customer_id`. Otherwise creates a Stripe customer with the user's
 * email and writes the mapping back to `stripe_customers`.
 *
 * Returns the Stripe customer id (not the row).
 */
export async function getOrCreateStripeCustomer(args: {
  profileId: string;
  email: string | undefined | null;
}): Promise<string> {
  const supabase = createClient();

  const { data: existing, error: lookupError } = await supabase
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("profile_id", args.profileId)
    .maybeSingle<{ stripe_customer_id: string }>();

  if (lookupError) {
    throw new Error(`stripe_customers lookup failed: ${lookupError.message}`);
  }

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email: args.email ?? undefined,
    metadata: {
      profile_id: args.profileId,
    },
  });

  // The current Database type definition (Table<Row> shorthand) doesn't fully
  // satisfy supabase-js 2.105's overload resolution for .insert(). Casting
  // through unknown lets us keep strict typing on the input payload while
  // sidestepping the inference bug. Same workaround is used in roles.ts for
  // single<>() and in repository call sites in Batch 2.
  type StripeCustomerInsert = Database["public"]["Tables"]["stripe_customers"]["Insert"];
  const insertRow: StripeCustomerInsert = {
    profile_id: args.profileId,
    stripe_customer_id: customer.id,
  };
  const { error: insertError } = await supabase
    .from("stripe_customers")
    .insert(insertRow as never);

  if (insertError) {
    // Best-effort: the customer is already created in Stripe. Don't blow up
    // the request — log and let the webhook eventually reconcile.
    console.error("[stripe-helpers] failed to write stripe_customers:", insertError.message);
  }

  return customer.id;
}

/**
 * Verify the authenticated user owns the given product, by walking
 * products -> sellers -> profile_id and comparing to the current user.
 *
 * Returns true if owned, false otherwise. Returns null if the lookup itself
 * failed (RLS denial, schema issue) so the caller can decide how to react.
 */
export async function userOwnsProduct(args: {
  userId: string;
  productId: string;
}): Promise<boolean | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, sellers!inner(profile_id)")
    .eq("id", args.productId)
    .maybeSingle<{ id: string; sellers: { profile_id: string } }>();

  if (error) {
    console.error("[stripe-helpers] product ownership lookup failed:", error.message);
    return null;
  }
  if (!data) return false;
  return data.sellers.profile_id === args.userId;
}

/**
 * Returns true if there is currently an active featured slot for the given
 * (game, category) tuple whose ends_at is in the future. Caller decides what
 * to do when occupied (typically: return 409).
 */
export async function isFeaturedSlotOccupied(args: {
  game: string;
  category: string;
}): Promise<boolean> {
  const supabase = createClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("featured_slots")
    .select("id, ends_at, status")
    .eq("game", args.game)
    .eq("category", args.category)
    .eq("status", "active")
    .gt("ends_at", nowIso)
    .limit(1);

  if (error) {
    console.error("[stripe-helpers] featured slot check failed:", error.message);
    // Be conservative: treat as occupied so we don't double-charge for a slot
    // we couldn't verify.
    return true;
  }

  return (data?.length ?? 0) > 0;
}
