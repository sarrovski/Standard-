"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import { games } from "@/lib/data";

/**
 * Full edit screen for a product. The form is sectioned into named cards
 * (Product Info, Media, External link, Pricing, Features, SEO) plus a
 * sticky right-side status panel (publish/archive + slug + meta freshness).
 *
 * Save model:
 *   - Each section is autonomous: the user fills what they want and clicks
 *     "Save changes" at the top-right OR the sticky bottom-right button.
 *   - Save sends a PATCH with the whole edited shape; partial fields are
 *     accepted by the API.
 *   - Status changes (Publish / Archive / Restore) are also PATCHes with
 *     just `{ id, status }`. They take effect immediately and reload.
 *
 * Media:
 *   - The Media section uses the existing /api/seller/products/[id]/media
 *     route. Upload is immediate and shows a "Saved" badge briefly.
 *
 * Demo mode never reaches this component; the server page handles that.
 */

type EditableMedia = {
  id: string;
  storagePath: string;
  publicUrl: string | null;
  altText: string | null;
  sortOrder: number;
};

type EditableProduct = {
  id: string;
  slug: string;
  name: string;
  game: string;
  category: string;
  status: string;
  summary: string | null;
  websiteUrl: string | null;
  features: string[];
  pricePoints: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  media: EditableMedia[];
};

type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

