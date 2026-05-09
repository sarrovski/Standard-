import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Server-side Supabase client for App Router server components, route
 * handlers, and server actions.
 *
 * Cookie write semantics (this is the production-tested fix from Batch 15A):
 *
 *   In Next.js 14 App Router, cookieStore.set() throws when called from
 *   inside a Server Component render context — Next allows reads but not
 *   writes during render. Supabase's SSR helpers will *attempt* to refresh
 *   the auth cookies on every server-side call (not just on auth events),
 *   so this throw fires often. Without the try/catch, the throw bubbles
 *   up and crashes the page render, which presents in production as a
 *   504 (the request hangs while the framework tries to recover, then
 *   Vercel's 300s edge timeout fires).
 *
 *   The middleware (middleware.ts) already runs the auth refresh against
 *   the response cookies on every protected route, so silently dropping
 *   the write attempt here is safe: subsequent requests will get fresh
 *   cookies via the middleware response.
 *
 *   Server actions and route handlers — which DO have a writable cookies
 *   context — go through the same client. There the set/remove will
 *   succeed without entering the catch.
 *
 * Reference: official Supabase Next.js App Router pattern, documented at
 * supabase.com/docs/guides/auth/server-side/nextjs.
 */
export function createClient() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server Component render context — write not allowed. Safe to
            // ignore: middleware refreshes the session on the response.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Same as above.
          }
        },
      },
    },
  );
}
