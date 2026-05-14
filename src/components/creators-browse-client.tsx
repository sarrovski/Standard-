"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import type { UICreatorCard } from "@/lib/creator-marketplace";

/**
 * Client-side browse + filter for the public /creators page.
 *
 * Filters operate purely in-app on the already-fetched active creator
 * list — game / content type / platform / availability dropdowns plus a
 * name/headline search box. Keeps it simple: no server round-trips per
 * filter change.
 */
export function CreatorsBrowseClient({
  creators,
}: {
  creators: UICreatorCard[];
}) {
  const [game, setGame] = useState("All");
  const [contentType, setContentType] = useState("All");
  const [platform, setPlatform] = useState("All");
  const [availability, setAvailability] = useState("All");
  const [search, setSearch] = useState("");

  // Derive filter options from the real data so we never show a filter
  // value that matches zero creators.
  const options = useMemo(() => {
    const games = new Set<string>();
    const contentTypes = new Set<string>();
    const platforms = new Set<string>();
    const availabilities = new Set<string>();
    for (const c of creators) {
      c.gamesCovered.forEach((g) => games.add(g));
      c.contentTypes.forEach((t) => contentTypes.add(t));
      c.platforms.forEach((p) => platforms.add(p));
      if (c.availability) availabilities.add(c.availability);
    }
    return {
      game: ["All", ...Array.from(games).sort()],
      contentType: ["All", ...Array.from(contentTypes).sort()],
      platform: ["All", ...Array.from(platforms).sort()],
      availability: ["All", ...Array.from(availabilities).sort()],
    };
  }, [creators]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return creators.filter((c) => {
      if (game !== "All" && !c.gamesCovered.includes(game)) return false;
      if (contentType !== "All" && !c.contentTypes.includes(contentType))
        return false;
      if (platform !== "All" && !c.platforms.includes(platform)) return false;
      if (availability !== "All" && c.availability !== availability)
        return false;
      if (q.length > 0) {
        const haystack = `${c.displayName} ${c.headline ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [creators, game, contentType, platform, availability, search]);

  const filtersActive =
    game !== "All" ||
    contentType !== "All" ||
    platform !== "All" ||
    availability !== "All" ||
    search.trim().length > 0;

  const clearFilters = () => {
    setGame("All");
    setContentType("All");
    setPlatform("All");
    setAvailability("All");
    setSearch("");
  };

  return (
    <>
      <Card className="mt-10 p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr_1.2fr]">
          <FilterSelect
            label="Game"
            value={game}
            options={options.game}
            onChange={setGame}
          />
          <FilterSelect
            label="Content type"
            value={contentType}
            options={options.contentType}
            onChange={setContentType}
          />
          <FilterSelect
            label="Platform"
            value={platform}
            options={options.platform}
            onChange={setPlatform}
          />
          <FilterSelect
            label="Availability"
            value={availability}
            options={options.availability}
            onChange={setAvailability}
          />
          <label className="grid gap-2 text-sm font-semibold text-slate-300">
            Search
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Creator name or headline"
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-400/50"
            />
          </label>
        </div>
        {filtersActive && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
            <span className="text-sm text-slate-500">
              {filtered.length}{" "}
              {filtered.length === 1 ? "creator" : "creators"} match
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-orange-100"
            >
              Clear filters
            </button>
          </div>
        )}
      </Card>

      {filtered.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-white/15 bg-slate-950/40 p-10 text-center">
          <h3 className="text-xl font-black tracking-tight">
            No creators match those filters
          </h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
            Try clearing a filter, or browse the full creator list.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} />
          ))}
        </div>
      )}
    </>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-300">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/50"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function CreatorCard({ creator }: { creator: UICreatorCard }) {
  const preview = creator.previewItem;
  return (
    <Link href={`/creators/${creator.slug}`} className="group">
      <Card className="h-full overflow-hidden transition group-hover:border-orange-400/30">
        <div className="relative h-32 overflow-hidden bg-slate-950">
          {creator.bannerUrl || preview?.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={creator.bannerUrl ?? preview?.thumbnailUrl ?? ""}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.02]"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-orange-500/20 to-orange-400/10" />
          )}
          {creator.isFeatured && (
            <span className="absolute left-3 top-3">
              <Badge tone="orange">Featured</Badge>
            </span>
          )}
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-black text-white">
                {creator.displayName}
              </h3>
              {creator.headline && (
                <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                  {creator.headline}
                </p>
              )}
            </div>
            {creator.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creator.avatarUrl}
                alt=""
                aria-hidden="true"
                className="h-10 w-10 flex-none rounded-xl object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-black text-white">
                {creator.displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {creator.contentTypes.length > 0 && (
            <MetaRow label="Content" values={creator.contentTypes} />
          )}
          {creator.gamesCovered.length > 0 && (
            <MetaRow label="Games" values={creator.gamesCovered} />
          )}
          {creator.platforms.length > 0 && (
            <MetaRow label="Platforms" values={creator.platforms} />
          )}

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
            <div>
              <div className="text-xs text-slate-500">Starting at</div>
              <div className="text-base font-black">
                {creator.startingRate ?? "On request"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Availability</div>
              <div className="text-sm font-semibold text-slate-200">
                {creator.availability ?? "Ask"}
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            {creator.portfolioCount}{" "}
            {creator.portfolioCount === 1 ? "portfolio item" : "portfolio items"}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function MetaRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="mt-3">
      <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {values.slice(0, 4).map((value) => (
          <span
            key={value}
            className="rounded-md border border-white/10 bg-slate-950/50 px-2 py-0.5 text-xs text-slate-300"
          >
            {value}
          </span>
        ))}
        {values.length > 4 && (
          <span className="rounded-md px-1 py-0.5 text-xs text-slate-500">
            +{values.length - 4}
          </span>
        )}
      </div>
    </div>
  );
}
