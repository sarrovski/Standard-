import { Badge, ButtonLink, Card, Nav, Shell } from "@/components/ui";

type Creator = {
  name: string;
  games: string[];
  contentTypes: string[];
  platforms: string[];
  startingRate: string;
  availability: string;
  accent: string;
};

const CREATORS: Creator[] = [
  {
    name: "NovaCut Studio",
    games: ["Valorant", "CS2", "Apex Legends"],
    contentTypes: ["TikToks", "Trailers", "Showcases"],
    platforms: ["TikTok", "YouTube Shorts", "YouTube"],
    startingRate: "$120",
    availability: "Open this week",
    accent: "from-cyan-400/60 via-orange-500/30 to-slate-950",
  },
  {
    name: "ClipForge",
    games: ["Fortnite", "Valorant", "Warzone"],
    contentTypes: ["Clips", "Promos", "Reviews"],
    platforms: ["TikTok", "Instagram Reels", "X"],
    startingRate: "$75",
    availability: "2 slots left",
    accent: "from-emerald-400/50 via-cyan-500/30 to-slate-950",
  },
  {
    name: "Vanta Thumbnails",
    games: ["CS2", "League of Legends", "Apex Legends"],
    contentTypes: ["Thumbnails", "Showcases", "Trailers"],
    platforms: ["YouTube", "Discord", "Web"],
    startingRate: "$45",
    availability: "Available next week",
    accent: "from-amber-300/50 via-orange-500/30 to-slate-950",
  },
  {
    name: "Pulse Review Lab",
    games: ["Valorant", "Fortnite", "Overwatch 2"],
    contentTypes: ["Reviews", "YouTube showcases", "Promos"],
    platforms: ["YouTube", "TikTok", "Twitch"],
    startingRate: "$180",
    availability: "Invite only",
    accent: "from-orange-400/60 via-cyan-400/25 to-slate-950",
  },
];

const FILTERS = {
  game: ["All", "Valorant", "CS2", "Fortnite", "Apex Legends", "League of Legends"],
  contentType: ["All", "TikToks", "Trailers", "Thumbnails", "Reviews", "Promos"],
  platform: ["All", "TikTok", "YouTube", "YouTube Shorts", "Instagram Reels", "Twitch"],
  availability: ["All", "Open this week", "2 slots left", "Available next week", "Invite only"],
};

export default function CreatorsPage() {
  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.82fr] lg:items-center">
          <div>
            <Badge tone="orange">Media creators</Badge>
            <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
              Find creators for gaming product content
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
              Sellers can discover creators for TikToks, YouTube showcases,
              trailers, thumbnails, reviews, and promos without Standard
              handling payments in the MVP.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                disabled
                className="inline-flex cursor-not-allowed items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-500"
              >
                Post a creator brief
              </button>
              <ButtonLink href="/creators/apply">Apply as a creator</ButtonLink>
            </div>

            <p className="mt-5 max-w-xl rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm leading-6 text-cyan-100">
              Creator profiles will be reviewed before appearing publicly.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Short-form clips", "TikTok, Reels, Shorts"],
              ["Launch trailers", "Product motion and feature beats"],
              ["Thumbnail systems", "Clickable YouTube and web assets"],
              ["Creator reviews", "Showcases with external contact"],
            ].map(([title, text]) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-slate-950/50 p-5"
              >
                <div className="h-28 rounded-xl border border-white/10 bg-gradient-to-br from-slate-900 via-orange-500/20 to-orange-400/10" />
                <h2 className="mt-4 text-lg font-black">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="mt-10 p-5">
          <div className="grid gap-6 lg:grid-cols-4">
            <FilterBlock title="Game" options={FILTERS.game} />
            <FilterBlock title="Content type" options={FILTERS.contentType} />
            <FilterBlock title="Platform" options={FILTERS.platform} />
            <FilterBlock title="Availability" options={FILTERS.availability} />
          </div>
        </Card>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">Creator concept preview</h2>
            <p className="mt-2 text-sm text-slate-500">
              Static cards for D1 validation. Filters are visual only.
            </p>
          </div>
          <Badge tone="amber">External contact MVP</Badge>
        </div>

        <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          These creator cards are sample profiles for validation; live creator
          listings are not active yet.
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {CREATORS.map((creator) => (
            <CreatorCard key={creator.name} creator={creator} />
          ))}
        </div>
      </section>
    </Shell>
  );
}

function FilterBlock({
  title,
  options,
}: {
  title: string;
  options: string[];
}) {
  return (
    <div>
      <div className="text-sm font-semibold text-slate-300">{title}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option, index) => (
          <button
            key={option}
            type="button"
            className={
              index === 0
                ? "rounded-full border border-orange-400/40 bg-orange-500/15 px-3 py-1.5 text-sm text-orange-100"
                : "rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-slate-300"
            }
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function CreatorCard({ creator }: { creator: Creator }) {
  return (
    <Card className="overflow-hidden">
      <div className={`h-32 bg-gradient-to-br ${creator.accent}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-black">{creator.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{creator.availability}</p>
          </div>
          <Badge tone="default">Concept profile</Badge>
        </div>

        <CreatorMeta label="Games" values={creator.games} />
        <CreatorMeta label="Content" values={creator.contentTypes} />
        <CreatorMeta label="Platforms" values={creator.platforms} />

        <div className="mt-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">Starting at</div>
            <div className="text-lg font-black">{creator.startingRate}</div>
          </div>
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-500"
          >
            Portfolio preview
          </button>
        </div>
      </div>
    </Card>
  );
}

function CreatorMeta({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  return (
    <div className="mt-4">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            key={value}
            className="rounded-md border border-white/10 bg-slate-950/50 px-2 py-1 text-xs text-slate-300"
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}
