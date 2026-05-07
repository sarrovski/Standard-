import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * SERVER-ONLY Supabase client using the service-role key.
 *
 * **Never** import this from a client component or expose it to the browser.
 * The service role bypasses RLS, so it must stay inside server-side code:
 *   - Stripe webhook handler
 *   - Other webhook endpoints that act without an authenticated user
 *
 * Throws if the env vars are missing — by the time this is called we expect
 * a fully-configured server environment. If you need a graceful degradation
 * path (e.g. inside a webhook in demo mode), check the env vars at the
 * call site before invoking this.
 */
export function createAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "createAdminClient called without NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: {
      // Service-role calls don't carry a user session.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
