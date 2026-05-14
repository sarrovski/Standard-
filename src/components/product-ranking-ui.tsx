import type { RankingLevel, RankingResult } from "@/lib/product-ranking";

const TONE: Record<RankingLevel, string> = {
  high: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
  medium: "border-orange-400/30 bg-orange-500/15 text-orange-100",
  low: "border-white/10 bg-white/[0.06] text-slate-200",
};

const DOT: Record<RankingLevel, string> = {
  high: "bg-emerald-400",
  medium: "bg-orange-400",
  low: "bg-slate-400",
};

// "New listing" overrides Low trust on cards for fresh products.
const NEW_LISTING_TONE = "border-orange-400/30 bg-orange-500/10 text-orange-100";

/**
 * Compact label pill. Used on marketplace cards, seller dashboard rows,
 * and the admin Products tab. Never exposes the numeric score — the
 * label and dot tone communicate the level.
 */
export function RankingPill({
  result,
  isNew,
  showAdminScore,
}: {
  result: RankingResult;
  /**
   * When true and level is low, render "New listing" (warmer tone)
   * instead of "Low trust". Use on public marketplace cards for
   * products created in the last ~2 weeks.
   */
  isNew?: boolean;
  /** Admin-only: append the numeric "/100" so admins can sanity-check. */
  showAdminScore?: boolean;
}) {
  const newListing = isNew && result.level === "low";
  const label = newListing ? "New listing" : result.label;
  const tone = newListing ? NEW_LISTING_TONE : TONE[result.level];
  const dot = newListing ? "bg-orange-400" : DOT[result.level];
  return (
    <span
      title={
        showAdminScore
          ? `${result.label} · ${result.score}/100`
          : result.label
      }
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-bold ${tone}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
      {showAdminScore && (
        <span className="opacity-70">· {result.score}/100</span>
      )}
    </span>
  );
}

/**
 * Card-style Visibility panel used on the seller's product edit page.
 * Shows the level, a short status line, and up to three concrete
 * suggestions. Never numeric.
 */
export function VisibilityPanel({
  result,
  maxSuggestions = 3,
}: {
  result: RankingResult;
  maxSuggestions?: number;
}) {
  const suggestions = result.sellerSuggestions.slice(0, maxSuggestions);
  const tone = TONE[result.level];
  return (
    <div className={`rounded-2xl border p-5 ${tone}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80">
            Visibility
          </p>
          <p className="mt-1 text-2xl font-black leading-none">{result.label}</p>
        </div>
        <p className="text-xs opacity-80">
          {suggestions.length === 0
            ? "Nothing left to improve right now."
            : `${suggestions.length} thing${suggestions.length === 1 ? "" : "s"} you can improve`}
        </p>
      </div>
      {suggestions.length > 0 && (
        <ul className="mt-4 grid gap-2 text-sm">
          {suggestions.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-current opacity-60"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Buyer-facing trust signal list. Renders the public signals in a
 * vertical list with a check icon — same affordance as the existing
 * TrustBox, just driven by the ranking helper.
 */
export function TrustSignalsList({ signals }: { signals: string[] }) {
  if (signals.length === 0) return null;
  return (
    <ul className="grid gap-2 text-sm text-slate-300">
      {signals.map((signal) => (
        <li key={signal} className="flex items-center gap-2">
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
            className="text-emerald-400"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {signal}
        </li>
      ))}
    </ul>
  );
}
