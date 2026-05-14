"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import {
  CREATOR_PROFILE_STATUS_LABEL,
  CREATOR_REQUEST_STATUS_LABEL,
  LIMITS,
  PORTFOLIO_ITEM_TYPE_LABEL,
  PORTFOLIO_ITEM_TYPES,
  type PortfolioItemType,
  type UICreatorPortfolioItem,
  type UICreatorProfile,
  type UICreatorRequest,
} from "@/lib/creator-marketplace";

const TABS = [
  { key: "profile", label: "Creator Profile" },
  { key: "portfolio", label: "Portfolio" },
  { key: "requests", label: "Requests" },
] as const;
type TabKey = (typeof TABS)[number]["key"];
const VALID = new Set<string>(TABS.map((t) => t.key));
function normalizeTab(c: string | null | undefined): TabKey {
  return c && VALID.has(c) ? (c as TabKey) : "profile";
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-400/50";
const textareaClass =
  "w-full resize-none rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-400/50";

export function CreatorDashboardClient({
  profile,
  portfolioItems,
  requests,
  initialTab,
}: {
  profile: UICreatorProfile;
  portfolioItems: UICreatorPortfolioItem[];
  requests: UICreatorRequest[];
  initialTab?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabKey>(() => normalizeTab(initialTab));

  useEffect(() => {
    const next = normalizeTab(searchParams.get("tab"));
    setTab((prev) => (prev === next ? prev : next));
  }, [searchParams]);

  const handleTab = (key: TabKey) => {
    setTab(key);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", key);
    router.replace(`/creator-dashboard?${params.toString()}`, {
      scroll: false,
    });
  };

  const openRequests = requests.filter((r) => r.status === "open").length;

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-3">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt=""
                aria-hidden="true"
                className="h-9 w-9 rounded-xl object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-black text-white">
                {profile.displayName.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">
                {profile.displayName}
              </div>
              <div className="mt-1">
                <Badge
                  tone={
                    profile.status === "active"
                      ? "green"
                      : profile.status === "suspended"
                        ? "red"
                        : "amber"
                  }
                >
                  {CREATOR_PROFILE_STATUS_LABEL[profile.status]}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <nav className="mt-4 grid gap-1 rounded-2xl border border-white/10 bg-white/[0.02] p-2">
          {TABS.map((item) => {
            const active = tab === item.key;
            const badge =
              item.key === "requests" && openRequests > 0
                ? openRequests
                : null;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleTab(item.key)}
                aria-pressed={active}
                className={
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition " +
                  (active
                    ? "bg-orange-500/15 text-white"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-white")
                }
              >
                <span
                  aria-hidden="true"
                  className={
                    "h-4 w-1 rounded-full transition " +
                    (active ? "bg-orange-400" : "bg-transparent")
                  }
                />
                <span className="flex-1">{item.label}</span>
                {badge !== null && (
                  <span className="rounded-full border border-orange-400/40 bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-100">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        {profile.status === "active" && (
          <Link
            href={`/creators/${profile.slug}`}
            className="mt-4 inline-flex w-full justify-center rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]"
          >
            View public profile ↗
          </Link>
        )}
      </aside>

      <div className="min-w-0">
        {tab === "profile" && <ProfileTab profile={profile} />}
        {tab === "portfolio" && (
          <PortfolioTab initialItems={portfolioItems} />
        )}
        {tab === "requests" && <RequestsTab initialRequests={requests} />}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Profile tab
// --------------------------------------------------------------------------

function ProfileTab({ profile }: { profile: UICreatorProfile }) {
  const [headline, setHeadline] = useState(profile.headline ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(profile.bannerUrl ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(profile.websiteUrl ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [discord, setDiscord] = useState(profile.discord ?? "");
  const [startingRate, setStartingRate] = useState(
    profile.startingRate ?? "",
  );
  const [availability, setAvailability] = useState(
    profile.availability ?? "",
  );
  const [platforms, setPlatforms] = useState(profile.platforms.join(", "));
  const [contentTypes, setContentTypes] = useState(
    profile.contentTypes.join(", "),
  );
  const [gamesCovered, setGamesCovered] = useState(
    profile.gamesCovered.join(", "),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      const response = await fetch("/api/creator/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline: headline.trim() || undefined,
          bio: bio.trim() || undefined,
          avatar_url: avatarUrl.trim() || undefined,
          banner_url: bannerUrl.trim() || undefined,
          website_url: websiteUrl.trim() || undefined,
          email: email.trim() || undefined,
          discord: discord.trim() || undefined,
          starting_rate: startingRate.trim() || undefined,
          availability: availability.trim() || undefined,
          platforms,
          content_types: contentTypes,
          games_covered: gamesCovered,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Couldn't save your profile.");
        return;
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Creator profile</h2>
          <p className="mt-1 text-sm text-slate-400">
            Edit how sellers see you. Display name and status are managed
            by Standard.
          </p>
        </div>
        <Badge
          tone={
            profile.status === "active"
              ? "green"
              : profile.status === "suspended"
                ? "red"
                : "amber"
          }
        >
          {CREATOR_PROFILE_STATUS_LABEL[profile.status]}
        </Badge>
      </div>

      <form onSubmit={save} className="mt-6 grid gap-5">
        <Labeled label="Headline">
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={LIMITS.headline.max}
            placeholder="Short-form showcases and launch trailers"
            className={inputClass}
          />
        </Labeled>
        <Labeled label="Bio">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={LIMITS.profileBio.max}
            rows={4}
            className={textareaClass}
          />
        </Labeled>
        <div className="grid gap-5 md:grid-cols-2">
          <Labeled label="Avatar URL">
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              maxLength={LIMITS.websiteUrl.max}
              placeholder="https://…"
              className={inputClass}
            />
          </Labeled>
          <Labeled label="Banner URL">
            <input
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              maxLength={LIMITS.websiteUrl.max}
              placeholder="https://…"
              className={inputClass}
            />
          </Labeled>
          <Labeled label="Website URL">
            <input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              maxLength={LIMITS.websiteUrl.max}
              placeholder="https://…"
              className={inputClass}
            />
          </Labeled>
          <Labeled label="Contact email">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={LIMITS.email.max}
              className={inputClass}
            />
          </Labeled>
          <Labeled label="Discord">
            <input
              value={discord}
              onChange={(e) => setDiscord(e.target.value)}
              maxLength={LIMITS.discord.max}
              className={inputClass}
            />
          </Labeled>
          <Labeled label="Starting rate">
            <input
              value={startingRate}
              onChange={(e) => setStartingRate(e.target.value)}
              maxLength={LIMITS.startingRate.max}
              placeholder="$100 per short"
              className={inputClass}
            />
          </Labeled>
          <Labeled label="Availability">
            <input
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              maxLength={LIMITS.availability.max}
              placeholder="Open this week"
              className={inputClass}
            />
          </Labeled>
        </div>
        <Labeled label="Platforms (comma separated)">
          <input
            value={platforms}
            onChange={(e) => setPlatforms(e.target.value)}
            placeholder="TikTok, YouTube, Twitch"
            className={inputClass}
          />
        </Labeled>
        <Labeled label="Content types (comma separated)">
          <input
            value={contentTypes}
            onChange={(e) => setContentTypes(e.target.value)}
            placeholder="Showcases, Trailers, Reviews"
            className={inputClass}
          />
        </Labeled>
        <Labeled label="Games covered (comma separated)">
          <input
            value={gamesCovered}
            onChange={(e) => setGamesCovered(e.target.value)}
            placeholder="Valorant, CS2, Fortnite"
            className={inputClass}
          />
        </Labeled>

        {error && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {saved && (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            Profile saved.
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Card>
  );
}

// --------------------------------------------------------------------------
// Portfolio tab
// --------------------------------------------------------------------------

type PortfolioDraft = {
  title: string;
  description: string;
  itemType: PortfolioItemType;
  game: string;
  platform: string;
  externalUrl: string;
  thumbnailUrl: string;
  sortOrder: string;
  isPublic: boolean;
};

const EMPTY_DRAFT: PortfolioDraft = {
  title: "",
  description: "",
  itemType: "other",
  game: "",
  platform: "",
  externalUrl: "",
  thumbnailUrl: "",
  sortOrder: "0",
  isPublic: true,
};

function draftFromItem(item: UICreatorPortfolioItem): PortfolioDraft {
  return {
    title: item.title,
    description: item.description ?? "",
    itemType: item.itemType,
    game: item.game ?? "",
    platform: item.platform ?? "",
    externalUrl: item.externalUrl ?? "",
    thumbnailUrl: item.thumbnailUrl ?? "",
    sortOrder: String(item.sortOrder),
    isPublic: item.isPublic,
  };
}

function PortfolioTab({
  initialItems,
}: {
  initialItems: UICreatorPortfolioItem[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitDraft = async (
    draft: PortfolioDraft,
    itemId: string | null,
  ) => {
    setError(null);
    setBusy(true);
    try {
      const body = {
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        item_type: draft.itemType,
        game: draft.game.trim() || undefined,
        platform: draft.platform.trim() || undefined,
        external_url: draft.externalUrl.trim() || undefined,
        thumbnail_url: draft.thumbnailUrl.trim() || undefined,
        sort_order: Number(draft.sortOrder) || 0,
        is_public: draft.isPublic,
      };
      const response = await fetch(
        itemId
          ? `/api/creator/portfolio/${itemId}`
          : "/api/creator/portfolio",
        {
          method: itemId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Couldn't save the portfolio item.");
        return;
      }
      setAdding(false);
      setEditingId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (itemId: string) => {
    if (!window.confirm("Delete this portfolio item?")) return;
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/creator/portfolio/${itemId}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Couldn't delete the item.");
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Portfolio</h2>
          <p className="mt-1 text-sm text-slate-400">
            Showcase your work. Public items appear on your creator
            profile.
          </p>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-400"
          >
            + Add item
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {adding && (
        <div className="mt-5">
          <PortfolioForm
            initial={EMPTY_DRAFT}
            busy={busy}
            onCancel={() => setAdding(false)}
            onSubmit={(draft) => submitDraft(draft, null)}
          />
        </div>
      )}

      <ul className="mt-5 space-y-3">
        {initialItems.length === 0 && !adding ? (
          <li className="rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-5 text-sm text-slate-400">
            No portfolio items yet. Add your first showcase, trailer, or
            thumbnail.
          </li>
        ) : (
          initialItems.map((item) =>
            editingId === item.id ? (
              <li key={item.id}>
                <PortfolioForm
                  initial={draftFromItem(item)}
                  busy={busy}
                  onCancel={() => setEditingId(null)}
                  onSubmit={(draft) => submitDraft(draft, item.id)}
                />
              </li>
            ) : (
              <li
                key={item.id}
                className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="default">
                    {PORTFOLIO_ITEM_TYPE_LABEL[item.itemType]}
                  </Badge>
                  {!item.isPublic && <Badge tone="amber">Hidden</Badge>}
                  <span className="text-sm font-semibold text-white">
                    {item.title}
                  </span>
                  <span className="text-xs text-slate-500">
                    {[item.game, item.platform].filter(Boolean).join(" · ")}
                  </span>
                </div>
                {item.description && (
                  <p className="mt-2 text-sm text-slate-400">
                    {item.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {item.externalUrl && (
                    <a
                      href={item.externalUrl}
                      target="_blank"
                      rel="noreferrer nofollow"
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-orange-200 transition hover:bg-orange-500/10"
                    >
                      Open link ↗
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(item.id);
                      setAdding(false);
                    }}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove(item.id)}
                    className="rounded-lg border border-red-400/40 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ),
          )
        )}
      </ul>
    </Card>
  );
}

function PortfolioForm({
  initial,
  busy,
  onCancel,
  onSubmit,
}: {
  initial: PortfolioDraft;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (draft: PortfolioDraft) => void;
}) {
  const [draft, setDraft] = useState<PortfolioDraft>(initial);
  const set = <K extends keyof PortfolioDraft>(
    key: K,
    value: PortfolioDraft[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(draft);
      }}
      className="grid gap-4 rounded-2xl border border-white/10 bg-black/30 p-4"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Labeled label="Title">
          <input
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            maxLength={LIMITS.itemTitle.max}
            required
            className={inputClass}
          />
        </Labeled>
        <Labeled label="Type">
          <select
            value={draft.itemType}
            onChange={(e) =>
              set("itemType", e.target.value as PortfolioItemType)
            }
            className={inputClass}
          >
            {PORTFOLIO_ITEM_TYPES.map((t) => (
              <option key={t} value={t}>
                {PORTFOLIO_ITEM_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Game">
          <input
            value={draft.game}
            onChange={(e) => set("game", e.target.value)}
            maxLength={LIMITS.itemGame.max}
            className={inputClass}
          />
        </Labeled>
        <Labeled label="Platform">
          <input
            value={draft.platform}
            onChange={(e) => set("platform", e.target.value)}
            maxLength={LIMITS.itemPlatform.max}
            className={inputClass}
          />
        </Labeled>
        <Labeled label="External URL">
          <input
            value={draft.externalUrl}
            onChange={(e) => set("externalUrl", e.target.value)}
            maxLength={LIMITS.itemUrl.max}
            placeholder="https://…"
            className={inputClass}
          />
        </Labeled>
        <Labeled label="Thumbnail URL">
          <input
            value={draft.thumbnailUrl}
            onChange={(e) => set("thumbnailUrl", e.target.value)}
            maxLength={LIMITS.itemUrl.max}
            placeholder="https://…"
            className={inputClass}
          />
        </Labeled>
        <Labeled label="Sort order">
          <input
            type="number"
            value={draft.sortOrder}
            onChange={(e) => set("sortOrder", e.target.value)}
            className={inputClass}
          />
        </Labeled>
        <label className="flex items-center gap-2 self-end text-sm font-semibold text-slate-200">
          <input
            type="checkbox"
            checked={draft.isPublic}
            onChange={(e) => set("isPublic", e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-slate-950 accent-orange-500"
          />
          Public (shows on your profile)
        </label>
      </div>
      <Labeled label="Description">
        <textarea
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          maxLength={LIMITS.itemDescription.max}
          rows={3}
          className={textareaClass}
        />
      </Labeled>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-400 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save item"}
        </button>
      </div>
    </form>
  );
}

// --------------------------------------------------------------------------
// Requests tab
// --------------------------------------------------------------------------

function RequestsTab({
  initialRequests,
}: {
  initialRequests: UICreatorRequest[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const patchRequest = async (
    id: string,
    patch: { status?: UICreatorRequest["status"]; creator_notes?: string },
  ) => {
    setError(null);
    setBusyId(id);
    try {
      const response = await fetch(`/api/creator/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Couldn't update the request.");
        return;
      }
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                ...(patch.status ? { status: patch.status } : {}),
                ...(patch.creator_notes !== undefined
                  ? { creatorNotes: patch.creator_notes }
                  : {}),
              }
            : r,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-black">Briefs from sellers</h2>
      <p className="mt-1 text-sm text-slate-400">
        Sellers send you briefs here. Standard doesn&apos;t handle
        messaging or payments — respond externally using their contact
        details, then track the status.
      </p>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-5 text-sm text-slate-400">
          No briefs yet. They&apos;ll appear here as sellers send them.
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {requests.map((req) => {
            const isBusy = busyId === req.id;
            const tone =
              req.status === "open"
                ? "amber"
                : req.status === "responded"
                  ? "green"
                  : req.status === "declined"
                    ? "red"
                    : "default";
            return (
              <li
                key={req.id}
                className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={tone}>
                    {CREATOR_REQUEST_STATUS_LABEL[req.status]}
                  </Badge>
                  <span className="text-sm font-semibold text-white">
                    {req.title}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300 whitespace-pre-line">
                  {req.brief}
                </p>
                <div className="mt-3 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                  <div>
                    Budget: {req.budget ?? "—"} · Timeline:{" "}
                    {req.timeline ?? "—"}
                  </div>
                  <div>
                    Contact: {req.requesterEmail ?? "—"}
                    {req.requesterDiscord
                      ? ` · ${req.requesterDiscord}`
                      : ""}
                  </div>
                </div>

                <div className="mt-3 grid gap-2">
                  <textarea
                    value={notesDraft[req.id] ?? req.creatorNotes ?? ""}
                    onChange={(e) =>
                      setNotesDraft((prev) => ({
                        ...prev,
                        [req.id]: e.target.value,
                      }))
                    }
                    placeholder="Private notes (only you see these)"
                    className="min-h-14 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/50"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          patchRequest(req.id, { status: "responded" })
                        }
                        className="rounded-lg bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
                      >
                        Mark responded
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          patchRequest(req.id, { status: "closed" })
                        }
                        className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08] disabled:opacity-60"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          patchRequest(req.id, { status: "declined" })
                        }
                        className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                      >
                        Decline
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        patchRequest(req.id, {
                          creator_notes:
                            (notesDraft[req.id] ?? req.creatorNotes ?? "").trim() ||
                            undefined,
                        })
                      }
                      className="rounded-lg border border-orange-400/40 bg-orange-500/15 px-3 py-1.5 text-xs font-semibold text-orange-100 transition hover:bg-orange-500/25 disabled:opacity-60"
                    >
                      Save notes
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-300">
        {label}
      </span>
      {children}
    </label>
  );
}
