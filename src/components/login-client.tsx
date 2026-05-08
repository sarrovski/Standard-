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
   * Supabase auth. When false we fall back to the demo path (detectSession) so
   * previews without env vars stay clickable.
   */
  supabaseConfigured: boolean;
  siteUrl: string;
};

type ProfileRole = "user" | "seller" | "admin";

type Status =
  | { kind: "idle" }
  | { kind: "submitting"; action: "password" | "magic" | "reset" }
  | { kind: "sent"; message: string }
  | { kind: "error"; message: string };

// Demo-only role detection. Picks a role based on substrings in the email so
// the prototype is navigable without a real auth backend. NEVER runs when
// Supabase is configured — see handlePasswordLogin / handleMagicLink.
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

function destinationForRole(role: ProfileRole | null | undefined): string {
  if (role === "admin") return "/admin";
  if (role === "seller") return "/dashboard";
  return "/account";
}

function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email before logging in with a password.";
  }
  return message;
}

export function LoginClient({ supabaseConfigured, siteUrl }: LoginClientProps) {
  const [email, setEmail] = useState(supabaseConfigured ? "" : "seller@standard.gg");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const redirectAfterPasswordLogin = async () => {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error(userError?.message ?? "Could not resolve signed-in user.");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: ProfileRole }>();

    window.location.href = destinationForRole(profile?.role);
  };

  const handlePasswordLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setStatus({ kind: "error", message: "Email is required." });
      return;
    }

    if (!supabaseConfigured) {
      const session = detectSessionDemo(normalizedEmail);
      saveSession(session);
      window.location.href = destinationFor(session);
      return;
    }

    if (!password) {
      setStatus({ kind: "error", message: "Password is required." });
      return;
    }

    setStatus({ kind: "submitting", action: "password" });
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setStatus({ kind: "error", message: friendlyAuthError(error.message) });
        return;
      }

      await redirectAfterPasswordLogin();
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? friendlyAuthError(err.message) : "Unexpected error logging in.",
      });
    }
  };

  const handleMagicLink = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setStatus({ kind: "error", message: "Email is required before requesting a magic link." });
      return;
    }

    if (!supabaseConfigured) {
      const session = detectSessionDemo(normalizedEmail);
      saveSession(session);
      window.location.href = destinationFor(session);
      return;
    }

    setStatus({ kind: "submitting", action: "magic" });
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback`,
          // Don't auto-create accounts via login — direct people to /signup.
          shouldCreateUser: false,
        },
      });
      if (error) {
        setStatus({ kind: "error", message: friendlyAuthError(error.message) });
        return;
      }
      setStatus({ kind: "sent", message: "Check your email for the magic link. It will expire shortly — request a new one if needed." });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? friendlyAuthError(err.message) : "Unexpected error sending magic link.",
      });
    }
  };

  const handleResetPassword = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setStatus({ kind: "error", message: "Enter your email first, then request a password reset." });
      return;
    }

    if (!supabaseConfigured) {
      setStatus({ kind: "sent", message: "Demo mode: password reset emails are not sent." });
      return;
    }

    setStatus({ kind: "submitting", action: "reset" });
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${siteUrl}/account`,
      });
      if (error) {
        setStatus({ kind: "error", message: friendlyAuthError(error.message) });
        return;
      }
      setStatus({ kind: "sent", message: "Password reset email sent. Check your inbox for the reset link." });
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? friendlyAuthError(err.message) : "Unexpected error sending reset email.",
      });
    }
  };

  const submittingAction = status.kind === "submitting" ? status.action : null;
  const isBusy = status.kind === "submitting";
  const sentMessage = status.kind === "sent" ? status.message : null;
  const errorMessage = status.kind === "error" ? status.message : null;

  return (
    <div className="space-y-5">
      <Card className="p-6 md:p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-black">Sign in</h2>
          <p className="mt-2 text-sm text-slate-400">
            {supabaseConfigured
              ? "Log in with your password, or request a magic link if you prefer."
              : "Demo mode: type any email to preview the routing."}
          </p>
        </div>

        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-400">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              disabled={isBusy}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400/50 disabled:opacity-60"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-400">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={supabaseConfigured ? "Your password" : "Optional in demo mode"}
              disabled={isBusy}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400/50 disabled:opacity-60"
            />
          </label>

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
            className="inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 disabled:opacity-60"
          >
            {submittingAction === "password"
              ? "Logging in…"
              : supabaseConfigured
                ? "Log in"
                : "Sign in (demo)"}
          </button>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={isBusy}
              className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-purple-400/40 hover:text-white disabled:opacity-60"
            >
              {submittingAction === "magic" ? "Sending…" : "Send magic link"}
            </button>
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={isBusy}
              className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-purple-400/40 hover:text-white disabled:opacity-60"
            >
              {submittingAction === "reset" ? "Sending…" : "Forgot password?"}
            </button>
          </div>
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
