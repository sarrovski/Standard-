import type { Metadata } from "next";
import { TrustArticle } from "@/components/trust-article";

export const metadata: Metadata = {
  title: "How Standard ranks products",
  description:
    "How product ordering on Standard works: featured slots, recency, verification status, buyer signals, and what we don't do.",
  alternates: { canonical: "/trust/how-standard-ranks-products" },
};

export default function HowStandardRanksProductsPage() {
  return (
    <TrustArticle
      eyebrow="Trust"
      title="How Standard ranks products"
      intro="The order products appear in on Standard is the result of a small set of public signals. This page explains exactly which signals matter, so sellers and buyers know what they're looking at."
      sections={[
        {
          title: "The principles",
          body: (
            <>
              The marketplace orders products by combining clarity (does
              the listing have enough information for a buyer to decide),
              trust (verification status and verified payment methods),
              and recency (newer published products surface ahead of stale
              ones). No single signal dominates — a high-quality new
              listing can outrank an older one, and a verified seller
              cannot outrank a clearly higher-quality unverified listing
              on quality alone.
            </>
          ),
        },
        {
          title: "Featured slots",
          body: (
            <>
              A small number of slots per game / category are paid,
              time-boxed placements at the top of the marketplace. Featured
              slots are clearly badged as featured, are limited to one
              active slot per game / category, and never replace the
              underlying ordering — they sit above it. Sellers pay for
              the slot directly; the buyer sees the same trust signals on
              a featured listing as on any other.
            </>
          ),
        },
        {
          title: "Verification status",
          body: (
            <ul className="list-disc pl-5 space-y-2">
              <li>Published status is required to appear in the public marketplace.</li>
              <li>Verified Seller and Provider / Developer tags improve ranking, all else equal.</li>
              <li>Verified payment methods improve ranking, all else equal.</li>
              <li>Recently revoked badges lower ranking until the seller re-verifies.</li>
            </ul>
          ),
        },
        {
          title: "Listing quality",
          body: (
            <>
              Products with complete listings — name, summary &gt; 120
              characters, at least one image, an FAQ, named feature
              groups, and a website URL — rank higher than otherwise
              identical listings missing those fields. Sellers can see
              their own listing-quality score in the dashboard.
            </>
          ),
        },
        {
          title: "Buyer signals",
          body: (
            <ul className="list-disc pl-5 space-y-2">
              <li>Number of views and outbound clicks (when traffic data is available).</li>
              <li>Saved-product count from buyer accounts.</li>
              <li>Recent review history — recency and consistency, not raw star count.</li>
            </ul>
          ),
        },
        {
          title: "What we don&apos;t do",
          body: (
            <ul className="list-disc pl-5 space-y-2">
              <li>No pay-to-rank beyond clearly badged featured slots.</li>
              <li>No private ranking deals with individual sellers.</li>
              <li>No ranking penalty for negative reviews on their own — only manipulated review patterns.</li>
              <li>No hidden &quot;trust score&quot; that buyers can&apos;t see — every input is on the product page.</li>
            </ul>
          ),
        },
      ]}
      faq={[
        {
          q: "Can sellers pay for higher ranking?",
          a: "Only through clearly badged featured slots, which are limited to one active slot per game / category. Outside of featured placement, ranking is determined by verification, listing quality, and buyer signals — not by payment.",
        },
        {
          q: "How does featured placement work?",
          a: "Sellers buy a time-boxed slot for a specific game / category. The slot is badged as featured and sits above the organic listings. Only one slot per game / category can be active at a time.",
        },
        {
          q: "Why might my product not show up?",
          a: "Most often: the product is in draft or archived status (only published products appear in the marketplace), or the listing is missing key fields (no media, short summary, no website URL). The dashboard 'Listing strength' score highlights what to fix.",
        },
        {
          q: "Are reviews factored into ranking?",
          a: "Yes — recency and consistency, not raw star count. A handful of recent, consistent reviews matter more than a long tail of old ones. Manipulated review patterns lower ranking and can trigger badge revocation.",
        },
      ]}
      related={[
        { href: "/trust/payment-verification", label: "Payment-method verification" },
        { href: "/trust/provider-tags", label: "Provider / Developer tags" },
        { href: "/trust/reviews", label: "How reviews work" },
        { href: "/trust/seller-risk", label: "Understanding seller risk" },
        { href: "/plans", label: "Seller plans (and featured slots)" },
        { href: "/trust", label: "Trust overview" },
      ]}
      primaryCta={{ href: "/marketplace", label: "Open marketplace" }}
      secondaryCta={{
        href: "/plans",
        label: "Seller plans",
      }}
    />
  );
}
