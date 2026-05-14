import type { createClient } from "./client";

/**
 * Helpers around Supabase's MFA (TOTP) API, shared by the login challenge UI,
 * the account-page enrollment card, and the server-side AAL enforcement in
 * `requireRole` and the auth callback.
 *
 * The client type is derived from the project's own browser factory rather
 * than annotated with `SupabaseClient<Database>` — @supabase/ssr 0.5.2 and
 * @supabase/supabase-js 2.105.3 disagree on `SupabaseClient`'s generic arity,
 * so a direct annotation doesn't match what the factories actually return.
 * The browser and server factories produce the same client type, so a value
 * from either is accepted here.
 */
type SupabaseSsrClient = ReturnType<typeof createClient>;

export type AalState = {
  /**
   * True when the session is password-only (`aal1`) but the user has a
   * verified factor available (`aal2`) — i.e. they still owe a TOTP challenge.
   */
  needsChallenge: boolean;
  currentLevel: string | null;
  nextLevel: string | null;
};

/**
 * Read the session's Authenticator Assurance Level.
 *
 * Fails open: on any MFA-API error this reports `needsChallenge: false`, so a
 * transient failure can't hard-lock every enrolled user out of the app. The
 * login challenge step is still reachable normally; this only governs the
 * server-side *enforcement* gate.
 */
export async function getAalState(
  supabase: SupabaseSsrClient,
): Promise<AalState> {
  const { data, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) {
    return { needsChallenge: false, currentLevel: null, nextLevel: null };
  }
  const { currentLevel, nextLevel } = data;
  return {
    needsChallenge: currentLevel === "aal1" && nextLevel === "aal2",
    currentLevel,
    nextLevel,
  };
}

export type VerifiedTotpFactor = {
  id: string;
  friendlyName: string | null;
};

/**
 * Return the user's first verified TOTP factor, or `null` if none is enrolled.
 * `listFactors().data.totp` is already verified-only (see auth-js
 * `_listFactors`).
 */
export async function getVerifiedTotpFactor(
  supabase: SupabaseSsrClient,
): Promise<VerifiedTotpFactor | null> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return null;
  const factor = data.totp?.[0];
  if (!factor) return null;
  return { id: factor.id, friendlyName: factor.friendly_name ?? null };
}
