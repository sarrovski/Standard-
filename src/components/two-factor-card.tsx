"use client";

import { useState } from "react";
import { Badge, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type TwoFactorCardProps = {
  /** False in demo mode (no Supabase env) — MFA calls are not available. */
  supabaseConfigured: boolean;
  /** Whether the user already has a verified TOTP factor. */
  initiallyEnabled: boolean;
  /** The verified factor's id, when enabled. */
  factorId: string | null;
};

type EnrollData = {
  factorId: string;
  qrCode: string;
  secret: string;
};

type View =
  | { kind: "disabled" }
  | { kind: "enrolling"; enroll: EnrollData }
  | { kind: "enabled"; factorId: string };

const PRIMARY_BTN =
  "inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 disabled:opacity-60";
const SECONDARY_BTN =
  "inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-purple-400/40 hover:text-white disabled:opacity-60";
const DANGER_BTN =
  "inline-flex items-center justify-center rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 transition hover:border-red-400/60 disabled:opacity-60";
const CODE_INPUT =
  "w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-center text-lg tracking-[0.3em] text-white outline-none transition placeholder:tracking-normal placeholder:text-slate-600 focus:border-purple-400/50 disabled:opacity-60";

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/**
 * Supabase returns `totp.qr_code` either as a ready `data:`/`http` URL or as
 * raw SVG markup depending on the version — normalise both into an <img> src.
 */
function qrSrc(raw: string): string {
  if (raw.startsWith("data:") || raw.startsWith("http")) return raw;
  return `data:image/svg+xml;utf-8,${encodeURIComponent(raw)}`;
}

export function TwoFactorCard({
  supabaseConfigured,
  initiallyEnabled,
  factorId,
}: TwoFactorCardProps) {
  const [view, setView] = useState<View>(
    initiallyEnabled && factorId
      ? { kind: "enabled", factorId }
      : { kind: "disabled" },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");

  // Demo mode: MFA isn't available without a Supabase backend.
  if (!supabaseConfigured) {
    return (
      <Card className="p-6">
        <Badge tone="amber">Not enabled</Badge>
        <h2 className="mt-4 text-2xl font-black">Two-factor authentication</h2>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          Two-factor authentication is available once Supabase auth is
          configured for this environment.
        </p>
      </Card>
    );
  }

  const startEnroll = async () => {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      // Clear any dangling unverified factors from a previously abandoned
      // attempt so a fresh enroll can't collide with them.
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const factor of factors?.all ?? []) {
        if (factor.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: factor.id });
        }
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });
      if (enrollError || !data) {
        setError(
          enrollError?.message ?? "Could not start two-factor setup.",
        );
        return;
      }
      setCode("");
      setView({
        kind: "enrolling",
        enroll: {
          factorId: data.id,
          qrCode: data.totp.qr_code,
          secret: data.totp.secret,
        },
      });
    } catch (err) {
      setError(errorMessage(err, "Could not start two-factor setup."));
    } finally {
      setBusy(false);
    }
  };

  const confirmEnroll = async (enroll: EnrollData) => {
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: verifyError } =
        await supabase.auth.mfa.challengeAndVerify({
          factorId: enroll.factorId,
          code,
        });
      if (verifyError) {
        setError(verifyError.message);
        return;
      }
      setCode("");
      setView({ kind: "enabled", factorId: enroll.factorId });
    } catch (err) {
      setError(errorMessage(err, "Could not verify the code. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const cancelEnroll = async (enroll: EnrollData) => {
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      // The factor is still unverified at this point — drop it so it doesn't
      // linger on the account.
      await supabase.auth.mfa.unenroll({ factorId: enroll.factorId });
    } catch {
      // Non-fatal: a leftover unverified factor is cleaned up on next enroll.
    } finally {
      setCode("");
      setView({ kind: "disabled" });
      setBusy(false);
    }
  };

  const removeTwoFactor = async (id: string) => {
    if (
      !window.confirm(
        "Remove two-factor authentication? You'll only need your password to sign in.",
      )
    ) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: id,
      });
      if (unenrollError) {
        setError(unenrollError.message);
        return;
      }
      setView({ kind: "disabled" });
    } catch (err) {
      setError(errorMessage(err, "Could not remove two-factor authentication."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      {view.kind === "disabled" && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge tone="amber">Not enabled</Badge>
              <h2 className="mt-4 text-2xl font-black">
                Two-factor authentication
              </h2>
            </div>
            <button
              type="button"
              onClick={startEnroll}
              disabled={busy}
              className={SECONDARY_BTN}
            >
              {busy ? "Starting…" : "Set up 2FA"}
            </button>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Add a time-based one-time code from an authenticator app as a second
            step when you sign in.
          </p>
        </>
      )}

      {view.kind === "enrolling" && (
        <>
          <Badge tone="purple">Setup in progress</Badge>
          <h2 className="mt-4 text-2xl font-black">
            Two-factor authentication
          </h2>

          <div className="mt-5 space-y-5">
            <div>
              <p className="text-sm font-semibold text-slate-200">
                1. Scan this QR code
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Use an authenticator app like 1Password, Authy, or Google
                Authenticator.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc(view.enroll.qrCode)}
                alt="Two-factor authentication QR code"
                className="mt-3 h-44 w-44 rounded-xl bg-white p-2"
              />
              <p className="mt-3 text-xs text-slate-500">
                Can&apos;t scan it? Enter this key manually:
              </p>
              <code className="mt-1 block break-all rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
                {view.enroll.secret}
              </code>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-200">
                2. Enter the 6-digit code
              </p>
              <input
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                disabled={busy}
                className={`mt-2 ${CODE_INPUT}`}
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => confirmEnroll(view.enroll)}
                disabled={busy || code.length !== 6}
                className={PRIMARY_BTN}
              >
                {busy ? "Verifying…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => cancelEnroll(view.enroll)}
                disabled={busy}
                className={SECONDARY_BTN}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {view.kind === "enabled" && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge tone="green">Enabled</Badge>
              <h2 className="mt-4 text-2xl font-black">
                Two-factor authentication
              </h2>
            </div>
            <button
              type="button"
              onClick={() => removeTwoFactor(view.factorId)}
              disabled={busy}
              className={DANGER_BTN}
            >
              {busy ? "Removing…" : "Remove 2FA"}
            </button>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-400">
            Your account is protected with an authenticator app. You&apos;ll be
            asked for a code each time you sign in.
          </p>
          {error && (
            <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}
        </>
      )}

      {view.kind === "disabled" && error && (
        <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}
    </Card>
  );
}
