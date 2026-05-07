"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { saveSession } from "@/lib/product-store";
import type { LocalSession } from "@/lib/product-types";
import { createClient } from "@/lib/supabase/client";

type SignupClientProps = {
  supabaseConfigured: boolean;
  siteUrl: string;
};

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

export function SignupClient({ supabaseConfigured, siteUrl }: SignupClientProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) return;

    if (!supabaseConfigured) {
      // Demo path: fake a buyer session and route to /account.
      const session: LocalSession = {
        email,
        role: "user",
        sellerSubscriptionStatus: "none",
        sellerTag: "none",
      };
      saveSession(session);
      window.location.href = "/account";
      return;
    }

    setStatus({ kind: "submitting" });
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
          // Allow account creation for signup. Roles always default to 'user'
          // (enforced by the migration 002 trigger). Sellers upgrade later.
          shouldCreateUser: true,
          data: displayName ? { display_name: displayName } : undefined,
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
    <Card className="p-6 md:p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-black">Create your account</h2>
        <p className="mt-2 text-sm text-slate-400">
          {supabaseConfigured
            ? "Enter your email and we'll send you a magic link to confirm and sign in."
            : "Demo mode: this just routes you to /account."}
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

        <label className="block">
          <span className="mb-2 block text-sm text-slate-400">Display name (optional)</span>
          <input
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="How you want to appear on Standard"
            disabled={submitting || sent}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400/50 disabled:opacity-60"
          />
        </label>

        <p className="text-xs text-slate-500">
          New accounts start as buyers. Seller access can be enabled afterward from your account onboarding.
        </p>

        {sent ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            Check your email for the confirmation link. It will expire shortly — request a new one if needed.
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
                : "Create account (demo)"}
        </button>
      </form>

      <div className="mt-6 border-t border-white/10 pt-6 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-purple-300 hover:text-purple-200">
          Sign in
        </Link>
      </div>
    </Card>
  );
}
