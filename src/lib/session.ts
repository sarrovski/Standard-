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
  /**
   * True when this profile owns a creator_profiles row (any status).
   * Drives the "Creator Dashboard" entry in the account menu. A user can
   * be a creator AND a seller — creator-ness is not a role, it's a
   * linked profile (see migration 017).
   */
  isCreator: boolean;
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

  // First try with avatar_url. If the migration 014 hasn't been applied
  // yet, PostgREST errors on the unknown column. Falling back to the
  // original column set keeps sign-in / nav working until the migration
  // lands — `avatarUrl` is just null until then.
  const withAvatar = await supabase
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

  // Lightweight creator check — one indexed lookup on creator_profiles
  // (profile_id). Tolerant of the table not existing yet (pre-migration
  // 017): on error we just treat the user as a non-creator.
  const isCreator = await profileOwnsCreator(supabase, user.id);

  if (!withAvatar.error && withAvatar.data) {
    return {
      id: withAvatar.data.id,
      email: withAvatar.data.email,
      displayName: withAvatar.data.display_name,
      avatarUrl: withAvatar.data.avatar_url,
      role: withAvatar.data.role,
      isCreator,
    };
  }

  // Either the row doesn't exist or the column is missing. Try the
  // legacy column set so we still return a session.
  const { data: legacy } = await supabase
    .from("profiles")
    .select("id, email, display_name, role")
    .eq("id", user.id)
    .maybeSingle<{
      id: string;
      email: string | null;
      display_name: string | null;
      role: SessionRole;
    }>();
  if (!legacy) return null;
  return {
    id: legacy.id,
    email: legacy.email,
    displayName: legacy.display_name,
    avatarUrl: null,
    role: legacy.role,
    isCreator,
  };
});

async function profileOwnsCreator(
  supabase: ReturnType<typeof createClient>,
  profileId: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("creator_profiles")
      .select("id")
      .eq("profile_id", profileId)
      .limit(1);
    if (error) return false;
    return Boolean(data && data.length > 0);
  } catch {
    return false;
  }
}
