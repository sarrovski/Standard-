import type { CookieOptions } from "@supabase/ssr";

/**
 * "Remember me" support for Supabase auth cookies.
 *
 * Why this exists: @supabase/ssr 0.5.2 hardcodes the auth-cookie `maxAge` to
 * its 400-day default when writing the session (see node_modules/@supabase/ssr
 * cookies.js — the browser and server storage paths both override `maxAge`
 * with `DEFAULT_COOKIE_OPTIONS.maxAge`). A `persistSession`/`cookieOptions`
 * flag therefore can't drive "Remember me".
 *
 * The mechanism instead: a non-HttpOnly marker cookie (`sb-remember`) written
 * by the browser at login time. Every Supabase cookie writer — the browser
 * client, the server client, and middleware — reads the marker and adjusts the
 * auth-cookie lifetime accordingly. When the marker is "0" the marker itself is
 * also a session cookie, so the marker and the auth cookies all expire together
 * when the browser closes.
 */

export const REMEMBER_COOKIE = "sb-remember";

/** Matches @supabase/ssr's DEFAULT_COOKIE_OPTIONS.maxAge (400 days, in seconds). */
export const PERSISTENT_MAX_AGE = 400 * 24 * 60 * 60;

/**
 * Interpret a raw `sb-remember` marker value. Absent marker defaults to `true`
 * (persistent) so pre-existing sessions and demo mode keep today's behavior.
 */
export function readRememberCookieValue(raw: string | undefined | null): boolean {
  if (raw == null) return true;
  return raw !== "0";
}

/** Parse a raw cookie header / `document.cookie` string into a name→value map. */
function parseCookieHeader(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    if (!name) continue;
    out[name] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

/** Read the remember preference out of a raw cookie string. */
export function readRememberFromCookieString(raw: string): boolean {
  return readRememberCookieValue(parseCookieHeader(raw)[REMEMBER_COOKIE]);
}

/**
 * Return a copy of `options` adjusted for the remember preference:
 *  - remember = true  → keep `maxAge`/`expires` (persistent cookie)
 *  - remember = false → strip `maxAge`/`expires` (session cookie, cleared on
 *    browser close)
 *
 * Callers must only apply this to genuine cookie *writes*. Cookie *removals*
 * (value `""`, `maxAge: 0`) must pass through untouched or they'd stop deleting.
 */
export function applyRememberToCookieOptions<T extends CookieOptions>(
  options: T,
  remember: boolean,
): T {
  if (remember) return options;
  const next = { ...options };
  delete next.maxAge;
  delete next.expires;
  return next;
}

/**
 * Minimal `Set-Cookie` string builder for the browser cookie adapter. Covers
 * the subset of attributes @supabase/ssr passes through (path, sameSite,
 * maxAge, expires) plus domain/secure for completeness. `httpOnly` is
 * intentionally not emitted — `document.cookie` can't set it, and the SSR
 * browser adapter's auth cookies are JS-readable by design.
 */
export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions,
): string {
  let str = `${name}=${encodeURIComponent(value)}`;
  if (typeof options.maxAge === "number") {
    str += `; Max-Age=${Math.floor(options.maxAge)}`;
  }
  if (options.expires instanceof Date) {
    str += `; Expires=${options.expires.toUTCString()}`;
  }
  str += `; Path=${options.path ?? "/"}`;
  if (options.domain) str += `; Domain=${options.domain}`;
  if (options.sameSite) {
    const raw =
      typeof options.sameSite === "string"
        ? options.sameSite
        : options.sameSite
          ? "strict"
          : "lax";
    str += `; SameSite=${raw.charAt(0).toUpperCase()}${raw.slice(1)}`;
  }
  if (options.secure) str += "; Secure";
  return str;
}

/**
 * Browser-only: write the `sb-remember` marker. Persistent when `remember`,
 * a session cookie otherwise so it clears alongside the auth cookies.
 * Call this *before* the Supabase sign-in call so the marker is in place when
 * Supabase writes the session cookies.
 */
export function setRememberCookie(remember: boolean): void {
  if (typeof document === "undefined") return;
  const secure =
    typeof location !== "undefined" && location.protocol === "https:";
  const options: CookieOptions = {
    path: "/",
    sameSite: "lax",
    ...(secure ? { secure: true } : {}),
    ...(remember ? { maxAge: PERSISTENT_MAX_AGE } : {}),
  };
  document.cookie = serializeCookie(REMEMBER_COOKIE, remember ? "1" : "0", options);
}

/** Browser-only: read the current `sb-remember` preference from `document.cookie`. */
export function readRememberFromDocument(): boolean {
  if (typeof document === "undefined") return true;
  return readRememberFromCookieString(document.cookie);
}
