import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { games, productCategories } from "@/lib/data";
import { buyerLandingFaq } from "@/lib/landing-faq";
import { countProducts } from "@/lib/landing-counts";
import { categoryFromSlug, gameFromSlug, toSlug } from "@/lib/slugs";

export async function generateStaticParams() {
  const out: Array<{ game: string; category: string }> = [];
  for (const game of games) {
    for (const category of productCategories) {
      out.push({ game: toSlug(game), category: toSlug(category) });
    }
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: { game: string; category: string };
}): Promise<Metadata> {
  const game = gameFromSlug(params.game);
  const category = categoryFromSlug(params.category);
  if (!game || !category) {
    return { title: "Not found — Standard" };
  }
  const title = `${game} — ${category} gaming tools on Standard`;
  const description = `Compare verified sellers, payment methods, and trust signals for ${category}-type ${game} gaming tools on Standard.`;
  return {
    title,
    description,
    alternates: {
      canonical: `/games/${toSlug(game)}/${toSlug(category)}`,
    },
    openGraph: { title, description, type: "website" },
  };
}

export default async function GameCategoryLandingPage({
  params,
}: {
  params: { game: string; category: string };
}) {
  const game = gameFromSlug(params.game);
  const category = categoryFromSlug(params.category);
  if (!game || !category) notFound();
  const count = await countProducts({ game, category });
  const marketplaceHref = `/marketplace?game=${encodeURIComponent(game)}&category=${encodeURIComponent(category)}`;

  return (
    <LandingPage
      eyebrow={`${game} · ${category}`}
      title={`${category} gaming tools for ${game}`}
      intro={`Browse ${category}-type ${game} gaming tools listed on Standard. Compare seller verification, accepted payment methods, and trust signals before deciding where to buy.`}
      productCount={count}
      marketplaceHref={marketplaceHref}
      marketplaceLabel={`Open ${game} · ${category} listings`}
      trustNote={`This page combines a game and a product type so buyers can narrow their search quickly. Standard is a third-party trust layer — we don't sell or deliver ${game} gaming tools ourselves, we surface verification, payment-method proofs, and seller signals so buyers can reduce risk before any purchase happens on a seller's own site.`}
      faqItems={buyerLandingFaq}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: game, href: `/games/${toSlug(game)}` },
        { label: category },
      ]}
    />
  );
}
