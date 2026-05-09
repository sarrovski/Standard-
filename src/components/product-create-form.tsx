"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui";
import { games } from "@/lib/data";

/**
 * Minimal create form. Four required fields. We save the product as a draft
 * via /api/seller/products, then push the user to the edit page where they
 * can flesh out images, features, price points, and SEO meta.
 */
export function ProductCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [game, setGame] = useState(games[0] ?? "Valorant");
  const [category, setCategory] = useState("Cheat");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          game,
          category: category.trim() || "Cheat",
          summary: summary.trim() || null,
        }),
      });
      const payload = (await response.json()) as {
        product?: { id: string; slug: string };
        error?: string;
      };
      if (!response.ok || !payload.product) {
        setError(payload.error ?? "Could not create product.");
        return;
      }
      // Soft replace so the back button doesn't put the user on a stale form.
      router.replace(`/dashboard/products/${payload.product.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-8 p-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Product name" required>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. PhantomX Tracker"
            disabled={busy}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400/50"
          />
        </Field>

        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Game" required>
            <select
              value={game}
              onChange={(event) => setGame(event.target.value)}
              disabled={busy}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-purple-400/50"
            >
              {games.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category" required>
            <input
              type="text"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="e.g. Cheat, Tracker, Spoofer"
              disabled={busy}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400/50"
            />
          </Field>
        </div>

        <Field label="Short summary">
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="One or two sentences a buyer will read first."
            rows={3}
            disabled={busy}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400/50"
          />
        </Field>

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Link
            href="/dashboard?tab=products"
            className="text-xs text-slate-500 hover:text-slate-300"
          >
            ← Back to products
          </Link>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create product"}
          </button>
        </div>
      </form>
    </Card>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="ml-1 text-purple-300">*</span>}
      </span>
      {children}
    </label>
  );
}
