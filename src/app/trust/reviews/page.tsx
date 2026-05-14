import type { Metadata } from "next";
import { TrustArticle } from "@/components/trust-article";

export const metadata: Metadata = {
  title: "Reviews on Standard — how they work",
  description:
    "How reviews on Standard work, who can leave them, how sellers are prevented from manipulating them, and what happens with suspicious patterns.",
  alternates: { canonical: "/trust/reviews" },
};

export default function ReviewsPage() {
  return (
    <TrustArticle
      eyebrow="Trust"
      title="How reviews on Standard work"
      intro="Reviews are one of the most important signals a buyer has. Standard's review system is built so feedback reflects real customer experiences and sellers cannot quietly edit or remove what's said about them."
      sections={[
        {
          title: "Why reviews matter on Standard",
          body: (
            <>
              Standard is a third-party trust layer. We don&apos;t sell or
              fulfil the products listed here — sellers do, on their own
              official websites. That makes the review history attached to
              each seller and product a buyer&apos;s primary check on how
              previous transactions actually went.
            </>
          ),
        },
        {
          title: "Who can leave a review",
          body: (
            <>
              Reviews are designed to come from real customers who have
              purchased or interacted with the seller. Reviewers must be
              signed in to a Standard account, and one account leaves one
              review per seller / product pair. Buying decisions made
              outside Standard can still be reviewed once the buyer creates
              an account and identifies the seller.
            </>
          ),
        },
        {
          title: "Sellers cannot edit or remove reviews",
          body: (
            <>
              Sellers see all reviews left for their products but cannot
              edit, delete, hide, or suppress them. Standard can remove
              reviews that violate platform rules (spam, off-topic content,
              doxxing, defamation, personal threats), but never on a
              seller&apos;s direct request.
            </>
          ),
        },
        {
          title: "Anti-manipulation policy",
          body: (
            <ul className="list-disc pl-5 space-y-2">
              <li>Coordinated fake reviews and review bombing are not allowed.</li>
              <li>Trading reviews for discounts or favours is not allowed.</li>
              <li>Reviews from accounts created clearly to brigade are removed.</li>
              <li>Sellers attempting to manipulate review history can lose verification or be removed.</li>
            </ul>
          ),
        },
        {
          title: "What happens with suspicious patterns",
          body: (
            <>
              Bursts of positive reviews from low-age accounts, mass
              negative reviews from accounts with no purchase history, or
              text patterns that look generated are flagged for the
              Standard team. We may remove the affected reviews, restrict
              the accounts involved, and (if a seller is implicated)
              revoke verification.
            </>
          ),
        },
      ]}
      faq={[
        {
          q: "Can a seller remove a negative review?",
          a: "No. Sellers cannot edit, delete, or hide reviews. They can respond publicly. Standard only removes reviews that violate platform rules.",
        },
        {
          q: "How does Standard detect fake reviews?",
          a: "We watch for unusual bursts, account age patterns, coordinated text, and reports from buyers and sellers. Suspicious activity is reviewed by the Standard team.",
        },
        {
          q: "Can I edit my own review?",
          a: "Yes — within reasonable limits. You can update your own review if your experience changes (e.g. a delayed order eventually arrived).",
        },
        {
          q: "What if a review is defamatory or off-topic?",
          a: "Sellers and buyers can report reviews that contain doxxing, defamation, personal threats, or unrelated spam. The Standard team reviews each report.",
        },
      ]}
      related={[
        { href: "/trust/seller-risk", label: "Understanding seller risk" },
        { href: "/trust/report-a-seller", label: "Report a seller" },
        { href: "/trust/payment-verification", label: "Payment-method verification" },
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
