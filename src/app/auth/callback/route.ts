import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/roles";
import { getSiteUrl } from "@/lib/site-url";

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

  // Only honour relative `next` paths so an attacker can't redirect off-site.
  const safeNext =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : null;

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${siteUrl}${safeNext ?? "/account"}`);
  }

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/login?auth=missing-code`);
  }

  const supabase = createClient();

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("[auth/callback] exchangeCodeForSession failed:", exchangeError.message);
    return NextResponse.redirect(`${siteUrl}/login?auth=exchange-failed`);
  }

  // If the caller asked for a specific destination and it's safe, honour it.
  if (safeNext) {
    return NextResponse.redirect(`${siteUrl}${safeNext}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${siteUrl}/account`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: "user" | "seller" | "admin" }>();

  if (profileError || !profile) {
    if (profileError) {
      console.error("[auth/callback] profile lookup failed:", profileError.message);
    }
    // The profiles row should exist via the trigger; if it doesn't, /account
    // is the safest landing — the user is logged in, just unrouted.
    return NextResponse.redirect(`${siteUrl}/account`);
  }

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
