"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import {
  CONTENT_TYPE_OPTIONS,
  CREATOR_COPY,
  LIMITS,
  PLATFORM_OPTIONS,
  type UICreatorApplication,
} from "@/lib/creator-marketplace";

/**
 * Real creator application form.
 *
 * States:
 *   - logged out             -> sign-in / sign-up CTA, no form
 *   - pending application    -> status card, no form (no duplicate spam)
 *   - approved application   -> status card linking to the dashboard
 *   - rejected / none        -> the application form (resubmission is
 *                               allowed after a rejection)
 *
 * Submits to POST /api/creators/apply. Validation is server-authoritative;
 * the client mirrors the length caps for a snappier UX.
 */
export function CreatorApplyClient({
  loggedIn,
  defaultEmail,
  latestApplication,
}: {
  loggedIn: boolean;
  defaultEmail: string | null;
  latestApplication: UICreatorApplication | null;
}) {
  if (!loggedIn) {
    return (
      <Shell2 title="Apply as a Standard media creator">
        <Card className="p-6">
          <p className="text-sm leading-6 text-slate-300">
            You need an account to apply as a creator. {CREATOR_COPY.reviewNotice}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/login?next=/creators/apply"
              className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-400"
            >
              Sign in
            </Link>
            <Link
              href="/signup?next=/creators/apply"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Create an account
            </Link>
          </div>
        </Card>
      </Shell2>
    );
  }

  if (
    latestApplication &&
    (latestApplication.status === "pending" ||
      latestApplication.status === "approved")
  ) {
    return (
      <Shell2 title="Your creator application">
        <Card className="p-6">
          <Badge
            tone={latestApplication.status === "approved" ? "green" : "amber"}
          >
            {latestApplication.status === "approved"
              ? "Approved"
              : "Under review"}
          </Badge>
          <h2 className="mt-3 text-xl font-black">
            {latestApplication.status === "approved"
              ? "You're an approved creator"
              : "Application submitted for review"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {latestApplication.status === "approved"
              ? "Your creator profile is live. Manage your profile, portfolio, and incoming briefs from your creator dashboard."
              : `${CREATOR_COPY.reviewNotice} We'll review your application and your profile will appear publicly once it's approved.`}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {latestApplication.status === "approved" ? (
              <Link
                href="/creator-dashboard"
                className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-400"
              >
                Open creator dashboard
              </Link>
            ) : null}
            <Link
              href="/creators"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Back to creators
            </Link>
          </div>
        </Card>
      </Shell2>
    );
  }

  // No live application (none, or a prior rejection) → show the form.
  return (
    <Shell2 title="Apply as a Standard media creator">
      <ApplyForm
        defaultEmail={defaultEmail}
        rejectedNote={
          latestApplication?.status === "rejected"
            ? latestApplication.adminNotes
            : null
        }
      />
    </Shell2>
  );
}

function Shell2({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <Badge tone="orange">Creator application</Badge>
      <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
        {title}
      </h1>
      <p className="mt-4 text-base leading-7 text-slate-400">
        {CREATOR_COPY.tagline} {CREATOR_COPY.externalPayments}
      </p>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function ApplyForm({
  defaultEmail,
  rejectedNote,
}: {
  defaultEmail: string | null;
  rejectedNote: string | null;
}) {
  const [creatorName, setCreatorName] = useState("");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [discord, setDiscord] = useState("");
  const [startingRate, setStartingRate] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [gamesCovered, setGamesCovered] = useState("");
  const [portfolioLinks, setPortfolioLinks] = useState("");
  const [availability, setAvailability] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const toggle = (
    list: string[],
    setList: (next: string[]) => void,
    value: string,
  ) => {
    setList(
      list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value],
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (creatorName.trim().length < LIMITS.creatorName.min) {
      setError("Add your creator name.");
      return;
    }
    if (email.trim().length < LIMITS.email.min) {
      setError("Add a contact email.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/creators/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creator_name: creatorName.trim(),
          email: email.trim(),
          discord: discord.trim() || undefined,
          starting_rate: startingRate.trim() || undefined,
          platforms,
          content_types: contentTypes,
          games_covered: gamesCovered,
          portfolio_links: portfolioLinks,
          availability: availability.trim() || undefined,
          bio: bio.trim() || undefined,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Couldn't submit your application.");
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
      <Card className="p-6">
        <Badge tone="green">Submitted</Badge>
        <h2 className="mt-3 text-xl font-black">
          Application submitted for review
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {CREATOR_COPY.reviewNotice} We&apos;ll review your application — your
          creator profile appears publicly once it&apos;s approved.
        </p>
        <Link
          href="/creators"
          className="mt-5 inline-flex rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
        >
          Back to creators
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6 md:p-8">
      {rejectedNote && (
        <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          <span className="font-semibold">
            A previous application wasn&apos;t approved.
          </span>{" "}
          {rejectedNote} You can update your details and resubmit below.
        </div>
      )}
      <form onSubmit={submit} className="grid gap-5">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Creator name">
            <input
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              maxLength={LIMITS.creatorName.max}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={LIMITS.email.max}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Discord (optional)">
            <input
              value={discord}
              onChange={(e) => setDiscord(e.target.value)}
              maxLength={LIMITS.discord.max}
              placeholder="@creator"
              className={inputClass}
            />
          </Field>
          <Field label="Starting rate (optional)">
            <input
              value={startingRate}
              onChange={(e) => setStartingRate(e.target.value)}
              maxLength={LIMITS.startingRate.max}
              placeholder="$100 per short"
              className={inputClass}
            />
          </Field>
        </div>

        <CheckGroup
          label={`Platforms (up to ${LIMITS.platforms})`}
          options={PLATFORM_OPTIONS}
          selected={platforms}
          onToggle={(v) => toggle(platforms, setPlatforms, v)}
        />
        <CheckGroup
          label={`Content types (up to ${LIMITS.contentTypes})`}
          options={CONTENT_TYPE_OPTIONS}
          selected={contentTypes}
          onToggle={(v) => toggle(contentTypes, setContentTypes, v)}
        />

        <Field label="Games covered (comma or newline separated)">
          <textarea
            value={gamesCovered}
            onChange={(e) => setGamesCovered(e.target.value)}
            rows={2}
            placeholder="Valorant, CS2, Fortnite"
            className={textareaClass}
          />
        </Field>
        <Field label="Portfolio links (one per line — must be http/https URLs)">
          <textarea
            value={portfolioLinks}
            onChange={(e) => setPortfolioLinks(e.target.value)}
            rows={3}
            placeholder="https://youtube.com/...\nhttps://tiktok.com/..."
            className={textareaClass}
          />
        </Field>
        <Field label="Availability (optional)">
          <input
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            maxLength={LIMITS.availability.max}
            placeholder="Open this week, 2 slots per month..."
            className={inputClass}
          />
        </Field>
        <Field label="Short bio (optional)">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={LIMITS.bio.max}
            placeholder="What you make, your style, what briefs are a strong fit."
            className={textareaClass}
          />
        </Field>

        {error && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit application"}
        </button>
        <p className="text-xs leading-5 text-slate-500">
          {CREATOR_COPY.reviewNotice}
        </p>
      </form>
    </Card>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-400/50";
const textareaClass =
  "w-full resize-none rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-orange-400/50";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-300">
        {label}
      </span>
      {children}
    </label>
  );
}

function CheckGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-slate-300">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              aria-pressed={active}
              className={
                "rounded-full border px-3 py-1.5 text-sm transition " +
                (active
                  ? "border-orange-400/40 bg-orange-500/15 text-orange-100"
                  : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20")
              }
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
