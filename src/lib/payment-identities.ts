import type { PaymentMethod } from "@/lib/data";

export type PaymentVisualIdentity = {
  mark: string;
  label: string;
  className: string;
  markClassName: string;
};

const paymentIdentities: Record<PaymentMethod, PaymentVisualIdentity> = {
  Crypto: {
    mark: "BTC",
    label: "Crypto",
    className: "border-amber-300/25 bg-amber-400/10 text-amber-100",
    markClassName: "from-amber-300 to-orange-500",
  },
  "PayPal G&S": {
    mark: "PP",
    label: "PayPal G&S",
    className: "border-sky-300/25 bg-sky-400/10 text-sky-100",
    markClassName: "from-sky-300 to-blue-600",
  },
  "PayPal F&F": {
    mark: "PP",
    label: "PayPal F&F",
    className: "border-blue-300/25 bg-blue-400/10 text-blue-100",
    markClassName: "from-blue-300 to-indigo-600",
  },
  Card: {
    mark: "CARD",
    label: "Card",
    className: "border-emerald-300/25 bg-emerald-400/10 text-emerald-100",
    markClassName: "from-emerald-300 to-teal-600",
  },
  CashApp: {
    mark: "$",
    label: "CashApp",
    className: "border-green-300/25 bg-green-400/10 text-green-100",
    markClassName: "from-green-300 to-emerald-600",
  },
  Skrill: {
    mark: "S",
    label: "Skrill",
    className: "border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-100",
    markClassName: "from-fuchsia-300 to-purple-700",
  },
  Wise: {
    mark: "W",
    label: "Wise",
    className: "border-teal-300/25 bg-teal-400/10 text-teal-100",
    markClassName: "from-teal-300 to-cyan-700",
  },
  "Gift Cards": {
    mark: "GC",
    label: "Gift Cards",
    className: "border-rose-300/25 bg-rose-400/10 text-rose-100",
    markClassName: "from-rose-300 to-pink-700",
  },
  "Bank Transfer": {
    mark: "BANK",
    label: "Bank Transfer",
    className: "border-indigo-300/25 bg-indigo-400/10 text-indigo-100",
    markClassName: "from-indigo-300 to-violet-700",
  },
};

function fallbackMark(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
}

export function getPaymentVisualIdentity(method: string): PaymentVisualIdentity {
  const identity = paymentIdentities[method as PaymentMethod];
  if (identity) return identity;

  return {
    mark: fallbackMark(method) || "?",
    label: method,
    className: "border-white/10 bg-white/[0.04] text-slate-200",
    markClassName: "from-slate-500 to-slate-800",
  };
}
