"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SessionUser } from "@/lib/session";

const ROLE_LABEL: Record<SessionUser["role"], string> = {
  admin: "Admin",
  seller: "Seller",
  user: "Buyer",
};

const ROLE_TONE: Record<SessionUser["role"], string> = {
  admin: "border-orange-400/30 bg-orange-500/15 text-orange-100",
  seller: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
  user: "border-white/10 bg-white/[0.06] text-slate-200",
};

/**
 * Top-right profile pill + dropdown shown by Nav once a user is signed in.
 *
 * Surfaces display_name (or email local-part as fallback), a role badge,
 * and an avatar initial. The dropdown shows role-appropriate links
 * (Dashboard for sellers + admins, Admin for admins only, Start Selling
 * for buyer-only accounts) and a sign-out form. Sign-out uses
 * <form action="/auth/logout" method="POST"> so it works without JS and
 * so auth cookies are cleared by the server before redirect.
 */
export function AccountMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hasDisplayName = Boolean(
    user.displayName && user.displayName.trim().length > 0,
  );
  const fallbackHandle =
    user.email && user.email.length > 0
      ? user.email.split("@")[0] ?? "Account"
      : "Account";
  const handle = hasDisplayName
    ? (user.displayName as string).trim()
    : fallbackHandle;
  const initial = (handle[0] ?? "?").toUpperCase();
  const roleLabel = ROLE_LABEL[user.role];
  const roleTone = ROLE_TONE[user.role];
  // Privacy: only surface the email in the dropdown when we have no
  // display name to identify the user. If display_name exists, the
  // handle + role badge are enough — never reveal the full email.
  const showEmailInHeader = !hasDisplayName && Boolean(user.email);

  const close = () => setOpen(false);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-3 text-sm font-semibold text-white transition hover:border-orange-400/40 hover:bg-orange-500/10"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            aria-hidden="true"
            className="h-7 w-7 rounded-lg object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 text-xs font-black text-white"
          >
            {initial}
          </span>
        )}
        <span className="hidden max-w-[10rem] truncate sm:inline">{handle}</span>
        <span
          aria-hidden="true"
          className={`hidden rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] sm:inline ${roleTone}`}
        >
          {roleLabel}
        </span>
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 transition ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl shadow-black/40 backdrop-blur"
        >
          <div className="border-b border-white/5 px-4 py-3">
            <div className="truncate text-sm font-semibold text-white">{handle}</div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${roleTone}`}
              >
                {roleLabel}
              </span>
              {showEmailInHeader && (
                <span className="truncate text-[11px] text-slate-500">
                  {user.email}
                </span>
              )}
            </div>
          </div>

          <ul className="grid gap-0.5 p-1.5 text-sm">
            <MenuLink href="/account" onClick={close}>
              Account
            </MenuLink>
            {(user.role === "seller" || user.role === "admin") && (
              <MenuLink href="/dashboard" onClick={close}>
                Dashboard
              </MenuLink>
            )}
            {user.role === "admin" && (
              <MenuLink href="/admin" onClick={close}>
                Admin
              </MenuLink>
            )}
            {user.role === "user" && (
              <MenuLink href="/account?view=sell" onClick={close}>
                Start Selling
              </MenuLink>
            )}
            <MenuLink href="/plans" onClick={close}>
              Plans
            </MenuLink>
          </ul>

          <form
            action="/auth/logout"
            method="POST"
            className="border-t border-white/5 p-1.5"
          >
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:bg-red-500/10 hover:text-red-200"
            >
              Sign out
              <span aria-hidden="true">↗</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        role="menuitem"
        className="flex items-center justify-between rounded-lg px-3 py-2 text-slate-200 transition hover:bg-orange-500/10 hover:text-orange-100"
      >
        {children}
      </Link>
    </li>
  );
}
