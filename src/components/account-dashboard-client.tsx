"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import { useRecentlyViewed } from "@/lib/recently-viewed";
import type { SavedProductRow } from "@/lib/repositories/buyer";

type AccountProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: "user" | "seller" | "admin";
};

const TABS = [
  { key: "saved", label: "Saved products" },
  { key: "recent", label: "Recently viewed" },
  { key: "settings", label: "Settings" },
] as const;

type TabKey = (typeof TABS)[number]["key"];
const VALID_TABS: Set<string> = new Set(TABS.map((t) => t.key));

function normalizeTab(candidate: string | null | undefined): TabKey {
  if (candidate && VALID_TABS.has(candidate)) return candidate as TabKey;
  return "saved";
}

export function AccountDashboardClient({
  profile,
  savedProducts,
  initialTab,
}: {
  profile: AccountProfile;
  savedProducts: SavedProductRow[];
  initialTab?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabKey>(() => normalizeTab(initialTab));

  useEffect(() => {
    const next = normalizeTab(searchParams.get("tab"));
    setTab((prev) => (prev === next ? prev : next));
  }, [searchParams]);

  const handleTabClick = (key: TabKey) => {
    setTab(key);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", key);
    router.replace(`/account?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-black text-white">
              {(profile.display_name?.[0] ?? profile.email?.[0] ?? "U").toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">
                {profile.display_name ?? "Your account"}
              </div>
              <div className="mt-1">
                <Badge
                  tone={
                    profile.role === "admin"
                      ? "orange"
                      : profile.role === "seller"
                        ? "green"
                        : "default"
                  }
                >
                  {profile.role === "admin"
                    ? "Admin"
                    : profile.role === "seller"
                      ? "Seller"
                      : "Buyer"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <nav className="mt-4 grid gap-1 rounded-2xl border border-white/10 bg-white/[0.02] p-2">
          {TABS.map((item) => {
            const isActive = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleTabClick(item.key)}
                className={
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition " +
                  (isActive
                    ? "bg-orange-500/15 text-white"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-white")
                }
                aria-pressed={isActive}
              >
                <span
                  aria-hidden="true"
                  className={
                    "h-4 w-1 rounded-full transition " +
                    (isActive ? "bg-orange-400" : "bg-transparent")
                  }
                />
                {item.label}
              </button>
            );
          })}
        </nav>

        {profile.role === "user" && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">
            <div className="font-semibold text-white">Want to sell?</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Switch to a seller plan to publish your own products.
            </p>
            <Link
              href="/account?view=sell"
              className="mt-3 inline-flex w-full justify-center rounded-xl border border-orange-400/40 bg-orange-500/15 px-3 py-2 text-xs font-semibold text-orange-100 hover:bg-orange-500/25"
            >
              Start selling
            </Link>
          </div>
        )}
      </aside>

      <div className="min-w-0">
        {tab === "saved" && <SavedTab savedProducts={savedProducts} />}
        {tab === "recent" && <RecentlyViewedTab />}
        {tab === "settings" && <SettingsTab profile={profile} />}
      </div>
    </div>
  );
}

function SavedTab({ savedProducts }: { savedProducts: SavedProductRow[] }) {
  const [items, setItems] = useState(savedProducts);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const removeItem = async (productId: string) => {
    setBusyId(productId);
    setError(null);
    const previous = items;
    setItems((rows) => rows.filter((row) => row.product.id !== productId));
    try {
      const response = await fetch("/api/saved-products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? "Could not remove product.");
        setItems(previous);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
      setItems(previous);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge tone="orange">Saved</Badge>
          <h2 className="mt-3 text-2xl font-black">Saved products</h2>
          <p className="mt-2 text-sm text-slate-400">
            Products you saved while browsing. Open one to view the full
            page or remove it from your list.
          </p>
        </div>
        <Link
          href="/marketplace"
          className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold transition hover:bg-white/[0.08]"
        >
          Browse marketplace
        </Link>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-5 divide-y divide-white/10">
        {items.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-400">No saved products yet.</p>
            <p className="mt-1 text-xs text-slate-500">
              Tap the heart on any product page to add it here.
            </p>
          </div>
        )}
        {items.map((row) => {
          const firstImage = row.product.product_media?.find(
            (media) => media.public_url || media.thumbnail_url,
          );
          const thumb =
            firstImage?.public_url ?? firstImage?.thumbnail_url ?? null;
          return (
            <div
              key={row.id}
              className="flex items-center gap-4 py-4"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-slate-950/60">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt={row.product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-slate-500"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">
                  {row.product.name}
                </div>
                <div className="mt-1 truncate text-xs text-slate-400">
                  {row.product.game}
                  {row.product.sellers
                    ? ` · ${row.product.sellers.seller_name}`
                    : ""}
                </div>
              </div>
              <Link
                href={`/products/${row.product.slug}`}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold transition hover:bg-white/[0.08]"
              >
                View
              </Link>
              <button
                type="button"
                onClick={() => removeItem(row.product.id)}
                disabled={busyId === row.product.id}
                className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
              >
                {busyId === row.product.id ? "Removing…" : "Remove"}
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function RecentlyViewedTab() {
  const items = useRecentlyViewed();
  return (
    <Card className="p-6">
      <Badge tone="default">Recently viewed</Badge>
      <h2 className="mt-3 text-2xl font-black">Recently viewed</h2>
      <p className="mt-2 text-sm text-slate-400">
        Last products you opened in this browser. Cleared when you clear
        your browser storage.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.length === 0 && (
          <p className="col-span-full py-6 text-sm text-slate-500">
            Nothing here yet — visit a product page and it will show up.
          </p>
        )}
        {items.map((item) => (
          <Link
            key={item.slug}
            href={`/products/${item.slug}`}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition hover:bg-white/[0.06]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-slate-950/60">
              {item.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbnailUrl}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-slate-500"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">
                {item.name}
              </div>
              <div className="mt-0.5 truncate text-xs text-slate-400">
                {item.game}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function SettingsTab({ profile }: { profile: AccountProfile }) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const dirty = useMemo(
    () => displayName.trim() !== (profile.display_name ?? "").trim(),
    [displayName, profile.display_name],
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSavedOk(false);
    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName.trim() }),
      });
      const payload = (await response.json()) as {
        error?: string;
        profile?: { display_name: string | null };
      };
      if (!response.ok) {
        setError(payload.error ?? "Could not save settings.");
        return;
      }
      setSavedOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <Badge tone="default">Settings</Badge>
      <h2 className="mt-3 text-2xl font-black">Account settings</h2>
      <p className="mt-2 text-sm text-slate-400">
        Edit how you appear on Standard. Email and account type are managed
        by Supabase Auth and your subscription — they can't be changed here.
      </p>

      <form onSubmit={submit} className="mt-6 grid gap-5">
        <label className="grid gap-2 text-sm font-semibold text-slate-200">
          Display name
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-300/50"
            placeholder="How you appear on Standard"
            maxLength={64}
            required
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <ReadOnlyField label="Email" value={profile.email ?? "—"} />
          <ReadOnlyField
            label="Account type"
            value={
              profile.role === "admin"
                ? "Admin"
                : profile.role === "seller"
                  ? "Seller"
                  : "Buyer"
            }
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}
        {savedOk ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            Settings saved.
          </div>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={saving || !dirty}
            className="inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-semibold text-slate-200">{label}</span>
      <div className="truncate rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-400">
        {value}
      </div>
    </div>
  );
}
