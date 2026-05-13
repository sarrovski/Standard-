import type { Metadata } from "next";
import Link from "next/link";
import { Badge, ButtonLink, Card, Nav, SectionHeader, Shell } from "@/components/ui";

export const metadata: Metadata = {
  title: "Trust on Standard — verification, reviews, and seller risk",
  description:
    "How Standard verifies sellers and payment methods, how reviews work, how products are ranked, and how buyers can reduce risk before purchasing gaming tools.",
  alternates: { canonical: "/trust" },
};

const trustPages = [
  {
    href: "/trust/payment-verification",
    title: "Payment-method verification",
    blurb:
      "How Standard verifies a seller's checkout setup, what the verified badge means, and what buyers should still check.",
  },
  {
    href: "/trust/provider-tags",
    title: "Provider / Developer tags",
    blurb:
      "What the official-seller badge represents, who qualifies, the proof we accept, and when it can be revoked.",
  },
  {
    href: "/trust/reviews",
    title: "How reviews work",
    blurb:
      "Who can leave a review, why sellers can't edit or remove them, and how we handle suspicious patterns.",
  },
  {
    href: "/trust/seller-risk",
    title: "Understanding seller risk",
    blurb:
      "A practical guide to the buyer-side risk signals on Standard, with a pre-purchase checklist.",
  },
  {
    href: "/trust/report-a-seller",
    title: "Report a seller",
    blurb:
      "If a seller misrepresents themselves or breaks the rules, how to report them and what happens next.",
  },
  {
    href: "/trust/how-standard-ranks-products",
    title: "How Standard ranks products",
    blurb:
      "Featured slots, verification status, listing quality, and buyer signals — exactly which inputs drive ranking.",
  },
];

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
          text="Our goal is to help buyers compare sellers before buying, understand payment risk, and reduce scams using clear, public trust signals."
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
            <Badge tone="default">Provider / Developer</Badge>
            <h2 className="mt-4 text-2xl font-black">Official seller tag</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              The Provider / Developer tag is reserved for sellers who can show they are the official
              owner, developer, or provider of a listed product.
            </p>
          </Card>
          <Card className="p-6">
            <Badge tone="orange">Reviews</Badge>
            <h2 className="mt-4 text-2xl font-black">Real customer feedback</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Reviews are designed to come from real customers. Sellers cannot directly manipulate,
              edit, or remove reviews from their products.
            </p>
          </Card>
        </section>

        <section className="mt-10">
          <p className="text-sm font-medium text-orange-300">Read more</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
            Trust topics explained in depth
          </h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {trustPages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="group rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-orange-400/40 hover:bg-orange-500/[0.04]"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold text-white">{page.title}</h3>
                  <span aria-hidden="true" className="text-orange-300 transition group-hover:translate-x-0.5">
                    →
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">{page.blurb}</p>
              </Link>
            ))}
          </div>
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
          <ButtonLink href="/trust/report-a-seller" variant="secondary">Report a seller</ButtonLink>
          <ButtonLink href="/terms" variant="secondary">Read terms</ButtonLink>
        </section>
      </section>
    </Shell>
  );
}
