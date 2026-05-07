import { Nav, SectionHeader, Shell } from "@/components/ui";
import { MarketplaceClient } from "@/components/marketplace-client";

export default function MarketplacePage() {
  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeader
          eyebrow="Marketplace"
          title="Choose a game, then browse visually"
          text="A working marketplace: created seller products appear here, verified payments power filters, and featured slots appear first."
        />
        <MarketplaceClient />
      </section>
    </Shell>
  );
}
