import Link from "next/link";

/**
 * Eight-step seller launch checklist, used on /start-selling and on the
 * /account?view=sell onboarding view. Each step links to the most useful
 * next surface (plans, dashboard, a specific tab, or a trust article).
 *
 * Copy is intentionally generic: no promises about traffic volume or
 * outcomes, no forbidden phrasing (cheat / undetected / bypass / etc.).
 */
const STEPS = [
  {
    n: 1,
    title: "Choose a plan",
    body: "Pick Launch, Growth, or Dominion based on how many products you want to publish and how much listing space you need.",
    href: "/plans",
    cta: "View plans",
  },
  {
    n: 2,
    title: "Create your seller profile",
    body: "Your seller profile sits at the centre of every product page. Add your seller name, official website, and (when relevant) public community channels.",
    href: "/dashboard",
    cta: "Open seller dashboard",
  },
  {
    n: 3,
    title: "Add your first product",
    body: "Create a product with a clear name, game, category, summary, and website URL. The faster a buyer understands what you're offering, the more qualified the click-through.",
    href: "/dashboard/products/new",
    cta: "Create product",
  },
  {
    n: 4,
    title: "Add media",
    body: "Upload at least one image and embed a video if you have one. Listings with real media improve buyer confidence and rank higher in product discovery.",
    href: "/dashboard?tab=products",
    cta: "Manage media",
  },
  {
    n: 5,
    title: "Add FAQ",
    body: "Answer the four to six questions buyers always ask — delivery, refunds, supported platforms, payment options. FAQs improve buyer confidence and feed rich-result eligibility for your product page.",
    href: "/dashboard?tab=products",
    cta: "Add FAQ",
  },
  {
    n: 6,
    title: "Verify a payment method",
    body: "Submit checkout proof so a payment method appears with the verified badge on your product page. Verified payment methods are one of the strongest trust signals buyers see.",
    href: "/trust/payment-verification",
    cta: "How verification works",
  },
  {
    n: 7,
    title: "Publish",
    body: "Once the listing is ready, switch the product status to Published from the Produits tab. Drafts stay private until you flip the switch.",
    href: "/dashboard?tab=products",
    cta: "Go to Produits",
  },
  {
    n: 8,
    title: "Improve listing strength",
    body: "Open any product to see its listing-strength score and the exact items left to improve. Higher-strength listings get better product discovery and stronger buyer confidence.",
    href: "/dashboard?tab=products",
    cta: "Check your scores",
  },
];

export function SellerLaunchChecklist({
  intro = "Eight steps to go from new seller to a published product with verified payment methods. None of these are gated; you can do them in order or jump around.",
}: {
  intro?: string;
}) {
  return (
    <section>
      <p className="text-sm font-medium text-orange-300">Onboarding</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
        Seller launch checklist
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{intro}</p>
      <ol className="mt-6 grid gap-3">
        {STEPS.map((step) => (
          <li
            key={step.n}
            className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-sm font-bold text-orange-200">
              {step.n}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-white">{step.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">{step.body}</p>
              <div className="mt-3">
                <Link
                  href={step.href}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-orange-100"
                >
                  {step.cta} <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
