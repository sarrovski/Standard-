"use client";

import { useState } from "react";
import { cn } from "@/lib/helpers";
import { getGameVisualIdentity, type VisualIdentity } from "@/lib/visual-identities";

type GameLogoProps = {
  game?: string;
  identity?: VisualIdentity;
  className?: string;
  fallbackClassName?: string;
  imageClassName?: string;
};

export function GameLogo({
  game,
  identity,
  className,
  fallbackClassName,
  imageClassName,
}: GameLogoProps) {
  const visual = identity ?? getGameVisualIdentity(game ?? "");
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showLogo = Boolean(visual.logoSrc && !failed);

  return (
    <span
      aria-label={visual.label}
      title={visual.label}
      className={cn(
        "relative inline-flex overflow-hidden bg-gradient-to-br",
        visual.className,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 inline-flex items-center justify-center transition-opacity",
          loaded ? "opacity-0" : "opacity-100",
          fallbackClassName,
        )}
      >
        {visual.mark}
      </span>
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={visual.logoSrc}
          alt={visual.logoAlt ?? `${visual.label} logo`}
          className={cn(
            "absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity",
            loaded && "opacity-100",
            imageClassName,
          )}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            setFailed(true);
          }}
        />
      ) : null}
    </span>
  );
}
