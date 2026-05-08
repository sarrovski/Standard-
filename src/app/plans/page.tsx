import { Badge, Card, Nav, Shell } from "@/components/ui";
import { PlanCheckoutButton } from "@/components/plan-checkout-button";

const SELLER_FEATURES = [
  "Create product announcements in the builder",
  "Upload product images and gallery",
  "Submit payment methods for verification",
  "Request the Provider / Developer tag",
  "Access the seller dashboard, analytics, and offers",
  "Optional featured slots, sold separately per category",
];

const FAQ = [
  {
    q: "Do I get featured placement included?",
    a: "No. Featured slots are sold separately as one-time purchases per game/category, available from your Billing page after subscribing.",
  },
  {
    q: "Does subscribing auto-verify my payment methods?",
    a: "No. Payment verification is reviewed manually after you submit proof. Only verified methods appear publicly.",
  },
  {
    q: "Does subscribing get me the Provider / Developer tag?",
    a: "No. The tag is reviewed manually and is independent from billing status.",
  },
  {
    q: "How do I cancel?",
    a: "Open the Stripe billing portal from /dashboard/billing. Cancelling does not auto-archive your published products.",
  },
];

export default function PlansPage() {
  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-4xl px-6 py-16">
        {/* Hero */}
        <div className="text-center">
          <Badge tone="purple">Seller plan</Badge>
          <h1 className="mt-4 text-4xl font-black md:text-5xl">
            Start selling trusted gaming products
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-400">
            One subscription unlocks the seller dashboard, builder, payment
            verification, and provider tag review. Featured placement is sold
            separately when you want a boost.
          </p>
        </div>

        {/* Single plan card */}
        <Card className="mt-10 border-purple-400/40 bg-purple-500/10 p-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <Badge tone="purple">Seller plan</Badge>
              <h2 className="mt-3 text-3xl font-black">Everything you need to publish</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Create products, upload media, and submit payment methods and
                provider tag for review. Trust signals stay independent —
                subscribing doesn&apos;t skip verification.
              </p>
              <ul className="mt-6 grid gap-2">
                {SELLER_FEATURES.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-slate-200"
                  >
                    <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-purple-300" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-white/15 bg-slate-950/60 p-6">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Subscription
              </div>
              <p className="mt-2 text-sm text-slate-400">
                Pricing is managed in Stripe and shown at checkout. You can
                cancel any time from the billing portal.
              </p>
              <div className="mt-6">
                <PlanCheckoutButton label="Start selling" variant="primary" />
              </div>
              <p className="mt-3 text-xs text-slate-500">
                If you&apos;re not signed in, you&apos;ll be sent to login first.
              </p>
            </div>
          </div>
        </Card>

        {/* Trust note */}
        <Card className="mt-8 p-6">
          <Badge tone="amber">Verification still matters</Badge>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            Subscribing gives you the seller workspace; it does not replace
            verification. Payments and provider tags are reviewed independently
            by Standard. Featured slots boost visibility but never change a
            product&apos;s trust score.
          </p>
        </Card>

        {/* FAQ */}
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
