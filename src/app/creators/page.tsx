import type { Metadata } from "next";
import { Badge, ButtonLink, Nav, Shell } from "@/components/ui";
import { CreatorsBrowseClient } from "@/components/creators-browse-client";
import { getSessionUser } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/roles";
import { getPublicCreators } from "@/lib/repositories/creators";
import { CREATOR_COPY, type UICreatorCard } from "@/lib/creator-marketplace";

export const metadata: Metadata = {
  title: "Find media creators for gaming product content — Standard",
  description:
    "Discover media creators for product showcases, thumbnails, trailers, reviews, and promos. Standard helps sellers find creators and send briefs — payments and delivery are handled externally.",
  alternates: { canonical: "/creators" },
};

// Demo-mode sample cards. Only rendered when Supabase isn't configured,
// and clearly labelled as concept previews — never mixed with real data.
const DEMO_CREATORS: UICreatorCard[] = [
  {
    id: "demo-1",
    slug: "demo-novacut",
    displayName: "NovaCut Studio (concept)",
    headline: "Short-form showcases and launch trailers",
    avatarUrl: null,
    bannerUrl: null,
    platforms: ["TikTok", "YouTube Shorts", "YouTube"],
    contentTypes: ["Showcases", "Trailers"],
    gamesCovered: ["Valorant", "CS2"],
    startingRate: "$120",
    availability: "Open this week",
    isFeatured: true,
    portfolioCount: 0,
    previewItem: null,
  },
  {
    id: "demo-2",
    slug: "demo-vanta",
    displayName: "Vanta Thumbnails (concept)",
    headline: "Clickable YouTube and web thumbnail systems",
    avatarUrl: null,
    bannerUrl: null,
    platforms: ["YouTube", "Web"],
    contentTypes: ["Thumbnails", "Promos"],
    gamesCovered: ["Apex Legends", "Fortnite"],
    startingRate: "$45",
    availability: "Available next week",
    isFeatured: false,
    portfolioCount: 0,
    previewItem: null,
  },
];

export default async function CreatorsPage() {
  const user = await getSessionUser();
  const supabaseReady = isSupabaseConfigured();
  const creatorsRes = supabaseReady
    ? await getPublicCreators()
    : { data: [], error: null };
  const creators = creatorsRes.data;
  const hasCreators = creators.length > 0;

  return (
    <Shell>
      <Nav user={user} />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="max-w-3xl">
          <Badge tone="orange">Media creators</Badge>
          <h1 className="mt-5 text-4xl font-black tracking-tight md:text-6xl">
            Find creators for gaming product content
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-400">
            {CREATOR_COPY.tagline} {CREATOR_COPY.discovery}{" "}
            {CREATOR_COPY.externalPayments}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="#creator-list">Browse creators</ButtonLink>
            <ButtonLink href="/creators/apply" variant="secondary">
              Apply as a creator
            </ButtonLink>
          </div>
          <p className="mt-5 max-w-xl rounded-2xl border border-orange-400/20 bg-orange-500/10 p-4 text-sm leading-6 text-orange-100">
            {CREATOR_COPY.reviewNotice} Send a brief from any creator&apos;s
            profile page — there&apos;s no global brief form.
          </p>
        </div>

        <div id="creator-list" className="mt-12 scroll-mt-24">
          {!supabaseReady ? (
            <>
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                Demo mode — these are concept profiles for layout review.
                Live creator listings load once Supabase is connected.
              </div>
              <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {DEMO_CREATORS.map((creator) => (
                  <div
                    key={creator.id}
                    className="rounded-3xl border border-white/10 bg-white/[0.035] p-5"
                  >
                    <Badge tone="default">Concept profile</Badge>
                    <h3 className="mt-3 text-lg font-black">
                      {creator.displayName}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {creator.headline}
                    </p>
                    <div className="mt-4 text-sm text-slate-500">
                      {creator.contentTypes.join(" · ")}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : hasCreators ? (
            <CreatorsBrowseClient creators={creators} />
          ) : (
            <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/40 p-10 text-center">
              <h2 className="text-2xl font-black tracking-tight">
                No approved creators yet
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
                {CREATOR_COPY.reviewNotice} Be one of the first media
                creators on Standard.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <ButtonLink href="/creators/apply">
                  Apply as a creator
                </ButtonLink>
                <ButtonLink href="/marketplace" variant="secondary">
                  Browse the marketplace
                </ButtonLink>
              </div>
            </div>
          )}
        </div>
      </section>
    </Shell>
  );
}
