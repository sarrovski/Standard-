import { Badge, ButtonLink, Card, Nav, SectionHeader, Shell } from "@/components/ui";

const verificationSteps = [
  {
    title: "Seller identity review",
    text: "We review public seller information, marketplace history, and profile consistency before assigning verification.",
  },
  {
    title: "Provider / Developer review",
    text: "Sellers who request the Provider / Developer tag must submit proof such as website, Discord, Telegram, or other ownership signals.",
  },
  {
    title: "Payment policy review",
    text: "Payment methods, refund policies, and high-risk payment profiles can be reviewed by the Standard team.",
  },
  {
    title: "Ongoing monitoring",
    text: "Verification is not permanent. It can be removed if a seller misleads users, manipulates reviews, or violates Standard rules.",
  },
];

const reviewRules = [
  "Reviews should come from real customers.",
  "Sellers cannot directly edit, delete, or manipulate reviews.",
  "Suspicious review patterns can be flagged for admin review.",
  "Coordinated fake reviews, review bombing, or spam can lead to restrictions.",
];

export default function TrustPage() {
  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeader
          eyebrow="Trust"
          title="Standard acts as a third-party verification layer"
          text="Our goal is to help customers compare sellers before buying, understand payment risk, and avoid scams by using clear trust signals."
        />

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <Badge tone="green">Verified Seller</Badge>
            <h2 className="mt-4 text-2xl font-black">Approved by Standard</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              A Verified Seller badge means the seller has been reviewed and approved by our team.
              It is not automatic, paid-only, or self-assigned.
            </p>
          </Card>
          <Card className="p-6">
            <Badge tone="cyan">Provider / Developer</Badge>
            <h2 className="mt-4 text-2xl font-black">Official seller tag</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              The Provider / Developer tag is reserved for sellers who can show they are the official
              owner, developer, or provider of a listed product.
            </p>
          </Card>
          <Card className="p-6">
            <Badge tone="purple">Reviews</Badge>
            <h2 className="mt-4 text-2xl font-black">Real customer feedback</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Reviews are designed to come from real customers. Sellers cannot directly manipulate,
              edit, or remove reviews from their listings.
            </p>
          </Card>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <Card className="p-6">
            <h2 className="text-2xl font-black">How seller verification works</h2>
            <div className="mt-5 grid gap-3">
              {verificationSteps.map((step) => (
                <div key={step.title} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="font-bold">{step.title}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{step.text}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-2xl font-black">Review integrity rules</h2>
            <div className="mt-5 space-y-3">
              {reviewRules.map((rule) => (
                <div key={rule} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                  {rule}
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="mt-10">
          <Card className="border-amber-400/20 bg-amber-500/10 p-6">
            <Badge tone="amber">Important</Badge>
            <h2 className="mt-4 text-2xl font-black">What Standard does and does not guarantee</h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-amber-100/90">
              Standard helps buyers compare sellers, payment methods, reviews, and trust signals.
              We do not directly sell third-party products and we do not guarantee every transaction.
              Buyers should still review seller status, payment method risk, delivery details, refund
              policy, and public trust signals before purchasing.
            </p>
          </Card>
        </section>

        <section className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/marketplace">Browse marketplace</ButtonLink>
          <ButtonLink href="/terms" variant="secondary">Read terms</ButtonLink>
        </section>
      </section>
    </Shell>
  );
}
