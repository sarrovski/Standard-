import { cn } from "@/lib/helpers";
import type { PaymentMethod, PaymentVerificationStatus } from "@/lib/data";
import { getPaymentVisualIdentity } from "@/lib/payment-identities";

const statusStyles: Record<PaymentVerificationStatus, string> = {
  Verified: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
  "Pending verification": "border-amber-400/20 bg-amber-500/10 text-amber-100",
  "Needs re-check": "border-orange-400/20 bg-orange-500/10 text-orange-100",
  Rejected: "border-red-400/20 bg-red-500/10 text-red-100",
};

export function PaymentPill({ method, compact = false }: { method: PaymentMethod; compact?: boolean }) {
  const style = getPaymentVisualIdentity(method);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 text-xs font-medium shadow-sm shadow-black/10",
        style.className,
      )}
    >
      <span
        className={cn(
          "inline-flex h-5 min-w-7 items-center justify-center rounded-full bg-gradient-to-br px-1.5 text-[8px] font-black text-white shadow-inner shadow-white/15",
          style.markClassName,
          compact && "h-4 min-w-6 px-1 text-[7px]",
        )}
      >
        {style.mark}
      </span>
      <span>{style.label}</span>
    </span>
  );
}

export function PaymentStatusPill({ status }: { status: PaymentVerificationStatus }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-medium", statusStyles[status])}>
      {status}
    </span>
  );
}

export function NoVerifiedPayments() {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-400">
      No verified payment methods yet.
    </div>
  );
}
