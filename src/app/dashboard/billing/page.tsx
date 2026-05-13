import { requireRole, isSupabaseConfigured } from "@/lib/roles";
import { Badge, Card, Nav, SectionHeader, Shell } from "@/components/ui";
import { BillingActions } from "@/components/billing-actions";
import {
  FeaturedSlotForm,
  type FeaturedProductOption,
} from "@/components/featured-slot-form";
import {
  getActiveSellerFeaturedSlots,
  getSellerByProfileId,
  getSellerProducts,
  getSellerSubscription,
} from "@/lib/repositories/seller";
import { adaptSellerSubscription, type UISellerSubscription } from "@/lib/adapters";

/**
 * /dashboard/billing is the single home for everything money-related on the
 * seller side:
 *   - subscription status + Stripe billing portal
 *   - featured slot purchase
 *   - currently active featured slots owned by this seller
 *
 * Featured slot CTAs were removed from product cards in this batch so there
 * is exactly one place to start a featured checkout.
 */

type ActiveFeaturedSlot = {
  id: string;
  productName: string;
  productSlug: string;
  game: string;
  category: string;
  endsAt: string | null;
};

type BillingViewState = {
  configured: boolean;
  subscription: UISellerSubscription | null;
  hasStripeCustomer: boolean;
  noSellerYet: boolean;
  publishedProducts: FeaturedProductOption[];
  activeFeaturedSlots: ActiveFeaturedSlot[];
};

