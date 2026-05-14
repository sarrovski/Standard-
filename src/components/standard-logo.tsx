import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/helpers";

/**
 * Official Standard logo (hexagonal "S" mark + "STANDARD" wordmark).
 *
 * Source asset: public/brand/standard-logo.png — provided by the brand.
 * The PNG has its own black background baked in (2508 × 627), so on the
 * Shell's `bg-black` background it composites seamlessly. Don't drop
 * this onto a light card without first asking for a transparent variant.
 *
 * `height` controls the rendered pixel height (the width scales to keep
 * the source's 4:1 aspect). `priority` is set so the homepage / above-
 * the-fold Nav loads the logo on the first paint without flashing.
 *
 * Pass `href={null}` for non-link surfaces (e.g. the footer column).
 * Otherwise the wrapper renders as a `<Link>` to `href` (default `/`).
 */

const LOGO_SRC = "/brand/standard-logo.png";
const LOGO_NATURAL_WIDTH = 2508;
const LOGO_NATURAL_HEIGHT = 627;
const LOGO_ASPECT = LOGO_NATURAL_WIDTH / LOGO_NATURAL_HEIGHT;

export function StandardLogo({
  className,
  height = 40,
  href = "/",
  priority = true,
}: {
  className?: string;
  /** Rendered pixel height. Width is computed from the source aspect. */
  height?: number;
  /** Wrap in a `<Link>` to this href, or pass `null` to render inline. */
  href?: string | null;
  priority?: boolean;
}) {
  const width = Math.round(LOGO_ASPECT * height);

  const img = (
    <Image
      src={LOGO_SRC}
      alt="Standard"
      width={width}
      height={height}
      priority={priority}
      className="block h-auto w-auto"
      style={{ height, width }}
    />
  );

  if (href === null) {
    return (
      <span className={cn("inline-flex items-center", className)}>{img}</span>
    );
  }
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center", className)}
      aria-label="Standard home"
    >
      {img}
    </Link>
  );
}
