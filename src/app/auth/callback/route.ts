import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/roles";
import { getSiteUrl } from "@/lib/site-url";
import { getAalState } from "@/lib/supabase/mfa";

/**
 * Magic-link / OAuth landing route.
 *
 * Flow:
 *   1. Exchange the `code` query param for a session (sets the auth cookies).
 *   2. Look up the profile's role from public.profiles (auto-created by the
 *      migration 002 trigger on signup).
 *   3. Redirect by role:
 *        admin  -> /admin
 *        seller -> /dashboard
 *        user   -> /account
 *      An explicit ?next= query param overrides the role-based redirect, but
 *      only for relative paths (security: never honour absolute redirects).
 *
 * Failure modes are non-fatal: if the code exchange fails, the profile row is
 * missing, or the role can't be read, we fall back to /account so the user
 * isn't locked out. Errors are logged for observability.
 *
 * Demo mode (no Supabase env vars) just redirects to /account.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next");
  const siteUrl = getSiteUrl();

  // Verbose callback logs so the auth flow is debuggable from Vercel logs
  // without rebuilding. Doesn't log the code itself (treat as a secret).
  const log = (step: string, extra?: Record<string, unknown>) => {
    console.log(
      "[auth/callback]",
      step,
      JSON.stringify({
        siteUrl,
        hasCode: Boolean(code),
        nextParam,
        ...(extra ?? {}),
      }),
    );
  };

  log("entered");

  // Only honour relative `next` paths so an attacker can't redirect off-site.
  const safeNext =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : null;

  if (!isSupabaseConfigured()) {
    log("supabase-not-configured");
    return NextResponse.redirect(`${siteUrl}${safeNext ?? "/account"}`);
  }

  if (!code) {
    log("missing-code");
    return NextResponse.redirect(`${siteUrl}/login?auth=missing-code`);
  }

  const supabase = createClient();

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error(
      "[auth/callback] exchangeCodeForSession failed:",
      exchangeError.message,
    );
    return NextResponse.redirect(`${siteUrl}/login?auth=exchange-failed`);
  }
  log("exchange-ok");

  // Enforce 2FA on magic-link / OAuth logins too: if the user has a verified
  // factor, send them to /login to complete the TOTP challenge before any
  // role destination (or ?next= target).
  const aal = await getAalState(supabase);
  if (aal.needsChallenge) {
    log("mfa-challenge-required");
    return NextResponse.redirect(`${siteUrl}/login`);
  }

  // If the caller asked for a specific destination and it's safe, honour it.
  if (safeNext) {
    log("redirect-safe-next", { safeNext });
    return NextResponse.redirect(`${siteUrl}${safeNext}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    log("no-user-after-exchange");
    return NextResponse.redirect(`${siteUrl}/account`);
  }
  log("user-resolved", { userId: user.id });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: "user" | "seller" | "admin" }>();

  if (profileError || !profile) {
    if (profileError) {
      console.error(
        "[auth/callback] profile lookup failed:",
        profileError.message,
      );
    }
    log("no-profile-row", { userId: user.id });
    // The profiles row should exist via the trigger; if it doesn't, /account
    // is the safest landing — the user is logged in, just unrouted.
    return NextResponse.redirect(`${siteUrl}/account`);
  }

  log("redirect-by-role", { role: profile.role });

  switch (profile.role) {
    case "admin":
      return NextResponse.redirect(`${siteUrl}/admin`);
    case "seller":
      return NextResponse.redirect(`${siteUrl}/dashboard`);
    case "user":
    default:
      return NextResponse.redirect(`${siteUrl}/account`);
  }
}