async function loadBillingData(): Promise<BillingViewState> {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      subscription: null,
      hasStripeCustomer: false,
      noSellerYet: false,
      publishedProducts: [],
      activeFeaturedSlots: [],
    };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      configured: true,
      subscription: null,
      hasStripeCustomer: false,
      noSellerYet: true,
      publishedProducts: [],
      activeFeaturedSlots: [],
    };
  }

  const sellerRes = await getSellerByProfileId(user.id);
  if (sellerRes.error || !sellerRes.data) {
    return {
      configured: true,
      subscription: null,
      hasStripeCustomer: false,
      noSellerYet: true,
      publishedProducts: [],
      activeFeaturedSlots: [],
    };
  }

  const seller = sellerRes.data;
  const [subRes, productsRes, featuredRes] = await Promise.all([
    getSellerSubscription(seller.id),
    getSellerProducts(seller.id),
    getActiveSellerFeaturedSlots(seller.id),
  ]);
  const subscription = adaptSellerSubscription(subRes.data ?? null);

  const { data: customerRow } = await supabase
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("profile_id", user.id)
    .maybeSingle<{ stripe_customer_id: string }>();

  type ProductRow = {
    id: string;
    name: string;
    game: string;
    category: string;
    status: string;
  };
  const publishedProducts: FeaturedProductOption[] = (
    (productsRes.data ?? []) as unknown as ProductRow[]
  )
    .filter((p) => p.status === "published")
    .map((p) => ({
      id: p.id,
      name: p.name,
      game: p.game,
      category: p.category,
    }));

  type FeaturedRow = {
    id: string;
    ends_at: string | null;
    products?: { name: string; slug: string; game: string; category: string } | null;
  };
  const activeFeaturedSlots: ActiveFeaturedSlot[] = (
    (featuredRes.data ?? []) as unknown as FeaturedRow[]
  ).map((row) => ({
    id: row.id,
    productName: row.products?.name ?? "—",
    productSlug: row.products?.slug ?? "",
    game: row.products?.game ?? "—",
    category: row.products?.category ?? "—",
    endsAt: row.ends_at,
  }));

  return {
    configured: true,
    subscription,
    hasStripeCustomer: Boolean(customerRow?.stripe_customer_id),
    noSellerYet: false,
    publishedProducts,
    activeFeaturedSlots,
  };
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  await requireRole(["seller", "admin"]);
  const state = await loadBillingData();

  const checkoutResult =
    typeof searchParams?.checkout === "string" ? searchParams.checkout : null;
  const featuredResult =
    typeof searchParams?.featured === "string" ? searchParams.featured : null;

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-5xl px-6 py-10">
        <SectionHeader
          eyebrow="Billing"
          title="Subscription, billing portal, and featured slots"
          text="One home for everything money-related on your seller account."
        />

        {checkoutResult === "success" && (
          <Card className="mt-6 border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            Subscription checkout completed. Your seller status will reflect once Stripe confirms
            the event (a few seconds).
          </Card>
        )}
        {checkoutResult === "cancelled" && (
          <Card className="mt-6 border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            Subscription checkout was cancelled. You can try again from /plans.
          </Card>
        )}
        {featuredResult === "success" && (
          <Card className="mt-6 border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            Featured slot purchase completed. Activation will appear shortly via webhook.
          </Card>
        )}
        {featuredResult === "cancelled" && (
          <Card className="mt-6 border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            Featured slot purchase was cancelled.
          </Card>
        )}

        {!state.configured ? (
          <Card className="mt-8 p-8">
            <Badge tone="amber">Demo mode</Badge>
            <h2 className="mt-4 text-2xl font-black">Billing is read-only in demo mode</h2>
            <p className="mt-3 text-sm text-slate-400">
              Connect Supabase + Stripe to manage real subscriptions and featured slots. The
              dashboard remains clickable so you can preview the rest of the seller experience.
            </p>
          </Card>
        ) : state.noSellerYet ? (
          <Card className="mt-8 p-8">
            <Badge tone="amber">No seller account yet</Badge>
            <h2 className="mt-4 text-2xl font-black">Subscribe to start selling</h2>
            <p className="mt-3 text-sm text-slate-400">
              You&apos;re signed in, but there&apos;s no seller account on this profile yet.
              Choose a plan to subscribe; the seller record is created automatically when Stripe
              confirms your first payment.
            </p>
            <a
              href="/plans"
              className="mt-6 inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white"
            >
              View seller plan
            </a>
          </Card>
        ) : (
          <div className="mt-8 grid gap-6">
            {/* 1. Subscription card */}
            <Card className="p-6">
              <Badge
                tone={
                  state.subscription?.status === "Active" ||
                  state.subscription?.status === "Trialing"
                    ? "green"
                    : state.subscription?.status === "Past due"
                      ? "amber"
                      : state.subscription?.status === "Canceled"
                        ? "red"
                        : "default"
                }
              >
                {state.subscription?.status ?? "No subscription"}
              </Badge>
              <h2 className="mt-4 text-2xl font-black">Subscription</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <Field label="Status" value={state.subscription?.status ?? "—"} />
                <Field
                  label="Current period ends"
                  value={formatDate(state.subscription?.currentPeriodEnd ?? null)}
                />
                <Field
                  label="Stripe subscription"
                  value={state.subscription?.stripeSubscriptionId ?? "—"}
                  mono
                />
                <Field
                  label="Stripe customer mapped"
                  value={state.hasStripeCustomer ? "Yes" : "Not yet"}
                />
              </div>
              <div className="mt-6">
                <BillingActions hasStripeCustomer={state.hasStripeCustomer} />
              </div>
            </Card>

            {/* 2. Featured slots — purchase + active */}
            <Card className="p-6">
              <Badge tone="orange">Featured slots</Badge>
              <h2 className="mt-4 text-2xl font-black">Boost a product to the top</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Featured placement raises a product&apos;s visibility inside its game/category.
                One active slot per game/category, 30 days, paid up-front via Stripe.
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-500">
                <li>Featured does not increase trust score.</li>
                <li>Featured does not skip payment verification.</li>
                <li>Provider / Developer tag is reviewed separately.</li>
              </ul>

              {state.activeFeaturedSlots.length > 0 && (
                <div className="mt-6 space-y-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Currently active
                  </div>
                  {state.activeFeaturedSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4"
                    >
                      <div>
                        <div className="font-semibold">{slot.productName}</div>
                        <div className="mt-1 text-xs text-emerald-200/70">
                          {slot.game} • {slot.category} • ends {formatDate(slot.endsAt)}
                        </div>
                      </div>
                      <Badge tone="green">Featured active</Badge>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/40 p-5">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Reserve a slot
                </div>
                <div className="mt-3">
                  <FeaturedSlotForm products={state.publishedProducts} />
                </div>
              </div>
            </Card>

            {/* 3. Notes */}
            <Card className="p-6">
              <Badge tone="amber">Verification still matters</Badge>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Featured boosts visibility but does not replace verification. Payment methods,
                Provider / Developer tag, and trust signals are reviewed independently. A
                seller can stop or change subscription anytime from the Stripe billing portal
                above; cancelling does not auto-archive published products.
              </p>
            </Card>

            {!state.hasStripeCustomer && (
              <Card className="p-6">
                <Badge tone="amber">Stripe customer not yet linked</Badge>
                <p className="mt-3 text-sm text-slate-400">
                  No <code>stripe_customers</code> row exists for your profile. The customer is
                  created automatically the first time you start a checkout. Open{" "}
                  <a href="/plans" className="underline">
                    Plans
                  </a>{" "}
                  to subscribe.
                </p>
              </Card>
            )}
          </div>
        )}
      </section>
    </Shell>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-sm ${mono ? "font-mono" : "font-semibold"} text-white`}>
        {value}
      </div>
    </div>
  );
}
