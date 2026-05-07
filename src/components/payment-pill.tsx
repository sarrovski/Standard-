import { cn } from "@/lib/helpers";
import type { PaymentMethod, PaymentVerificationStatus } from "@/lib/data";

const paymentStyles: Record<PaymentMethod, { icon: string; label: string; className: string }> = {
  Crypto: { icon: "₿", label: "Crypto", className: "border-amber-400/20 bg-amber-500/10 text-amber-100" },
  "PayPal G&S": { icon: "P", label: "PayPal G&S", className: "border-sky-400/20 bg-sky-500/10 text-sky-100" },
  "PayPal F&F": { icon: "P", label: "PayPal F&F", className: "border-blue-400/20 bg-blue-500/10 text-blue-100" },
  Card: { icon: "◫", label: "Card", className: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" },
  CashApp: { icon: "$", label: "CashApp", className: "border-green-400/20 bg-green-500/10 text-green-100" },
  Skrill: { icon: "S", label: "Skrill", className: "border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-100" },
  Wise: { icon: "W", label: "Wise", className: "border-teal-400/20 bg-teal-500/10 text-teal-100" },
  "Gift Cards": { icon: "🎁", label: "Gift Cards", className: "border-rose-400/20 bg-rose-500/10 text-rose-100" },
  "Bank Transfer": { icon: "⇄", label: "Bank Transfer", className: "border-indigo-400/20 bg-indigo-500/10 text-indigo-100" },
};

const statusStyles: Record<PaymentVerificationStatus, string> = {
  Verified: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
  "Pending verification": "border-amber-400/20 bg-amber-500/10 text-amber-100",
  "Needs re-check": "border-orange-400/20 bg-orange-500/10 text-orange-100",
  Rejected: "border-red-400/20 bg-red-500/10 text-red-100",
};

export function PaymentPill({ method, compact = false }: { method: PaymentMethod; compact?: boolean }) {
  const style = paymentStyles[method];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium",
        style.className,
      )}
    >
      <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-black/15 text-[11px] font-bold", compact && "h-4 w-4 text-[10px]")}>{style.icon}</span>
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
      Payment methods not verified yet
    </div>
  );
}
