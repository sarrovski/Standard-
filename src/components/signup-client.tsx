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

type ProfileRole = "user" | "seller" | "admin";

type Status =
  | { kind: "idle" }
  | { kind: "submitting"; action: "password" | "magic" }
  | { kind: "sent"; message: string }
  | { kind: "error"; message: string };

function destinationForRole(role: ProfileRole | null | undefined): string {
  if (role === "admin") return "/admin";
  if (role === "seller") return "/dashboard";
  return "/account";
}

function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("already registered") || normalized.includes("user already registered")) {
    return "An account already exists for this email. Log in instead.";
  }
  if (normalized.includes("password should be at least")) {
    return "Password is too short. Use at least 8 characters.";
  }
  return message;
}

export function SignupClient({ supabaseConfigured, siteUrl }: SignupClientProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const redirectAfterImmediateSignup = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/account";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: ProfileRole }>();

    window.location.href = destinationForRole(profile?.role);
  };

  const handlePasswordSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setStatus({ kind: "error", message: "Email is required." });
      return;
    }

    if (!supabaseConfigured) {
      // Demo path: fake a buyer session and route to /account.
      const session: LocalSession = {
        email: normalizedEmail,
        role: "user",
        sellerSubscriptionStatus: "none",
        sellerTag: "none",
      };
      saveSession(session);
      window.location.href = "/account";
      return;
    }

    if (password.length < 8) {
      setStatus({ kind: "error", message: "Password must be at least 8 characters." });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ kind: "error", message: "Passwords do not match." });
      return;
    }

    setStatus({ kind: "submitting", action: "password" });
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
          data: displayName ? { display_name: displayName } : undefined,
        },
      });

      if (error) {
        setStatus({ kind: "error", message: friendlyAuthError(error.message) });
        return;
      }

      if (data.session) {
        await redirectAfterImmediateSignup();
        return;
      }

      setStatus({ kind: "sent", message: "Account created. Check your email to confirm your account before logging in." });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? friendlyAuthError(err.message) : "Unexpected error creating account.",
      });
    }
  };

  const handleMagicSignup = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setStatus({ kind: "error", message: "Email is required before requesting a magic link." });
      return;
    }

    if (!supabaseConfigured) {
      const session: LocalSession = {
        email: normalizedEmail,
        role: "user",
        sellerSubscriptionStatus: "none",
        sellerTag: "none",
      };
      saveSession(session);
      window.location.href = "/account";
      return;
    }

    setStatus({ kind: "submitting", action: "magic" });
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
          // Allow account creation for signup. Roles always default to 'user'
          // (enforced by the migration 002 trigger). Sellers upgrade later.
          shouldCreateUser: true,
          data: displayName ? { display_name: displayName } : undefined,
        },
      });
      if (error) {
        setStatus({ kind: "error", message: friendlyAuthError(error.message) });
        return;
      }
      setStatus({ kind: "sent", message: "Check your email for the confirmation link. It will expire shortly — request a new one if needed." });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? friendlyAuthError(err.message) : "Unexpected error sending magic link.",
      });
    }
  };

  const submittingAction = status.kind === "submitting" ? status.action : null;
  const isBusy = status.kind === "submitting";
  const sentMessage = status.kind === "sent" ? status.message : null;
  const errorMessage = status.kind === "error" ? status.message : null;

  return (
    <Card className="p-6 md:p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-black">Create your account</h2>
        <p className="mt-2 text-sm text-slate-400">
          {supabaseConfigured
            ? "Create an account with a password. Magic link signup stays available as a backup."
            : "Demo mode: this just routes you to /account."}
        </p>
      </div>

      <form onSubmit={handlePasswordSignup} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm text-slate-400">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            disabled={isBusy}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-400/50 disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-slate-400">Display name (optional)</span>
          <input
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="How you want to appear on Standard"
            disabled={isBusy}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-400/50 disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-slate-400">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            disabled={isBusy}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-400/50 disabled:opacity-60"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-slate-400">Confirm password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat your password"
            disabled={isBusy}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-400/50 disabled:opacity-60"
          />
        </label>

        <p className="text-xs text-slate-500">
          New accounts start as buyers. Seller access can be enabled afterward from your account onboarding.
        </p>

        {sentMessage ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {sentMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isBusy}
          className="inline-flex w-full justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 disabled:opacity-60"
        >
          {submittingAction === "password"
            ? "Creating account…"
            : supabaseConfigured
              ? "Create account"
              : "Create account (demo)"}
        </button>

        <button
          type="button"
          onClick={handleMagicSignup}
          disabled={isBusy}
          className="w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-orange-400/40 hover:text-white disabled:opacity-60"
        >
          {submittingAction === "magic" ? "Sending magic link…" : "Send magic link instead"}
        </button>
      </form>

      <div className="mt-6 border-t border-white/10 pt-6 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-orange-300 hover:text-orange-200">
          Sign in
        </Link>
      </div>
    </Card>
  );
}
