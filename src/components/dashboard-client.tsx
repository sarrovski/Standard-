"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui";
import {
  ConsolePanel,
  ConsoleStat,
  DashboardReadinessPanel,
  DashboardShell,
  DashboardWorkspace,
  type DashboardTabItem,
  type ReadinessItem,
} from "@/components/dashboard-console";
import {
  analytics,
  paymentMethods as paymentMethodsList,
  paymentVerificationQueue,
  providerTagRequests as demoProviderTagRequests,
  sellerProducts as demoSellerProducts,
  trafficSources,
} from "@/lib/data";
import {
  addPaymentRequest,
  getLocalProducts,
  getPaymentRequests,
  saveLocalProducts,
} from "@/lib/product-store";
import type {
  LocalPaymentRequest,
  LocalProduct,
} from "@/lib/product-types";
import type { PaymentMethod } from "@/lib/data";
import type {
  UIProductMedia,
  UISellerPaymentMethodOption,
  UISellerPaymentRequest,
  UISellerProductCard,
  UISellerProviderTagStatus,
  UISellerSubscription,
} from "@/lib/adapters";
import { PaymentPill, PaymentStatusPill } from "@/components/payment-pill";

const tabs: DashboardTabItem[] = [
  {
    key: "products",
    label: "Produits",
    eyebrow: "Catalog",
    title: "Product control center",
    description: "Manage product status, media, and public page readiness without changing how publishing works.",
    icon: "box",
  },
  {
    key: "payments",
    label: "Payment Verification",
    eyebrow: "Trust",
    title: "Payment verification console",
    description: "Submit payment proof and review method statuses. Only verified methods appear publicly.",
    icon: "shield",
  },
  {
    key: "analytics",
    label: "Analytics",
    eyebrow: "Signals",
    title: "Performance snapshot",
    description: "A compact read-only view of the seller metrics currently available in Standard.",
    icon: "chart",
  },
  {
    key: "verification",
    label: "Provider Tag",
    eyebrow: "Seller tag",
    title: "Provider / Developer tag",
    description: "Request the seller tag for manual admin review. This is not a role or automatic guarantee.",
    icon: "badge",
  },
  {
    key: "billing",
    label: "Billing",
    eyebrow: "Plan",
    title: "Billing and visibility",
    description: "Open billing and Featured visibility controls without changing any Stripe routes.",
    icon: "billing",
  },
];

const VALID_TAB_KEYS = new Set(tabs.map((t) => t.key));
const DEFAULT_TAB = "products";

/**
 * Aliases let people land on /dashboard?tab=payment-verification or
 * /dashboard?tab=provider-tag (the human-readable slugs from the tab
 * labels) and end up on the right panel. Retired demo tabs intentionally
 * fall back to Produits so old links keep landing somewhere useful.
 */
const TAB_ALIASES: Record<string, string> = {
  builder: "products",
  offers: "products",
  "payment-verification": "payments",
  "provider-tag": "verification",
  produits: "products",
};

function normalizeTab(candidate: string | null | undefined): string {
  if (!candidate) return DEFAULT_TAB;
  const aliased = TAB_ALIASES[candidate] ?? candidate;
  if (VALID_TAB_KEYS.has(aliased)) return aliased;
  return DEFAULT_TAB;
}

function toRawProductStatus(status: string): "draft" | "published" | "archived" {
  const normalized = status.toLowerCase();
  if (normalized === "published") return "published";
  if (normalized === "archived") return "archived";
  return "draft";
}

function productStatusLabel(status: "draft" | "published" | "archived") {
  if (status === "published") return "Published";
  if (status === "archived") return "Archived";
  return "Draft";
}

function getActiveTab(key: string) {
  return tabs.find((item) => item.key === key) ?? tabs[0]!;
}

