import { Card, Nav, SectionHeader, Shell } from "@/components/ui";

const sections = [
  {
    title: "1. Standard's role",
    text:
      "Standard is a marketplace discovery, comparison, and seller verification platform. Standard does not directly sell third-party products listed by sellers. Sellers are responsible for their own products, payment policies, delivery, customer support, and product claims.",
  },
  {
    title: "2. Seller verification",
    text:
      "A Verified Seller badge means the seller has been reviewed and approved by the Standard team based on available information. Verification can include seller identity signals, marketplace history, website review, community proof, payment policy review, and other trust signals. Verification can be revoked at any time.",
  },
  {
    title: "3. Provider / Developer tag",
    text:
      "The Provider / Developer tag is reserved for sellers who submit proof that they are the official owner, developer, or provider of a listed product. Proof may include an official website, Discord, Telegram, domain email, product panel, or other ownership indicators. Standard may approve, reject, or request more proof.",
  },
  {
    title: "4. Reviews",
    text:
      "Reviews should reflect real customer experiences. Sellers cannot directly edit, remove, suppress, or manipulate reviews. Fake reviews, review bombing, coordinated review manipulation, spam, or misleading review activity may result in moderation, restriction, badge removal, or product removal.",
  },
  {
    title: "5. Payment methods and risk",
    text:
      "Payment methods displayed on Standard are used to help buyers compare purchasing options. Some payment methods may carry higher risk, including irreversible payments, gift cards, or friend/family transfers. Buyers are responsible for reviewing payment risk before purchasing.",
  },
  {
    title: "6. Seller responsibility",
    text:
      "Sellers are responsible for accurate product information, pricing, payment terms, stock status, delivery, refunds, and support. Misleading claims, impersonation, fake verification attempts, or abusive behavior may lead to suspension or removal from Standard.",
  },
  {
    title: "7. Buyer responsibility",
    text:
      "Standard provides trust signals and comparison tools, but buyers remain responsible for their purchase decisions. Buyers should compare sellers carefully and review verification status, payment method, delivery details, refund policy, and reviews before buying.",
  },
  {
    title: "8. Moderation rights",
    text:
      "Standard may review, restrict, hide, or remove products, seller tags, reviews, payment methods, or accounts that appear misleading, risky, abusive, manipulated, or in violation of platform rules.",
  },
];

export default function TermsPage() {
  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-5xl px-6 py-10">
        <SectionHeader
          eyebrow="Terms"
          title="Standard platform terms"
          text="These terms explain how Standard positions seller verification, reviews, payment methods, and buyer comparison tools."
        />

        <div className="mt-8 space-y-4">
          {sections.map((section) => (
            <Card key={section.title} className="p-6">
              <h2 className="text-xl font-bold">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">{section.text}</p>
            </Card>
          ))}
        </div>

        <Card className="mt-8 border-orange-400/20 bg-orange-500/10 p-6">
          <h2 className="text-xl font-bold">Plain-English summary</h2>
          <p className="mt-3 text-sm leading-7 text-orange-100/90">
            Standard helps customers compare sellers so they can make better decisions and avoid scams.
            Verified Sellers are approved by our team. Provider / Developer tags require proof.
            Reviews should come from real customers and sellers cannot manipulate them. Standard does
            not directly sell third-party products and buyers should still check risks before purchasing.
          </p>
        </Card>
      </section>
    </Shell>
  );
}
