"use client";

import { useEffect, useState } from "react";
import { Badge, Card, MiniStat } from "@/components/ui";
import {
  adminSignals,
  products as demoProducts,
  featuredSlots,
  paymentVerificationQueue,
  providerTagRequests as demoProviderTagRequests,
  submissionQueue,
} from "@/lib/data";
import {
  getLocalProducts,
  getPaymentRequests,
  saveLocalProducts,
  savePaymentRequests,
} from "@/lib/product-store";
import type { LocalPaymentRequest, LocalProduct } from "@/lib/product-types";
import type {
  UIAdminPaymentRequest,
  UIAdminProviderTagRequest,
} from "@/lib/adapters";
import { PaymentPill, PaymentStatusPill } from "@/components/payment-pill";

type AdminClientProps = {
  initialPaymentRequests: UIAdminPaymentRequest[] | null;
  initialProviderTagRequests: UIAdminProviderTagRequest[] | null;
};

export function AdminClient({
  initialPaymentRequests,
  initialProviderTagRequests,
}: AdminClientProps) {
  const supabaseSourced = initialPaymentRequests !== null;

  // Demo-mode state: live local store backed by product-store.ts.
  const [demoRequests, setDemoRequests] = useState<LocalPaymentRequest[]>([]);
  const [demoLocalProducts, setDemoLocalProducts] = useState<LocalProduct[]>([]);

  useEffect(() => {
    if (supabaseSourced) return;
    setDemoRequests(getPaymentRequests());
    setDemoLocalProducts(getLocalProducts());
  }, [supabaseSourced]);

  // Demo-only mutation. Approve/reject writes for Supabase data are deferred
  // to Batch 5 so we don't run partial writes against a real DB yet.
  const updateDemoRequest = (
    request: LocalPaymentRequest,
    status: "Verified" | "Rejected" | "Needs re-check",
  ) => {
    const updatedRequests = demoRequests.map((item) =>
      item.id === request.id ? { ...item, status } : item,
    );
    setDemoRequests(updatedRequests);
    savePaymentRequests(updatedRequests);

    if (status === "Verified") {
      const updatedProducts = demoLocalProducts.map((product) => {
        if (product.slug !== request.productSlug) return product;
        const alreadyVerified = product.verifiedPayments.includes(request.method);
        return {
          ...product,
          verifiedPayments: alreadyVerified
            ? product.verifiedPayments
            : [...product.verifiedPayments, request.method],
          paymentProfiles: [
            ...product.paymentProfiles.filter(
              (payment) => payment.method !== request.method,
            ),
            {
              method: request.method,
              status: "Verified" as const,
              processor: request.processor,
              proofType: "Admin-approved MVP proof",
              proofNote: request.proofNote,
              checkoutUrl: request.checkoutUrl,
              refundPolicy: request.refundPolicy,
            },
          ],
        };
      });
      setDemoLocalProducts(updatedProducts);
      saveLocalProducts(updatedProducts);
    }
  };

  // Build the unified queue list. In Supabase mode we render the server-fetched
  // rows; in demo mode we combine the in-memory local store with the data.ts
  // fixture queue, like before.
  type QueueItem =
    | (UIAdminPaymentRequest & { _source: "supabase" })
    | (LocalPaymentRequest & { _source: "demo-local" })
    | (typeof paymentVerificationQueue[number] & { _source: "demo-fixture" });

  const queueItems: QueueItem[] = supabaseSourced
    ? (initialPaymentRequests ?? []).map((r) => ({ ...r, _source: "supabase" as const }))
    : [
        ...demoRequests.map((r) => ({ ...r, _source: "demo-local" as const })),
        ...paymentVerificationQueue.map((r) => ({ ...r, _source: "demo-fixture" as const })),
      ];

  const tagRequestItems = supabaseSourced
    ? initialProviderTagRequests ?? []
    : demoProviderTagRequests.map((r) => ({
        id: r.seller + r.product,
        seller: r.seller,
        product: r.product,
        status: r.status as "Pending" | "Approved" | "Rejected",
      }));

  return (
    <div className="mt-8 space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <MiniStat
          label="Open submissions"
          value={String(submissionQueue.length)}
          detail="Need review"
        />
        <MiniStat
          label="Payment requests"
          value={String(queueItems.length)}
          detail={supabaseSourced ? "from Supabase" : "demo + database-ready"}
        />
        <MiniStat
          label={supabaseSourced ? "Data source" : "Demo products"}
          value={supabaseSourced ? "Supabase" : String(demoLocalProducts.length)}
          detail={supabaseSourced ? "live" : "created in builder"}
        />
        <MiniStat
          label="Risk signals"
          value={String(adminSignals.length)}
          detail="Watchlist"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {["Sellers", "Products", "Payment Verification", "Provider Tag Requests", "Featured Slots", "Admin Actions"].map(
          (section) => (
            <Card key={section} className="p-4">
              <div className="text-sm font-bold">{section}</div>
              <p className="mt-2 text-xs leading-5 text-slate-500">Supabase-backed admin section scaffold.</p>
            </Card>
          ),
        )}
      </section>

      <Card className="overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <h2 className="text-xl font-bold">Payment Verification Queue</h2>
          <p className="mt-1 text-sm text-slate-400">
            {supabaseSourced
              ? "Showing pending and needs-recheck requests from Supabase. Approve/reject actions land in Batch 5."
              : "Approving a demo payment request makes that payment method public on the product and marketplace filters."}
          </p>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          {queueItems.map((item) => {
            const keyId =
              item._source === "supabase" || item._source === "demo-local"
                ? item.id
                : item.seller + item.product + item.method;

            const productLabel =
              item._source === "demo-local"
                ? item.productName
                : item.product;
            const proof =
              item._source === "demo-local"
                ? item.proofNote
                : item._source === "supabase"
                  ? item.submittedProof
                  : item.submittedProof;
            const checkoutUrl =
              "checkoutUrl" in item ? item.checkoutUrl : "—";
            const refundPolicy =
              "refundPolicy" in item ? item.refundPolicy : "—";
            const risk = "risk" in item ? item.risk : "Medium";

            return (
              <Card key={keyId} className="p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{item.seller}</h3>
                      <p className="mt-1 text-sm text-slate-500">{productLabel}</p>
                    </div>
                    <PaymentStatusPill status={item.status} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <PaymentPill method={item.method} />
                    <Badge tone={risk === "High" ? "red" : risk === "Medium" ? "amber" : "green"}>
                      {risk} risk
                    </Badge>
                    {item._source === "supabase" && <Badge tone="green">Live</Badge>}
                    {item._source === "demo-local" && <Badge tone="purple">Demo</Badge>}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
                    <div><span className="text-slate-500">Proof:</span> {proof}</div>
                    <div className="mt-2"><span className="text-slate-500">Checkout:</span> {checkoutUrl}</div>
                    <div className="mt-2"><span className="text-slate-500">Refund policy:</span> {refundPolicy}</div>
                  </div>
                  {item._source === "demo-local" ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => updateDemoRequest(item, "Verified")}
                        className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateDemoRequest(item, "Needs re-check")}
                        className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300"
                      >
                        Request more proof
                      </button>
                      <button
                        onClick={() => updateDemoRequest(item, "Rejected")}
                        className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300"
                      >
                        Reject
                      </button>
                    </div>
                  ) : item._source === "supabase" ? (
                    <p className="text-xs text-slate-500">
                      Approve/reject writes wired in Batch 5.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">Demo request. Actions are shown on demo requests.</p>
                  )}
                </div>
              </Card>
            );
          })}
          {queueItems.length === 0 && (
            <p className="col-span-full text-sm text-slate-500">
              No pending payment verification requests.
            </p>
          )}
        </div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Panel title="Provider / Developer tag requests">
          <div className="space-y-3">
            {tagRequestItems.map((request) => (
              <div
                key={request.id}
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
            ))}
            {tagRequestItems.length === 0 && (
              <p className="text-sm text-slate-500">No pending provider tag requests.</p>
            )}
          </div>
        </Panel>

        <Panel title="Signal Center">
          <div className="space-y-3">
            {adminSignals.map((signal) => (
              <div key={signal.title} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="font-semibold">{signal.title}</div>
                <div className="mt-1 text-xs text-slate-500">{signal.meta}</div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel title="Featured Slots">
          <div className="space-y-3">
            {featuredSlots.map((slot) => (
              <div key={slot.category} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-bold">{slot.category}</div>
                    <div className="mt-1 text-xs text-slate-500">One active slot per game/category.</div>
                  </div>
                  <Badge tone={slot.status === "Available" ? "green" : "amber"}>{slot.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Admin Actions">
          <div className="space-y-3">
            {["Approve payment proof", "Reject provider tag", "Request more proof"].map((action) => (
              <div key={action} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                {action}
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <Panel title="Product moderation">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Tag</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payments</th>
              </tr>
            </thead>
            <tbody>
              {(supabaseSourced ? demoProducts : [...demoLocalProducts, ...demoProducts]).map(
                (product) => (
                  <tr key={product.slug} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-4 font-semibold">{product.name}</td>
                    <td className="px-4 py-4 text-slate-400">{product.seller}</td>
                    <td className="px-4 py-4">
                      <Badge>{product.sellerTag}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={product.productStatus === "Verified" ? "green" : "amber"}>
                        {product.productStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-slate-400">
                      {product.verifiedPayments.length || "None"}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-white/10 p-5">
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}
