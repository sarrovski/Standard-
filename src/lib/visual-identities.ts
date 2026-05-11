export type VisualIdentity = {
  mark: string;
  label: string;
  className: string;
  logoSrc?: string;
  logoAlt?: string;
};

const unknownGameIdentity: VisualIdentity = {
  mark: "?",
  label: "Unknown game",
  className: "from-slate-500/80 via-slate-700/70 to-slate-950",
};

const gameIdentities: Record<string, VisualIdentity> = {
  Valorant: {
    mark: "V",
    label: "Valorant",
    className: "from-rose-500/85 via-red-500/60 to-slate-950",
    logoSrc: "/brand/games/valorant.svg",
    logoAlt: "Valorant logo",
  },
  CS2: {
    mark: "CS",
    label: "CS2",
    className: "from-amber-400/85 via-orange-500/65 to-zinc-950",
    logoSrc: "/brand/games/cs2.svg",
    logoAlt: "CS2 logo",
  },
  Fortnite: {
    mark: "F",
    label: "Fortnite",
    className: "from-sky-400/85 via-indigo-500/70 to-fuchsia-950",
    logoSrc: "/brand/games/fortnite.svg",
    logoAlt: "Fortnite logo",
  },
  "Apex Legends": {
    mark: "A",
    label: "Apex Legends",
    className: "from-orange-500/90 via-red-500/70 to-stone-950",
    logoSrc: "/brand/games/apex-legends.svg",
    logoAlt: "Apex Legends logo",
  },
  "Call of Duty": {
    mark: "COD",
    label: "Call of Duty",
    className: "from-emerald-400/80 via-lime-700/65 to-neutral-950",
    logoSrc: "/brand/games/call-of-duty.svg",
    logoAlt: "Call of Duty logo",
  },
  "League of Legends": {
    mark: "LoL",
    label: "League of Legends",
    className: "from-cyan-300/85 via-blue-700/70 to-amber-950",
    logoSrc: "/brand/games/league-of-legends.svg",
    logoAlt: "League of Legends logo",
  },
  "Escape from Tarkov": {
    mark: "EFT",
    label: "Escape from Tarkov",
    className: "from-lime-300/75 via-emerald-900/75 to-zinc-950",
    logoSrc: "/brand/games/escape-from-tarkov.svg",
    logoAlt: "Escape from Tarkov logo",
  },
  Rust: {
    mark: "R",
    label: "Rust",
    className: "from-orange-600/90 via-stone-600/75 to-zinc-950",
    logoSrc: "/brand/games/rust.svg",
    logoAlt: "Rust logo",
  },
};

const categoryIdentities: ReadonlyArray<{
  match: (value: string) => boolean;
  identity: VisualIdentity;
}> = [
  {
    match: (value) => value.includes("analytics"),
    identity: {
      mark: "AN",
      label: "Analytics",
      className: "border-cyan-300/20 bg-cyan-400/10 text-cyan-100",
    },
  },
  {
    match: (value) => value.includes("overlay"),
    identity: {
      mark: "OV",
      label: "Overlay",
      className: "border-violet-300/20 bg-violet-400/10 text-violet-100",
    },
  },
  {
    match: (value) => value.includes("utility"),
    identity: {
      mark: "UT",
      label: "Utility",
      className: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
    },
  },
  {
    match: (value) => value.includes("seller") || value.includes("offer"),
    identity: {
      mark: "SL",
      label: "Seller offer",
      className: "border-amber-300/20 bg-amber-400/10 text-amber-100",
    },
  },
  {
    match: (value) => value.includes("assistant") || value.includes("companion"),
    identity: {
      mark: "AI",
      label: "Assistant",
      className: "border-fuchsia-300/20 bg-fuchsia-400/10 text-fuchsia-100",
    },
  },
];

export function getGameVisualIdentity(game: string): VisualIdentity {
  return gameIdentities[game] ?? unknownGameIdentity;
}

export function getCategoryVisualIdentity(category: string): VisualIdentity {
  const normalized = category.toLowerCase();
  const match = categoryIdentities.find((item) => item.match(normalized));
  return {
    mark: match?.identity.mark ?? "CT",
    label: category,
    className: match?.identity.className ?? "border-white/10 bg-white/[0.04] text-slate-200",
  };
}
