import type { Metadata } from "next";
import { TrustArticle } from "@/components/trust-article";

export const metadata: Metadata = {
  title: "Payment-method verification — Standard",
  description:
    "How Standard verifies seller payment methods. What the verified badge means, what buyers should still check, and how verification can be revoked.",
  alternates: { canonical: "/trust/payment-verification" },
};

export default function PaymentVerificationPage() {
  return (
    <TrustArticle
      eyebrow="Trust"
      title="Payment-method verification"
      intro="Standard reviews the payment methods a seller publicly accepts. The goal is to give buyers a clearer picture of how a checkout actually works before they leave for a seller's official website."
      sections={[
        {
          title: "What payment-method verification means",
          body: (
            <>
              A verified payment method on Standard means the seller has
              submitted public-facing checkout proof and (where applicable)
              a refund policy, and the Standard team has reviewed it. The
              badge confirms the seller&apos;s claim that the method is real
              and supported on their site — not that every transaction will
              be problem-free.
            </>
          ),
        },
        {
          title: "What sellers submit",
          body: (
            <ul className="list-disc pl-5 space-y-2">
              <li>Checkout URL or merchant screenshot showing the method.</li>
              <li>Refund or dispute policy URL when the method supports them.</li>
              <li>Processor name (e.g. Stripe, Coinbase Commerce, manual).</li>
              <li>
                Any seller-specific notes about delivery time or supported
                regions.
              </li>
            </ul>
          ),
        },
        {
          title: "Lower-risk vs. higher-risk methods",
          body: (
            <>
              Some payment methods give buyers stronger protection than
              others. Card and PayPal Goods &amp; Services generally support
              chargebacks and disputes. Friends &amp; Family transfers, gift
              cards, and crypto are typically irreversible. Standard surfaces
              this difference on the product page so buyers can match the
              method to the level of protection they want.
            </>
          ),
        },
        {
          title: "How verification can be revoked",
          body: (
            <>
              Verification is not permanent. We can revoke a verified payment
              badge if a seller&apos;s checkout setup changes, refund policy
              disappears, or buyer reports indicate the method is no longer
              real. Sellers can re-submit once the issue is resolved.
            </>
          ),
        },
        {
          title: "What Standard does not do",
          body: (
            <>
              Standard does not process, hold, or escrow payments. Buyers
              transact directly on the seller&apos;s official website using
              the seller&apos;s checkout. Standard is a discovery and
              trust-signal layer that helps buyers compare options before
              that checkout begins.
            </>
          ),
        },
      ]}
      faq={[
        {
          q: "What does a verified payment method mean?",
          a: "It means the Standard team has reviewed proof that the seller actually accepts that payment method on their official site, and (where relevant) that a refund or dispute policy exists. It is a statement about the checkout setup, not a guarantee about any individual order.",
        },
        {
          q: "Does Standard hold or process payments?",
          a: "No. Buyers transact on the seller's official website. Standard surfaces verified payment methods, refund policies, and trust signals before the click-through.",
        },
        {
          q: "Are all sellers required to verify payment methods?",
          a: "No, but sellers without any verified payment method are surfaced with weaker trust signals. Buyers should treat unverified payment claims with more caution.",
        },
        {
          q: "What if a payment method is later removed?",
          a: "If the verified badge disappears, it usually means the proof no longer holds (refund-policy URL broken, checkout reorganised, buyer reports). Sellers can re-submit to be reviewed again.",
        },
      ]}
      related={[
        { href: "/trust/provider-tags", label: "Provider / Developer tags" },
        { href: "/trust/seller-risk", label: "Understanding seller risk" },
        { href: "/trust/reviews", label: "How reviews work" },
        { href: "/trust", label: "Trust overview" },
        { href: "/plans", label: "Seller plans" },
      ]}
      primaryCta={{ href: "/marketplace", label: "Open marketplace" }}
      secondaryCta={{
        href: "/start-selling",
        label: "Apply as a seller",
      }}
    />
  );
}
