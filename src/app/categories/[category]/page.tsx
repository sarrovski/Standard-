import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { productCategories } from "@/lib/data";
import { buyerLandingFaq } from "@/lib/landing-faq";
import { countProducts } from "@/lib/landing-counts";
import { categoryFromSlug, toSlug } from "@/lib/slugs";

export async function generateStaticParams() {
  return productCategories.map((category) => ({ category: toSlug(category) }));
}

export async function generateMetadata({
  params,
}: {
  params: { category: string };
}): Promise<Metadata> {
  const category = categoryFromSlug(params.category);
  if (!category) {
    return { title: "Not found — Standard" };
  }
  const title = `${category} gaming tools — verified sellers on Standard`;
  const description = `Discover ${category}-type gaming tools listed on Standard. Compare seller verification, payment-method proofs, and trust signals across games.`;
  return {
    title,
    description,
    alternates: { canonical: `/categories/${toSlug(category)}` },
    openGraph: { title, description, type: "website" },
  };
}

export default async function CategoryLandingPage({
  params,
}: {
  params: { category: string };
}) {
  const category = categoryFromSlug(params.category);
  if (!category) notFound();
  const count = await countProducts({ category });
  const marketplaceHref = `/marketplace?category=${encodeURIComponent(category)}`;

  return (
    <LandingPage
      eyebrow="Category"
      title={`${category} gaming tools`}
      intro={`Browse ${category}-type gaming tools across every supported game. Compare seller verification, accepted payment methods, and trust signals before clicking through to a seller's official website.`}
      productCount={count}
      marketplaceHref={marketplaceHref}
      marketplaceLabel={`Browse ${category} listings`}
      trustNote={`Standard categorises gaming tools by type so buyers can quickly compare what's out there. We don't sell ${category} products ourselves — we surface verification status, payment-method proofs, and seller signals to help reduce buyer risk before any purchase happens on a seller's own website.`}
      faqItems={buyerLandingFaq}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Categories", href: "/marketplace" },
        { label: category },
      ]}
    />
  );
}