function buildReadinessItems({
  supabaseSourced,
  products,
  paymentRequests,
  providerTagStatus,
  subscription,
}: {
  supabaseSourced: boolean;
  products: UISellerProductCard[];
  paymentRequests: UISellerPaymentRequest[];
  providerTagStatus: UISellerProviderTagStatus;
  subscription: UISellerSubscription | null;
}): ReadinessItem[] {
  if (!supabaseSourced) {
    return [
      {
        label: "Demo fallback",
        detail: "Dashboard remains usable when Supabase env vars are absent.",
        complete: true,
      },
      {
        label: "Create a product",
        detail: "Local demo product creation uses the existing draft flow.",
        complete: true,
      },
      {
        label: "Payment verification",
        detail: "Connect Supabase to submit real seller verification requests.",
        complete: false,
      },
      {
        label: "Provider tag",
        detail: "Provider / Developer remains a seller tag reviewed by admins.",
        complete: false,
      },
    ];
  }

  return [
    {
      label: "Create a product",
      detail: products.length > 0 ? `${products.length} product records found.` : "Create a product draft first.",
      complete: products.length > 0,
    },
    {
      label: "Add product media",
      detail: "Images help buyers inspect the product before leaving Standard.",
      complete: products.some((product) => product.mediaAssets > 0 || (product.media ?? []).length > 0),
    },
    {
      label: "Submit payment verification",
      detail: paymentRequests.length > 0 ? "Payment proof has been submitted for review." : "Verified methods are the only methods shown publicly.",
      complete: paymentRequests.length > 0,
    },
    {
      label: "Request Provider / Developer tag",
      detail: providerTagStatus === "Not requested" ? "Optional seller tag; admin review is manual." : `Current request status: ${providerTagStatus}.`,
      complete: providerTagStatus !== "Not requested",
    },
    {
      label: "Configure billing",
      detail: subscription ? `Subscription status: ${subscription.status}.` : "Open Billing when you are ready to manage plan details.",
      complete: Boolean(subscription),
    },
  ];
}

/**
 * `initialData`:
 *   - non-null => Supabase-sourced (server fetched). Demo product-store is
 *     ignored. Writes flow through the /api/seller/* routes.
 *   - null     => demo mode. Existing in-memory product-store + data.ts.
 */
export type DashboardInitialData = {
  products: UISellerProductCard[];
  paymentRequests: UISellerPaymentRequest[];
  providerTagStatus: UISellerProviderTagStatus;
  sellerName: string;
  paymentMethods: UISellerPaymentMethodOption[];
  subscription: UISellerSubscription | null;
} | null;

type DashboardClientProps = {
  initialTab?: string;
  initialData: DashboardInitialData;
};

