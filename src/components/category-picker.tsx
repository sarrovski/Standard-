"use client";

import { type ReactNode } from "react";
import { productCategories } from "@/lib/data";

/**
 * Visual category picker used by the product create + edit forms in place
 * of a native <select>. Renders a grid of pill buttons with a small
 * per-category icon so sellers can scan the closed list at a glance and
 * pick with one click.
 *
 * The list of categories is the same closed list exposed from
 * `src/lib/data.ts`. If a product was created before the closed list
 * existed and its current category isn't in the list, the caller can
 * pass `extraOptions` to surface that legacy value as an additional
 * pill so saving doesn't silently rewrite it.
 */
export function CategoryPicker({
  value,
  onChange,
  extraOptions = [],
  label = "Category",
}: {
  value: string;
  onChange: (next: string) => void;
  extraOptions?: string[];
  label?: string;
}) {
  const options = Array.from(
    new Set([...extraOptions.filter(Boolean), ...productCategories]),
  );

  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-semibold text-slate-200">{label}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {options.map((option) => {
          const isActive = option === value;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              aria-pressed={isActive}
              className={
                "group flex items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition " +
                (isActive
                  ? "border-orange-400/70 bg-orange-500/15 text-white shadow-[0_8px_24px_-16px_rgba(249,115,22,0.7)]"
                  : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/20 hover:bg-white/[0.05] hover:text-white")
              }
            >
              <span
                aria-hidden="true"
                className={
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition " +
                  (isActive
                    ? "border-orange-400/50 bg-orange-500/20 text-orange-200"
                    : "border-white/10 bg-white/[0.04] text-slate-400 group-hover:text-slate-200")
                }
              >
                <CategoryIcon name={option} />
              </span>
              <span className="min-w-0 truncate">{option}</span>
              {isActive && (
                <svg
                  aria-hidden="true"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="ml-auto text-orange-300"
                >
                  <path d="M5 12l5 5 9-11" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function CategoryIcon({ name }: { name: string }): ReactNode {
  const stroke = {
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "Aim Assist":
      return (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      );
    case "ESP / Visuals":
      return (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "Stat Tracker / Analytics":
      return (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
    case "Overlay / HUD":
      return (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      );
    case "Coaching":
      return (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <path d="M22 10L12 5 2 10l10 5 10-5z" />
          <path d="M6 12v5c3 2 9 2 12 0v-5" />
        </svg>
      );
    case "Macros / Scripts":
      return (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 4l-4 16" />
        </svg>
      );
    case "Utility":
      return (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <path d="M14.7 6.3a4 4 0 1 1 3 3l-8 8a2.5 2.5 0 1 1-3.5-3.5l8-8z" />
          <path d="M14 9l1 1" />
        </svg>
      );
    default:
      return (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        </svg>
      );
  }
}
