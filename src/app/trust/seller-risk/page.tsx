import type { Metadata } from "next";
import { TrustArticle } from "@/components/trust-article";

export const metadata: Metadata = {
  title: "Understanding seller risk — Standard",
  description:
    "A practical guide to the buyer-side risk signals on Standard. What reduces risk, what increases it, and a pre-purchase checklist.",
  alternates: { canonical: "/trust/seller-risk" },
};

export default function SellerRiskPage() {
  return (
    <TrustArticle
      eyebrow="Trust"
      title="Understanding seller risk"
      intro="Standard helps buyers compare gaming-tool sellers before they click through to an outside website. This page lays out exactly which signals to weigh and how to use them."
      sections={[
        {
          title: "What &quot;seller risk&quot; means here",
          body: (
            <>
              Risk on Standard is about how confident a buyer can be that
              the seller will deliver, support, and honour their stated
              policy. It is not about the product itself — that&apos;s the
              seller&apos;s claim — but about the seller&apos;s identity
              and operational track record.
            </>
          ),
        },
        {
          title: "Signals that reduce risk",
          body: (
            <ul className="list-disc pl-5 space-y-2">
              <li>Verified Seller badge (reviewed by Standard).</li>
              <li>Provider / Developer tag with proof of ownership.</li>
              <li>One or more verified payment methods.</li>
              <li>Refund or dispute policy linked from the verified method.</li>
              <li>Publicly linked support channels (Discord, Telegram, email).</li>
              <li>Active review history with consistent feedback.</li>
            </ul>
          ),
        },
        {
          title: "Signals that increase risk",
          body: (
            <ul className="list-disc pl-5 space-y-2">
              <li>No verified payment methods on file.</li>
              <li>Payment methods limited to irreversible options (gift cards, friends &amp; family transfers).</li>
              <li>No public refund or dispute policy.</li>
              <li>Recent burst of mass-positive or mass-negative reviews from new accounts.</li>
              <li>Inconsistent claims between marketplace listing and seller website.</li>
              <li>Limited or no support contact information.</li>
            </ul>
          ),
        },
        {
          title: "Pre-purchase checklist",
          body: (
            <ol className="list-decimal pl-5 space-y-2">
              <li>Open the product page on Standard.</li>
              <li>Check the seller&apos;s verification badges.</li>
              <li>Confirm at least one verified payment method matches what you want to use.</li>
              <li>Read the refund or dispute policy linked from that method.</li>
              <li>Check the recent reviews — both content and timing.</li>
              <li>Click through to the seller&apos;s official website. Confirm the URL matches what Standard shows.</li>
            </ol>
          ),
        },
        {
          title: "What Standard can and can&apos;t guarantee",
          body: (
            <>
              We can verify identity signals, payment-method proofs, and
              public reviews. We cannot guarantee any individual
              transaction will be problem-free, that a refund will be
              processed, or that delivery will meet a particular timeline.
              Buyers are still responsible for the final decision to
              transact on the seller&apos;s site.
            </>
          ),
        },
      ]}
      faq={[
        {
          q: "How is risk represented on Standard?",
          a: "As a combination of badges (Verified Seller, Provider / Developer), verified payment methods, refund-policy links, and review history. There's no single numeric score because risk has multiple independent dimensions.",
        },
        {
          q: "What's the highest-trust setup?",
          a: "Provider / Developer tag + verified card / PayPal G&S checkout with a refund policy + active review history. That combination gives buyers both identity and recourse.",
        },
        {
          q: "How do I report a risky seller?",
          a: "Use the report flow at /trust/report-a-seller. Include specific evidence — screenshots, dates, transaction references — so the Standard team can act quickly.",
        },
        {
          q: "Does a missing badge mean a seller is dangerous?",
          a: "Not automatically. A seller may be new, or may not have applied for a tag. Treat a missing badge as 'less information available' rather than 'definitively risky'.",
        },
      ]}
      related={[
        { href: "/trust/payment-verification", label: "Payment-method verification" },
        { href: "/trust/provider-tags", label: "Provider / Developer tags" },
        { href: "/trust/reviews", label: "How reviews work" },
        { href: "/trust/report-a-seller", label: "Report a seller" },
        { href: "/trust", label: "Trust overview" },
      ]}
      primaryCta={{ href: "/marketplace", label: "Open marketplace" }}
      secondaryCta={{
        href: "/trust/report-a-seller",
        label: "Report a seller",
      }}
    />
  );
}
