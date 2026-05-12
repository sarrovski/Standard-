import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/helpers";

export type DashboardIconName =
  | "box"
  | "shield"
  | "chart"
  | "badge"
  | "billing";

export type DashboardTabItem = {
  key: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: DashboardIconName;
};

export type ReadinessItem = {
  label: string;
  detail: string;
  complete: boolean;
};

export function DashboardShell({
  tabs,
  active,
  sellerName,
  supabaseSourced,
  subscriptionLabel,
  onSelect,
  children,
}: {
  tabs: DashboardTabItem[];
  active: string;
  sellerName: string;
  supabaseSourced: boolean;
  subscriptionLabel: string;
  onSelect: (key: string) => void;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#070812] text-white">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_86%_0%,rgba(139,92,246,0.16),transparent_30%),radial-gradient(circle_at_4%_30%,rgba(34,211,238,0.1),transparent_28%)]" />
      <div className="relative flex min-h-screen">
        <DashboardSidebar
          tabs={tabs}
          active={active}
          sellerName={sellerName}
          supabaseSourced={supabaseSourced}
          subscriptionLabel={subscriptionLabel}
          onSelect={onSelect}
        />
        <div className="min-w-0 flex-1">
          <DashboardMobileNav tabs={tabs} active={active} onSelect={onSelect} />
          <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}

function DashboardSidebar({
  tabs,
  active,
  sellerName,
  supabaseSourced,
  subscriptionLabel,
  onSelect,
}: {
  tabs: DashboardTabItem[];
  active: string;
  sellerName: string;
  supabaseSourced: boolean;
  subscriptionLabel: string;
  onSelect: (key: string) => void;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 flex-none border-r border-white/10 bg-black/20 p-4 backdrop-blur-xl lg:flex lg:flex-col">
      <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 via-violet-500 to-purple-700 text-lg font-black">
            S
          </span>
          <span>
            <span className="block text-xl font-black tracking-tight">Standard</span>
            <span className="text-xs text-slate-500">Seller console</span>
          </span>
        </Link>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
          {supabaseSourced ? "Live workspace" : "Demo workspace"}
        </div>
      </div>

      <nav className="mt-5 grid gap-2" aria-label="Dashboard sections">
        {tabs.map((item) => (
          <SidebarButton
            key={item.key}
            item={item}
            active={active === item.key}
            onSelect={onSelect}
          />
        ))}
      </nav>

      <div className="mt-auto grid gap-3">
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Seller status
          </div>
          <div className="mt-3 text-sm font-bold text-white">{sellerName}</div>
          <div className="mt-1 text-xs text-slate-500">{subscriptionLabel}</div>
        </div>
        <Link
          href="/dashboard/products/new"
          className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold shadow-lg shadow-purple-500/20"
        >
          Create product
        </Link>
      </div>
    </aside>
  );
}

function DashboardMobileNav({
  tabs,
  active,
  onSelect,
}: {
  tabs: DashboardTabItem[];
  active: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-white/10 bg-[#070812]/90 px-4 py-3 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 via-violet-500 to-purple-700 text-sm font-black">
            S
          </span>
          <span className="font-black">Standard</span>
        </Link>
        <Link
          href="/dashboard/products/new"
          className="rounded-xl border border-purple-400/30 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-100"
        >
          Create
        </Link>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            className={cn(
              "flex-none rounded-xl border px-3 py-2 text-xs font-semibold transition",
              active === item.key
                ? "border-purple-300/40 bg-purple-500/20 text-purple-100"
                : "border-white/10 bg-white/[0.035] text-slate-400",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SidebarButton({
  item,
  active,
  onSelect,
}: {
  item: DashboardTabItem;
  active: boolean;
  onSelect: (key: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.key)}
      className={cn(
        "group flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition",
        active
          ? "border-purple-300/30 bg-purple-500/15 text-white"
          : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.035] hover:text-white",
      )}
      aria-pressed={active}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl border",
          active
            ? "border-purple-300/30 bg-purple-500/20 text-purple-100"
            : "border-white/10 bg-black/20 text-slate-500 group-hover:text-slate-200",
        )}
      >
        <DashboardIcon name={item.icon} />
      </span>
      <span>
        <span className="block text-sm font-semibold">{item.label}</span>
        <span className="text-[11px] text-slate-500">{item.eyebrow}</span>
      </span>
    </button>
  );
}

export function DashboardWorkspace({
  activeTab,
  children,
  aside,
}: {
  activeTab: DashboardTabItem;
  children: ReactNode;
  aside: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/30">
      <header className="border-b border-white/10 bg-slate-950/35 px-5 py-5 sm:px-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Dashboard</span>
              <span className="text-slate-700">›</span>
              <span className="font-semibold text-slate-200">{activeTab.label}</span>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl">
              {activeTab.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              {activeTab.description}
            </p>
          </div>
          <Link
            href="/marketplace"
            className="inline-flex w-fit items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/30 hover:text-white"
          >
            View marketplace
          </Link>
        </div>
      </header>
      <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0">{children}</div>
        <div className="min-w-0">{aside}</div>
      </div>
    </section>
  );
}

export function DashboardReadinessPanel({
  title,
  items,
}: {
  title: string;
  items: ReadinessItem[];
}) {
  const complete = items.filter((item) => item.complete).length;
  const progress = items.length > 0 ? Math.round((complete / items.length) * 100) : 0;

  return (
    <aside className="rounded-3xl border border-white/10 bg-slate-950/45 p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        Seller checklist
      </div>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">Informational only. Admin review still applies.</p>
        </div>
        <div className="text-2xl font-black text-cyan-100">{progress}%</div>
      </div>
      <div className="mt-4 h-2 rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-purple-400 to-fuchsia-400"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border text-[10px] font-black",
                  item.complete
                    ? "border-emerald-300/30 bg-emerald-500/15 text-emerald-200"
                    : "border-white/10 bg-black/20 text-slate-500",
                )}
              >
                {item.complete ? "✓" : ""}
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">{item.label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{item.detail}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

export function ConsolePanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-3xl border border-white/10 bg-slate-950/40", className)}>
      {children}
    </section>
  );
}

export function ConsoleStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

export function DashboardIcon({ name }: { name: DashboardIconName }) {
  const common = {
    className: "h-4 w-4",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };

  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3 5 6v5c0 4.2 2.9 8 7 10 4.1-2 7-5.8 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-5" />
      </svg>
    );
  }
  if (name === "chart") {
    return (
      <svg {...common}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 15v-4" />
        <path d="M12 15V8" />
        <path d="M16 15v-6" />
      </svg>
    );
  }
  if (name === "badge") {
    return (
      <svg {...common}>
        <path d="M12 3 9.4 7.8 4 8.6l3.9 3.8-.9 5.4 5-2.6 5 2.6-.9-5.4L20 8.6l-5.4-.8L12 3Z" />
      </svg>
    );
  }
  if (name === "billing") {
    return (
      <svg {...common}>
        <rect x="4" y="6" width="16" height="12" rx="2" />
        <path d="M4 10h16" />
        <path d="M8 15h3" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
      <path d="m4 7.5 8 4.5 8-4.5" />
      <path d="M12 12v9" />
    </svg>
  );
}
