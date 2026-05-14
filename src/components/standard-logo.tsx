import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/helpers";

/**
 * The Standard brand mark — a flat-top hexagon with a geometric block "S"
 * cut/stroked through the middle. Rendered as inline SVG so:
 *   - It stays crisp at every display density
 *   - The hexagon inherits color via `currentColor`, so callers control
 *     the orange via `text-orange-500` etc.
 *   - No image asset has to ship in /public
 *
 * Sizes are driven by Tailwind `h-*` / `w-*` on the wrapper; the SVG itself
 * uses a 100 × 86.6 viewBox (the geometric aspect ratio of a regular
 * flat-top hexagon).
 *
 * Use `<StandardLogoMark>` for icon-only spots (Nav avatar, OG square).
 * Use `<StandardLogo>` (below) for mark + wordmark combinations.
 */
export function StandardLogoMark({
  className,
  // The "S" stroke colour. Defaults to near-black so the mark reads well
  // on the orange hexagon at any size. Override for tonal variants.
  strokeColor = "#0a0a0a",
  // Aria-label is empty by default so the SVG is treated as decoration.
  // Pass an explicit label when the mark stands alone (no adjacent text).
  ariaLabel,
}: {
  className?: string;
  strokeColor?: string;
  ariaLabel?: string;
}) {
  const labelled = Boolean(ariaLabel);
  return (
    <svg
      viewBox="0 0 100 86.6"
      role={labelled ? "img" : undefined}
      aria-hidden={labelled ? undefined : true}
      aria-label={labelled ? ariaLabel : undefined}
      className={cn("block", className)}
    >
      {/* Hexagon, flat-top. Vertices: top-left, top-right, right,
          bottom-right, bottom-left, left. */}
      <path
        d="M25 0 H75 L100 43.3 L75 86.6 H25 L0 43.3 Z"
        fill="currentColor"
      />
      {/* Block-S traced as a thick stroked path. Starts top-right, goes
          left across the top bar, drops down the left side, goes right
          across the middle bar, drops down the right side, then goes left
          across the bottom bar. Miter joins give the corners crisp 90°
          angles that match the wordmark's geometry. */}
      <path
        d="M68 22 L32 22 L32 37 L68 37 L68 64 L32 64"
        stroke={strokeColor}
        strokeWidth="13"
        strokeLinejoin="miter"
        strokeLinecap="butt"
        fill="none"
      />
    </svg>
  );
}

/**
 * Mark + "STANDARD" wordmark side-by-side. The wordmark uses system-stack
 * geometric sans with `font-black` and generous letter-spacing to match
 * the brand sheet. Wraps in a `<Link href="/">` by default so it doubles
 * as the homepage CTA in Nav and Footer.
 */
export function StandardLogo({
  className,
  markClassName,
  wordmarkClassName,
  /** When provided, wraps the logo in a `<Link href={href}>`. */
  href = "/",
  children,
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  href?: string | null;
  /** Override the wordmark text. Defaults to "STANDARD". */
  children?: ReactNode;
}) {
  const inner = (
    <>
      <StandardLogoMark
        className={cn("h-9 w-auto text-orange-500", markClassName)}
      />
      <span
        className={cn(
          "text-2xl font-black uppercase tracking-[0.18em] text-white",
          wordmarkClassName,
        )}
      >
        {children ?? "STANDARD"}
      </span>
    </>
  );

  if (href === null) {
    return (
      <span
        className={cn("inline-flex items-center gap-3", className)}
        aria-label="Standard"
      >
        {inner}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-3", className)}
      aria-label="Standard home"
    >
      {inner}
    </Link>
  );
}
