"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { games, productCategories } from "@/lib/data";

type EditableProduct = {
  id: string;
  slug: string;
  name: string;
  game: string;
  category: string;
  website_url: string;
  summary: string;
  features: string[];
  status: "draft" | "published" | "archived";
};

type ProductEditError = {
  error?: string;
  step?: string;
  code?: string;
  details?: string;
};

function formatEditError(status: number | null, payload: ProductEditError) {
  const pieces: string[] = [];
  if (status) pieces.push(`HTTP ${status}`);
  if (payload.step) pieces.push(payload.step);
  if (payload.code) pieces.push(payload.code);
  const prefix = pieces.length > 0 ? `${pieces.join(" / ")}: ` : "";
  const message = payload.error ?? "Could not save product.";
  const details = payload.details ? ` ${payload.details}` : "";
  return `${prefix}${message}${details}`;
}

export function ProductEditClient({ product }: { product: EditableProduct }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: product.name,
    game: product.game,
    category: product.category,
    website_url: product.website_url,
    summary: product.summary,
    features: product.features.join(", "),
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isPublished = product.status === "published";

  // Closed picker lists. If a product was created before the closed lists
  // existed (legacy data), preserve its current value as the first option
  // so saving doesn't silently rewrite it.
  const gameOptions = useMemo(() => {
    if (form.game && !games.includes(form.game)) {
      return [form.game, ...games];
    }
    return games;
  }, [form.game]);
  const categoryOptions = useMemo(() => {
    if (form.category && !productCategories.includes(form.category)) {
      return [form.category, ...productCategories];
    }
    return productCategories;
  }, [form.category]);

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.game.trim() || !form.category.trim()) {
      setError("Validation: product name, game, and category are required.");
      return;
    }

    const features = form.features
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);

    setSaving(true);
    try {
      const response = await fetch("/api/seller/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: product.id,
          name: form.name,
          game: form.game,
          category: form.category,
          website_url: form.website_url || null,
          summary: form.summary || null,
          features,
        }),
      });
      const payload = (await response.json()) as
        | { product: { id: string; slug: string } }
        | ProductEditError;
      if (!response.ok) {
        setError(formatEditError(response.status, payload as ProductEditError));
        return;
      }
      router.push("/dashboard?tab=products");
    } catch (err) {
      setError(
        formatEditError(null, {
          error: err instanceof Error ? err.message : "Network error.",
          step: "product_update",
          code: "network_error",
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Badge tone={isPublished ? "green" : "default"}>
            {isPublished ? "Published" : "Private"}
          </Badge>
          <h2 className="mt-4 text-2xl font-black">Edit product</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Update the product details. Status changes (publish / make
            private / delete) live in the Produits tab kebab menu.
          </p>
        </div>
        <Link
          href="/dashboard?tab=products"
          className="inline-flex justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white"
        >
          Back to Produits
        </Link>
      </div>

      <form onSubmit={submit} className="mt-6 grid gap-5">
        <div className="grid gap-5 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold text-slate-200">
            Product name
            <input
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-300/50"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-200">
            Game
            <select
              value={form.game}
              onChange={(event) => update("game", event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-300/50"
              required
            >
              {gameOptions.map((game) => (
                <option key={game} value={game}>
                  {game}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-200">
            Category
            <select
              value={form.category}
              onChange={(event) => update("category", event.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-300/50"
              required
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-2 text-sm font-semibold text-slate-200">
          Website URL
          <input
            value={form.website_url}
            onChange={(event) => update("website_url", event.target.value)}
            placeholder="https://example.com"
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-300/50"
            type="url"
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-200">
          Short summary
          <textarea
            value={form.summary}
            onChange={(event) => update("summary", event.target.value)}
            className="min-h-28 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-300/50"
          />
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-200">
          Features
          <input
            value={form.features}
            onChange={(event) => update("features", event.target.value)}
            placeholder="Comma-separated, e.g. Anti-cheat, ESP, Aimbot"
            className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-300/50"
          />
          <span className="text-xs font-normal text-slate-500">
            Separate features with commas. Leave empty to clear.
          </span>
        </label>

        {error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <Link
            href={`/products/${product.slug}`}
            className="inline-flex justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
          >
            View public page
          </Link>
        </div>
      </form>
    </Card>
  );
}
