"use client";

import type { PaymentProfile } from "@/lib/data";

/**
 * Compact trust-signal panel rendered next to the product page's
 * primary CTA. Mostly check-icon labels plus contact links — designed
 * to reduce hesitation before the buyer clicks through to the seller
 * site.
 *
 * Items adapt to the real product data:
 *   - verifiedPaymentCount: shown when there's at least one verified
 *     payment method on the seller
 *   - hasRefundPolicy: true if any verified payment method has a
 *     refund policy URL on file
 *   - hasSupport: true when seller exposes Discord or Telegram
 *   - websiteUrl / discord / telegram: contact links beneath the
 *     check list
 */

type TrustBoxProps = {
  paymentProfiles: PaymentProfile[];
  websiteUrl?: string;
  discord?: string;
  telegram?: string;
  sellerTag: string;
};

export function TrustBox({
  paymentProfiles,
  websiteUrl,
  discord,
  telegram,
  sellerTag,
}: TrustBoxProps) {
  const verifiedPaymentCount = paymentProfiles.filter(
    (profile) => profile.status === "Verified",
  ).length;
  const hasRefundPolicy = paymentProfiles.some(
    (profile) => profile.refundPolicy && profile.refundPolicy !== "—",
  );
  const refundUrl = paymentProfiles.find(
    (profile) => profile.refundPolicy && profile.refundPolicy !== "—",
  )?.refundPolicy;
  const hasSupport = Boolean(discord || telegram);
  const isVerifiedSeller =
    sellerTag === "Provider / Developer" || sellerTag === "Verified Seller";

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-200/80">
        Why buy through Standard
      </div>

      <ul className="mt-3 grid gap-2 text-sm">
        <TrustRow
          ok
          label="Secure checkout via verified payment methods"
          detail={
            verifiedPaymentCount > 0
              ? `${verifiedPaymentCount} verified ${verifiedPaymentCount === 1 ? "method" : "methods"} on file`
              : "Payment methods reviewed by Standard"
          }
        />
        <TrustRow
          ok
          label="Fast delivery"
          detail="Sellers ship instantly after checkout on their site"
        />
        <TrustRow
          ok={hasSupport}
          label="Support included"
          detail={
            hasSupport
              ? "Reach the seller via Discord or Telegram"
              : "No support channel listed yet"
          }
        />
        <TrustRow
          ok={hasRefundPolicy}
          label="Refund policy on file"
          detail={
            hasRefundPolicy
              ? "Linked from the seller's verified payment method"
              : "Ask the seller for their refund terms"
          }
          href={hasRefundPolicy ? refundUrl ?? undefined : undefined}
        />
        <TrustRow
          ok={isVerifiedSeller}
          label="Seller verification"
          detail={
            isVerifiedSeller
              ? `${sellerTag} — reviewed by Standard`
              : "Standard reviews seller submissions"
          }
        />
      </ul>

      {(websiteUrl || discord || telegram) && (
        <div className="mt-4 grid gap-2 border-t border-white/10 pt-3 text-xs">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Contact the seller
          </div>
          {websiteUrl ? (
            <ContactLink label="Website" value={websiteUrl} href={websiteUrl} />
          ) : null}
          {discord ? (
            <ContactLink
              label="Discord"
              value={discord}
              href={normalizeDiscord(discord)}
            />
          ) : null}
          {telegram ? (
            <ContactLink
              label="Telegram"
              value={telegram}
              href={normalizeTelegram(telegram)}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function TrustRow({
  ok,
  label,
  detail,
  href,
}: {
  ok: boolean;
  label: string;
  detail: string;
  href?: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className={
          "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border " +
          (ok
            ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
            : "border-amber-400/30 bg-amber-500/10 text-amber-300")
        }
      >
        {ok ? (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12l5 5 9-11" />
          </svg>
        ) : (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        )}
      </span>
      <div className="min-w-0">
        <div className="font-semibold text-white">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-white underline-offset-2 hover:underline"
            >
              {label}
            </a>
          ) : (
            label
          )}
        </div>
        <div className="text-xs text-slate-400">{detail}</div>
      </div>
    </li>
  );
}

/**
 * Sellers enter Discord handles in inconsistent shapes — "discord.gg/foo",
 * "@foo", "https://discord.gg/foo", etc. Normalize to a clickable URL
 * without ending up with double-prefixed links like
 * "https://discord.gg/discord.gg/foo".
 */
function normalizeDiscord(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.toLowerCase().startsWith("discord.")) return `https://${trimmed}`;
  return `https://discord.gg/${trimmed.replace(/^@/, "")}`;
}

function normalizeTelegram(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.toLowerCase().startsWith("t.me/")) return `https://${trimmed}`;
  return `https://t.me/${trimmed.replace(/^@/, "")}`;
}

function ContactLink({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="truncate text-orange-200 underline-offset-2 hover:underline"
      >
        {value}
      </a>
    </div>
  );
}
