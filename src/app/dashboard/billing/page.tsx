import { requireRole, isSupabaseConfigured } from "@/lib/roles";
import { getSessionUser } from "@/lib/session";
import { Badge, Card, Nav, SectionHeader, Shell } from "@/components/ui";
import { BillingActions } from "@/components/billing-actions";
import {
  getSellerByProfileId,
  getSellerSubscription,
} from "@/lib/repositories/seller";
import { adaptSellerSubscription, type UISellerSubscription } from "@/lib/adapters";

/**
 * /dashboard/billing is the home for the seller subscription + Stripe billing
 * portal.
 *
 * Featured slot purchase used to live here too; it now lives in the dashboard
 * Produits tab, right next to the seller's product list.
 */

type BillingViewState = {
  configured: boolean;
  subscription: UISellerSubscription | null;
  hasStripeCustomer: boolean;
  noSellerYet: boolean;
};

async function loadBillingData(): Promise<BillingViewState> {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      subscription: null,
      hasStripeCustomer: false,
      noSellerYet: false,
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
    };
  }

  const sellerRes = await getSellerByProfileId(user.id);
  if (sellerRes.error || !sellerRes.data) {
    return {
      configured: true,
      subscription: null,
      hasStripeCustomer: false,
      noSellerYet: true,
    };
  }

  const seller = sellerRes.data;
  const subRes = await getSellerSubscription(seller.id);
  const subscription = adaptSellerSubscription(subRes.data ?? null);

  const { data: customerRow } = await supabase
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("profile_id", user.id)
    .maybeSingle<{ stripe_customer_id: string }>();

  return {
    configured: true,
    subscription,
    hasStripeCustomer: Boolean(customerRow?.stripe_customer_id),
    noSellerYet: false,
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
  const [state, user] = await Promise.all([loadBillingData(), getSessionUser()]);

  const checkoutResult =
    typeof searchParams?.checkout === "string" ? searchParams.checkout : null;

  return (
    <Shell>
      <Nav user={user} />
      <section className="mx-auto max-w-5xl px-6 py-10">
        <SectionHeader
          eyebrow="Billing"
          title="Subscription and billing portal"
          text="Manage your seller subscription and open the Stripe customer portal. Featured slots are reserved from the Produits tab."
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

        {!state.configured ? (
          <Card className="mt-8 p-8">
            <Badge tone="amber">Demo mode</Badge>
            <h2 className="mt-4 text-2xl font-black">Billing is read-only in demo mode</h2>
            <p className="mt-3 text-sm text-slate-400">
              Connect Supabase + Stripe to manage your real subscription. The
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

            {/* 2. Notes */}
            <Card className="p-6">
              <Badge tone="amber">Good to know</Badge>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                A seller can stop or change their subscription anytime from the
                Stripe billing portal above; cancelling does not auto-archive
                published products. Featured slots are reserved from the
                Produits tab and are billed separately from the subscription.
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
