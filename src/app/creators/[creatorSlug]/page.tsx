import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { Badge, ButtonLink, Card, Nav, Shell } from "@/components/ui";
import { CreatorBriefForm } from "@/components/creator-brief-form";
import { isSupabaseConfigured } from "@/lib/roles";
import { getPublicCreatorBySlug } from "@/lib/repositories/creators";
import { getSessionUser } from "@/lib/session";
import { getSiteUrl } from "@/lib/site-url";
import {
  PORTFOLIO_ITEM_TYPE_LABEL,
  type UICreatorPortfolioItem,
  type UICreatorProfile,
} from "@/lib/creator-marketplace";

/**
 * Public creator profile — /creators/[creatorSlug].
 *
 * Indexable when the creator profile is active. Surfaces the hero
 * (avatar, name, headline, badges, rate, availability), the public
 * portfolio grid, an About block, and a "send creator brief" panel.
 *
 * Standard does NOT process creator payments — the brief is a contact
 * request; the seller/creator deal happens externally.
 */

type LoadResult =
  | {
      kind: "ok";
      profile: UICreatorProfile;
      items: UICreatorPortfolioItem[];
    }
  | { kind: "not_found" }
  | { kind: "error" }
  | { kind: "demo" };

const loadCreator = cache(async (slug: string): Promise<LoadResult> => {
  if (!isSupabaseConfigured()) return { kind: "demo" };
  const res = await getPublicCreatorBySlug(slug);
  if (res.error) return { kind: "error" };
  if (!res.data) return { kind: "not_found" };
  return { kind: "ok", profile: res.data.profile, items: res.data.items };
});

