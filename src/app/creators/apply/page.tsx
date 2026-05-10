"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Badge, Card, Nav, Shell } from "@/components/ui";

const PLATFORM_OPTIONS = ["TikTok", "YouTube", "YouTube Shorts", "Instagram", "Twitch", "X"];
const CONTENT_OPTIONS = ["Clips", "Trailers", "Thumbnails", "TikToks", "YouTube showcases", "Reviews", "Promos"];

export default function CreatorApplyPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Badge tone="purple">Creator application</Badge>
            <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
              Apply as a Standard media creator
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-400">
              This D1 form is a static mock. It captures the shape of the
              future review flow without creating accounts, database rows, or
              backend submissions.
            </p>
            <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4 text-sm leading-6 text-cyan-100">
              Creator profiles will be reviewed before appearing publicly.
            </div>
            <Link
              href="/creators"
              className="mt-6 inline-flex rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white"
            >
              Back to creators
            </Link>
          </div>

          <Card className="p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <TextField label="Creator name" name="creatorName" />
                <TextField label="Email" name="email" placeholder="creator@example.com" />
                <TextField label="Discord" name="discord" placeholder="@creator" />
                <TextField label="Starting rate" name="startingRate" placeholder="$100 per short" />
              </div>

              <CheckGroup label="Platforms" name="platforms" options={PLATFORM_OPTIONS} />
              <CheckGroup label="Content types" name="contentTypes" options={CONTENT_OPTIONS} />

              <TextArea
                label="Games covered"
                name="gamesCovered"
                placeholder="Valorant, CS2, Fortnite..."
              />
              <TextArea
                label="Portfolio links"
                name="portfolioLinks"
                placeholder="Paste TikTok, YouTube, Drive, Behance, or website links."
              />
              <TextArea
                label="Availability"
                name="availability"
                placeholder="Open this week, weekends only, 2 slots per month..."
              />
              <TextArea
                label="Short bio"
                name="bio"
                placeholder="Tell sellers what you make, your style, and what briefs are a strong fit."
              />

              {submitted ? (
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                  Application mock submitted. Backend review flow coming soon.
                </div>
              ) : null}

              <button
                type="submit"
                className="inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20"
              >
                Submit application mock
              </button>
            </form>
          </Card>
        </div>
      </section>
    </Shell>
  );
}

function TextField({
  label,
  name,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-400">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400/50"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-400">{label}</span>
      <textarea
        name={name}
        rows={4}
        placeholder={placeholder}
        className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400/50"
      />
    </label>
  );
}

function CheckGroup({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm text-slate-400">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300"
          >
            <input
              type="checkbox"
              name={name}
              value={option}
              className="h-4 w-4 rounded border-white/20 bg-slate-950 accent-purple-500"
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
