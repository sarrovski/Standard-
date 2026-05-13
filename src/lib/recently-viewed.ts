"use client";

import { useEffect, useState } from "react";

/**
 * Lightweight localStorage-backed "recently viewed products" tracker.
 *
 * Why client-side only:
 *   - No PII / no DB row to manage per view.
 *   - Survives across logged-out -> logged-in transitions inside the same
 *     browser.
 *   - Doesn't add request volume to Supabase on every product view.
 *
 * Shape: a capped FIFO list of slugs, most-recent first. We store the
 * minimum needed (slug + name + game + thumbnail URL) so the dashboard
 * can render the list without round-tripping back to the API.
 */

const STORAGE_KEY = "standard.recently_viewed";
const MAX_ITEMS = 8;

export type RecentlyViewedItem = {
  slug: string;
  name: string;
  game: string;
  thumbnailUrl: string | null;
  viewedAt: string;
};

function readStorage(): RecentlyViewedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentlyViewedItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as RecentlyViewedItem).slug === "string" &&
        typeof (item as RecentlyViewedItem).name === "string",
    );
  } catch {
    return [];
  }
}

function writeStorage(items: RecentlyViewedItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota exceeded or storage disabled — silently drop. */
  }
}

/**
 * Record a product view. Safe to call on every render of a product page;
 * the FIFO update is idempotent within MAX_ITEMS.
 */
export function recordRecentlyViewed(item: Omit<RecentlyViewedItem, "viewedAt">) {
  if (typeof window === "undefined") return;
  const next: RecentlyViewedItem = { ...item, viewedAt: new Date().toISOString() };
  const existing = readStorage().filter((row) => row.slug !== item.slug);
  writeStorage([next, ...existing].slice(0, MAX_ITEMS));
}

/**
 * Read the current recently-viewed list. Returns an empty array on the
 * server (where localStorage doesn't exist) — call sites should render
 * the list client-side only or guard against SSR.
 */
export function useRecentlyViewed(): RecentlyViewedItem[] {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  useEffect(() => {
    setItems(readStorage());
  }, []);
  return items;
}