export async function generateMetadata({
  params,
}: {
  params: { creatorSlug: string };
}): Promise<Metadata> {
  const result = await loadCreator(params.creatorSlug);
  if (result.kind !== "ok") {
    return {
      title: "Creator not found — Standard",
      robots: { index: false, follow: false },
    };
  }
  const { profile } = result;
  const canonical = `/creators/${params.creatorSlug}`;
  const title = `${profile.displayName} — media creator on Standard`;
  const descriptionParts = [profile.headline ?? "Media creator on Standard"];
  if (profile.contentTypes.length > 0) {
    descriptionParts.push(profile.contentTypes.join(", "));
  }
  if (profile.gamesCovered.length > 0) {
    descriptionParts.push(`Covers ${profile.gamesCovered.join(", ")}`);
  }
  const description = descriptionParts.join(" · ").slice(0, 160);
  const image = profile.bannerUrl ?? profile.avatarUrl ?? null;

  return {
    title: title.length > 60 ? `${profile.displayName} on Standard` : title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: "profile",
      url: canonical,
      siteName: "Standard",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

function buildCreatorJsonLd(slug: string, profile: UICreatorProfile): unknown {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${profile.displayName} on Standard`,
    url: `${siteUrl}/creators/${slug}`,
    mainEntity: {
      "@type": "Person",
      name: profile.displayName,
      description: profile.headline ?? undefined,
      url: `${siteUrl}/creators/${slug}`,
      ...(profile.avatarUrl ? { image: profile.avatarUrl } : {}),
      ...(profile.websiteUrl ? { sameAs: [profile.websiteUrl] } : {}),
    },
  };
}

export default async function CreatorProfilePage({
  params,
}: {
  params: { creatorSlug: string };
}) {
  const result = await loadCreator(params.creatorSlug);
  const user = await getSessionUser();

  if (result.kind !== "ok") {
    const message =
      result.kind === "demo"
        ? "Creator profiles load once Supabase is connected."
        : result.kind === "not_found"
          ? "We couldn't find that creator, or their profile isn't active."
          : "Couldn't load this creator profile.";
    return (
      <Shell>
        <Nav user={user} />
        <section className="mx-auto max-w-3xl px-6 py-16 text-center">
          <Link
            href="/creators"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back to creators
          </Link>
          <h1 className="mt-6 text-3xl font-black tracking-tight">
            Creator unavailable
          </h1>
          <p className="mt-3 text-sm text-slate-400">{message}</p>
          <div className="mt-6 flex justify-center">
            <ButtonLink href="/creators">Browse creators</ButtonLink>
          </div>
        </section>
      </Shell>
    );
  }

  const { profile, items } = result;
  const jsonLd = buildCreatorJsonLd(params.creatorSlug, profile);

  return (
    <Shell>
      <Nav user={user} />
      <section className="mx-auto max-w-5xl px-6 py-10">
        <Link
          href="/creators"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Back to creators
        </Link>

        {/* Hero ----------------------------------------------------------- */}
        <header className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
          <div className="relative h-36 bg-slate-950 sm:h-44">
            {profile.bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.bannerUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-orange-500/20 to-orange-400/10" />
            )}
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-start">
            <div className="-mt-16 flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-orange-400 to-orange-600 text-3xl font-black text-white">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={`${profile.displayName} avatar`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{profile.displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-black tracking-tight">
                  {profile.displayName}
                </h1>
                {profile.isFeatured && <Badge tone="orange">Featured</Badge>}
              </div>
              {profile.headline && (
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {profile.headline}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.gamesCovered.map((game) => (
                  <Chip key={`g-${game}`}>{game}</Chip>
                ))}
                {profile.contentTypes.map((type) => (
                  <Chip key={`c-${type}`}>{type}</Chip>
                ))}
                {profile.platforms.map((platform) => (
                  <Chip key={`p-${platform}`}>{platform}</Chip>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                <span>
                  <span className="text-slate-500">Starting at </span>
                  <span className="font-black text-white">
                    {profile.startingRate ?? "On request"}
                  </span>
                </span>
                <span>
                  <span className="text-slate-500">Availability </span>
                  <span className="font-semibold text-slate-200">
                    {profile.availability ?? "Ask"}
                  </span>
                </span>
                {profile.websiteUrl && (
                  <a
                    href={profile.websiteUrl}
                    target="_blank"
                    rel="noreferrer nofollow"
                    className="font-semibold text-orange-300 underline-offset-2 hover:underline"
                  >
                    Website ↗
                  </a>
                )}
              </div>
              <div className="mt-5">
                <ButtonLink href="#send-brief">Send creator brief</ButtonLink>
              </div>
            </div>
          </div>
        </header>

        {/* Portfolio ------------------------------------------------------ */}
        <section className="mt-10">
          <h2 className="text-2xl font-black">Portfolio</h2>
          {items.length === 0 ? (
            <Card className="mt-4 p-6 text-sm text-slate-400">
              This creator hasn&apos;t added public portfolio work yet.
            </Card>
          ) : (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <PortfolioCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        {/* About ---------------------------------------------------------- */}
        {(profile.bio ||
          profile.platforms.length > 0 ||
          profile.contentTypes.length > 0 ||
          profile.gamesCovered.length > 0) && (
          <section className="mt-10">
            <h2 className="text-2xl font-black">About</h2>
            <Card className="mt-4 p-6">
              {profile.bio && (
                <p className="text-sm leading-7 text-slate-300 whitespace-pre-line">
                  {profile.bio}
                </p>
              )}
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <AboutBlock label="Platforms" values={profile.platforms} />
                <AboutBlock
                  label="Content types"
                  values={profile.contentTypes}
                />
                <AboutBlock label="Games covered" values={profile.gamesCovered} />
              </div>
            </Card>
          </section>
        )}

        {/* Send brief ----------------------------------------------------- */}
        <section id="send-brief" className="mt-10 scroll-mt-24">
          <h2 className="text-2xl font-black">Send {profile.displayName} a brief</h2>
          <p className="mt-2 text-sm text-slate-400">
            Briefs are a contact request — the creator responds externally
            using the details you provide. Standard doesn&apos;t process
            creator payments.
          </p>
          <Card className="mt-4 p-6">
            <CreatorBriefForm
              creatorSlug={params.creatorSlug}
              creatorName={profile.displayName}
              loggedIn={Boolean(user)}
              defaultEmail={user?.email ?? null}
            />
          </Card>
        </section>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </Shell>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-white/10 bg-slate-950/50 px-2 py-1 text-xs text-slate-300">
      {children}
    </span>
  );
}

function AboutBlock({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.map((value) => (
          <Chip key={value}>{value}</Chip>
        ))}
      </div>
    </div>
  );
}

function PortfolioCard({ item }: { item: UICreatorPortfolioItem }) {
  const inner = (
    <Card className="h-full overflow-hidden transition hover:border-orange-400/30">
      <div className="relative aspect-video overflow-hidden bg-slate-950">
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-orange-500/15 to-orange-400/10" />
        )}
        <span className="absolute left-2 top-2 rounded-md border border-white/15 bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {PORTFOLIO_ITEM_TYPE_LABEL[item.itemType]}
        </span>
      </div>
      <div className="p-4">
        <h3 className="text-sm font-bold text-white">{item.title}</h3>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-xs text-slate-400">
            {item.description}
          </p>
        )}
        {(item.game || item.platform) && (
          <div className="mt-2 text-[11px] text-slate-500">
            {[item.game, item.platform].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
    </Card>
  );

  if (item.externalUrl) {
    return (
      <a href={item.externalUrl} target="_blank" rel="noreferrer nofollow">
        {inner}
      </a>
    );
  }
  return inner;
}
