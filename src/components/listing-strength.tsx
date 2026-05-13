import {
  listingStrengthTone,
  type ListingStrengthResult,
  type ListingStrengthTone,
} from "@/lib/listing-strength";

const cardClasses: Record<ListingStrengthTone, string> = {
  red: "border-red-400/30 bg-red-500/10 text-red-100",
  amber: "border-amber-400/30 bg-amber-500/10 text-amber-100",
  green: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
  orange: "border-orange-400/40 bg-orange-500/15 text-orange-100",
};

const barClasses: Record<ListingStrengthTone, string> = {
  red: "bg-red-400",
  amber: "bg-amber-400",
  green: "bg-emerald-400",
  orange: "bg-orange-400",
};

const dotClasses: Record<ListingStrengthTone, string> = {
  red: "bg-red-400",
  amber: "bg-amber-400",
  green: "bg-emerald-400",
  orange: "bg-orange-400",
};

const pillClasses: Record<ListingStrengthTone, string> = {
  red: "border-red-400/30 bg-red-500/10 text-red-200",
  amber: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  green: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  orange: "border-orange-400/40 bg-orange-500/15 text-orange-100",
};

/**
 * Full-width Listing strength panel — used near the top of the seller's
 * product edit page. Shows the score, a progress bar, and the actionable
 * list of things to improve. Guidance only; never blocks saving.
 */
export function ListingStrengthCard({ result }: { result: ListingStrengthResult }) {
  const tone = listingStrengthTone(result.score);
  const missingCount = result.missing.length;
  return (
    <div className={`rounded-2xl border p-5 ${cardClasses[tone]}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80">
            Listing strength
          </p>
          <p className="mt-1 text-4xl font-black leading-none">
            {result.score}
            <span className="text-base font-bold opacity-70"> / 100</span>
          </p>
        </div>
        <p className="text-xs opacity-80">
          {missingCount === 0
            ? "Looking great. Nothing left to improve."
            : `${missingCount} thing${missingCount === 1 ? "" : "s"} left to improve`}
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={result.score}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/30"
      >
        <div
          className={`h-full transition-all ${barClasses[tone]}`}
          style={{ width: `${result.score}%` }}
        />
      </div>
      {missingCount > 0 && (
        <ul className="mt-4 grid gap-2 text-sm">
          {result.missing.map((item) => (
            <li key={item.key} className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
              <span>{item.action}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Compact pill — used on the dashboard product rows. Hover tooltip surfaces
 * how many items are still to improve.
 */
export function ListingStrengthBadge({
  score,
  missingCount,
}: {
  score: number;
  missingCount?: number;
}) {
  const tone = listingStrengthTone(score);
  const title =
    missingCount === undefined
      ? `Listing strength ${score} / 100`
      : missingCount === 0
        ? `Listing strength ${score} / 100 — looking great`
        : `Listing strength ${score} / 100 — ${missingCount} thing${missingCount === 1 ? "" : "s"} left to improve`;
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-bold ${pillClasses[tone]}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dotClasses[tone]}`} />
      {score}
      <span className="opacity-70">/100</span>
    </span>
  );
}
