"use client";

import { useEffect, useState, type FormEvent } from "react";

type Reason =
  | "misleading_information"
  | "payment_issue"
  | "impersonation"
  | "broken_official_link"
  | "unsafe_or_prohibited"
  | "other";

const REASON_OPTIONS: ReadonlyArray<{ value: Reason; label: string }> = [
  { value: "misleading_information", label: "Misleading information" },
  { value: "payment_issue", label: "Payment issue" },
  { value: "impersonation", label: "Impersonation" },
  { value: "broken_official_link", label: "Broken official link" },
  { value: "unsafe_or_prohibited", label: "Unsafe or prohibited content" },
  { value: "other", label: "Other" },
];

const MAX_DETAILS = 2000;

/**
 * Small "Report listing" link that opens a modal letting any visitor flag
 * a product. Anonymous reports are allowed; authenticated users have their
 * profile id attached server-side. The API enforces validation,
 * deduplication, and rate-limiting — this component just collects input.
 */
export function ReportListingButton({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>("misleading_information");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Close on Escape, lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const reset = () => {
    setReason("misleading_information");
    setDetails("");
    setError(null);
    setDone(false);
  };

  const close = () => {
    setOpen(false);
    // Reset after the modal animates out so the user doesn't see flash.
    setTimeout(reset, 200);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (details.length > MAX_DETAILS) {
      setError(`Details must be ${MAX_DETAILS} characters or fewer.`);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/product-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          reason,
          details: details.trim() || undefined,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(payload.error ?? "Couldn't submit report. Try again.");
        return;
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-orange-400/40 hover:bg-orange-500/10 hover:text-orange-100"
      >
        <span aria-hidden="true">⚠</span>
        Report listing
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-listing-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="Close report dialog"
            onClick={close}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-black/40">
            <h2
              id="report-listing-title"
              className="text-xl font-black tracking-tight"
            >
              Report listing
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Let our trust team know what&apos;s wrong. Reports are reviewed
              by the Standard team. Your identity is not shared with the
              seller.
            </p>

            {done ? (
              <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                Report submitted. Thanks for the heads up — the team will
                look at it.
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-400"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm font-semibold text-slate-200">
                  Reason
                  <select
                    value={reason}
                    onChange={(event) => setReason(event.target.value as Reason)}
                    className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/50"
                  >
                    {REASON_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-200">
                  Details (optional)
                  <textarea
                    value={details}
                    onChange={(event) => setDetails(event.target.value)}
                    maxLength={MAX_DETAILS}
                    placeholder="Anything specific the team should know."
                    className="min-h-28 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-400/50"
                  />
                  <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    {details.length} / {MAX_DETAILS}
                  </span>
                </label>

                {error && (
                  <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white shadow-[0_8px_24px_-12px_rgba(249,115,22,0.65)] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Submitting…" : "Submit report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