export function DashboardClient({
  initialTab = DEFAULT_TAB,
  initialData,
}: DashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Keep a local active-tab state. We seed it from the prop (which the
  // server component derives from searchParams) for SSR/hydration parity,
  // then keep it synced with searchParams on subsequent client-side
  // navigations. This is the bug fix: previously the state was only set
  // once at mount, so clicking a tab updated the URL but not the visible
  // panel — only a full reload would re-mount the component with the new
  // initialTab.
  const [tab, setTab] = useState<string>(() => normalizeTab(initialTab));

  useEffect(() => {
    const next = normalizeTab(searchParams.get("tab"));
    setTab((prev) => (prev === next ? prev : next));
  }, [searchParams]);

  const handleTabClick = (key: string) => {
    // Optimistically update the visible panel before the URL change
    // round-trips through the router. router.replace updates the URL
    // without adding a history entry per click — clicks within the
    // dashboard read more like in-page nav than route navigation.
    setTab(key);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", key);
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  };

  const supabaseSourced = initialData !== null;
  const activeTab = getActiveTab(tab);
  const sellerName = initialData?.sellerName || (supabaseSourced ? "Pending seller" : "Demo seller");
  const subscriptionLabel = initialData?.subscription
    ? `${initialData.subscription.status} plan`
    : supabaseSourced
      ? "Plan pending"
      : "Demo mode";
  const readinessItems = buildReadinessItems({
    supabaseSourced,
    products: initialData?.products ?? [],
    paymentRequests: initialData?.paymentRequests ?? [],
    providerTagStatus: initialData?.providerTagStatus ?? "Not requested",
    subscription: initialData?.subscription ?? null,
  });

  return (
    <DashboardShell
      tabs={tabs}
      active={tab}
      sellerName={sellerName}
      supabaseSourced={supabaseSourced}
      subscriptionLabel={subscriptionLabel}
      onSelect={handleTabClick}
    >
      <DashboardWorkspace
        activeTab={activeTab}
        aside={<DashboardReadinessPanel title="Product readiness" items={readinessItems} />}
      >
        {tab === "products" && (
          <Products
            supabaseSourced={supabaseSourced}
            initialProducts={initialData?.products ?? null}
            initialPaymentRequests={initialData?.paymentRequests ?? null}
          />
        )}
        {tab === "payments" && (
          <Payments
            supabaseSourced={supabaseSourced}
            initialRequests={initialData?.paymentRequests ?? null}
            initialProducts={initialData?.products ?? null}
            paymentMethods={initialData?.paymentMethods ?? []}
          />
        )}
        {tab === "analytics" && <Analytics />}
        {tab === "verification" && (
          <Verification
            supabaseSourced={supabaseSourced}
            initialStatus={initialData?.providerTagStatus ?? "Not requested"}
          />
        )}
        {tab === "billing" && <Billing />}
      </DashboardWorkspace>
    </DashboardShell>
  );
}

// =========================================================================
// Per-product media upload + thumbnails (Supabase mode only)
// =========================================================================

function ProductMediaPanel({
  productId,
  initialMedia,
}: {
  productId: string;
  initialMedia: UIProductMedia[];
}) {
  const [media, setMedia] = useState<UIProductMedia[]>(initialMedia);
  const [altText, setAltText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);
  // Tracks the most recent successful upload so we can mark it as "Saved"
  // briefly. Auto-clears after a few seconds so the badge doesn't stick on
  // older items forever.
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (!savedNotice) return;
    const timeout = window.setTimeout(() => {
      setSavedNotice(false);
      setLastSavedId(null);
    }, 4000);
    return () => window.clearTimeout(timeout);
  }, [savedNotice]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset the input so the same file can be re-selected later if needed.
    event.target.value = "";
    if (!file) return;
    setError(null);
    setSavedNotice(false);
    setLastSavedId(null);

    const formData = new FormData();
    formData.append("file", file);
    if (altText.trim()) formData.append("alt_text", altText.trim());

    setBusy(true);
    try {
      const response = await fetch(`/api/seller/products/${productId}/media`, {
        method: "POST",
        body: formData,
      });
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
        code?: string;
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
      setMedia((prev) => [
        ...prev,
        {
          id: uploaded.id,
          storagePath: uploaded.storage_path,
          publicUrl: uploaded.public_url,
          altText: uploaded.alt_text,
          sortOrder: uploaded.sort_order,
        },
      ]);
      setAltText("");
      setLastSavedId(uploaded.id);
      setSavedNotice(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (mediaId: string) => {
    setBusyDeleteId(mediaId);
    setError(null);
    try {
      const response = await fetch(`/api/seller/products/${productId}/media`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media_id: mediaId }),
      });
      const payload = (await response.json()) as {
        error?: string;
        step?: string;
        code?: string;
      };
      if (response.status >= 400 && response.status !== 207) {
        const stepLabel = payload.step ? `[${payload.step}] ` : "";
        setError(`${stepLabel}${payload.error ?? "Delete failed."}`);
        return;
      }
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusyDeleteId(null);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Media
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Uploaded image assets stay attached to this product.
          </p>
        </div>
        <Badge tone="cyan">{media.length} images</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {media.map((m) => {
          const isJustSaved = m.id === lastSavedId;
          return (
            <div
              key={m.id}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/40 aspect-square"
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
        {media.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-xs text-slate-500">
            No media yet.
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Alt text (optional)
          </span>
          <input
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            placeholder="Describe the image"
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none transition focus:border-purple-300/40"
          />
        </label>
        <label
          className={`inline-flex cursor-pointer items-center justify-center rounded-xl border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-xs font-semibold text-purple-200 transition hover:border-purple-300/50 hover:bg-purple-500/15 ${
            busy ? "opacity-60" : ""
          }`}
        >
          {busy ? "Uploading..." : "Upload image"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleUpload}
            disabled={busy}
            className="hidden"
          />
        </label>
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        Images are saved automatically as soon as they upload - no extra
        step needed.
      </p>

      {savedNotice && (
        <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-2 text-xs text-emerald-100">
          Image uploaded and saved.
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 p-2 text-xs text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// Produits tab
// =========================================================================

function Products({
  supabaseSourced,
  initialProducts,
  initialPaymentRequests,
}: {
  supabaseSourced: boolean;
  initialProducts: UISellerProductCard[] | null;
  initialPaymentRequests: UISellerPaymentRequest[] | null;
}) {
  const [demoProductsList, setDemoProducts] = useState<LocalProduct[]>([]);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (supabaseSourced) return;
    setDemoProducts(getLocalProducts());
  }, [supabaseSourced]);

  const displayProducts = useMemo(() => {
    if (supabaseSourced) {
      return initialProducts ?? [];
    }
    const localCards = demoProductsList.map((product) => {
      const rawStatus = toRawProductStatus(product.productStatus);
      return {
        id: product.slug, // demo: no real UUID, slug doubles as id
        slug: product.slug,
        name: product.name,
        status: productStatusLabel(rawStatus),
        rawStatus,
        toolStatus: "Demo draft / database-ready",
        game: product.game,
        category: product.category,
        features: product.features,
        views: product.activity.views,
        outboundClicks: 0,
        outboundCtr: "0%",
        integrity: String(product.integrity ?? "Pending"),
        pageTemplate: "Hero Spotlight",
        mediaAssets: product.gallery.length,
        website: product.websiteUrl.replace("https://", ""),
        nextAction:
          rawStatus === "draft"
            ? "Publish locally when the product is ready"
            : rawStatus === "published"
              ? "Confirm public page and payment verification"
              : "Restore to draft before publishing again",
        media: [],
      };
    });
    return [
      ...localCards,
      ...demoSellerProducts.map((item) => ({
        ...item,
        id: "phantomx-tracker",
        slug: "phantomx-tracker",
        status: "Published",
        category: "Analytics / Overlay",
        rawStatus: "published" as const,
        media: [],
      })),
    ];
  }, [supabaseSourced, initialProducts, demoProductsList]);

  const paymentRequestsBySlug = useMemo(() => {
    const requests = initialPaymentRequests ?? [];
    return new Map(
      requests
        .filter((request) => request.productSlug)
        .map((request) => [request.productSlug!, request.status]),
    );
  }, [initialPaymentRequests]);

  // Real publish/archive (Supabase mode only). On success we reload the page
  // so server-side initialData reflects the change. A finer-grained client
  // refresh (router.refresh) would also work but reload keeps logic simple.
  const updateProductStatus = async (
    productId: string,
    nextStatus: "published" | "archived" | "draft",
  ) => {
    if (!supabaseSourced) {
      const nextLabel = productStatusLabel(nextStatus);
      setDemoProducts((current) => {
        const updated = current.map((product) =>
          product.slug === productId
            ? { ...product, productStatus: nextLabel }
            : product,
        );
        saveLocalProducts(updated);
        return updated;
      });
      return;
    }
    setActionError(null);
    setBusyProductId(productId);
    try {
      const response = await fetch("/api/seller/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productId, status: nextStatus }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setActionError(payload.error ?? "Could not update product status.");
        return;
      }
      // Reload the dashboard so the product list reflects the change.
      window.location.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusyProductId(null);
    }
  };

  const archiveProduct = async (productId: string, productName: string) => {
    if (!supabaseSourced) {
      await updateProductStatus(productId, "archived");
      return;
    }
    const confirmed = window.confirm(
      `Archive "${productName}"? It will be removed from the public marketplace, but its product record and media will remain saved.`,
    );
    if (!confirmed) return;
    await updateProductStatus(productId, "archived");
  };

  const publishedCount = displayProducts.filter((product) => product.rawStatus === "published").length;
  const draftCount = displayProducts.filter((product) => product.rawStatus === "draft").length;
  const mediaCount = displayProducts.reduce((total, product) => total + product.mediaAssets, 0);

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-4">
        <ConsoleStat
          label="Products"
          value={String(displayProducts.length)}
          detail={supabaseSourced ? "from Supabase" : "demo + database-ready"}
        />
        <ConsoleStat label="Published" value={String(publishedCount)} detail="public visibility" />
        <ConsoleStat label="Drafts" value={String(draftCount)} detail="private workspace" />
        <ConsoleStat label="Media assets" value={String(mediaCount)} detail="attached images" />
      </section>

      <ConsolePanel className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black">Products workspace</h2>
            <p className="mt-1 text-sm text-slate-400">
              Draft, publish, archive, restore, and manage media for your products.
            </p>
          </div>
          <Link
            href="/dashboard/products/new"
            className="inline-flex justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold"
          >
            Create product
          </Link>
        </div>

        {actionError && (
          <div className="border-b border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
            {actionError}
          </div>
        )}

        <div className="grid gap-3 p-3">
          {displayProducts.length === 0 && (
            <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] p-6 text-sm text-slate-500">
              No products yet. Create a product to start building your catalog.
            </p>
          )}
          {displayProducts.map((product) => {
            const coverUrl = product.media?.find((item) => item.publicUrl)?.publicUrl ?? null;
            const paymentStatus = paymentRequestsBySlug.get(product.slug) ?? "Not submitted";
            const statusLabel = productStatusLabel(product.rawStatus);
            const canUpdateStatus =
              supabaseSourced || demoProductsList.some((item) => item.slug === product.slug);
            return (
              <div
                key={product.slug + product.name}
                className="rounded-3xl border border-white/10 bg-white/[0.025] p-4"
              >
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-start">
                  <div className="flex min-w-0 gap-4">
                    <div className="h-24 w-24 flex-none overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
                      {coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={coverUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-end bg-gradient-to-br from-cyan-500/25 via-purple-500/25 to-fuchsia-500/20 p-3">
                          <span className="text-xs font-black text-white/80">STD</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-xl font-black">{product.name}</h3>
                        <Badge tone={product.rawStatus === "published" ? "green" : "amber"}>
                          {statusLabel}
                        </Badge>
                        <Badge tone="cyan">{product.mediaAssets} media</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {product.game} / {product.category} / {product.website}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-slate-950/45 px-3 py-1 text-xs text-slate-300">
                          Payment: {paymentStatus}
                        </span>
                        <span className="rounded-full border border-white/10 bg-slate-950/45 px-3 py-1 text-xs text-slate-300">
                          {product.toolStatus}
                        </span>
                        <span className="rounded-full border border-white/10 bg-slate-950/45 px-3 py-1 text-xs text-slate-300">
                          Trust score: {product.integrity}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {product.features.slice(0, 4).map((feature) => (
                          <span
                            key={feature}
                            className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-slate-400"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Link
                      href={`/products/${product.slug}`}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-semibold transition hover:border-cyan-300/30"
                    >
                      View public page
                    </Link>
                    {canUpdateStatus && product.rawStatus === "draft" && (
                      <button
                        onClick={() => updateProductStatus(product.id, "published")}
                        disabled={busyProductId === product.id}
                        className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-center text-sm font-semibold text-emerald-200 disabled:opacity-60"
                      >
                        {busyProductId === product.id ? "Publishing…" : "Publish"}
                      </button>
                    )}
                    {canUpdateStatus && product.rawStatus !== "archived" && (
                      <button
                        onClick={() => archiveProduct(product.id, product.name)}
                        disabled={busyProductId === product.id}
                        className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-center text-sm font-semibold text-red-200 disabled:opacity-60"
                      >
                        {busyProductId === product.id ? "Archiving…" : "Archive product"}
                      </button>
                    )}
                    {canUpdateStatus && product.rawStatus === "archived" && (
                      <button
                        onClick={() => updateProductStatus(product.id, "draft")}
                        disabled={busyProductId === product.id}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-semibold disabled:opacity-60"
                      >
                        {busyProductId === product.id ? "Restoring…" : "Restore to draft"}
                      </button>
                    )}
                    <div className="rounded-xl border border-white/10 bg-slate-950/35 px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Next action
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-300">
                        {product.nextAction}
                      </div>
                    </div>
                  </div>
                </div>
                {supabaseSourced && (
                  <ProductMediaPanel
                    productId={product.id}
                    initialMedia={product.media ?? []}
                  />
                )}
              </div>
            );
          })}
        </div>
      </ConsolePanel>
    </div>
  );
}

// =========================================================================
// Payment Verification tab
// =========================================================================

function Payments({
  supabaseSourced,
  initialRequests,
  initialProducts,
  paymentMethods,
}: {
  supabaseSourced: boolean;
  initialRequests: UISellerPaymentRequest[] | null;
  initialProducts: UISellerProductCard[] | null;
  paymentMethods: UISellerPaymentMethodOption[];
}) {
  // Demo state
  const [demoRequests, setDemoRequests] = useState<LocalPaymentRequest[]>([]);
  const [demoProducts, setDemoProducts] = useState<LocalProduct[]>([]);

  // Form state — used in both modes; in Supabase mode we send IDs, in demo
  // mode we send the same labels we always used.
  const [demoMethod, setDemoMethod] = useState<PaymentMethod>("Card");
  const [productSelection, setProductSelection] = useState(""); // slug (demo) | id (supabase)
  const [paymentMethodId, setPaymentMethodId] = useState<string>("");
  const [processor, setProcessor] = useState("Stripe");
  const [checkoutUrl, setCheckoutUrl] = useState("https://example.com/checkout");
  const [proofUrl, setProofUrl] = useState("");
  const [sellerNotes, setSellerNotes] = useState("Payment method visible at checkout.");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState<string | null>(null);

  // Local copy of the requests list so the UI updates immediately after submit
  // without a full page reload. Initial value depends on which mode we're in.
  const [supabaseRequests, setSupabaseRequests] = useState<UISellerPaymentRequest[]>(
    initialRequests ?? [],
  );

  useEffect(() => {
    if (supabaseSourced) return;
    setDemoProducts(getLocalProducts());
    setDemoRequests(getPaymentRequests());
  }, [supabaseSourced]);

  // Default the payment method dropdown to the first option in Supabase mode.
  useEffect(() => {
    if (!supabaseSourced) return;
    if (!paymentMethodId && paymentMethods.length > 0) {
      const first = paymentMethods[0];
      if (first) setPaymentMethodId(first.id);
    }
  }, [supabaseSourced, paymentMethods, paymentMethodId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitOk(null);

    if (!supabaseSourced) {
      const product =
        demoProducts.find((item) => item.slug === productSelection) || demoProducts[0];
      if (!product) {
        setSubmitError("Create a product first.");
        return;
      }
      const request: LocalPaymentRequest = {
        id: crypto.randomUUID(),
        seller: product.seller,
        productSlug: product.slug,
        productName: product.name,
        method: demoMethod,
        processor,
        checkoutUrl,
        refundPolicy: "—",
        proofNote: sellerNotes,
        status: "Pending verification",
        risk:
          demoMethod === "Gift Cards" || demoMethod === "PayPal F&F"
            ? "High"
            : demoMethod === "Crypto"
              ? "Medium"
              : "Low",
        createdAt: new Date().toISOString(),
      };
      addPaymentRequest(request);
      setDemoRequests([request, ...demoRequests]);
      setSubmitOk("Submitted. Admin will review.");
      return;
    }

    // Supabase path: submit real UUIDs.
    if (!productSelection) {
      setSubmitError("Select a product.");
      return;
    }
    if (!paymentMethodId) {
      setSubmitError("Select a payment method.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/seller/payment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productSelection,
          payment_method_id: paymentMethodId,
          external_proof_url: proofUrl || checkoutUrl || undefined,
          seller_notes: sellerNotes || undefined,
        }),
      });
      const payload = (await response.json()) as { error?: string; request?: { id: string } };
      if (!response.ok) {
        setSubmitError(payload.error ?? "Could not submit payment verification.");
        return;
      }

      // Optimistic UI update: prepend a local row so the seller sees their
      // submission immediately without reloading. Look up the names from our
      // existing options to render correctly.
      const product = (initialProducts ?? []).find((p) => p.id === productSelection);
      const method = paymentMethods.find((m) => m.id === paymentMethodId);
      if (product && method && payload.request) {
        const optimistic: UISellerPaymentRequest = {
          id: payload.request.id,
          productName: product.name,
          productSlug: product.slug,
          method: method.name as PaymentMethod,
          status: "Pending verification",
          proofNote: sellerNotes || proofUrl || "—",
        };
        setSupabaseRequests((prev) => [optimistic, ...prev]);
      }

      setSubmitOk("Submitted. Admin will review.");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const requestsToShow = supabaseSourced
    ? supabaseRequests
    : [
        ...demoRequests.map((r) => ({
          id: r.id,
          productName: r.productName,
          productSlug: r.productSlug,
          method: r.method,
          status: r.status,
          proofNote: r.proofNote,
        })),
        ...paymentVerificationQueue.map((r) => ({
          id: r.seller + r.product + r.method,
          productName: r.product,
          productSlug: null,
          method: r.method,
          status: r.status,
          proofNote: r.submittedProof,
        })),
      ];

  return (
    <div className="space-y-6">
      <ConsolePanel className="p-6">
        <Badge tone="cyan">Payment verification</Badge>
        <h2 className="mt-4 text-2xl font-black">Prove the payment methods you accept</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Payment methods stay private or under review until admin approves them. Only verified
          methods appear on your public product page and in marketplace filters.
        </p>
      </ConsolePanel>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <ConsolePanel className="p-6">
          <h2 className="text-2xl font-black">Add payment method</h2>
          {supabaseSourced && (initialProducts?.length ?? 0) === 0 && (
            <p className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              You don't have any products yet. Create a product before submitting payment proof.
            </p>
          )}
          {supabaseSourced && paymentMethods.length === 0 && (
            <p className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              No payment methods are configured in the database. Ask an admin to seed
              public.payment_methods.
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
            <label className="block rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <span className="text-xs text-slate-500">Product</span>
              <select
                value={productSelection}
                onChange={(event) => setProductSelection(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
              >
                <option value="">Select…</option>
                {supabaseSourced
                  ? (initialProducts ?? []).map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))
                  : demoProducts.map((product) => (
                      <option key={product.slug} value={product.slug}>
                        {product.name}
                      </option>
                    ))}
              </select>
            </label>

            <label className="block rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <span className="text-xs text-slate-500">Payment method</span>
              {supabaseSourced ? (
                <select
                  value={paymentMethodId}
                  onChange={(event) => setPaymentMethodId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
                >
                  <option value="">Select…</option>
                  {paymentMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={demoMethod}
                  onChange={(event) => setDemoMethod(event.target.value as PaymentMethod)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
                >
                  {paymentMethods.length === 0 &&
                    paymentMethodsList.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  {paymentMethods.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              )}
            </label>

            <DashboardTextInput label="Processor / account label" value={processor} onChange={setProcessor} />
            <DashboardTextInput label="Checkout URL" value={checkoutUrl} onChange={setCheckoutUrl} />
            <DashboardTextInput label="Proof URL (optional)" value={proofUrl} onChange={setProofUrl} />
            <DashboardTextInput label="Seller notes" value={sellerNotes} onChange={setSellerNotes} />

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit payment verification"}
            </button>
            {submitError && (
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
                {submitError}
              </div>
            )}
            {submitOk && (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                {submitOk}
              </div>
            )}
          </form>
        </ConsolePanel>

        <ConsolePanel className="p-6">
          <h2 className="text-2xl font-black">Your payment status</h2>
          <div className="mt-5 space-y-3">
            {requestsToShow.length === 0 && (
              <p className="text-sm text-slate-500">No payment verification requests yet.</p>
            )}
            {requestsToShow.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <PaymentPill method={item.method} />
                  <PaymentStatusPill status={item.status} />
                </div>
                <div className="mt-3 text-sm font-semibold">{item.productName}</div>
                <div className="mt-1 text-xs text-slate-500">{item.proofNote}</div>
              </div>
            ))}
          </div>
        </ConsolePanel>
      </section>
    </div>
  );
}

// =========================================================================
// Analytics tab — read-only, demo data only for this batch
// =========================================================================

function Analytics() {
  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <ConsolePanel className="p-6">
        <Badge tone="green">Analytics</Badge>
        <h2 className="mt-4 text-2xl font-black">Performance</h2>
        <p className="mt-2 text-sm text-slate-500">
          Real analytics integration comes after the storage / events tracking batch.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {analytics.map((item) => (
            <ConsoleStat key={item.label} label={item.label} value={item.value} detail={item.change} />
          ))}
        </div>
      </ConsolePanel>
      <ConsolePanel className="p-6">
        <h2 className="text-2xl font-black">Traffic sources</h2>
        <div className="mt-6 space-y-4">
          {trafficSources.map(([source, share]) => (
            <div key={source}>
              <div className="flex justify-between text-sm">
                <span>{source}</span>
                <span>{share}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-purple-400"
                  style={{ width: `${share}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </ConsolePanel>
    </section>
  );
}

// =========================================================================
// Provider Tag tab
// =========================================================================

function Verification({
  supabaseSourced,
  initialStatus,
}: {
  supabaseSourced: boolean;
  initialStatus: UISellerProviderTagStatus;
}) {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [discord, setDiscord] = useState("");
  const [telegram, setTelegram] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<UISellerProviderTagStatus>(initialStatus);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setOk(null);

    if (!supabaseSourced) {
      setOk("Demo: request not actually submitted. Connect Supabase to make this real.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/seller/provider-tag-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website_url: websiteUrl || undefined,
          discord_handle: discord || undefined,
          telegram_handle: telegram || undefined,
          proof_url: proofUrl || undefined,
          seller_notes: notes || undefined,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Could not submit provider tag request.");
        return;
      }
      setOk("Submitted. Admin will review.");
      setCurrentStatus("Pending");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <ConsolePanel className="p-6">
        <Badge tone="purple">Provider tag request</Badge>
        <h2 className="mt-4 text-2xl font-black">Request Provider / Developer tag</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          If you are the official developer or provider, submit your public proof here. Admin
          reviews requests manually.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <DashboardTextInput label="Website URL" value={websiteUrl} onChange={setWebsiteUrl} />
          <DashboardTextInput label="Discord handle" value={discord} onChange={setDiscord} />
          <DashboardTextInput label="Telegram handle" value={telegram} onChange={setTelegram} />
          <DashboardTextInput label="Proof URL (optional)" value={proofUrl} onChange={setProofUrl} />
          <DashboardTextInput label="Notes for admin" value={notes} onChange={setNotes} />
          <button
            type="submit"
            disabled={submitting || currentStatus === "Pending"}
            className="rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {currentStatus === "Pending"
              ? "Request pending review"
              : submitting
                ? "Submitting…"
                : "Submit provider tag request"}
          </button>
          {error && (
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}
          {ok && (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              {ok}
            </div>
          )}
        </form>
      </ConsolePanel>

      <ConsolePanel className="p-6">
        <h2 className="text-2xl font-black">Status</h2>
        <div className="mt-5 space-y-3">
          {supabaseSourced ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold">Your request</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {currentStatus === "Not requested"
                      ? "You haven't requested the tag yet."
                      : `Latest status from Supabase.`}
                  </div>
                </div>
                <Badge
                  tone={
                    currentStatus === "Approved"
                      ? "green"
                      : currentStatus === "Pending"
                        ? "amber"
                        : currentStatus === "Rejected"
                          ? "red"
                          : "default"
                  }
                >
                  {currentStatus}
                </Badge>
              </div>
            </div>
          ) : (
            demoProviderTagRequests.map((request) => (
              <div
                key={request.seller + request.product}
                className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-bold">{request.product}</div>
                    <div className="mt-1 text-xs text-slate-500">{request.seller}</div>
                  </div>
                  <Badge tone={request.status === "Approved" ? "green" : "amber"}>
                    {request.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </ConsolePanel>
    </section>
  );
}

// =========================================================================
// Billing tab — placeholder pointing at Stripe
// =========================================================================

function Billing() {
  return (
    <ConsolePanel className="p-6">
      <Badge tone="purple">Billing</Badge>
      <h2 className="mt-4 text-2xl font-black">Subscription, billing portal, and featured slots</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Everything money-related lives on a dedicated page so it stays organized.
        From there you can review your subscription, open the Stripe customer
        portal, and reserve a featured slot for one of your published products.
      </p>
      <Link
        href="/dashboard/billing"
        className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white"
      >
        Open billing
      </Link>
      <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm leading-6 text-slate-400">
        Billing is the only place to open the Stripe customer portal or reserve
        Featured visibility. Plans remains the only place to start a seller
        subscription.
      </div>
    </ConsolePanel>
  );
}

// =========================================================================
// Shared bits
// =========================================================================

function DashboardTextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-300/40"
      />
    </label>
  );
}
