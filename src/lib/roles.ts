import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAalState } from "@/lib/supabase/mfa";

export type AppRole = "user" | "seller" | "admin";

export function isSupabaseConfigured(): boolean {
  // Strict check: reject empty/whitespace values too, so a misconfigured
  // env var (set to "") doesn't make the app think Supabase is available
  // and then hang on a query against a non-URL.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key);
}

/**
 * Server-side route guard.
 *
 * Behavior:
 *   - Demo mode (no Supabase env vars): pass-through, returns
 *     { user: null, role: 'demo' }. Preview deploys stay clickable.
 *   - Configured: requires an authenticated user whose `profiles.role` is in
 *     `allowedRoles`. Otherwise redirects.
 *
 * Redirect targets:
 *   - Not authenticated  -> /login
 *   - Authenticated but missing or wrong role -> /account
 *
 * Notes:
 *   - We don't pass a `next` query param because we don't have the request
 *     URL here (server components don't expose it cleanly). If we add deep
 *     return-to support later it should live in middleware, not here.
 *   - The demo escape hatch is intentional per the project's D2 decision.
 *     Production must always set Supabase env vars.
 */
export async function requireRole(allowedRoles: AppRole[]) {
  if (!isSupabaseConfigured()) {
    return { user: null, role: "demo" as const };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Enforce 2FA: a user with a verified TOTP factor must complete the login
  // challenge before reaching any guarded route. The /login page detects the
  // pending challenge on mount and shows the code step.
  const aal = await getAalState(supabase);
  if (aal.needsChallenge) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: AppRole }>();

  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect("/account");
  }

  return { user, role: profile.role };
}
