import Link from "next/link";
import type { ReactNode } from "react";
import { ButtonLink, Card, Nav, SectionHeader, Shell } from "@/components/ui";
import { getSessionUser } from "@/lib/session";

export type TrustSection = { title: string; body: ReactNode };
export type TrustFaq = { q: string; a: string };
export type TrustLink = { href: string; label: string };

/**
 * Shared layout for /trust sub-pages. Each page passes a hero (eyebrow,
 * title, intro), a list of body sections, an FAQ block, related-page
 * links, and optional CTAs. The component handles Shell + Nav + Footer
 * (Footer is wired through Shell) so the page files stay as pure data.
 */
export async function TrustArticle({
  eyebrow,
  title,
  intro,
  sections,
  faq,
  related,
  primaryCta,
  secondaryCta,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: TrustSection[];
  faq: TrustFaq[];
  related: TrustLink[];
  primaryCta?: TrustLink;
  secondaryCta?: TrustLink;
}) {
  const user = await getSessionUser();
  return (
    <Shell>
      <Nav user={user} />
      <section className="mx-auto max-w-5xl px-6 py-10">
        <nav
          aria-label="Breadcrumb"
          className="mb-5 text-sm text-slate-400"
        >
          <Link href="/" className="hover:text-white">Home</Link>
          <span className="mx-2 text-slate-600">/</span>
          <Link href="/trust" className="hover:text-white">Trust</Link>
          <span className="mx-2 text-slate-600">/</span>
          <span className="text-slate-200">{title}</span>
        </nav>

        <SectionHeader eyebrow={eyebrow} title={title} text={intro} />

        {(primaryCta || secondaryCta) && (
          <div className="mt-6 flex flex-wrap gap-3">
            {primaryCta && (
              <ButtonLink href={primaryCta.href}>{primaryCta.label}</ButtonLink>
            )}
            {secondaryCta && (
              <ButtonLink href={secondaryCta.href} variant="secondary">
                {secondaryCta.label}
              </ButtonLink>
            )}
          </div>
        )}

        <div className="mt-10 grid gap-4">
          {sections.map((section, index) => (
            <Card key={`${section.title}-${index}`} className="p-6">
              <h2 className="text-xl font-bold">{section.title}</h2>
              <div className="mt-3 text-sm leading-7 text-slate-400">
                {section.body}
              </div>
            </Card>
          ))}
        </div>

        {faq.length > 0 && (
          <section className="mt-12">
            <p className="text-sm font-medium text-orange-300">FAQ</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
              Common questions
            </h2>
            <div className="mt-5 grid gap-3">
              {faq.map((item) => (
                <Card key={item.q} className="p-5">
                  <h3 className="text-base font-bold">{item.q}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.a}</p>
                </Card>
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold">Related trust pages</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {related.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-semibold text-slate-200 transition hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-orange-100"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12 rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center">
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">
            Ready to compare sellers?
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Browse the marketplace, check verified payment methods, and click
            through to the seller&apos;s official website to buy.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/marketplace">Open marketplace</ButtonLink>
            <ButtonLink href="/start-selling" variant="secondary">
              Start selling on Standard
            </ButtonLink>
          </div>
        </section>
      </section>
    </Shell>
  );
}
