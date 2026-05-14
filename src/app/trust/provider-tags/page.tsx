import type { Metadata } from "next";
import { TrustArticle } from "@/components/trust-article";

export const metadata: Metadata = {
  title: "Provider / Developer tags — Standard",
  description:
    "What the Provider / Developer badge represents on Standard, who qualifies, the proof required, and when the badge can be revoked.",
  alternates: { canonical: "/trust/provider-tags" },
};

export default function ProviderTagsPage() {
  return (
    <TrustArticle
      eyebrow="Trust"
      title="Provider / Developer tags"
      intro="The Provider / Developer tag identifies sellers who can show they are the official owner, developer, or provider of a listed gaming tool — not a reseller or third party."
      sections={[
        {
          title: "What the badge represents",
          body: (
            <>
              A Provider / Developer badge is a strong identity signal: the
              seller is the same entity that publishes the product on its
              own website, runs its support channels, and controls its
              official brand. It does not say anything about price,
              refund policy, or product quality — buyers should still check
              those independently.
            </>
          ),
        },
        {
          title: "Who is eligible",
          body: (
            <>
              The Provider / Developer tag is reserved for sellers who own
              the product they list. Common qualifiers include:
              <ul className="mt-3 list-disc pl-5 space-y-2">
                <li>The seller&apos;s official website matches the product brand.</li>
                <li>Public community channels (Discord, Telegram) are operated by the seller.</li>
                <li>The seller can show domain-level proof (e.g. SSL ownership, branded support email).</li>
              </ul>
            </>
          ),
        },
        {
          title: "Proof Standard accepts",
          body: (
            <ul className="list-disc pl-5 space-y-2">
              <li>Official-website URL matching the product brand.</li>
              <li>Discord / Telegram handles that are publicly linked from the website.</li>
              <li>Email from a domain matching the product brand.</li>
              <li>Product-panel screenshots, dashboard ownership, or other operational signals.</li>
            </ul>
          ),
        },
        {
          title: "Why some sellers don&apos;t have it",
          body: (
            <>
              A seller may publish products without applying for the badge,
              or may apply and be denied if the proof is insufficient. A
              missing Provider / Developer tag does not mean the seller is
              illegitimate — only that they have not (yet) shown the
              ownership proof. Buyers should rely on the combination of
              tags, verified payment methods, and other trust signals.
            </>
          ),
        },
        {
          title: "How the badge can be revoked",
          body: (
            <>
              The Standard team can revoke the badge if a seller&apos;s
              proof becomes outdated, if their official channels go offline,
              if they misrepresent ownership, or if a credible report
              indicates the seller is no longer the owner. Sellers can
              re-apply with updated proof.
            </>
          ),
        },
      ]}
      faq={[
        {
          q: "Who can request the Provider / Developer tag?",
          a: "Any seller who owns the product they list and can show proof of that ownership — typically an official website, branded community channels, and a matching support email.",
        },
        {
          q: "What proof is required?",
          a: "At minimum, a website URL that matches the product brand and a publicly linked support or community channel. Domain email and operational dashboards strengthen the case.",
        },
        {
          q: "Can a Provider tag be removed?",
          a: "Yes. If proof becomes outdated, official channels go offline, or a credible report indicates ownership has changed, the badge can be revoked. Sellers can re-apply.",
        },
        {
          q: "Does the tag guarantee the product is safe?",
          a: "No. The badge confirms identity and ownership only. Buyers should still review verified payment methods, refund policy, and seller-risk signals before buying.",
        },
      ]}
      related={[
        { href: "/trust/payment-verification", label: "Payment-method verification" },
        { href: "/trust/seller-risk", label: "Understanding seller risk" },
        { href: "/trust/reviews", label: "How reviews work" },
        { href: "/trust", label: "Trust overview" },
        { href: "/start-selling", label: "Apply as a seller" },
      ]}
      primaryCta={{ href: "/marketplace", label: "Open marketplace" }}
      secondaryCta={{
        href: "/start-selling",
        label: "Apply for a Provider tag",
      }}
    />
  );
}
