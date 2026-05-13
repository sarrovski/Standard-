import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/helpers";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(249,115,22,0.14),transparent_32%),radial-gradient(circle_at_0%_42%,rgba(249,115,22,0.06),transparent_30%)]" />
      <div className="relative">
        {children}
        <Footer />
      </div>
    </main>
  );
}

export function Nav() {
  return (
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
      <Link href="/" className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-lg font-black text-white">
          S
        </span>
        <span className="text-2xl font-black tracking-tight">Standard</span>
      </Link>

      <div className="hidden items-center gap-7 text-sm font-medium text-slate-300 md:flex">
        <Link href="/marketplace" className="transition hover:text-white">Marketplace</Link>
        <Link href="/creators" className="transition hover:text-white">Creators</Link>
        <Link href="/start-selling" className="transition hover:text-white">Start Selling</Link>
        <Link href="/trust" className="transition hover:text-white">Trust</Link>
        <Link href="/plans" className="transition hover:text-white">Plans</Link>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/login" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white">
          Login
        </Link>
      </div>
    </nav>
  );
}

export function Card({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-3xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/20",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "orange" | "green" | "amber" | "red" | "cyan";
}) {
  const styles = {
    default: "border-white/10 bg-white/[0.04] text-slate-300",
    orange: "border-orange-400/20 bg-orange-500/10 text-orange-200",
    green: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    red: "border-red-400/20 bg-red-500/10 text-red-200",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
  };

  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", styles[tone])}>
      {children}
    </span>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  onClick,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={
        variant === "primary"
          ? "inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-400"
          : "inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white"
      }
    >
      {children}
    </Link>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-orange-300">{eyebrow}</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">{title}</h1>
      <p className="mt-4 max-w-3xl text-slate-400">{text}</p>
    </div>
  );
}

export function MiniStat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </Card>
  );
}

export function Tabs({
  items,
  active,
  basePath,
}: {
  items: Array<{ key: string; label: string }>;
  active: string;
  basePath: string;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.035] p-2">
      {items.map((item) => (
        <Link
          key={item.key}
          href={`${basePath}?tab=${item.key}`}
          className={cn(
            "whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition",
            active === item.key
              ? "bg-orange-500/20 text-orange-100"
              : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}


export function Footer() {
  return (
    <footer className="mx-auto mt-16 max-w-7xl border-t border-white/10 px-6 py-10">
      <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-lg font-black text-white">
              S
            </span>
            <span className="text-2xl font-black tracking-tight">Standard</span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
            Standard helps buyers compare sellers, verified payment methods, product pages, and trust signals before they leave for a seller website.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white">Product</h3>
          <div className="mt-4 grid gap-3 text-sm text-slate-400">
            <Link href="/marketplace" className="hover:text-white">Marketplace</Link>
            <Link href="/creators" className="hover:text-white">Creators</Link>
            <Link href="/plans" className="hover:text-white">Plans</Link>
            <Link href="/trust" className="hover:text-white">Trust</Link>
            <Link href="/start-selling" className="hover:text-white">Start Selling</Link>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white">Legal</h3>
          <div className="mt-4 grid gap-3 text-sm text-slate-400">
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/trust" className="hover:text-white">Verification policy</Link>
            <span className="text-slate-600">© Standard</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
