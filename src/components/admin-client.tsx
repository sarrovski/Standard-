"use client";

import { useEffect, useState } from "react";
import { Badge, Card, MiniStat } from "@/components/ui";
import { adminSignals, products as demoProducts, featuredSlots, paymentVerificationQueue, providerTagRequests, submissionQueue } from "@/lib/data";
import { getLocalProducts, getPaymentRequests, saveLocalProducts, savePaymentRequests } from "@/lib/product-store";
import type { LocalPaymentRequest, LocalProduct } from "@/lib/product-types";
import { PaymentPill, PaymentStatusPill } from "@/components/payment-pill";

export function AdminClient() {
  const [requests, setRequests] = useState<LocalPaymentRequest[]>([]);
  const [localProducts, setProducts] = useState<LocalProduct[]>([]);

  useEffect(() => {
    setRequests(getPaymentRequests());
    setProducts(getLocalProducts());
  }, []);

  const updateRequest = (request: LocalPaymentRequest, status: "Verified" | "Rejected" | "Needs re-check") => {
    const updatedRequests = requests.map((item) =>
      item.id === request.id ? { ...item, status } : item,
    );
    setRequests(updatedRequests);
    savePaymentRequests(updatedRequests);

    if (status === "Verified") {
      const updatedProducts = localProducts.map((product) => {
        if (product.slug !== request.productSlug) return product;
        const alreadyVerified = product.verifiedPayments.includes(request.method);
        return {
          ...product,
          verifiedPayments: alreadyVerified ? product.verifiedPayments : [...product.verifiedPayments, request.method],
          paymentProfiles: [
            ...product.paymentProfiles.filter((payment) => payment.method !== request.method),
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
      setProducts(updatedProducts);
      saveLocalProducts(updatedProducts);
    }
  };

  const allRequests = [...requests, ...paymentVerificationQueue];

  return (
    <div className="mt-8 space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <MiniStat label="Open submissions" value={String(submissionQueue.length)} detail="Need review" />
        <MiniStat label="Payment requests" value={String(allRequests.length)} detail="demo + database-ready" />
        <MiniStat label="Demo products" value={String(localProducts.length)} detail="created in builder" />
        <MiniStat label="Risk signals" value={String(adminSignals.length)} detail="Watchlist" />
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {["Sellers", "Products", "Payment Verification", "Provider Tag Requests", "Featured Slots", "Admin Actions"].map((section) => (
          <Card key={section} className="p-4">
            <div className="text-sm font-bold">{section}</div>
            <p className="mt-2 text-xs leading-5 text-slate-500">Supabase-backed admin section scaffold.</p>
          </Card>
        ))}
      </section>

      <Card className="overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <h2 className="text-xl font-bold">Payment Verification Queue</h2>
          <p className="mt-1 text-sm text-slate-400">
            Approving a demo payment request makes that payment method public on the product and marketplace filters.
          </p>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          {allRequests.map((item: any) => {
            const isLocal = "id" in item;
            return (
              <Card key={item.id || item.seller + item.product + item.method} className="p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{item.seller}</h3>
                      <p className="mt-1 text-sm text-slate-500">{item.productName || item.product}</p>
                    </div>
                    <PaymentStatusPill status={item.status} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <PaymentPill method={item.method} />
                    <Badge tone={item.risk === "High" ? "red" : item.risk === "Medium" ? "amber" : "green"}>{item.risk} risk</Badge>
                    {isLocal && <Badge tone="purple">Demo</Badge>}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
                    <div><span className="text-slate-500">Proof:</span> {item.submittedProof || item.proofNote}</div>
                    <div className="mt-2"><span className="text-slate-500">Checkout:</span> {item.checkoutUrl}</div>
                    <div className="mt-2"><span className="text-slate-500">Refund policy:</span> {item.refundPolicy}</div>
                  </div>
                  {isLocal ? (
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => updateRequest(item, "Verified")} className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">Approve</button>
                      <button onClick={() => updateRequest(item, "Needs re-check")} className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300">Request more proof</button>
                      <button onClick={() => updateRequest(item, "Rejected")} className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">Reject</button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Demo request. Actions are shown on demo requests.</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Panel title="Provider / Developer tag requests">
          <div className="space-y-3">
            {providerTagRequests.map((request) => (
              <div key={request.seller + request.product} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-bold">{request.product}</div>
                    <div className="mt-1 text-xs text-slate-500">{request.seller}</div>
                  </div>
                  <Badge tone={request.status === "Approved" ? "green" : "amber"}>{request.status}</Badge>
                </div>
              </div>
            ))}
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
              {[...localProducts, ...demoProducts].map((product: any) => (
                <tr key={product.slug} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-4 font-semibold">{product.name}</td>
                  <td className="px-4 py-4 text-slate-400">{product.seller}</td>
                  <td className="px-4 py-4"><Badge>{product.sellerTag}</Badge></td>
                  <td className="px-4 py-4"><Badge tone={product.productStatus === "Verified" ? "green" : "amber"}>{product.productStatus}</Badge></td>
                  <td className="px-4 py-4 text-slate-400">{product.verifiedPayments.length || "None"}</td>
                </tr>
              ))}
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
