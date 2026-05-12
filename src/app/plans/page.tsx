import { Badge, Card, Nav, Shell } from "@/components/ui";
import { PlanCheckoutButton } from "@/components/plan-checkout-button";

type Plan = {
  name: string;
  price: string;
  audience: string;
  recommended?: boolean;
  perks: string[];
};

const PLANS: Plan[] = [
  {
    name: "Launch",
    price: "$19/mo",
    audience: "For new sellers testing the market.",
    perks: [
      "Up to 3 published products",
      "5 media uploads per product",
      "Standard product pages",
      "Submit payment methods for verification",
      "Basic trust signals",
      "Basic seller profile",
      "Provider / Developer tag request available",
      "Basic dashboard analytics",
      "Standard admin review queue",
      "Featured slots sold separately, subject to availability",
    ],
  },
  {
    name: "Growth",
    price: "$49/mo",
    audience: "For active sellers who want to look more credible and convert better.",
    recommended: true,
    perks: [
      "Up to 15 published products",
      "15 media uploads per product",
      "Enhanced product pages",
      "Priority payment verification review",
      "More trust signals per product",
      "Enhanced seller profile",
      "Offers tools",
      "Advanced dashboard analytics",
      "Provider / Developer tag request available",
      "Featured slot eligibility, sold separately",
      "Better marketplace presentation",
    ],
  },
  {
    name: "Dominion",
    price: "$99/mo",
    audience: "For teams, providers, studios, and high-volume sellers.",
    perks: [
      "Up to 50 published products",
      "30 media uploads per product",
      "Premium product pages",
      "Highest payment verification review priority",
      "Expanded trust signals",
      "Premium seller profile",
      "Offers tools",
      "Advanced analytics",
      "Category performance insights",
      "Provider / Developer tag request available",
      "Featured slot eligibility, sold separately",
      "Early access to new seller tools",
      "Premium marketplace presentation",
    ],
  },
];

const FAQ = [
  {
    q: "Do subscriptions verify my payments?",
    a: "No. Payment methods still require admin approval.",
  },
  {
    q: "Is Provider / Developer included?",
    a: "You can request the tag, but approval is still reviewed.",
  },
  {
    q: "Does Featured improve trust score?",
    a: "No. Featured only affects placement.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes, through billing once multi-plan Stripe price IDs are configured.",
  },
  {
    q: "Why choose Growth?",
    a: "Growth is the best fit for active sellers who need more products, stronger presentation, and priority review.",
  },
];

export default function PlansPage() {
  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <Badge tone="orange">Seller subscriptions</Badge>
          <h1 className="mt-4 text-4xl font-black md:text-5xl">
            Start selling trusted gaming products
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-400">
            Create product pages, prove payment methods, build trust, and grow
            visibility inside a marketplace built for gaming sellers.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={
                "relative flex h-full flex-col p-6 " +
                (plan.recommended
                  ? "border-orange-300/50 bg-orange-500/10 shadow-orange-500/20"
                  : "bg-slate-950/30")
              }
            >
              {plan.recommended && (
                <div className="absolute right-5 top-5">
                  <Badge tone="orange">Recommended</Badge>
                </div>
              )}
              <div className="pr-28 lg:pr-0">
                <h2 className="text-2xl font-black">{plan.name}</h2>
                <div className="mt-3 text-4xl font-black">{plan.price}</div>
                <p className="mt-3 min-h-12 text-sm leading-6 text-slate-400">
                  {plan.audience}
                </p>
              </div>

              <ul className="mt-6 grid gap-2">
                {plan.perks.map((perk) => (
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
                <PlanCheckoutButton
                  label={`Choose ${plan.name}`}
                  variant={plan.recommended ? "primary" : "secondary"}
                />
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Uses the current seller subscription checkout while dedicated
                  plan price IDs are added.
                </p>
              </div>
            </Card>
          ))}
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
              Featured slots are sold separately from subscriptions and are
              subject to game/category availability.
            </p>
          </Card>
        </div>

        <Card className="mt-6 p-6">
          <Badge tone="orange">Stripe pricing TODO</Badge>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            The current backend uses one{" "}
            <code className="text-slate-200">
              STRIPE_SELLER_SUBSCRIPTION_PRICE_ID
            </code>
            . Dedicated plan prices should be added later as{" "}
            <code className="text-slate-200">STRIPE_LAUNCH_PRICE_ID</code>,{" "}
            <code className="text-slate-200">STRIPE_GROWTH_PRICE_ID</code>, and{" "}
            <code className="text-slate-200">STRIPE_DOMINION_PRICE_ID</code>.
          </p>
        </Card>

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
