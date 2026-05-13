import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { games } from "@/lib/data";
import { buyerLandingFaq } from "@/lib/landing-faq";
import { countProducts } from "@/lib/landing-counts";
import { gameFromSlug, toSlug } from "@/lib/slugs";

export async function generateStaticParams() {
  return games.map((game) => ({ game: toSlug(game) }));
}

export async function generateMetadata({
  params,
}: {
  params: { game: string };
}): Promise<Metadata> {
  const game = gameFromSlug(params.game);
  if (!game) {
    return { title: "Not found — Standard" };
  }
  const title = `${game} gaming tools — verified sellers on Standard`;
  const description = `Compare verified sellers, payment methods, and trust signals for ${game} gaming tools on Standard. Browse the marketplace before clicking through to a seller's official website.`;
  return {
    title,
    description,
    alternates: { canonical: `/games/${toSlug(game)}` },
    openGraph: { title, description, type: "website" },
  };
}

export default async function GameLandingPage({
  params,
}: {
  params: { game: string };
}) {
  const game = gameFromSlug(params.game);
  if (!game) notFound();
  const count = await countProducts({ game });
  const marketplaceHref = `/marketplace?game=${encodeURIComponent(game)}`;

  return (
    <LandingPage
      eyebrow="Game hub"
      title={`${game} gaming tools`}
      intro={`Browse seller-listed ${game} gaming tools on Standard. Compare seller verification, accepted payment methods, and trust signals before you decide where to buy.`}
      productCount={count}
      marketplaceHref={marketplaceHref}
      marketplaceLabel={`Open ${game} on the marketplace`}
      trustNote={`Standard is a third-party trust layer for ${game} gaming-tool buyers. We don't sell or deliver products ourselves — we surface seller verification, payment-method proofs, and other trust signals so buyers can reduce risk before leaving for a seller's official website.`}
      faqItems={buyerLandingFaq}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Games", href: "/marketplace" },
        { label: game },
      ]}
    />
  );
}
