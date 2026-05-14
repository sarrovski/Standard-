import Link from "next/link";
import { ButtonLink, Card, Nav, SectionHeader, Shell } from "@/components/ui";
import type { LandingFaqItem } from "@/lib/landing-faq";
import { getSessionUser } from "@/lib/session";

type Crumb = { label: string; href?: string };

export async function LandingPage({
  eyebrow,
  title,
  intro,
  productCount,
  marketplaceHref,
  marketplaceLabel,
  trustNote,
  faqItems,
  breadcrumbs,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  productCount: number;
  marketplaceHref: string;
  marketplaceLabel: string;
  trustNote: string;
  faqItems: ReadonlyArray<LandingFaqItem>;
  breadcrumbs?: ReadonlyArray<Crumb>;
}) {
  const user = await getSessionUser();
  return (
    <Shell>
      <Nav user={user} />
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-10">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-400"
          >
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <span key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                  {crumb.href && !isLast ? (
                    <Link href={crumb.href} className="hover:text-white">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={isLast ? "text-slate-200" : ""}>{crumb.label}</span>
                  )}
                  {!isLast && <span className="text-slate-600">/</span>}
                </span>
              );
            })}
          </nav>
        )}

        <SectionHeader eyebrow={eyebrow} title={title} text={intro} />

        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href={marketplaceHref}>{marketplaceLabel}</ButtonLink>
          <ButtonLink href="/trust" variant="secondary">
            How verification works
          </ButtonLink>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-200/80">
              Active listings
            </p>
            <p className="mt-3 text-4xl font-black">{productCount}</p>
            <p className="mt-1 text-sm text-slate-500">
              listed or under review on Standard
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-xl font-bold">Seller verification</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Every Verified Seller is reviewed and approved by the Standard
              team before receiving the badge. The badge reflects the seller,
              not a guarantee about the product.
            </p>
          </Card>
          <Card className="p-6">
            <h3 className="text-xl font-bold">Payment-method verification</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Sellers submit checkout proofs and refund policies. Only the
              methods we verify surface on a product page&apos;s trust panel.
            </p>
          </Card>
        </div>

        <section className="mt-14">
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">
            Why this page exists
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
            {trustNote}
          </p>
        </section>

        <section className="mt-14">
          <p className="text-sm font-medium text-orange-300">Buyer FAQ</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
            Common buyer questions
          </h2>
          <div className="mt-6 grid gap-3">
            {faqItems.map((item) => (
              <Card key={item.q} className="p-5">
                <h3 className="text-base font-bold">{item.q}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{item.a}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center">
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">
            Ready to browse?
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Compare sellers, verified payment methods, and trust signals in one
            place. Then click through to a seller&apos;s official website to buy.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href={marketplaceHref}>{marketplaceLabel}</ButtonLink>
            <ButtonLink href="/trust" variant="secondary">
              Verification policy
            </ButtonLink>
          </div>
        </section>
      </section>
    </Shell>
  );
}
