import type { Metadata } from "next";
import { TrustArticle } from "@/components/trust-article";

export const metadata: Metadata = {
  title: "Report a seller — Standard",
  description:
    "How to report a seller on Standard. What's reportable, what evidence helps, how reviews are handled, and the possible outcomes.",
  alternates: { canonical: "/trust/report-a-seller" },
};

export default function ReportSellerPage() {
  return (
    <TrustArticle
      eyebrow="Trust"
      title="Report a seller"
      intro="If a seller misrepresents themselves, breaks Standard's rules, or harms a buyer, you can report them to our trust team. Good reports include specific, verifiable evidence."
      sections={[
        {
          title: "What is reportable",
          body: (
            <ul className="list-disc pl-5 space-y-2">
              <li>Misrepresenting ownership — claiming to be the Provider / Developer without proof.</li>
              <li>Inventing or faking verified payment methods.</li>
              <li>Manipulating reviews — buying, bartering, brigading, or coordinating them.</li>
              <li>Misleading product claims (pricing, included features, delivery promises).</li>
              <li>Refusing a refund where one was promised in the linked policy.</li>
              <li>Impersonating another seller or brand.</li>
              <li>Abusive, threatening, or doxxing behaviour toward buyers.</li>
            </ul>
          ),
        },
        {
          title: "What is not handled here",
          body: (
            <>
              Standard is a discovery and trust-signal layer, not a
              payment processor or escrow service. Disputes about the
              quality of a delivered product, refund timing, or technical
              support belong with the seller&apos;s own support channel
              first. Open a Standard report if the seller is uncooperative
              <em> and</em> their behaviour falls into one of the
              reportable categories above.
            </>
          ),
        },
        {
          title: "What to include in a report",
          body: (
            <ul className="list-disc pl-5 space-y-2">
              <li>The seller name and product URL on Standard.</li>
              <li>The seller&apos;s official website URL and the date you visited it.</li>
              <li>Screenshots of the issue (claim vs. reality, refund refusal, etc.).</li>
              <li>Transaction reference numbers if a purchase was attempted.</li>
              <li>Links to relevant community channels and dates of any interactions.</li>
              <li>Any other public evidence (review patterns, social media posts).</li>
            </ul>
          ),
        },
        {
          title: "How reports are reviewed",
          body: (
            <>
              The Standard team reads every report. We may contact the
              reporter for clarification, contact the seller for a
              response, and consult public evidence. We do not share the
              reporter&apos;s identity with the seller. Decisions are made
              against the platform rules in our terms, not on volume of
              reports alone.
            </>
          ),
        },
        {
          title: "Possible outcomes",
          body: (
            <ul className="list-disc pl-5 space-y-2">
              <li>No action — the report does not meet platform rules.</li>
              <li>Warning — the seller is informed and given a chance to fix the issue.</li>
              <li>Badge revocation — the Verified Seller or Provider / Developer tag is removed.</li>
              <li>Payment-method de-verification — the verified payment-method badge is removed until proof is re-submitted.</li>
              <li>Listing removal — one or more products are removed from the marketplace.</li>
              <li>Seller removal — repeated or severe violations end the account.</li>
            </ul>
          ),
        },
        {
          title: "How to contact us",
          body: (
            <>
              Send your report — with the evidence listed above — to{" "}
              <a
                href="mailto:trust@standard.gg"
                className="text-orange-200 underline-offset-2 hover:underline"
              >
                trust@standard.gg
              </a>
              . Reports are typically reviewed within 5 business days,
              faster for safety-critical issues.
            </>
          ),
        },
      ]}
      faq={[
        {
          q: "Will my identity be shared with the seller?",
          a: "No. Standard does not share reporter identity with the seller. If we contact the seller for a response, we describe the issue in general terms without identifying you.",
        },
        {
          q: "Can I report anonymously?",
          a: "You can, but a report with no contact information is harder to act on if we need follow-up evidence. We recommend using an email you check.",
        },
        {
          q: "How long does a report take?",
          a: "Most reports are reviewed within 5 business days. Safety-critical issues (impersonation, doxxing, threats) are prioritised.",
        },
        {
          q: "What happens after a report?",
          a: "You get an acknowledgement, and an outcome notification once the team has finished its review. Outcomes range from no action to seller removal depending on the violation.",
        },
      ]}
      related={[
        { href: "/trust/reviews", label: "How reviews work" },
        { href: "/trust/seller-risk", label: "Understanding seller risk" },
        { href: "/trust/provider-tags", label: "Provider / Developer tags" },
        { href: "/trust", label: "Trust overview" },
        { href: "/terms", label: "Platform terms" },
      ]}
      primaryCta={{ href: "/marketplace", label: "Back to marketplace" }}
      secondaryCta={{
        href: "/terms",
        label: "Read platform terms",
      }}
    />
  );
}
