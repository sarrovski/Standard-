"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { saveSession } from "@/lib/product-store";
import type { LocalSession } from "@/lib/product-types";
import { createClient } from "@/lib/supabase/client";

type LoginClientProps = {
  /**
   * Set by the server based on isSupabaseConfigured(). When true we use real
   * Supabase magic-link auth. When false we fall back to the demo path
   * (detectSession) so previews without env vars stay clickable.
   */
  supabaseConfigured: boolean;
  siteUrl: string;
};

// Demo-only role detection. Picks a role based on substrings in the email so
// the prototype is navigable without a real auth backend. NEVER runs when
// Supabase is configured — see signInWithMagicLink below.
function detectSessionDemo(email: string): LocalSession {
  const normalized = email.toLowerCase().trim();

  if (normalized.includes("admin")) {
    return { email, role: "admin", sellerSubscriptionStatus: "active", sellerTag: "none" };
  }
  if (normalized.includes("seller") || normalized.includes("dev") || normalized.includes("provider")) {
    return {
      email,
      role: "seller",
      sellerSubscriptionStatus: "active",
      sellerTag: normalized.includes("provider") || normalized.includes("dev") ? "provider_developer" : "verified_seller",
    };
  }
  if (normalized.includes("new")) {
    return { email, role: "seller", sellerSubscriptionStatus: "none", sellerTag: "none" };
  }
  return { email, role: "user", sellerSubscriptionStatus: "none", sellerTag: "none" };
}

function destinationFor(session: LocalSession): string {
  if (session.role === "admin") return "/admin";
  if (session.role === "seller" && session.sellerSubscriptionStatus === "active") return "/dashboard";
  if (session.role === "seller") return "/account?view=sell";
  return "/account";
}

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

export function LoginClient({ supabaseConfigured, siteUrl }: LoginClientProps) {
  const [email, setEmail] = useState(supabaseConfigured ? "" : "seller@standard.gg");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) return;

    if (!supabaseConfigured) {
      // Demo path: skip the email round-trip, route based on heuristic.
      const session = detectSessionDemo(email);
      saveSession(session);
      window.location.href = destinationFor(session);
      return;
    }

    setStatus({ kind: "submitting" });
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
          // Don't auto-create accounts via login — direct people to /signup.
          shouldCreateUser: false,
        },
      });
      if (error) {
        setStatus({ kind: "error", message: error.message });
        return;
      }
      setStatus({ kind: "sent" });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Unexpected error sending magic link.",
      });
    }
  };

  const submitting = status.kind === "submitting";
  const sent = status.kind === "sent";
  const errorMessage = status.kind === "error" ? status.message : null;

  return (
    <div className="space-y-5">
      <Card className="p-6 md:p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-black">Sign in</h2>
          <p className="mt-2 text-sm text-slate-400">
            {supabaseConfigured
              ? "Enter your email and we'll send you a magic link."
              : "Demo mode: type any email to preview the routing."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-400">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              disabled={submitting || sent}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400/50 disabled:opacity-60"
            />
          </label>

          {sent ? (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              Check your email for the magic link. It will expire shortly — request a new one if needed.
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting || sent}
            className="inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 disabled:opacity-60"
          >
            {submitting
              ? "Sending magic link…"
              : sent
                ? "Magic link sent"
                : supabaseConfigured
                  ? "Send magic link"
                  : "Sign in (demo)"}
          </button>
        </form>

        <div className="mt-6 border-t border-white/10 pt-6 text-center text-sm text-slate-400">
          New to Standard?{" "}
          <Link href="/signup" className="font-semibold text-purple-300 hover:text-purple-200">
            Create an account
          </Link>
        </div>
      </Card>

      {!supabaseConfigured ? (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <div className="font-bold">MVP test accounts</div>
              <p className="mt-1 text-sm text-slate-500">
                Type one of these emails, then sign in.
              </p>
            </div>
            <Badge tone="amber">Demo</Badge>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {([
              ["user@standard.gg", "Buyer account"],
              ["seller@standard.gg", "Seller dashboard"],
              ["new@standard.gg", "Seller onboarding"],
              ["admin@standard.gg", "Admin panel"],
            ] as const).map(([mail, label]) => (
              <button
                key={mail}
                type="button"
                onClick={() => setEmail(mail)}
                className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-left text-sm text-slate-300 transition hover:border-purple-400/40 hover:text-white"
              >
                <div className="font-semibold">{mail}</div>
                <div className="mt-1 text-xs text-slate-500">{label}</div>
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="flex gap-3">
        <ButtonLink href="/marketplace" variant="secondary">Browse marketplace</ButtonLink>
        <ButtonLink href="/plans" variant="secondary">View plans</ButtonLink>
      </div>
    </div>
  );
}
