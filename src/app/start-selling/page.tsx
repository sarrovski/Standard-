import type { Metadata } from "next";
import { Badge, ButtonLink, Card, Nav, SectionHeader, Shell } from "@/components/ui";
import { SellerLaunchChecklist } from "@/components/seller-launch-checklist";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Start selling on Standard — seller launch checklist",
  description:
    "How to launch as a gaming-tool seller on Standard. Pick a plan, build your seller profile, add products and media, verify payment methods, and start receiving qualified traffic to your official site.",
  alternates: { canonical: "/start-selling" },
};

const VALUE_PROPS = [
  {
    title: "Qualified traffic",
    body: "Buyers reach your product page through game and category landing pages, the marketplace, and search. They arrive with intent — not at random.",
  },
  {
    title: "Buyer confidence",
    body: "Verification badges, verified payment methods, and clear refund-policy links reduce hesitation before a buyer clicks through to your official site.",
  },
  {
    title: "Trust signals",
    body: "Standard surfaces seller verification, payment proof, and review history on every product page so buyers don't have to leave to research.",
  },
  {
    title: "Product discovery",
    body: "Each product appears across game hubs, category pages, and the marketplace — multiple indexed entry points working in your favour for organic search.",
  },
  {
    title: "Seller profile",
    body: "Your seller profile carries across every product you publish. One verification effort, applied everywhere.",
  },
];

const FAQ = [
  {
    q: "How long does verification take?",
    a: "Most payment-method verifications are reviewed within 3 business days. Provider / Developer tag requests typically take 3–7 business days because they require more proof.",
  },
  {
    q: "Does a subscription auto-verify my payment methods?",
    a: "No. A subscription gives you access to the seller dashboard and lets you submit verification requests, but the Standard team reviews them independently. Verification is earned, not bought.",
  },
  {
    q: "Can sellers pay for higher ranking?",
    a: "Only through clearly badged featured slots, which are time-boxed and limited to one per game / category. Outside of featured placement, product ranking depends on listing quality, verification, and buyer signals — never on direct payment.",
  },
  {
    q: "Where does the checkout actually happen?",
    a: "On your own website. Standard surfaces buyer-confidence signals and sends qualified traffic to your official checkout. Standard does not process or hold payments itself.",
  },
  {
    q: "What if a buyer reports me?",
    a: "Every report is reviewed by the Standard team. Outcomes range from no action through warnings, badge revocation, payment-method de-verification, listing removal, and account removal. See the report-a-seller page for the full process.",
  },
  {
    q: "What does a Standard product page include?",
    a: "Hero with title and game / category badges, media gallery (images + embedded videos), grouped feature list, FAQ, verified-payment-method panel, trust signals, price points, and a primary CTA to your official site.",
  },
];

export default async function StartSellingPage() {
  const user = await getSessionUser();
  return (
    <Shell>
      <Nav user={user} />
      <section className="mx-auto max-w-5xl px-6 py-10">
        <SectionHeader
          eyebrow="Start selling"
          title="Launch your seller profile on Standard"
          text="Standard is a discovery and verification layer for gaming-tool sellers. Build your seller profile, verify your payment methods, and start receiving qualified traffic on every product page that links back to your official site."
        />

        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/plans">View seller plans</ButtonLink>
          <ButtonLink href="/trust" variant="secondary">
            Trust overview
          </ButtonLink>
        </div>

        <section className="mt-12">
          <p className="text-sm font-medium text-orange-300">Why Standard</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
            What sellers get out of the platform
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {VALUE_PROPS.slice(0, 3).map((prop) => (
              <Card key={prop.title} className="p-5">
                <h3 className="text-base font-bold">{prop.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{prop.body}</p>
              </Card>
            ))}
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {VALUE_PROPS.slice(3).map((prop) => (
              <Card key={prop.title} className="p-5">
                <h3 className="text-base font-bold">{prop.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{prop.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <div className="mt-12">
          <SellerLaunchChecklist />
        </div>

        <section className="mt-12">
          <p className="text-sm font-medium text-orange-300">FAQ</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
            Common seller questions
          </h2>
          <div className="mt-5 grid gap-3">
            {FAQ.map(({ q, a }) => (
              <Card key={q} className="p-5">
                <h3 className="text-base font-bold">{q}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{a}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center">
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">
            Ready to launch?
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Pick a plan, set up your seller profile, and have your first product
            live in a few hours.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/plans">Choose a plan</ButtonLink>
            <ButtonLink href="/trust/payment-verification" variant="secondary">
              How verification works
            </ButtonLink>
          </div>
        </section>

        <Card className="mt-6 border-amber-400/20 bg-amber-500/10 p-6">
          <Badge tone="amber">Verification still matters</Badge>
          <p className="mt-3 text-sm leading-6 text-amber-100/90">
            A subscription gives you access to the seller dashboard, but it
            doesn&apos;t auto-verify your payment methods or grant the
            Provider / Developer tag. Both are reviewed independently. Featured
            slots improve placement only — they never change verification
            status or trust signals.
          </p>
        </Card>
      </section>
    </Shell>
  );
}
