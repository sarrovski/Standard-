"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge, Card, MiniStat } from "@/components/ui";
import {
  adminSignals,
  featuredSlots as demoFeaturedSlots,
  games as gamesList,
  productCategories as categoriesList,
} from "@/lib/data";
import type {
  UIAdminFeaturedSlot,
  UIAdminPaymentRequest,
  UIAdminProduct,
  UIAdminProductReport,
  UIAdminProviderTagRequest,
  UIAdminSeller,
} from "@/lib/adapters";
import type { RealRiskSignal } from "@/app/admin/page";
import { PaymentPill, PaymentStatusPill } from "@/components/payment-pill";
import { RankingPill } from "@/components/product-ranking-ui";
import { evaluateProductRanking } from "@/lib/product-ranking";
import { REVIEW_RATING_MAX } from "@/lib/product-reviews";
import {
  CREATOR_PROFILE_STATUS_LABEL,
  CREATOR_PROFILE_STATUSES,
  type CreatorProfileStatus,
  type UICreatorApplication,
} from "@/lib/creator-marketplace";

/**
 * Lightweight shape for the admin Reviews queue. All fields are
 * pre-flattened server-side so the client component doesn't need to
 * know about the underlying product_reviews schema.
 */
export type AdminReviewItem = {
  id: string;
  rating: number;
  body: string;
  appealReason: string | null;
  createdAt: string;
  productName: string;
  productSlug: string;
  sellerName: string;
  reviewerName: string | null;
};

/**
 * Flattened creator profile row for the admin Creators tab. Counts are
 * pre-computed server-side so the client doesn't touch the schema.
 */
export type AdminCreatorProfileItem = {
  id: string;
  slug: string;
  displayName: string;
  status: CreatorProfileStatus;
  isFeatured: boolean;
  portfolioCount: number;
  requestCount: number;
  createdAt: string;
};

type AdminClientProps = {
  initialPaymentRequests: UIAdminPaymentRequest[] | null;
  initialProviderTagRequests: UIAdminProviderTagRequest[] | null;
  initialSellers: UIAdminSeller[] | null;
  initialProducts: UIAdminProduct[] | null;
  initialFeaturedSlots: UIAdminFeaturedSlot[] | null;
  initialReports: UIAdminProductReport[] | null;
  initialReviews: AdminReviewItem[] | null;
  initialCreatorApplications: UICreatorApplication[] | null;
  initialCreatorProfiles: AdminCreatorProfileItem[] | null;
  realSignals: RealRiskSignal[];
  initialTab?: string;
};

type PaymentAction = "approve" | "reject" | "needs_recheck";
type ProviderTagAction = "approve" | "reject";

const TABS = [
  { key: "queue", label: "Payment queue" },
  { key: "tags", label: "Provider tags" },
  { key: "sellers", label: "Sellers" },
  { key: "products", label: "Products" },
  { key: "reports", label: "Reports" },
  { key: "reviews", label: "Reviews" },
  { key: "creators", label: "Creators" },
  { key: "featured", label: "Featured slots" },
  { key: "signals", label: "Signals" },
] as const;

type TabKey = (typeof TABS)[number]["key"];
const VALID_TABS: Set<string> = new Set(TABS.map((t) => t.key));

function normalizeTab(candidate: string | null | undefined): TabKey {
  if (candidate && VALID_TABS.has(candidate)) return candidate as TabKey;
  return "queue";
}