export function ProductEditClient({ product }: { product: EditableProduct }) {
  const router = useRouter();

  // Editable form state — local copy of the product, mutated by inputs.
  const [name, setName] = useState(product.name);
  const [game, setGame] = useState(product.game);
  const [category, setCategory] = useState(product.category);
  const [summary, setSummary] = useState(product.summary ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(product.websiteUrl ?? "");
  const [features, setFeatures] = useState<string[]>(product.features);
  const [pricePoints, setPricePoints] = useState<string[]>(product.pricePoints);
  const [metaTitle, setMetaTitle] = useState(product.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(
    product.metaDescription ?? "",
  );

  const [media, setMedia] = useState<EditableMedia[]>(product.media);
  const [save, setSave] = useState<SaveStatus>({ kind: "idle" });
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Status flips refresh the server data instead of reasoning about it
  // client-side. Cheap, safe, avoids stale state after publish.
  const handleStatusChange = async (next: "published" | "draft" | "archived") => {
    setStatusError(null);
    setStatusBusy(true);
    try {
      const response = await fetch("/api/seller/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, status: next }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatusError(payload.error ?? "Could not update status.");
        return;
      }
      router.refresh();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setStatusBusy(false);
    }
  };

  const handleSave = async () => {
    setSave({ kind: "saving" });
    try {
      const response = await fetch("/api/seller/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: product.id,
          name,
          game,
          category,
          summary: summary.trim() || null,
          website_url: websiteUrl.trim() || null,
          features,
          price_points: pricePoints,
          meta_title: metaTitle.trim() || null,
          meta_description: metaDescription.trim() || null,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setSave({ kind: "error", message: payload.error ?? "Save failed." });
        return;
      }
      setSave({ kind: "saved" });
      router.refresh();
    } catch (err) {
      setSave({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error.",
      });
    }
  };

  // Auto-clear "saved" indicator a few seconds after success.
  useEffect(() => {
    if (save.kind !== "saved") return;
    const t = window.setTimeout(() => setSave({ kind: "idle" }), 3000);
    return () => window.clearTimeout(t);
  }, [save.kind]);

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      {/* Header strip */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/dashboard?tab=products"
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            ← Back to products
          </Link>
          <h1 className="mt-2 truncate text-3xl font-black md:text-4xl">
            {name || product.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>
              <code className="text-slate-400">/{product.slug}</code>
            </span>
            <span>•</span>
            <StatusBadge status={product.status} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {save.kind === "saved" && (
            <span className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-200">
              ✓ Saved
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={save.kind === "saving"}
            className="rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {save.kind === "saving" ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {save.kind === "error" && (
        <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {save.message}
        </div>
      )}

      {/* Body */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Section: Product Info */}
          <Section
            icon={<DotIcon tone="purple" />}
            title="Product info"
            subtitle="Basic information about your product."
          >
            <div className="space-y-5">
              <FormField label="Name" required>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={inputClass}
                />
              </FormField>

              <div className="grid gap-5 md:grid-cols-2">
                <FormField label="Game" required>
                  <select
                    value={game}
                    onChange={(event) => setGame(event.target.value)}
                    className={inputClass}
                  >
                    {games.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Category" required>
                  <input
                    type="text"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className={inputClass}
                  />
                </FormField>
              </div>

              <FormField
                label="Short summary"
                hint="Shows above the fold on the public product page."
              >
                <textarea
                  value={summary}
                  onChange={(event) => setSummary(event.target.value)}
                  rows={3}
                  className={inputClass}
                />
              </FormField>
            </div>
          </Section>

          {/* Section: External link */}
          <Section
            icon={<DotIcon tone="cyan" />}
            title="External link"
            subtitle="Where buyers go after the marketplace card. Standard does not process the transaction itself."
          >
            <FormField
              label="Website URL"
              hint="Shown as the 'Visit seller site' CTA on the public page."
            >
              <input
                type="url"
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://yoursite.com"
                className={inputClass}
              />
            </FormField>
          </Section>

          {/* Section: Pricing */}
          <Section
            icon={<DotIcon tone="amber" />}
            title="Price points"
            subtitle="Free-form list, e.g. '1 month — $20', 'Lifetime — $120'. Standard doesn't process the payment; this is only for buyer context."
          >
            <ChipListEditor
              values={pricePoints}
              onChange={setPricePoints}
              placeholder="Add a price point and press Enter"
            />
          </Section>

          {/* Section: Features */}
          <Section
            icon={<DotIcon tone="green" />}
            title="Features"
            subtitle="What the product does, in a few short bullets."
          >
            <ChipListEditor
              values={features}
              onChange={setFeatures}
              placeholder="Add a feature and press Enter"
            />
          </Section>

          {/* Section: Media */}
          <Section
            icon={<DotIcon tone="purple" />}
            title="Media"
            subtitle="Images shown in the product gallery. The first image is also the marketplace card cover."
          >
            <MediaPanel
              productId={product.id}
              initialMedia={media}
              onChange={setMedia}
            />
          </Section>

          {/* Section: SEO */}
          <Section
            icon={<DotIcon tone="cyan" />}
            title="SEO & metadata"
            subtitle="Optional. If empty, search engines and social previews fall back to the product name and summary."
          >
            <FormField
              label="Meta title"
              hint={`${metaTitle.length} / 60 characters recommended.`}
            >
              <input
                type="text"
                value={metaTitle}
                maxLength={120}
                onChange={(event) => setMetaTitle(event.target.value)}
                placeholder="Falls back to product name"
                className={inputClass}
              />
            </FormField>
            <FormField
              label="Meta description"
              hint={`${metaDescription.length} / 160 characters recommended.`}
            >
              <textarea
                value={metaDescription}
                maxLength={320}
                onChange={(event) => setMetaDescription(event.target.value)}
                placeholder="One or two sentences. Used in Google snippets, Discord embeds, OG cards."
                rows={3}
                className={inputClass}
              />
            </FormField>
          </Section>
        </div>

        {/* Sticky status sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </div>
            <div className="mt-3">
              <StatusBadge status={product.status} />
            </div>
            <div className="mt-4 grid gap-2">
              {product.status !== "published" && (
                <button
                  type="button"
                  onClick={() => handleStatusChange("published")}
                  disabled={statusBusy}
                  className="rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {statusBusy ? "Working…" : "Publish"}
                </button>
              )}
              {product.status === "published" && (
                <button
                  type="button"
                  onClick={() => handleStatusChange("archived")}
                  disabled={statusBusy}
                  className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200 disabled:opacity-60"
                >
                  {statusBusy ? "Working…" : "Archive"}
                </button>
              )}
              {product.status === "archived" && (
                <button
                  type="button"
                  onClick={() => handleStatusChange("draft")}
                  disabled={statusBusy}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 disabled:opacity-60"
                >
                  {statusBusy ? "Working…" : "Restore to draft"}
                </button>
              )}
            </div>
            {statusError && (
              <p className="mt-3 text-xs text-red-300">{statusError}</p>
            )}
          </Card>

          <Card className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Public URL
            </div>
            <div className="mt-2 break-all text-xs text-slate-300">
              <code>/products/{product.slug}</code>
            </div>
            {product.status === "published" && (
              <Link
                href={`/products/${product.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex text-xs font-semibold text-purple-300 hover:text-purple-200"
              >
                View live page →
              </Link>
            )}
          </Card>

          <Card className="p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tip
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Add a meta title and description for Discord embeds and Google
              search snippets. They&apos;re what most buyers see first.
            </p>
          </Card>
        </aside>
      </div>

      {/* Sticky bottom save bar (mobile + as a safety net on long forms) */}
      <div className="sticky bottom-4 mt-8 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={save.kind === "saving"}
          className="rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-60"
        >
          {save.kind === "saving" ? "Saving…" : "Save changes"}
        </button>
      </div>
    </section>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400/50";

function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>
          {label}
          {required && <span className="ml-1 text-purple-300">*</span>}
        </span>
        {hint && <span className="text-[10px] font-normal normal-case tracking-normal text-slate-600">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <div className="mt-1">{icon}</div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function DotIcon({ tone }: { tone: "purple" | "cyan" | "amber" | "green" }) {
  const ringTone = {
    purple: "border-purple-400/40 bg-purple-500/15",
    cyan: "border-cyan-400/40 bg-cyan-500/15",
    amber: "border-amber-400/40 bg-amber-500/15",
    green: "border-emerald-400/40 bg-emerald-500/15",
  }[tone];
  const dotTone = {
    purple: "bg-purple-300",
    cyan: "bg-cyan-300",
    amber: "bg-amber-300",
    green: "bg-emerald-300",
  }[tone];
  return (
    <span
      className={`inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg border ${ringTone}`}
    >
      <span className={`h-2 w-2 rounded-full ${dotTone}`} />
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "published") return <Badge tone="green">Published</Badge>;
  if (status === "archived") return <Badge tone="default">Archived</Badge>;
  return <Badge tone="amber">Draft</Badge>;
}

// Inline chip-style editor for text[] fields. Enter or comma adds a chip;
// click "x" removes it. Plain DOM for now — no DnD reorder, sellers can
// edit by removing + re-adding.
function ChipListEditor({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");
  const commit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (values.includes(trimmed)) {
      setInput("");
      return;
    }
    onChange([...values, trimmed]);
    setInput("");
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 p-3">
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 text-xs text-slate-200"
          >
            {value}
            <button
              type="button"
              onClick={() => onChange(values.filter((v) => v !== value))}
              className="ml-1 text-slate-500 hover:text-red-300"
              aria-label={`Remove ${value}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              commit();
            } else if (event.key === "Backspace" && !input && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={commit}
          placeholder={values.length === 0 ? placeholder : ""}
          className="min-w-[200px] flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
        />
      </div>
      <p className="mt-2 text-[11px] text-slate-600">
        Press Enter or comma to add. Click × to remove.
      </p>
    </div>
  );
}

// ─── Media panel ──────────────────────────────────────────────────────────

function MediaPanel({
  productId,
  initialMedia,
  onChange,
}: {
  productId: string;
  initialMedia: EditableMedia[];
  onChange: (next: EditableMedia[]) => void;
}) {
  const [media, setMedia] = useState<EditableMedia[]>(initialMedia);
  const [busy, setBusy] = useState(false);
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (!savedNotice) return;
    const t = window.setTimeout(() => {
      setSavedNotice(false);
      setLastSavedId(null);
    }, 4000);
    return () => window.clearTimeout(t);
  }, [savedNotice]);

  const update = (next: EditableMedia[]) => {
    setMedia(next);
    onChange(next);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setSavedNotice(false);
    setLastSavedId(null);

    const formData = new FormData();
    formData.append("file", file);

    setBusy(true);
    try {
      const response = await fetch(
        `/api/seller/products/${productId}/media`,
        { method: "POST", body: formData },
      );
      const payload = (await response.json()) as {
        media?: {
          id: string;
          storage_path: string;
          public_url: string | null;
          alt_text: string | null;
          sort_order: number;
        };
        error?: string;
        step?: string;
        details?: string;
      };
      const uploaded = payload.media;
      if (!response.ok || !uploaded) {
        const stepLabel = payload.step ? `[${payload.step}] ` : "";
        const detailSuffix = payload.details ? ` (${payload.details})` : "";
        setError(
          `${stepLabel}${payload.error ?? "Upload failed."}${detailSuffix}`,
        );
        return;
      }
      const next = [
        ...media,
        {
          id: uploaded.id,
          storagePath: uploaded.storage_path,
          publicUrl: uploaded.public_url,
          altText: uploaded.alt_text,
          sortOrder: uploaded.sort_order,
        },
      ];
      update(next);
      setLastSavedId(uploaded.id);
      setSavedNotice(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (mediaId: string) => {
    setError(null);
    setBusyDeleteId(mediaId);
    try {
      const response = await fetch(
        `/api/seller/products/${productId}/media`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ media_id: mediaId }),
        },
      );
      const payload = (await response.json()) as {
        error?: string;
        step?: string;
      };
      if (response.status >= 400 && response.status !== 207) {
        const stepLabel = payload.step ? `[${payload.step}] ` : "";
        setError(`${stepLabel}${payload.error ?? "Delete failed."}`);
        return;
      }
      update(media.filter((m) => m.id !== mediaId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusyDeleteId(null);
    }
  };

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        {media.map((m) => {
          const isJustSaved = m.id === lastSavedId;
          return (
            <div
              key={m.id}
              className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/40"
            >
              {m.publicUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.publicUrl}
                  alt={m.altText ?? ""}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">
                  No URL
                </div>
              )}
              {isJustSaved && (
                <div className="absolute left-1 top-1 rounded-md border border-emerald-400/40 bg-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-50">
                  Saved
                </div>
              )}
              <button
                type="button"
                onClick={() => handleDelete(m.id)}
                disabled={busyDeleteId === m.id}
                className="absolute right-1 top-1 rounded-md border border-red-400/30 bg-red-500/30 px-2 py-1 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100 disabled:opacity-60"
              >
                {busyDeleteId === m.id ? "…" : "Delete"}
              </button>
            </div>
          );
        })}

        {/* Upload tile */}
        <label
          className={`flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-purple-400/30 bg-purple-500/5 text-purple-200 transition hover:border-purple-400/60 hover:bg-purple-500/10 ${
            busy ? "opacity-60" : ""
          }`}
        >
          <span className="text-2xl">+</span>
          <span className="mt-1 text-xs font-semibold">
            {busy ? "Uploading…" : "Click to upload"}
          </span>
          <span className="mt-1 text-[10px] text-slate-500">
            JPG, PNG, WebP — up to 10 MB
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleUpload}
            disabled={busy}
            className="hidden"
          />
        </label>
      </div>

      {savedNotice && (
        <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-2 text-xs text-emerald-100">
          ✓ Image uploaded and saved.
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 p-2 text-xs text-red-200">
          {error}
        </div>
      )}
      <p className="mt-3 text-[11px] text-slate-600">
        Images are saved automatically as soon as they upload. The first image
        is used as the marketplace card cover.
      </p>
    </div>
  );
}
