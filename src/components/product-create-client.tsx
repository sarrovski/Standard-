"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { addLocalProduct, slugify } from "@/lib/product-store";
import { games, productCategories } from "@/lib/data";
import type { LocalProduct } from "@/lib/product-types";

type ProductCreateError = {
  error?: string;
  step?: string;
  code?: string;
  details?: string;
};

type ProductCreateResponse =
  | { product: { id: string; slug: string; name: string; status: string } }
  | ProductCreateError;

function formatCreateError(status: number | null, payload: ProductCreateError) {
  const pieces = [];
  if (status) pieces.push(`HTTP ${status}`);
  if (payload.step) pieces.push(payload.step);
  if (payload.code) pieces.push(payload.code);

  const prefix = pieces.length > 0 ? `${pieces.join(" / ")}: ` : "";
  const message = payload.error ?? "Could not create product.";
  const details = payload.details ? ` ${payload.details}` : "";
  return `${prefix}${message}${details}`;
}

function createDemoProduct(form: ProductCreateForm): LocalProduct {
  const slug = slugify(form.name) || `product-${Date.now()}`;
  return {
    slug,
    name: form.name,
    seller: "Demo Seller",
    sellerTag: "Seller",
    game: form.game,
    category: form.category,
    architecture: "Database-ready",
    productStatus: "Draft",
    integrity: null,
    confidence: "Pending",
    verifiedPayments: [],
    paymentProfiles: [],
    features: [],
    pricePoints: [],
    delivery: "Pending verification",
    refundPolicy: "Pending verification",
    accent: "from-orange-500/70 to-cyan-400/40",
    summary: form.summary,
    websiteUrl: "",
    websiteLabel: "Visit website",
    discord: "",
    telegram: "",
    trustSignals: ["Seller-submitted product"],
    gallery: [],
    benefits: ["Created in the Standard product flow"],
    faq: [
      {
        q: "What happens next?",
        a: "Add media from Produits, verify payment methods, then publish when ready.",
      },
    ],
    activity: { vouches: 0, views: 0, replies: 0, lastSeen: "Just created" },
  };
}

type ProductCreateForm = {
  name: string;
  game: string;
  category: string;
  summary: string;
};

export function ProductCreateClient({
  supabaseConfigured,
}: {
  supabaseConfigured: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProductCreateForm>({
    name: "",
    game: games[0] ?? "",
    category: productCategories[0] ?? "",
    summary: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (key: keyof ProductCreateForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.game.trim() || !form.category.trim()) {
      setError("Validation: product name, game, and category are required.");
      return;
    }

    if (!supabaseConfigured) {
      addLocalProduct(createDemoProduct(form));
      router.push("/dashboard?tab=products");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          game: form.game,
          category: form.category,
          summary: form.summary,
        }),
      });
      const payload = (await response.json()) as ProductCreateResponse;
      if (!response.ok) {
        setError(formatCreateError(response.status, payload as ProductCreateError));
        return;
      }
      router.push("/dashboard?tab=products");
    } catch (err) {
      setError(
        formatCreateError(null, {
          error: err instanceof Error ? err.message : "Network error.",
          step: "product_insert",
          code: "network_error",
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mt-8 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Badge tone="orange">Draft product</Badge>
          <h2 className="mt-4 text-2xl font-black">Create product</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Products start as drafts. Add media from Produits after creation,
            then publish when payment and trust details are ready.
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
              placeholder="Matrix Inter"
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
              {games.map((game) => (
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
              {productCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-2 text-sm font-semibold text-slate-200">
          Short summary
          <textarea
            value={form.summary}
            onChange={(event) => update("summary", event.target.value)}
            className="min-h-28 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-300/50"
            placeholder="rust most advanced cheat"
          />
        </label>

        {error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create product"}
          </button>
          <p className="text-xs text-slate-500">
            Drafts use status = draft and stay private until published.
          </p>
        </div>
      </form>
    </Card>
  );
}
