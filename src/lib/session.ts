import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/roles";

export type SessionRole = "user" | "seller" | "admin";

export type SessionUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: SessionRole;
};

/**
 * Server-side session loader used by the top-right account menu.
 *
 * Returns null when:
 *   - Supabase isn't configured (demo mode → Nav shows the Login link).
 *   - There's no authenticated session.
 *   - The profile row hasn't materialised yet (the 002 trigger normally
 *     creates it on signup; falling back to null is safer than guessing
 *     a role).
 *
 * Wrapped in React `cache()` so multiple components that need the
 * session in a single render (e.g. Nav + the page itself) share a
 * single auth + profiles round-trip.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name, avatar_url, role")
    .eq("id", user.id)
    .maybeSingle<{
      id: string;
      email: string | null;
      display_name: string | null;
      avatar_url: string | null;
      role: SessionRole;
    }>();
  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    role: profile.role,
  };
});
