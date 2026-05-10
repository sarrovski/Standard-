import { cn } from "@/lib/helpers";
import type { PaymentMethod, PaymentVerificationStatus } from "@/lib/data";

const paymentStyles: Record<
  PaymentMethod,
  { icon: string; label: string; className: string; markClassName: string }
> = {
  Crypto: {
    icon: "BTC",
    label: "Crypto",
    className: "border-amber-300/25 bg-amber-400/10 text-amber-100",
    markClassName: "from-amber-300 to-orange-500",
  },
  "PayPal G&S": {
    icon: "PP",
    label: "PayPal G&S",
    className: "border-sky-300/25 bg-sky-400/10 text-sky-100",
    markClassName: "from-sky-300 to-blue-600",
  },
  "PayPal F&F": {
    icon: "FF",
    label: "PayPal F&F",
    className: "border-blue-300/25 bg-blue-400/10 text-blue-100",
    markClassName: "from-blue-300 to-indigo-600",
  },
  Card: {
    icon: "CC",
    label: "Card",
    className: "border-emerald-300/25 bg-emerald-400/10 text-emerald-100",
    markClassName: "from-emerald-300 to-teal-600",
  },
  CashApp: {
    icon: "$",
    label: "CashApp",
    className: "border-green-300/25 bg-green-400/10 text-green-100",
    markClassName: "from-green-300 to-emerald-600",
  },
  Skrill: {
    icon: "SK",
    label: "Skrill",
    className: "border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-100",
    markClassName: "from-fuchsia-300 to-purple-700",
  },
  Wise: {
    icon: "W",
    label: "Wise",
    className: "border-teal-300/25 bg-teal-400/10 text-teal-100",
    markClassName: "from-teal-300 to-cyan-700",
  },
  "Gift Cards": {
    icon: "GC",
    label: "Gift Cards",
    className: "border-rose-300/25 bg-rose-400/10 text-rose-100",
    markClassName: "from-rose-300 to-pink-700",
  },
  "Bank Transfer": {
    icon: "BT",
    label: "Bank Transfer",
    className: "border-indigo-300/25 bg-indigo-400/10 text-indigo-100",
    markClassName: "from-indigo-300 to-violet-700",
  },
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
        "inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-2.5 text-xs font-medium shadow-sm shadow-black/10",
        style.className,
      )}
    >
      <span
        className={cn(
          "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br px-1 text-[8px] font-black text-white shadow-inner shadow-white/15",
          style.markClassName,
          compact && "h-4 min-w-5 text-[7px]",
        )}
      >
        {style.icon}
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
      Payment methods not verified yet
    </div>
  );
}