export function AdminClient({
  initialPaymentRequests,
  initialProviderTagRequests,
  initialSellers,
  initialProducts,
  initialFeaturedSlots,
  initialReports,
  initialReviews,
  initialCreatorApplications,
  initialCreatorProfiles,
  realSignals,
  initialTab,
}: AdminClientProps) {
  const supabaseSourced = initialPaymentRequests !== null;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabKey>(() => normalizeTab(initialTab));

  useEffect(() => {
    const next = normalizeTab(searchParams.get("tab"));
    setTab((prev) => (prev === next ? prev : next));
  }, [searchParams]);

  const handleTabClick = (key: TabKey) => {
    setTab(key);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", key);
    router.replace(`/admin?${params.toString()}`, { scroll: false });
  };

  const [supabasePayments, setSupabasePayments] = useState<UIAdminPaymentRequest[]>(
    initialPaymentRequests ?? [],
  );
  const [supabaseTagRequests, setSupabaseTagRequests] = useState<
    UIAdminProviderTagRequest[]
  >(initialProviderTagRequests ?? []);
  const [sellers] = useState<UIAdminSeller[]>(initialSellers ?? []);
  const [products] = useState<UIAdminProduct[]>(initialProducts ?? []);
  const [featuredSlots] = useState<UIAdminFeaturedSlot[]>(
    initialFeaturedSlots ?? [],
  );
  const [reports, setReports] = useState<UIAdminProductReport[]>(
    initialReports ?? [],
  );
  const openReportsCount = reports.filter((r) => r.status === "open").length;
  const [reviews, setReviews] = useState<AdminReviewItem[]>(
    initialReviews ?? [],
  );
  const appealedReviewCount = reviews.length;
  const [creatorApplications, setCreatorApplications] = useState<
    UICreatorApplication[]
  >(initialCreatorApplications ?? []);
  const [creatorProfiles, setCreatorProfiles] = useState<
    AdminCreatorProfileItem[]
  >(initialCreatorProfiles ?? []);
  const pendingCreatorCount = creatorApplications.filter(
    (a) => a.status === "pending",
  ).length;

  // Sellers tab can request the Products tab pre-filtered by seller via a
  // URL query param (?seller=<id>). Read it and pass into ProductsTab.
  const sellerFilterFromUrl = searchParams.get("seller");

  const navigateToProductsForSeller = (sellerId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "products");
    params.set("seller", sellerId);
    router.replace(`/admin?${params.toString()}`, { scroll: false });
    setTab("products");
  };

  const pendingPaymentCount = supabasePayments.filter(
    (item) => item.status === "Pending verification" || item.status === "Needs re-check",
  ).length;
  const pendingTagCount = supabaseTagRequests.length;

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-black text-white">
              A
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">
                Admin console
              </div>
              <div className="mt-1">
                <Badge tone={supabaseSourced ? "green" : "amber"}>
                  {supabaseSourced ? "Live" : "Demo"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <nav className="mt-4 grid gap-1 rounded-2xl border border-white/10 bg-white/[0.02] p-2">
          {TABS.map((item) => {
            const isActive = tab === item.key;
            const badge =
              item.key === "queue" && pendingPaymentCount > 0
                ? pendingPaymentCount
                : item.key === "tags" && pendingTagCount > 0
                  ? pendingTagCount
                  : item.key === "reports" && openReportsCount > 0
                    ? openReportsCount
                    : item.key === "reviews" && appealedReviewCount > 0
                      ? appealedReviewCount
                      : item.key === "creators" && pendingCreatorCount > 0
                        ? pendingCreatorCount
                        : null;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleTabClick(item.key)}
                aria-pressed={isActive}
                className={
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold transition " +
                  (isActive
                    ? "bg-orange-500/15 text-white"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-white")
                }
              >
                <span
                  aria-hidden="true"
                  className={
                    "h-4 w-1 rounded-full transition " +
                    (isActive ? "bg-orange-400" : "bg-transparent")
                  }
                />
                <span className="flex-1">{item.label}</span>
                {badge !== null && (
                  <span className="rounded-full border border-orange-400/40 bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-100">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          <MiniStat
            label="Pending payments"
            value={String(pendingPaymentCount)}
            detail={supabaseSourced ? "from Supabase" : "demo data"}
          />
          <MiniStat
            label="Pending provider tags"
            value={String(pendingTagCount)}
            detail={supabaseSourced ? "from Supabase" : "demo data"}
          />
          <MiniStat
            label="Sellers"
            value={String(sellers.length)}
            detail={supabaseSourced ? "Supabase" : "demo"}
          />
          <MiniStat
            label="Risk signals"
            value={String(adminSignals.length)}
            detail="Watchlist"
          />
        </section>

        {tab === "queue" && (
          <PaymentQueueTab
            items={supabasePayments}
            supabaseSourced={supabaseSourced}
            onRemove={(ids) =>
              setSupabasePayments((prev) =>
                prev.filter((item) => !ids.includes(item.id)),
              )
            }
          />
        )}
        {tab === "tags" && (
          <ProviderTagTab
            items={supabaseTagRequests}
            supabaseSourced={supabaseSourced}
            onRemove={(ids) =>
              setSupabaseTagRequests((prev) =>
                prev.filter((item) => !ids.includes(item.id)),
              )
            }
          />
        )}
        {tab === "sellers" && (
          <SellersTab
            sellers={sellers}
            supabaseSourced={supabaseSourced}
            onViewProducts={navigateToProductsForSeller}
          />
        )}
        {tab === "products" && (
          <ProductsTab
            products={products}
            sellers={sellers}
            supabaseSourced={supabaseSourced}
            initialSellerFilter={sellerFilterFromUrl}
          />
        )}
        {tab === "reports" && (
          <ReportsTab
            reports={reports}
            supabaseSourced={supabaseSourced}
            onStatusChange={(id, nextStatus) =>
              setReports((prev) =>
                prev.map((r) =>
                  r.id === id
                    ? {
                        ...r,
                        status: nextStatus,
                        statusLabel:
                          nextStatus === "open"
                            ? "Open"
                            : nextStatus === "reviewed"
                              ? "Reviewed"
                              : "Resolved",
                        reviewedAt:
                          nextStatus === "open" ? null : new Date().toISOString(),
                      }
                    : r,
                ),
              )
            }
          />
        )}
        {tab === "reviews" && (
          <ReviewsQueueTab
            reviews={reviews}
            supabaseSourced={supabaseSourced}
            onResolve={(id) =>
              setReviews((prev) => prev.filter((row) => row.id !== id))
            }
          />
        )}
        {tab === "creators" && (
          <CreatorsAdminTab
            applications={creatorApplications}
            profiles={creatorProfiles}
            supabaseSourced={supabaseSourced}
            onApplicationResolved={(id, status) =>
              setCreatorApplications((prev) =>
                prev.map((a) => (a.id === id ? { ...a, status } : a)),
              )
            }
            onProfileChange={(id, patch) =>
              setCreatorProfiles((prev) =>
                prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
              )
            }
          />
        )}
        {tab === "featured" && (
          <FeaturedSlotsTab
            slots={featuredSlots}
            supabaseSourced={supabaseSourced}
          />
        )}
        {tab === "signals" && (
          <SignalsTab
            realSignals={realSignals}
            supabaseSourced={supabaseSourced}
          />
        )}
      </div>
    </div>
  );
}

// =========================================================================
// Payment queue — multi-select + bulk approve / reject / needs_recheck
// =========================================================================

function PaymentQueueTab({
  items,
  supabaseSourced,
  onRemove,
}: {
  items: UIAdminPaymentRequest[];
  supabaseSourced: boolean;
  onRemove: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const allSelected = useMemo(
    () => items.length > 0 && items.every((item) => selected.has(item.id)),
    [items, selected],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (prev.size === items.length) return new Set();
      return new Set(items.map((item) => item.id));
    });
  };

  const moderateOne = async (
    id: string,
    action: PaymentAction,
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/admin/payment-verification/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          admin_notes: notes[id]?.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        return { ok: false, error: payload.error ?? "Could not update request." };
      }
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Network error.",
      };
    }
  };

  const moderate = async (ids: string[], action: PaymentAction) => {
    if (ids.length === 0 || !supabaseSourced) return;
    setError(null);
    setNotice(null);
    setBusyIds(new Set(ids));
    const results = await Promise.all(
      ids.map(async (id) => ({ id, result: await moderateOne(id, action) })),
    );
    const succeeded = results.filter((r) => r.result.ok).map((r) => r.id);
    const failed = results.filter((r) => !r.result.ok);

    if (succeeded.length > 0) {
      onRemove(succeeded);
      setSelected((prev) => {
        const next = new Set(prev);
        succeeded.forEach((id) => next.delete(id));
        return next;
      });
    }
    if (failed.length > 0) {
      setError(
        `${failed.length} of ${ids.length} failed: ${failed[0]?.result.error ?? "unknown error"}`,
      );
    } else {
      const verb =
        action === "approve"
          ? "Approved"
          : action === "reject"
            ? "Rejected"
            : "Marked for re-check";
      setNotice(`${verb} ${succeeded.length} request${succeeded.length === 1 ? "" : "s"}.`);
    }
    setBusyIds(new Set());
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">Payment verification queue</h2>
          <p className="mt-1 text-sm text-slate-400">
            {supabaseSourced
              ? "Live queue. Approve to publish the seller's payment method on every one of their products."
              : "Demo mode — connect Supabase to moderate real requests."}
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={toggleAll}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.08]"
          >
            {allSelected ? "Clear selection" : "Select all"}
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-orange-500/5 px-5 py-3 text-sm">
          <span className="font-semibold text-white">
            {selected.size} selected
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => moderate(Array.from(selected), "approve")}
              disabled={!supabaseSourced || busyIds.size > 0}
              className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 disabled:opacity-60"
            >
              {busyIds.size > 0 ? "Working…" : `Approve ${selected.size}`}
            </button>
            <button
              type="button"
              onClick={() => moderate(Array.from(selected), "needs_recheck")}
              disabled={!supabaseSourced || busyIds.size > 0}
              className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 disabled:opacity-60"
            >
              Needs more proof
            </button>
            <button
              type="button"
              onClick={() => moderate(Array.from(selected), "reject")}
              disabled={!supabaseSourced || busyIds.size > 0}
              className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 disabled:opacity-60"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.08]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="border-b border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {notice && (
        <div className="border-b border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          {notice}
        </div>
      )}

      <div className="divide-y divide-white/10">
        {items.length === 0 && (
          <p className="p-6 text-sm text-slate-500">
            No pending payment verification requests.
          </p>
        )}
        {items.map((item) => {
          const isSelected = selected.has(item.id);
          const isBusy = busyIds.has(item.id);
          return (
            <div key={item.id} className="px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
                <label className="flex items-center pt-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(item.id)}
                    disabled={!supabaseSourced || isBusy}
                    className="h-4 w-4 cursor-pointer rounded border-white/20 bg-black/30 accent-orange-500"
                    aria-label={`Select request from ${item.seller}`}
                  />
                </label>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{item.seller}</h3>
                    <Badge tone={item.risk === "High" ? "red" : item.risk === "Medium" ? "amber" : "green"}>
                      {item.risk} risk
                    </Badge>
                    <PaymentStatusPill status={item.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Product: {item.product}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <PaymentPill method={item.method} />
                  </div>
                  <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/40 p-3 text-xs text-slate-400">
                    <div>
                      <span className="text-slate-500">Proof:</span>{" "}
                      {item.submittedProof}
                    </div>
                    <div className="mt-1">
                      <span className="text-slate-500">Checkout:</span>{" "}
                      {item.checkoutUrl}
                    </div>
                  </div>
                  {supabaseSourced && (
                    <textarea
                      placeholder="Admin notes (optional)…"
                      value={notes[item.id] ?? ""}
                      onChange={(event) =>
                        setNotes((prev) => ({ ...prev, [item.id]: event.target.value }))
                      }
                      rows={2}
                      className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white outline-none focus:border-orange-400/50"
                    />
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-2 lg:w-44">
                  {supabaseSourced ? (
                    <>
                      <button
                        type="button"
                        onClick={() => moderate([item.id], "approve")}
                        disabled={isBusy}
                        className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-60"
                      >
                        {isBusy ? "…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => moderate([item.id], "needs_recheck")}
                        disabled={isBusy}
                        className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 disabled:opacity-60"
                      >
                        Request more proof
                      </button>
                      <button
                        type="button"
                        onClick={() => moderate([item.id], "reject")}
                        disabled={isBusy}
                        className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Demo fixture. Actions live on Supabase.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// =========================================================================
// Provider tag queue — multi-select + bulk approve / reject
// =========================================================================

function ProviderTagTab({
  items,
  supabaseSourced,
  onRemove,
}: {
  items: UIAdminProviderTagRequest[];
  supabaseSourced: boolean;
  onRemove: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (prev.size === items.length) return new Set();
      return new Set(items.map((item) => item.id));
    });
  };

  const moderateOne = async (
    id: string,
    action: ProviderTagAction,
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/admin/provider-tag/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          admin_notes: notes[id]?.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        return { ok: false, error: payload.error ?? "Could not update request." };
      }
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Network error.",
      };
    }
  };

  const moderate = async (ids: string[], action: ProviderTagAction) => {
    if (ids.length === 0 || !supabaseSourced) return;
    setError(null);
    setNotice(null);
    setBusyIds(new Set(ids));
    const results = await Promise.all(
      ids.map(async (id) => ({ id, result: await moderateOne(id, action) })),
    );
    const succeeded = results.filter((r) => r.result.ok).map((r) => r.id);
    const failed = results.filter((r) => !r.result.ok);

    if (succeeded.length > 0) {
      onRemove(succeeded);
      setSelected((prev) => {
        const next = new Set(prev);
        succeeded.forEach((id) => next.delete(id));
        return next;
      });
    }
    if (failed.length > 0) {
      setError(
        `${failed.length} of ${ids.length} failed: ${failed[0]?.result.error ?? "unknown error"}`,
      );
    } else {
      setNotice(
        `${action === "approve" ? "Approved" : "Rejected"} ${succeeded.length} request${succeeded.length === 1 ? "" : "s"}.`,
      );
    }
    setBusyIds(new Set());
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">Provider / Developer tag requests</h2>
          <p className="mt-1 text-sm text-slate-400">
            {supabaseSourced
              ? "Live queue. Approving sets provider_tag_status = approved on the seller's record."
              : "Demo mode — connect Supabase to moderate real requests."}
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={toggleAll}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.08]"
          >
            {items.every((item) => selected.has(item.id)) ? "Clear selection" : "Select all"}
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-orange-500/5 px-5 py-3 text-sm">
          <span className="font-semibold text-white">
            {selected.size} selected
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => moderate(Array.from(selected), "approve")}
              disabled={!supabaseSourced || busyIds.size > 0}
              className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 disabled:opacity-60"
            >
              {busyIds.size > 0 ? "Working…" : `Approve ${selected.size}`}
            </button>
            <button
              type="button"
              onClick={() => moderate(Array.from(selected), "reject")}
              disabled={!supabaseSourced || busyIds.size > 0}
              className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 disabled:opacity-60"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.08]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="border-b border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}
      {notice && (
        <div className="border-b border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          {notice}
        </div>
      )}

      <div className="divide-y divide-white/10">
        {items.length === 0 && (
          <p className="p-6 text-sm text-slate-500">
            No pending provider tag requests.
          </p>
        )}
        {items.map((item) => {
          const isSelected = selected.has(item.id);
          const isBusy = busyIds.has(item.id);
          return (
            <div key={item.id} className="px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
                <label className="flex items-center pt-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(item.id)}
                    disabled={!supabaseSourced || isBusy}
                    className="h-4 w-4 cursor-pointer rounded border-white/20 bg-black/30 accent-orange-500"
                    aria-label={`Select request from ${item.seller}`}
                  />
                </label>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{item.seller}</h3>
                    <Badge tone={item.status === "Approved" ? "green" : "amber"}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{item.product}</p>
                  {supabaseSourced && (
                    <textarea
                      placeholder="Admin notes (optional)…"
                      value={notes[item.id] ?? ""}
                      onChange={(event) =>
                        setNotes((prev) => ({ ...prev, [item.id]: event.target.value }))
                      }
                      rows={2}
                      className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white outline-none focus:border-orange-400/50"
                    />
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-2 lg:w-36">
                  {supabaseSourced ? (
                    <>
                      <button
                        type="button"
                        onClick={() => moderate([item.id], "approve")}
                        disabled={isBusy}
                        className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-60"
                      >
                        {isBusy ? "…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        onClick={() => moderate([item.id], "reject")}
                        disabled={isBusy}
                        className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Demo fixture.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// =========================================================================
// Sellers — list view with role / provider tag / subscription / counts
// =========================================================================

function SellersTab({
  sellers,
  supabaseSourced,
  onViewProducts,
}: {
  sellers: UIAdminSeller[];
  supabaseSourced: boolean;
  onViewProducts: (sellerId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sellers;
    return sellers.filter((seller) =>
      [seller.sellerName, seller.profileEmail, seller.profileDisplayName]
        .filter((value): value is string => typeof value === "string")
        .some((value) => value.toLowerCase().includes(q)),
    );
  }, [sellers, search]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">Sellers</h2>
          <p className="mt-1 text-sm text-slate-400">
            {supabaseSourced
              ? "All sellers on Standard. Search by store name, email, or display name."
              : "Demo mode — no sellers to show. Connect Supabase to load real data."}
          </p>
        </div>
        <label className="relative w-full sm:max-w-xs">
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
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search sellers"
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2 pl-10 pr-3 text-sm text-white outline-none focus:border-orange-400/50"
          />
        </label>
      </div>

      <div className="divide-y divide-white/10">
        {filtered.length === 0 && (
          <p className="p-6 text-sm text-slate-500">
            {sellers.length === 0
              ? "No sellers yet."
              : `No sellers match "${search}".`}
          </p>
        )}
        {filtered.map((seller) => (
          <div key={seller.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[1.6fr_0.9fr_0.9fr_0.7fr]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-white">
                  {seller.sellerName}
                </h3>
                <Badge tone={seller.role === "admin" ? "orange" : "default"}>
                  {seller.role === "admin"
                    ? "Admin"
                    : seller.role === "seller"
                      ? "Seller"
                      : "Buyer"}
                </Badge>
              </div>
              <p className="mt-1 truncate text-xs text-slate-400">
                {seller.profileEmail ?? "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                tone={
                  seller.providerTag === "Approved"
                    ? "green"
                    : seller.providerTag === "Rejected"
                      ? "red"
                      : seller.providerTag === "Pending"
                        ? "amber"
                        : "default"
                }
              >
                Tag: {seller.providerTag}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                tone={
                  seller.subscriptionStatus === "active"
                    ? "green"
                    : seller.subscriptionStatus === "past_due" ||
                        seller.subscriptionStatus === "canceled"
                      ? "red"
                      : seller.subscriptionStatus === "trialing"
                        ? "amber"
                        : "default"
                }
              >
                Sub: {seller.subscriptionStatus}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>
                <span className="text-slate-500">Products</span>{" "}
                {seller.productsCount}
              </span>
              <span>
                <span className="text-slate-500">Verified pmts</span>{" "}
                {seller.verifiedPaymentMethodsCount}
              </span>
              <button
                type="button"
                onClick={() => onViewProducts(seller.id)}
                disabled={seller.productsCount === 0}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                View products
              </button>
              {seller.websiteUrl ? (
                <a
                  href={seller.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-orange-100"
                >
                  Visit website ↗
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// =========================================================================
// Products — read-only moderation table for now (kept from previous version)
// =========================================================================

function ProductsTab({
  products,
  sellers,
  supabaseSourced,
  initialSellerFilter,
}: {
  products: UIAdminProduct[];
  sellers: UIAdminSeller[];
  supabaseSourced: boolean;
  initialSellerFilter: string | null;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "draft" | "published" | "archived"
  >("all");
  const [gameFilter, setGameFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sellerFilter, setSellerFilter] = useState<string>(
    initialSellerFilter ?? "all",
  );

  // If the seller filter param arrives later (deep-link from Sellers tab),
  // sync state to match.
  useEffect(() => {
    if (initialSellerFilter) setSellerFilter(initialSellerFilter);
  }, [initialSellerFilter]);

  const sellerOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const p of products) ids.add(p.sellerId);
    const known = sellers.filter((s) => ids.has(s.id));
    return known.length > 0 ? known : sellers;
  }, [products, sellers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((product) => {
      if (statusFilter !== "all" && product.status !== statusFilter) return false;
      if (gameFilter !== "all" && product.game !== gameFilter) return false;
      if (categoryFilter !== "all" && product.category !== categoryFilter) return false;
      if (sellerFilter !== "all" && product.sellerId !== sellerFilter) return false;
      if (q) {
        const haystack = `${product.name} ${product.sellerName} ${product.game} ${product.category}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [products, search, statusFilter, gameFilter, categoryFilter, sellerFilter]);

  const filtersActive =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    gameFilter !== "all" ||
    categoryFilter !== "all" ||
    sellerFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setGameFilter("all");
    setCategoryFilter("all");
    setSellerFilter("all");
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-white/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Product moderation</h2>
            <p className="mt-1 text-sm text-slate-400">
              {supabaseSourced
                ? "Read-only roster of every product. Filter by status / game / category / seller."
                : "Demo mode — connect Supabase to load real products."}
            </p>
          </div>
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-orange-100"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, seller, game, category"
            className="lg:col-span-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-400/50"
          />
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "all" | "draft" | "published" | "archived",
              )
            }
            className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-400/50"
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Private (archived)</option>
          </select>
          <select
            value={gameFilter}
            onChange={(event) => setGameFilter(event.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-400/50"
          >
            <option value="all">All games</option>
            {gamesList.map((game) => (
              <option key={game} value={game}>
                {game}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-400/50"
          >
            <option value="all">All categories</option>
            {categoriesList.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select
            value={sellerFilter}
            onChange={(event) => setSellerFilter(event.target.value)}
            className="lg:col-span-5 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-orange-400/50"
          >
            <option value="all">All sellers</option>
            {sellerOptions.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.sellerName}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Showing {filtered.length} of {products.length} product
          {products.length === 1 ? "" : "s"}
        </p>
      </div>

      {products.length === 0 ? (
        <p className="p-6 text-sm text-slate-500">
          {supabaseSourced
            ? "No products in the database yet."
            : "Demo mode: no products to show."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Product</th>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Game</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Trust</th>
                <th className="px-4 py-3"> </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const ranking = evaluateProductRanking({
                  published: product.status === "published",
                  sellerTag: product.sellerTag,
                  verifiedPaymentCount: product.verifiedPaymentCount,
                  hasMedia: product.hasMedia,
                  summary: product.summary,
                  featureGroupCount: product.featureGroupCount,
                  flatFeatureCount: product.flatFeatureCount,
                  faqCount: product.faqCount,
                });
                return (
                <tr
                  key={product.id}
                  className="border-b border-white/5 align-top last:border-0"
                >
                  <td className="px-5 py-4">
                    <div className="font-semibold text-white">{product.name}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {new Date(product.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-300">{product.sellerName}</td>
                  <td className="px-4 py-4 text-slate-400">{product.game}</td>
                  <td className="px-4 py-4 text-slate-400">{product.category}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        tone={
                          product.status === "published"
                            ? "green"
                            : product.status === "draft"
                              ? "amber"
                              : "default"
                        }
                      >
                        {product.statusLabel}
                      </Badge>
                      {product.pendingVerifications > 0 && (
                        <Badge tone="orange">
                          Verification pending · {product.pendingVerifications}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <RankingPill result={ranking} showAdminScore />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/products/${product.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-orange-100"
                    >
                      Open public page ↗
                    </Link>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// =========================================================================
// Reports tab — open / reviewed / resolved, with admin action buttons
// =========================================================================

function ReportsTab({
  reports,
  supabaseSourced,
  onStatusChange,
}: {
  reports: UIAdminProductReport[];
  supabaseSourced: boolean;
  onStatusChange: (
    id: string,
    nextStatus: "open" | "reviewed" | "resolved",
  ) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setStatus = async (
    id: string,
    nextStatus: "open" | "reviewed" | "resolved",
  ) => {
    if (!supabaseSourced) return;
    setError(null);
    setBusyId(id);
    try {
      const response = await fetch(`/api/admin/product-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Couldn't update report.");
        return;
      }
      onStatusChange(id, nextStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-5">
        <div>
          <h2 className="text-xl font-bold">Buyer reports</h2>
          <p className="mt-1 text-sm text-slate-400">
            {supabaseSourced
              ? "Reports submitted from public product pages. Mark each one as you review."
              : "Demo mode — connect Supabase to load real reports."}
          </p>
        </div>
        <Badge tone={supabaseSourced ? "green" : "amber"}>
          {supabaseSourced ? `Live · ${reports.length} report${reports.length === 1 ? "" : "s"}` : "Demo only"}
        </Badge>
      </div>

      {error && (
        <div className="m-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {reports.length === 0 ? (
        <div className="p-6 text-sm text-slate-500">
          {supabaseSourced
            ? "No reports yet. They'll appear here as buyers submit them."
            : "Demo mode: no reports to show."}
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {reports.map((report) => {
            const isBusy = busyId === report.id;
            const tone =
              report.status === "open"
                ? "amber"
                : report.status === "reviewed"
                  ? "default"
                  : "green";
            return (
              <div key={report.id} className="grid gap-3 p-5 lg:grid-cols-[1.4fr_0.6fr]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={tone}>{report.statusLabel}</Badge>
                    <Badge tone="orange">{report.reasonLabel}</Badge>
                    {report.productSlug ? (
                      <Link
                        href={`/products/${report.productSlug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-sm font-semibold text-white transition hover:text-orange-200"
                      >
                        {report.productName} ↗
                      </Link>
                    ) : (
                      <span className="truncate text-sm font-semibold text-white">
                        {report.productName}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {report.sellerName ? `${report.sellerName} · ` : ""}
                    {report.reporterDisplayName
                      ? `Reported by ${report.reporterDisplayName}`
                      : "Reported anonymously"}
                    {" · "}
                    {new Date(report.createdAt).toLocaleString()}
                    {report.reviewedAt
                      ? ` · reviewed ${new Date(report.reviewedAt).toLocaleString()}`
                      : ""}
                  </p>
                  {report.details && (
                    <p className="mt-3 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-slate-200">
                      {report.details}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-start justify-end gap-2">
                  {report.status !== "reviewed" && (
                    <button
                      type="button"
                      onClick={() => setStatus(report.id, "reviewed")}
                      disabled={isBusy}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Mark reviewed
                    </button>
                  )}
                  {report.status !== "resolved" && (
                    <button
                      type="button"
                      onClick={() => setStatus(report.id, "resolved")}
                      disabled={isBusy}
                      className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Resolve
                    </button>
                  )}
                  {report.status !== "open" && (
                    <button
                      type="button"
                      onClick={() => setStatus(report.id, "open")}
                      disabled={isBusy}
                      className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// =========================================================================
// Featured slots + Signals — display only (kept from previous version)
// =========================================================================

function FeaturedSlotsTab({
  slots,
  supabaseSourced,
}: {
  slots: UIAdminFeaturedSlot[];
  supabaseSourced: boolean;
}) {
  const showingReal = supabaseSourced && slots.length > 0;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Featured slots</h2>
          <p className="mt-1 text-sm text-slate-400">
            One active slot per game / category. Admin allocation flow lands in
            a follow-up.
          </p>
        </div>
        <Badge tone={showingReal ? "green" : "amber"}>
          {showingReal
            ? `Live · ${slots.length} slot${slots.length === 1 ? "" : "s"}`
            : supabaseSourced
              ? "Live · no slots yet"
              : "Demo data"}
        </Badge>
      </div>

      {showingReal ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-white">
                  {slot.game} · {slot.category}
                </span>
                <Badge
                  tone={
                    slot.status === "active"
                      ? "green"
                      : slot.status === "available"
                        ? "default"
                        : slot.status === "expired"
                          ? "amber"
                          : "red"
                  }
                >
                  {slot.statusLabel}
                </Badge>
              </div>
              <div className="mt-2 text-sm text-slate-300">
                {slot.productName ? (
                  <Link
                    href={`/products/${slot.productSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline-offset-2 hover:text-orange-200 hover:underline"
                  >
                    {slot.productName}
                  </Link>
                ) : (
                  <span className="text-slate-500">No product reserved</span>
                )}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {slot.sellerName ?? "—"}
                {slot.startsAt && slot.endsAt
                  ? ` · ${new Date(slot.startsAt).toLocaleDateString()} → ${new Date(slot.endsAt).toLocaleDateString()}`
                  : ""}
              </div>
            </div>
          ))}
        </div>
      ) : supabaseSourced ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-5 text-sm text-slate-400">
          No featured slots configured yet. Once an admin (or Stripe checkout)
          allocates a slot, it&apos;ll appear here.
        </div>
      ) : (
        <>
          <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100">
            Demo placeholder slots from <code>data.ts</code> — connect Supabase
            to load real allocations.
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {demoFeaturedSlots.map((slot) => (
              <div
                key={slot.category}
                className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-white">{slot.category}</span>
                  <Badge tone={slot.status === "Available" ? "green" : "amber"}>
                    {slot.status}
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {slot.product ?? "No product reserved"}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function SignalsTab({
  realSignals,
  supabaseSourced,
}: {
  realSignals: RealRiskSignal[];
  supabaseSourced: boolean;
}) {
  const severityTone = (
    severity: RealRiskSignal["severity"],
  ): "red" | "amber" | "default" =>
    severity === "high" ? "red" : severity === "medium" ? "amber" : "default";

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Signal center</h2>
          <p className="mt-1 text-sm text-slate-400">
            Risk signals split between live data and example heuristics.
          </p>
        </div>
        <Badge tone={supabaseSourced ? "green" : "amber"}>
          {supabaseSourced ? "Live · real signals on top" : "Demo only"}
        </Badge>
      </div>

      <section className="mt-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-200/80">
          Live signals
        </h3>
        {supabaseSourced ? (
          realSignals.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-emerald-400/30 bg-emerald-500/10 p-5 text-sm text-emerald-200">
              Nothing flagged right now. Live signals appear here when payment
              or provider-tag requests stale out, or when sellers publish
              without verified payment methods.
            </div>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {realSignals.map((signal) => (
                <div
                  key={signal.key}
                  className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-semibold text-white">{signal.title}</div>
                    <Badge tone={severityTone(signal.severity)}>
                      {signal.severity === "high"
                        ? "High"
                        : signal.severity === "medium"
                          ? "Medium"
                          : "Low"}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{signal.detail}</div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="mt-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100">
            Demo mode — connect Supabase to derive real signals from open
            requests and seller data.
          </div>
        )}
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Example heuristics
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Static placeholders from <code>data.ts</code>. Useful as a reference
          for what kinds of signals we may compute in the future.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {adminSignals.map((signal) => (
            <div
              key={signal.title}
              className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-4"
            >
              <div className="font-semibold text-slate-200">{signal.title}</div>
              <div className="mt-1 text-xs text-slate-500">{signal.meta}</div>
            </div>
          ))}
        </div>
      </section>
    </Card>
  );
}


// =========================================================================
// Reviews queue — appealed reviews, with approve / reject actions
// =========================================================================

function ReviewsQueueTab({
  reviews,
  supabaseSourced,
  onResolve,
}: {
  reviews: AdminReviewItem[];
  supabaseSourced: boolean;
  onResolve: (id: string) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (id: string, action: "approve" | "reject") => {
    if (!supabaseSourced) return;
    setError(null);
    setBusyId(id);
    try {
      const response = await fetch(`/api/admin/product-reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Couldn't update review.");
        return;
      }
      // Either action removes the row from the appealed-only queue.
      onResolve(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-5">
        <div>
          <h2 className="text-xl font-bold">Appealed reviews</h2>
          <p className="mt-1 text-sm text-slate-400">
            {supabaseSourced
              ? "Sellers have flagged these community reviews for admin review. Approve to keep visible, reject to hide."
              : "Demo mode — connect Supabase to load real reviews."}
          </p>
        </div>
        <Badge tone={supabaseSourced ? "green" : "amber"}>
          {supabaseSourced
            ? `Live · ${reviews.length} appeal${reviews.length === 1 ? "" : "s"}`
            : "Demo only"}
        </Badge>
      </div>

      {error && (
        <div className="m-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="p-6 text-sm text-slate-500">
          {supabaseSourced
            ? "Nothing to moderate. Community reviews land as approved; only seller appeals reach this queue."
            : "Demo mode: no reviews to show."}
        </div>
      ) : (
        <ul className="divide-y divide-white/10">
          {reviews.map((review) => {
            const isBusy = busyId === review.id;
            return (
              <li key={review.id} className="grid gap-3 p-5 lg:grid-cols-[1.6fr_0.4fr]">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="amber">Appealed</Badge>
                    <Badge tone="orange">
                      {review.rating} / {REVIEW_RATING_MAX}
                    </Badge>
                    {review.productSlug ? (
                      <Link
                        href={`/products/${review.productSlug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-sm font-semibold text-white transition hover:text-orange-200"
                      >
                        {review.productName} ↗
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold text-white">
                        {review.productName}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {review.sellerName}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-slate-200 whitespace-pre-line">
                    {review.body}
                  </p>
                  {review.appealReason && (
                    <div className="rounded-2xl border border-amber-300/20 bg-amber-500/[0.06] p-3 text-xs text-amber-100">
                      <span className="font-semibold uppercase tracking-wide text-amber-200">
                        Seller appeal:
                      </span>{" "}
                      {review.appealReason}
                    </div>
                  )}
                  <div className="text-xs text-slate-500">
                    By {review.reviewerName ?? "Buyer"} ·{" "}
                    {new Date(review.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex flex-col items-end justify-start gap-2">
                  <button
                    type="button"
                    disabled={isBusy || !supabaseSourced}
                    onClick={() => act(review.id, "approve")}
                    className="rounded-lg bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isBusy ? "Working…" : "Keep review"}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy || !supabaseSourced}
                    onClick={() => act(review.id, "reject")}
                    className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Remove review
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// =========================================================================
// Creators tab — application queue + creator profile management
// =========================================================================

function CreatorsAdminTab({
  applications,
  profiles,
  supabaseSourced,
  onApplicationResolved,
  onProfileChange,
}: {
  applications: UICreatorApplication[];
  profiles: AdminCreatorProfileItem[];
  supabaseSourced: boolean;
  onApplicationResolved: (
    id: string,
    status: UICreatorApplication["status"],
  ) => void;
  onProfileChange: (
    id: string,
    patch: Partial<AdminCreatorProfileItem>,
  ) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const reviewApplication = async (
    id: string,
    action: "approve" | "reject",
  ) => {
    if (!supabaseSourced) return;
    setError(null);
    setBusyId(id);
    try {
      const response = await fetch(`/api/admin/creator-applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          admin_notes: notes[id]?.trim() || undefined,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Couldn't update application.");
        return;
      }
      onApplicationResolved(id, action === "approve" ? "approved" : "rejected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusyId(null);
    }
  };

  const updateProfile = async (
    id: string,
    patch: { status?: CreatorProfileStatus; is_featured?: boolean },
  ) => {
    if (!supabaseSourced) return;
    setError(null);
    setBusyId(id);
    try {
      const response = await fetch(`/api/admin/creator-profiles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Couldn't update creator profile.");
        return;
      }
      onProfileChange(id, {
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.is_featured !== undefined
          ? { isFeatured: patch.is_featured }
          : {}),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setBusyId(null);
    }
  };

  const pending = applications.filter((a) => a.status === "pending");
  const reviewed = applications.filter((a) => a.status !== "pending");

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Applications queue */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <h2 className="text-xl font-bold">Creator applications</h2>
            <p className="mt-1 text-sm text-slate-400">
              {supabaseSourced
                ? "Approve to create an active creator profile, or reject with a note. Pending applications are shown first."
                : "Demo mode — connect Supabase to load applications."}
            </p>
          </div>
          <Badge tone={supabaseSourced ? "green" : "amber"}>
            {supabaseSourced
              ? `${pending.length} pending`
              : "Demo only"}
          </Badge>
        </div>

        {applications.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            {supabaseSourced
              ? "No creator applications yet."
              : "Demo mode: no applications to show."}
          </div>
        ) : (
          <ul className="divide-y divide-white/10">
            {[...pending, ...reviewed].map((app) => {
              const isBusy = busyId === app.id;
              const tone =
                app.status === "approved"
                  ? "green"
                  : app.status === "rejected"
                    ? "red"
                    : "amber";
              return (
                <li key={app.id} className="grid gap-3 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={tone}>
                      {app.status === "approved"
                        ? "Approved"
                        : app.status === "rejected"
                          ? "Rejected"
                          : "Pending"}
                    </Badge>
                    <span className="text-sm font-semibold text-white">
                      {app.creatorName}
                    </span>
                    <span className="text-xs text-slate-500">
                      {app.email}
                      {app.discord ? ` · ${app.discord}` : ""}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
                    <CreatorMetaCell label="Platforms" values={app.platforms} />
                    <CreatorMetaCell
                      label="Content"
                      values={app.contentTypes}
                    />
                    <CreatorMetaCell label="Games" values={app.gamesCovered} />
                    <div>
                      <div className="font-semibold uppercase tracking-wide text-slate-500">
                        Rate / availability
                      </div>
                      <div className="mt-1 text-slate-300">
                        {app.startingRate ?? "—"}
                        {app.availability ? ` · ${app.availability}` : ""}
                      </div>
                    </div>
                  </div>

                  {app.bio && (
                    <p className="text-sm leading-6 text-slate-300 whitespace-pre-line">
                      {app.bio}
                    </p>
                  )}
                  {app.portfolioLinks.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {app.portfolioLinks.map((link) => (
                        <a
                          key={link}
                          href={link}
                          target="_blank"
                          rel="noreferrer nofollow"
                          className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-orange-200 transition hover:bg-orange-500/10"
                        >
                          {link.replace(/^https?:\/\//, "").slice(0, 48)} ↗
                        </a>
                      ))}
                    </div>
                  )}
                  {app.adminNotes && app.status !== "pending" && (
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-xs text-slate-400">
                      <span className="font-semibold uppercase tracking-wide text-slate-500">
                        Admin note:
                      </span>{" "}
                      {app.adminNotes}
                    </div>
                  )}

                  {app.status === "pending" && supabaseSourced && (
                    <div className="grid gap-2">
                      <textarea
                        value={notes[app.id] ?? ""}
                        onChange={(e) =>
                          setNotes((prev) => ({
                            ...prev,
                            [app.id]: e.target.value,
                          }))
                        }
                        placeholder="Admin notes (optional — shown to the applicant on rejection)"
                        className="min-h-16 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/50"
                      />
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => reviewApplication(app.id, "reject")}
                          className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => reviewApplication(app.id, "approve")}
                          className="rounded-lg bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-60"
                        >
                          {isBusy ? "Working…" : "Approve + create profile"}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Creator profiles */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <h2 className="text-xl font-bold">Creator profiles</h2>
            <p className="mt-1 text-sm text-slate-400">
              Make active / hidden / suspended and feature creators. Hidden
              and suspended profiles don&apos;t appear publicly.
            </p>
          </div>
          <Badge tone={supabaseSourced ? "green" : "amber"}>
            {supabaseSourced ? `${profiles.length} profiles` : "Demo only"}
          </Badge>
        </div>

        {profiles.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No creator profiles yet — approve an application to create one.
          </div>
        ) : (
          <ul className="divide-y divide-white/10">
            {profiles.map((profile) => {
              const isBusy = busyId === profile.id;
              const statusTone =
                profile.status === "active"
                  ? "green"
                  : profile.status === "suspended"
                    ? "red"
                    : "amber";
              return (
                <li
                  key={profile.id}
                  className="grid gap-3 p-5 lg:grid-cols-[1.4fr_1fr]"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={statusTone}>
                        {CREATOR_PROFILE_STATUS_LABEL[profile.status]}
                      </Badge>
                      {profile.isFeatured && (
                        <Badge tone="orange">Featured</Badge>
                      )}
                      <Link
                        href={`/creators/${profile.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-white transition hover:text-orange-200"
                      >
                        {profile.displayName} ↗
                      </Link>
                    </div>
                    <div className="text-xs text-slate-500">
                      {profile.portfolioCount} portfolio ·{" "}
                      {profile.requestCount} requests · since{" "}
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {supabaseSourced && (
                    <div className="flex flex-wrap items-start justify-end gap-2">
                      {CREATOR_PROFILE_STATUSES.filter(
                        (s) => s !== "draft" && s !== profile.status,
                      ).map((status) => (
                        <button
                          key={status}
                          type="button"
                          disabled={isBusy}
                          onClick={() => updateProfile(profile.id, { status })}
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08] disabled:opacity-60"
                        >
                          {status === "active"
                            ? "Make active"
                            : status === "hidden"
                              ? "Hide"
                              : "Suspend"}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          updateProfile(profile.id, {
                            is_featured: !profile.isFeatured,
                          })
                        }
                        className="rounded-lg border border-orange-400/40 bg-orange-500/15 px-2.5 py-1.5 text-xs font-semibold text-orange-100 transition hover:bg-orange-500/25 disabled:opacity-60"
                      >
                        {profile.isFeatured ? "Unfeature" : "Feature"}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function CreatorMetaCell({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  return (
    <div>
      <div className="font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-slate-300">
        {values.length > 0 ? values.join(", ") : "—"}
      </div>
    </div>
  );
}
