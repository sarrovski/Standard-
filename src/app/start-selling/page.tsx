import { Badge, ButtonLink, Card, Nav, SectionHeader, Shell } from "@/components/ui";

const STEPS = [
  {
    title: "Create an account",
    text: "Use one Standard account for browsing, saved products, and seller access.",
  },
  {
    title: "Choose seller plan",
    text: "Start the seller subscription from Plans when you are ready to sell.",
  },
  {
    title: "Create product",
    text: "Use Builder to create the product, then manage status and media from Produits.",
  },
  {
    title: "Verify payment methods",
    text: "Submit proof before payment methods appear publicly on marketplace pages.",
  },
  {
    title: "Build trust",
    text: "Request the Provider / Developer tag if it applies, and keep public claims clear.",
  },
];

export default function StartSellingPage() {
  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-5xl px-6 py-12">
        <SectionHeader
          eyebrow="Start Selling"
          title="How selling works on Standard"
          text="Standard gives sellers a product workspace and buyers a trust layer. The actual seller subscription starts from Plans."
        />

        <Card className="mt-8 p-6">
          <Badge tone="orange">How it works</Badge>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {STEPS.map((step, index) => (
              <div
                key={step.title}
                className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
              >
                <div className="text-xs font-semibold text-orange-200">
                  Step {index + 1}
                </div>
                <h2 className="mt-2 text-lg font-bold">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {step.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/plans">View seller plan</ButtonLink>
            <ButtonLink href="/trust" variant="secondary">
              Review trust rules
            </ButtonLink>
          </div>
        </Card>

        <Card className="mt-6 p-6">
          <Badge tone="amber">Verification still matters</Badge>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Featured visibility, seller subscriptions, payment verification, and
            Provider / Developer tags are separate flows. Paid visibility never
            changes trust score or bypasses payment proof.
          </p>
        </Card>
      </section>
    </Shell>
  );
}
