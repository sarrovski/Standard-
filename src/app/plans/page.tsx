import type { Metadata } from "next";
import { Badge, Card, Nav, Shell } from "@/components/ui";
import { PlanCheckoutButton } from "@/components/plan-checkout-button";
import { getSessionUser } from "@/lib/session";
import { getSellerPlanPricing } from "@/lib/stripe-helpers";

export const metadata: Metadata = {
  title: "Seller plan — Standard",
  description:
    "One seller plan to publish gaming-tool products on Standard: a seller dashboard, the verified-payment workflow, trust signals, and qualified traffic to your official site.",
  alternates: { canonical: "/plans" },
};

// Render per-request so the Stripe price is always read live — never baked
// into static HTML at build time, which could drift from the real Price.
export const dynamic = "force-dynamic";

/**
 * /plans sells a single seller subscription. The price is read live from
 * the Stripe Price referenced by STRIPE_SELLER_SUBSCRIPTION_PRICE_ID via
 * getSellerPlanPricing() — the displayed amount and the amount charged at
 * checkout are the same object, so they can't drift.
 *
 * Perks below describe what the seller subscription unlocks (dashboard +
 * publishing + the verified-payment workflow). They are intentionally not
 * tier-specific — there is one plan, and the only enforced perk today is
 * the seller role + dashboard access, delivered by the Stripe webhook.
 */

const PERKS: string[] = [
  "Seller dashboard with the verified-payment workflow",
  "Publish products to the Standard marketplace",
  "Image + YouTube media on every product",
  "Product pages with trust signals and ranking",
  "Submit payment methods for admin verification",
  "Public seller profile page",
  "Provider / Developer tag request available",
  "Dashboard analytics — product views and outbound clicks",
  "Featured slots available as a separate add-on",
];

const FAQ = [
  {
    q: "Does subscribing verify my payment methods?",
    a: "No. Payment methods still require admin approval — the subscription only unlocks the seller dashboard and the verification workflow.",
  },
  {
    q: "Is the Provider / Developer tag included?",
    a: "You can request the tag once you're a seller, but approval is reviewed independently.",
  },
  {
    q: "Do Featured slots improve my trust score?",
    a: "No. Featured slots are a separate add-on that only affects placement, never trust or verification.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — manage or cancel from the Stripe billing portal in your dashboard. Cancelling doesn't auto-archive your published products.",
  },
  {
    q: "When do I get seller access after paying?",
    a: "Within a few seconds of checkout completing — Stripe confirms the payment via webhook, which promotes your account to seller and opens the dashboard.",
  },
];

export default async function PlansPage() {
  const [user, pricing] = await Promise.all([
    getSessionUser(),
    getSellerPlanPricing(),
  ]);

  return (
    <Shell>
      <Nav user={user} />
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <Badge tone="orange">Seller subscription</Badge>
          <h1 className="mt-4 text-4xl font-black md:text-5xl">
            One plan to start selling on Standard
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-400">
            Get a seller dashboard, the verified-payment workflow, qualified
            traffic from game and category landing pages, and the trust
            signals that lift buyer confidence on every product page.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-md">
          <Card className="relative flex h-full flex-col border-orange-300/50 bg-orange-500/10 p-8 shadow-orange-500/20">
            <div className="absolute right-6 top-6">
              <Badge tone="orange">Seller plan</Badge>
            </div>
            <h2 className="text-2xl font-black">Standard Seller</h2>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-5xl font-black">{pricing.amountLabel}</span>
              <span className="text-lg font-semibold text-slate-400">
                /{pricing.interval}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Everything you need to publish, verify, and grow as a seller.
              Billed monthly, cancel anytime.
            </p>
            {pricing.source === "fallback" && (
              <p className="mt-2 text-xs text-amber-200/80">
                Live pricing loads once Stripe is connected — this is a
                placeholder amount.
              </p>
            )}

            <ul className="mt-6 grid gap-2">
              {PERKS.map((perk) => (
                <li
                  key={perk}
                  className="flex items-start gap-2 text-sm leading-6 text-slate-200"
                >
                  <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-orange-300" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-6">
              <PlanCheckoutButton label="Subscribe and start selling" />
            </div>
          </Card>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <Card className="p-6">
            <Badge tone="amber">Verification is earned</Badge>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              Verification is earned, not bought. Payment methods and Provider /
              Developer tags still require admin approval.
            </p>
          </Card>
          <Card className="p-6">
            <Badge tone="default">Featured add-on</Badge>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              Featured slots are sold separately from the subscription and are
              subject to game/category availability.
            </p>
          </Card>
        </div>

        <div className="mt-12 grid gap-4">
          <h3 className="text-xl font-bold">FAQ</h3>
          {FAQ.map(({ q, a }) => (
            <div
              key={q}
              className="rounded-2xl border border-white/10 bg-slate-950/40 p-5"
            >
              <div className="font-semibold">{q}</div>
              <p className="mt-2 text-sm leading-6 text-slate-400">{a}</p>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
