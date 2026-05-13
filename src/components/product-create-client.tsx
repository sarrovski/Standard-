"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { CategoryPicker } from "@/components/category-picker";
import { FeatureGroupsEditor } from "@/components/feature-groups-editor";
import { addLocalProduct, slugify } from "@/lib/product-store";
import { games, productCategories } from "@/lib/data";
import { flattenFeatureGroups, type FeatureGroup } from "@/lib/product-features";
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
    features: flattenFeatureGroups(form.feature_groups),
    pricePoints: [],
    delivery: "Pending verification",
    refundPolicy: "Pending verification",
    accent: "from-orange-500/70 to-cyan-400/40",
    summary: form.summary,
    websiteUrl: form.website_url,
    websiteLabel: form.website_url ? "Visit website" : "Visit website",
    discord: "",
    telegram: "",
    trustSignals: ["Seller-submitted product"],
    gallery: [],
    benefits: ["Created in the Standard product flow"],
    faq: [
      {
        q: "What happens next?",
        a: "Add media on the edit page, verify payment methods, then publish when ready.",
      },
    ],
    activity: { vouches: 0, views: 0, replies: 0, lastSeen: "Just created" },
  };
}

type ProductCreateForm = {
  name: string;
  game: string;
  category: string;
  website_url: string;
  summary: string;
  feature_groups: FeatureGroup[];
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
    website_url: "",
    summary: "",
    feature_groups: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = <K extends keyof ProductCreateForm>(
    key: K,
    value: ProductCreateForm[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.game.trim() || !form.category.trim()) {
      setError("Validation: product name, game, and category are required.");
      return;
    }

    const featureGroups = form.feature_groups
      .map((group) => ({
        name: group.name.trim(),
        features: group.features.map((f) => f.trim()).filter(Boolean),
      }))
      .filter((group) => group.name || group.features.length > 0);

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
          website_url: form.website_url || null,
          summary: form.summary || null,
          features_grouped: featureGroups,
        }),
      });
      const payload = (await response.json()) as ProductCreateResponse;
      if (!response.ok) {
        setError(formatCreateError(response.status, payload as ProductCreateError));
        return;
      }
      // Send the seller straight to the per-product edit page so they
      // can add images / YouTube links inline. Same form fields, plus
      // the media panel below.
      if ("product" in payload && payload.product?.id) {
        router.push(`/dashboard/products/${payload.product.id}/edit`);
      } else {
        router.push("/dashboard?tab=products");
      }
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
    <Card className="p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Badge tone="default">Private</Badge>
          <h2 className="mt-4 text-2xl font-black">Create product</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Same fields as the edit page. Save once and you'll land on the
            edit page, where you can add product images and YouTube videos.
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
        <div className="grid gap-5 md:grid-cols-2">
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
        </div>

        <CategoryPicker
          value={form.category}
          onChange={(category) => update("category", category)}
        />

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
            placeholder="rust most advanced cheat"
          />
        </label>

        <FeatureGroupsEditor
          value={form.feature_groups}
          onChange={(next) => update("feature_groups", next)}
        />

        {error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex justify-center rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create and add media"}
          </button>
          <p className="text-xs text-slate-500">
            Drafts stay private until you publish them from Produits.
          </p>
        </div>
      </form>
    </Card>
  );
}
