"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, Card, MiniStat } from "@/components/ui";
import {
  paymentMethods as paymentMethodsList,
  paymentVerificationQueue,
  providerTagRequests as demoProviderTagRequests,
  sellerProducts as demoSellerProducts,
} from "@/lib/data";
import {
  addPaymentRequest,
  getLocalProducts,
  getPaymentRequests,
} from "@/lib/product-store";
import type {
  LocalPaymentRequest,
  LocalProduct,
} from "@/lib/product-types";
import type { PaymentMethod } from "@/lib/data";
import type {
  UISellerPaymentMethodOption,
  UISellerPaymentRequest,
  UISellerProductCard,
  UISellerProviderTagStatus,
  UISellerSubscription,
} from "@/lib/adapters";
import { PaymentPill, PaymentStatusPill } from "@/components/payment-pill";
import { RankingPill } from "@/components/product-ranking-ui";
import {
  evaluateProductRanking,
  type RankingInput,
} from "@/lib/product-ranking";
import { groupsFromFlatFeatures } from "@/lib/product-features";
import { SellerAnalytics } from "@/components/seller-analytics";
import {
  SellerReviewsTab,
  type SellerReview,
} from "@/components/seller-reviews-tab";

const tabs = [
  { key: "products", label: "Produits" },
  { key: "payments", label: "Payment Verification" },
  { key: "analytics", label: "Analytics" },
  { key: "reviews", label: "Reviews" },
  { key: "verification", label: "Provider Tag" },
  { key: "billing", label: "Billing" },
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

/**
 * Vertical sidebar nav for the seller dashboard. Sits on the left at
 * lg+ widths and stacks above the active panel on small screens.
 *
 * The parent owns both the active-tab state and the URL update — clicks
 * call `onSelect`, which keeps the visible panel and `?tab=` in sync
 * without a full reload.
 */
function DashboardSidebar({
  items,
  active,
  onSelect,
  sellerName,
  supabaseSourced,
  hasProducts,
}: {
  items: Array<{ key: string; label: string }>;
  active: string;
  onSelect: (key: string) => void;
  sellerName: string | null;
  supabaseSourced: boolean;
  hasProducts: boolean;
}) {
  const statusLabel = !supabaseSourced
    ? "Demo"
    : hasProducts
      ? "Live"
      : "Pending";
  const statusTone: "default" | "green" | "amber" =
    statusLabel === "Live" ? "green" : statusLabel === "Pending" ? "amber" : "default";

  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-black text-white">
            {(sellerName?.[0] ?? "S").toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">
              {sellerName ?? "Dashboard"}
            </div>
            <div className="mt-1">
              <Badge tone={statusTone}>{statusLabel}</Badge>
            </div>
          </div>
        </div>
      </div>

      <nav className="mt-4 grid gap-1 rounded-2xl border border-white/10 bg-white/[0.02] p-2">
        {items.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={
                "flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition " +
                (isActive
                  ? "bg-orange-500/15 text-white"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-white")
              }
              aria-pressed={isActive}
            >
              <span
                aria-hidden="true"
                className={
                  "h-4 w-1 rounded-full transition " +
                  (isActive ? "bg-orange-400" : "bg-transparent")
                }
              />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
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
  /** Count of verified payment methods on the seller's profile (seller-level). */
  verifiedPaymentMethodCount: number;
  /** Community reviews on this seller's products, any status. */
  reviews: SellerReview[];
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
  const hasProducts = (initialData?.products?.length ?? 0) > 0;

  // Shared merged product list — fed to the Produits tab and the Analytics
  // tab so they always agree on which products exist. In Supabase mode this
  // is just the server-loaded list; in demo mode we merge data.ts demos with
  // the localStorage-backed product builder.
  const [demoLocalProducts, setDemoLocalProducts] = useState<LocalProduct[]>([]);
  useEffect(() => {
    if (supabaseSourced) return;
    setDemoLocalProducts(getLocalProducts());
  }, [supabaseSourced]);

  const analyticsProducts = useMemo<UISellerProductCard[]>(() => {
    if (supabaseSourced) return initialData?.products ?? [];
    const localCards: UISellerProductCard[] = demoLocalProducts.map((product) => ({
      id: product.slug,
      slug: product.slug,
      name: product.name,
      status: product.productStatus,
      rawStatus: "draft" as const,
      toolStatus: "Draft / database-ready",
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
      nextAction: "Submit for review and verify payment methods",
      media: [],
      summary: product.summary,
      featureGroups: groupsFromFlatFeatures(product.features),
      faq: product.faq.map((item) => ({ q: item.q, a: item.a })),
      websiteUrl: product.websiteUrl,
    }));
    const fromSellerProducts: UISellerProductCard[] = demoSellerProducts.map(
      (item) => {
        const slug = item.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        return {
          ...item,
          id: slug,
          slug,
          category: "Analytics / Overlay",
          rawStatus: "published" as const,
          media: [],
          summary: "",
          featureGroups: groupsFromFlatFeatures(item.features),
          faq: [],
          websiteUrl: `https://${item.website}`,
        };
      },
    );
    return [...localCards, ...fromSellerProducts];
  }, [supabaseSourced, initialData, demoLocalProducts]);

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <DashboardSidebar
        items={tabs}
        active={tab}
        onSelect={handleTabClick}
        sellerName={initialData?.sellerName ?? null}
        supabaseSourced={supabaseSourced}
        hasProducts={hasProducts}
      />

      <div className="min-w-0">
        {tab === "products" && (
          <Products
            supabaseSourced={supabaseSourced}
            initialProducts={initialData?.products ?? null}
            verifiedPaymentMethodCount={initialData?.verifiedPaymentMethodCount}
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
        {tab === "analytics" && (
          <SellerAnalytics
            supabaseSourced={supabaseSourced}
            products={analyticsProducts}
            verifiedPaymentMethodCount={
              supabaseSourced
                ? initialData?.verifiedPaymentMethodCount
                : undefined
            }
          />
        )}
        {tab === "reviews" && (
          <SellerReviewsTab
            supabaseSourced={supabaseSourced}
            initialReviews={initialData?.reviews ?? []}
          />
        )}
        {tab === "verification" && (
          <Verification
            supabaseSourced={supabaseSourced}
            initialStatus={initialData?.providerTagStatus ?? "Not requested"}
          />
        )}
        {tab === "billing" && <Billing />}
      </div>
    </div>
  );
}

// =========================================================================
// Produits tab
// =========================================================================

function Products({
  supabaseSourced,
  initialProducts,
  verifiedPaymentMethodCount,
}: {
  supabaseSourced: boolean;
  initialProducts: UISellerProductCard[] | null;
  verifiedPaymentMethodCount: number | undefined;
}) {
  const [demoProductsList, setDemoProducts] = useState<LocalProduct[]>([]);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (supabaseSourced) return;
    setDemoProducts(getLocalProducts());
  }, [supabaseSourced]);

  useEffect(() => {
    if (!openMenuId) return;
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-product-menu]")) {
        setOpenMenuId(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuId]);

  const displayProducts = useMemo(() => {
    if (supabaseSourced) {
      return initialProducts ?? [];
    }
    const localCards: UISellerProductCard[] = demoProductsList.map((product) => ({
      id: product.slug, // demo: no real UUID, slug doubles as id
      slug: product.slug,
      name: product.name,
      status: product.productStatus,
      rawStatus: "draft" as const,
      toolStatus: "Draft / database-ready",
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
      nextAction: "Submit for review and verify payment methods",
      media: [],
      summary: product.summary,
      featureGroups: groupsFromFlatFeatures(product.features),
      faq: product.faq.map((item) => ({ q: item.q, a: item.a })),
      websiteUrl: product.websiteUrl,
    }));
    const fromSellerProducts: UISellerProductCard[] = demoSellerProducts.map((item) => {
      const slug = item.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      return {
        ...item,
        id: slug,
        slug,
        category: "Analytics / Overlay",
        rawStatus: "published" as const,
        media: [],
        summary: "",
        featureGroups: groupsFromFlatFeatures(item.features),
        faq: [],
        websiteUrl: `https://${item.website}`,
      };
    });
    return [...localCards, ...fromSellerProducts];
  }, [supabaseSourced, initialProducts, demoProductsList]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return displayProducts;
    return displayProducts.filter((product) =>
      [product.name, product.game, product.website, product.category]
        .filter((value): value is string => typeof value === "string")
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [displayProducts, searchQuery]);

  // Real publish/archive (Supabase mode only). On success we reload the page
  // so server-side initialData reflects the change. A finer-grained client
  // refresh (router.refresh) would also work but reload keeps logic simple.
  const updateProductStatus = async (
    productId: string,
    nextStatus: "published" | "archived" | "draft",
  ) => {
    if (!supabaseSourced) return;
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

  const makePrivate = async (productId: string, productName: string) => {
    const confirmed = window.confirm(
      `Make "${productName}" private? It will be removed from the public marketplace and marketplace filters. The product record and media stay saved and you can restore it later.`,
    );
    if (!confirmed) return;
    await updateProductStatus(productId, "archived");
  };

  const deleteProduct = async (productId: string, productName: string) => {
    if (!supabaseSourced) return;
    const confirmed = window.confirm(
      `Permanently delete "${productName}"?\n\nThis removes the product, every uploaded image and YouTube link, and any associated storage files. This action cannot be undone.`,
    );
    if (!confirmed) return;
    setActionError(null);
    setBusyProductId(productId);
    setOpenMenuId(null);
    try {
      const response = await fetch(
        `/api/seller/products?id=${encodeURIComponent(productId)}`,
        { method: "DELETE" },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setActionError(payload.error ?? "Could not delete product.");
        return;
      }
      window.location.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusyProductId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <MiniStat
          label="Produits en ligne"
          value={String(displayProducts.length)}
          detail={supabaseSourced ? "from Supabase" : "demo + database-ready"}
        />
        <MiniStat label="Views produits" value="35.2K" detail="+16.4%" />
        <MiniStat label="Outbound clicks" value="1.7K" detail="website traffic" />
        <MiniStat label="Avg outbound CTR" value="4.93%" detail="+0.8 pts" />
      </section>

      <Card>
        <div className="flex flex-col gap-4 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Produits en ligne</h2>
            <p className="mt-1 text-sm text-slate-400">
              Draft, publish, archive, restore, and manage media for your products.
            </p>
          </div>
          <Link
            href="/dashboard/products/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-12px_rgba(249,115,22,0.65)] transition hover:bg-orange-400"
          >
            <span aria-hidden="true" className="text-base leading-none">+</span>
            Create product
          </Link>
        </div>

        <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative w-full sm:max-w-md">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search for a product"
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2 pl-10 pr-3 text-sm text-white outline-none transition focus:border-orange-400/50"
              aria-label="Search products"
            />
          </label>
          <p className="text-xs text-slate-500">
            {searchQuery.trim()
              ? `Showing ${filteredProducts.length} of ${displayProducts.length} ${displayProducts.length === 1 ? "product" : "products"}`
              : `${displayProducts.length} ${displayProducts.length === 1 ? "product" : "products"}`}
          </p>
        </div>

        {actionError && (
          <div className="border-b border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">
            {actionError}
          </div>
        )}

        <div className="divide-y divide-white/10">
          {displayProducts.length === 0 && (
            <p className="p-6 text-sm text-slate-500">
              No products yet. Create a product to start building your catalog.
            </p>
          )}
          {displayProducts.length > 0 && filteredProducts.length === 0 && (
            <p className="p-6 text-sm text-slate-500">
              No products match &ldquo;{searchQuery}&rdquo;.
            </p>
          )}
          {filteredProducts.map((product, productIndex) => {
            const thumbnail = product.media?.find(
              (item) => item.imageUrl || item.thumbnailUrl,
            );
            const thumbnailUrl =
              thumbnail?.imageUrl ?? thumbnail?.thumbnailUrl ?? null;
            const isMenuOpen = openMenuId === product.id;
            const isBusy = busyProductId === product.id;
            const rankingInput: RankingInput = {
              published: product.rawStatus === "published",
              // Seller dashboard rows belong to the current seller; we don't
              // know their tag from this view (it lives on profiles via the
              // session), so this is the conservative "Seller" baseline.
              // Once the dashboard plumbs the session's tag in, this can
              // surface "Verified Seller" / "Provider / Developer" too.
              sellerTag: "Seller",
              verifiedPaymentCount: supabaseSourced
                ? verifiedPaymentMethodCount ?? 0
                : 0,
              hasMedia: product.media.length > 0,
              summary: product.summary,
              featureGroupCount: product.featureGroups.length,
              flatFeatureCount: product.features.length,
              faqCount: product.faq.filter(
                (item) => item.q.trim() !== "" && item.a.trim() !== "",
              ).length,
            };
            const ranking = evaluateProductRanking(rankingInput);
            // Drop the kebab menu upward for rows near the bottom of the
            // list so it doesn't overflow the card / viewport.
            const dropUp =
              filteredProducts.length > 1 &&
              productIndex >= filteredProducts.length - 2;
            return (
              <div key={product.slug + product.name} className="px-5 py-3">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-slate-950/60">
                    {thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbnailUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <svg
                        aria-hidden="true"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-slate-500"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="m21 15-5-5L5 21" />
                      </svg>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold leading-tight">
                        {product.name}
                      </h3>
                      <Badge tone={product.rawStatus === "published" ? "green" : "default"}>
                        {product.rawStatus === "published" ? "Published" : "Private"}
                      </Badge>
                      <RankingPill result={ranking} />
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {product.game}
                      {product.website ? ` · ${product.website}` : ""}
                      {` · ${product.outboundCtr} CTR · ${product.views} views`}
                    </p>
                  </div>

                  <Link
                    href={`/products/${product.slug}`}
                    aria-label="View public page"
                    title="View public page"
                    className="hidden h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] text-slate-400 transition hover:bg-white/[0.06] hover:text-white sm:inline-flex"
                  >
                    <svg
                      aria-hidden="true"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 1 0-7.07-7.07l-1.5 1.5" />
                      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
                    </svg>
                  </Link>

                  <div className="relative" data-product-menu>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId(isMenuOpen ? null : product.id)
                      }
                      aria-label="Product actions"
                      aria-haspopup="menu"
                      aria-expanded={isMenuOpen}
                      disabled={isBusy}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] text-slate-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-60"
                    >
                      <svg
                        aria-hidden="true"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <circle cx="5" cy="12" r="1.7" />
                        <circle cx="12" cy="12" r="1.7" />
                        <circle cx="19" cy="12" r="1.7" />
                      </svg>
                    </button>
                    {isMenuOpen && (
                      <div
                        role="menu"
                        className={
                          "absolute right-0 z-20 w-52 overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/60 " +
                          (dropUp ? "bottom-full mb-1" : "top-full mt-1")
                        }
                      >
                        {supabaseSourced && (
                          <Link
                            href={`/dashboard/products/${product.id}/edit`}
                            role="menuitem"
                            className="block px-3 py-2 text-sm text-slate-200 hover:bg-white/[0.04]"
                            onClick={() => setOpenMenuId(null)}
                          >
                            Edit
                          </Link>
                        )}
                        <Link
                          href={`/products/${product.slug}`}
                          role="menuitem"
                          className="block px-3 py-2 text-sm text-slate-200 hover:bg-white/[0.04]"
                          onClick={() => setOpenMenuId(null)}
                        >
                          View public page
                        </Link>
                        {supabaseSourced && product.rawStatus !== "published" && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuId(null);
                              updateProductStatus(product.id, "published");
                            }}
                            disabled={isBusy}
                            className="block w-full px-3 py-2 text-left text-sm text-emerald-200 hover:bg-white/[0.04] disabled:opacity-60"
                          >
                            {isBusy ? "Publishing…" : "Publish"}
                          </button>
                        )}
                        {supabaseSourced && product.rawStatus === "published" && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenMenuId(null);
                              makePrivate(product.id, product.name);
                            }}
                            disabled={isBusy}
                            className="block w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/[0.04] disabled:opacity-60"
                          >
                            {isBusy ? "Updating…" : "Make private"}
                          </button>
                        )}
                        {supabaseSourced && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => deleteProduct(product.id, product.name)}
                            disabled={isBusy}
                            className="block w-full border-t border-white/10 px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-60"
                          >
                            {isBusy ? "Working…" : "Delete"}
                          </button>
                        )}
                        {!supabaseSourced && (
                          <p className="px-3 py-2 text-xs text-slate-500">
                            Connect Supabase to enable edit, publish, make
                            private, and delete.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </Card>

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

  // Form state. Verification is at the seller-account level, so the only
  // selection a seller makes is which payment method they want approved.
  const [demoMethod, setDemoMethod] = useState<PaymentMethod>("Card");
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
      const request: LocalPaymentRequest = {
        id: crypto.randomUUID(),
        seller: "Demo Seller",
        productSlug: null,
        productName: null,
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

    // Supabase path: submit real UUIDs. No product_id — verification is
    // at the seller-account level and applies to every product the
    // seller publishes once admin approves.
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
      // submission immediately without reloading.
      const method = paymentMethods.find((m) => m.id === paymentMethodId);
      if (method && payload.request) {
        const optimistic: UISellerPaymentRequest = {
          id: payload.request.id,
          productName: null,
          productSlug: null,
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
      <Card className="p-6">
        <Badge tone="default">Payment verification</Badge>
        <h2 className="mt-4 text-2xl font-black">Prove the payment methods you accept</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Payment methods stay private or under review until admin approves them. Only verified
          methods appear on your public product page and in marketplace filters.
        </p>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6">
          <h2 className="text-2xl font-black">Add payment method</h2>
          <p className="mt-2 text-sm text-slate-500">
            Verification is per seller account, not per product. Once a
            payment method is approved it shows on every product you
            publish.
          </p>
          {supabaseSourced && paymentMethods.length === 0 && (
            <p className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              No payment methods are configured in the database. Ask an admin to seed
              public.payment_methods.
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
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
              className="mt-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold disabled:opacity-60"
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
        </Card>

        <Card className="p-6">
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
                <div className="mt-2 text-xs text-slate-500">{item.proofNote}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

// =========================================================================
// Analytics tab — read-only, demo data only for this batch
// =========================================================================

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
      <Card className="p-6">
        <Badge tone="orange">Provider tag request</Badge>
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
            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold disabled:opacity-60"
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
      </Card>

      <Card className="p-6">
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
      </Card>
    </section>
  );
}

// =========================================================================
// Billing tab — placeholder pointing at Stripe
// =========================================================================

function Billing() {
  return (
    <Card className="p-6">
      <Badge tone="orange">Billing</Badge>
      <h2 className="mt-4 text-2xl font-black">Subscription, billing portal, and featured slots</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Everything money-related lives on a dedicated page so it stays organized.
        From there you can review your subscription, open the Stripe customer
        portal, and reserve a featured slot for one of your published products.
      </p>
      <Link
        href="/dashboard/billing"
        className="mt-5 inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white"
      >
        Open billing
      </Link>
      <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm leading-6 text-slate-400">
        Billing is the only place to open the Stripe customer portal or reserve
        Featured visibility. Plans remains the only place to start a seller
        subscription.
      </div>
    </Card>
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
      <div className="text-xs text-slate-500">{label}</div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
      />
    </label>
  );
}
