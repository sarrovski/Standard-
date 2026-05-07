"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { saveSession } from "@/lib/product-store";
import type { LocalSession } from "@/lib/product-types";

function detectSession(email: string): LocalSession {
  const normalized = email.toLowerCase().trim();

  if (normalized.includes("admin")) {
    return {
      email,
      role: "admin",
      sellerSubscriptionStatus: "active",
      sellerTag: "none",
    };
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
    return {
      email,
      role: "seller",
      sellerSubscriptionStatus: "none",
      sellerTag: "none",
    };
  }

  return {
    email,
    role: "user",
    sellerSubscriptionStatus: "none",
    sellerTag: "none",
  };
}

function destinationFor(session: LocalSession) {
  if (session.role === "admin") return "/admin";
  if (session.role === "seller" && session.sellerSubscriptionStatus === "active") return "/dashboard";
  if (session.role === "seller") return "/account?view=sell";
  return "/account";
}

export function LoginClient() {
  const [email, setEmail] = useState("seller@standard.gg");

  const signIn = () => {
    const session = detectSession(email);
    saveSession(session);
    window.location.href = destinationFor(session);
  };

  return (
    <div className="space-y-5">
      <Card className="p-6 md:p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-black">Sign in</h2>
          <p className="mt-2 text-sm text-slate-400">
            Access your account, seller tools, or admin workspace.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-400">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400/50"
            />
          </label>

          <label className="block">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm text-slate-400">Password</span>
              <Link href="/login" className="text-xs text-purple-300 hover:text-purple-200">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              placeholder="Any password works in MVP"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400/50"
            />
          </label>

          <button
            onClick={signIn}
            className="inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20"
          >
            Sign in
          </button>
        </div>

        <div className="mt-6 border-t border-white/10 pt-6 text-center text-sm text-slate-400">
          New to Standard?{" "}
          <Link href="/signup" className="font-semibold text-purple-300 hover:text-purple-200">
            Create an account
          </Link>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <div className="font-bold">MVP test accounts</div>
            <p className="mt-1 text-sm text-slate-500">
              Type one of these emails, then sign in.
            </p>
          </div>
          <Badge tone="amber">Local</Badge>
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
              onClick={() => setEmail(mail)}
              className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-left text-sm text-slate-300 transition hover:border-purple-400/40 hover:text-white"
            >
              <div className="font-semibold">{mail}</div>
              <div className="mt-1 text-xs text-slate-500">{label}</div>
            </button>
          ))}
        </div>
      </Card>

      <div className="flex gap-3">
        <ButtonLink href="/marketplace" variant="secondary">Browse marketplace</ButtonLink>
        <ButtonLink href="/plans" variant="secondary">View plans</ButtonLink>
      </div>
    </div>
  );
}
