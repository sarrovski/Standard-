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
    case "Internal":
      // CPU chip — runs inside the game process.
      return (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" />
          <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
        </svg>
      );
    case "External":
      // Monitor / out-of-process overlay window.
      return (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <rect x="2" y="4" width="20" height="13" rx="2" />
          <path d="M8 20h8M12 17v3" />
        </svg>
      );
    case "DMA":
      // Hardware board with traces.
      return (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <rect x="3" y="6" width="18" height="12" rx="1.5" />
          <circle cx="8" cy="12" r="1.2" />
          <circle cx="16" cy="12" r="1.2" />
          <path d="M9.2 12H14.8M8 9.5V8M16 9.5V8M8 14.5V16M16 14.5V16" />
        </svg>
      );
    case "Scripts":
      // Angle brackets — code / macros.
      return (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 4l-4 16" />
        </svg>
      );
    case "Spoofer":
      // Shield + refresh arrows for HWID rotation.
      return (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" {...stroke}>
          <path d="M12 3l8 3v5c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-3z" />
          <path d="M9 13a3 3 0 0 0 6-1M15 11a3 3 0 0 0-6 1" />
          <path d="M14.5 10.5L16 12l-2-0.5M9.5 13.5L8 12l2 0.5" />
        </svg>
      );
    case "Other":
      // Three dots — anything that doesn't fit above.
      return (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
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
