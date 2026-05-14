"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { LIMITS } from "@/lib/creator-marketplace";

/**
 * "Send creator brief" form on the public creator profile page.
 *
 * - Logged out  -> sign-in prompt (no form).
 * - Logged in   -> the brief form; the API attaches seller_id
 *   automatically when the requester owns a seller record.
 *
 * No messaging is built — the creator responds externally using the
 * contact details submitted here.
 */
export function CreatorBriefForm({
  creatorSlug,
  creatorName,
  loggedIn,
  defaultEmail,
}: {
  creatorSlug: string;
  creatorName: string;
  loggedIn: boolean;
  defaultEmail: string | null;
}) {
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [discord, setDiscord] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!loggedIn) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5 text-sm text-slate-300">
        <Link
          href={`/login?next=/creators/${creatorSlug}`}
          className="font-semibold text-orange-300 underline-offset-2 hover:underline"
        >
          Sign in
        </Link>{" "}
        to send {creatorName} a brief. Standard doesn&apos;t process creator
        payments — you&apos;ll arrange delivery and payment externally.
      </div>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (title.trim().length < LIMITS.requestTitle.min) {
      setError("Add a short title for your brief.");
      return;
    }
    if (brief.trim().length < LIMITS.requestBrief.min) {
      setError(
        `Describe the work in at least ${LIMITS.requestBrief.min} characters.`,
      );
      return;
    }
    if (!email.trim() && !discord.trim()) {
      setError("Add at least one contact method (email or Discord).");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/creator-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creator_slug: creatorSlug,
          title: title.trim(),
          brief: brief.trim(),
          budget: budget.trim() || undefined,
          timeline: timeline.trim() || undefined,
          requester_email: email.trim() || undefined,
          requester_discord: discord.trim() || undefined,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Couldn't send the brief. Try again.");
        return;
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5 text-sm leading-6 text-emerald-100">
        Brief sent. {creatorName} can respond externally using your contact
        details. You can track this request from your dashboard.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <label className="grid gap-1.5 text-sm font-semibold text-slate-200">
        Brief title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={LIMITS.requestTitle.max}
          placeholder="e.g. 30s launch trailer for our new product"
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/50"
        />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold text-slate-200">
        Brief
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          maxLength={LIMITS.requestBrief.max}
          placeholder="What do you need, what's the product, what's the vibe, references…"
          className="min-h-28 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/50"
        />
        <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
          {brief.length} / {LIMITS.requestBrief.max}
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold text-slate-200">
          Budget (optional)
          <input
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            maxLength={LIMITS.budget.max}
            placeholder="e.g. $150–$300"
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/50"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-200">
          Timeline (optional)
          <input
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
            maxLength={LIMITS.timeline.max}
            placeholder="e.g. within 2 weeks"
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/50"
          />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold text-slate-200">
          Contact email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={LIMITS.email.max}
            placeholder="you@example.com"
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/50"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-200">
          Contact Discord
          <input
            value={discord}
            onChange={(e) => setDiscord(e.target.value)}
            maxLength={LIMITS.discord.max}
            placeholder="@yourhandle"
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/50"
          />
        </label>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Send creator brief"}
      </button>
      <p className="text-xs leading-5 text-slate-500">
        Standard doesn&apos;t process creator payments. Briefs are a contact
        request — you and the creator arrange delivery and payment externally.
      </p>
    </form>
  );
}
