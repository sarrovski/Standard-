import { createBrowserClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "./types";
import {
  applyRememberToCookieOptions,
  readRememberFromDocument,
  serializeCookie,
} from "./remember";

/**
 * Browser-side Supabase client.
 *
 * Uses a custom cookie adapter so the "Remember me" choice can control
 * session-cookie lifetime. @supabase/ssr's built-in browser adapter always
 * writes the auth cookies with a 400-day maxAge (it hardcodes
 * `DEFAULT_COOKIE_OPTIONS.maxAge`, ignoring any `cookieOptions` you pass) — see
 * remember.ts for the full explanation. Our `setAll` instead reads the
 * `sb-remember` marker at write time and strips maxAge/expires (→ session
 * cookie) when the user opted out of being remembered.
 *
 * The marker is read fresh on every write, so the cached singleton client
 * always reflects the current choice.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === "undefined") return [];
          return document.cookie
            .split(";")
            .map((part) => {
              const idx = part.indexOf("=");
              if (idx === -1) return null;
              const name = part.slice(0, idx).trim();
              if (!name) return null;
              return {
                name,
                value: decodeURIComponent(part.slice(idx + 1).trim()),
              };
            })
            .filter((c): c is { name: string; value: string } => c !== null);
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          if (typeof document === "undefined") return;
          const remember = readRememberFromDocument();
          for (const { name, value, options } of cookiesToSet) {
            // Genuine writes follow the remember preference; removals (empty
            // value / maxAge 0) pass through untouched so they still delete.
            const finalOptions = value
              ? applyRememberToCookieOptions(options, remember)
              : options;
            document.cookie = serializeCookie(name, value, finalOptions);
          }
        },
      },
    },
  );
}
