/**
 * Wrap a Supabase query (or any awaitable) with a hard timeout so a
 * misbehaving request doesn't hang the page render until Vercel's
 * 300s edge timeout. Returns the original result shape on success, or
 * a synthetic { data: null, error: TimeoutError } object on timeout
 * — same shape callers already handle.
 *
 * Why not AbortController + supabase-js cancellation: supabase-js does
 * accept an AbortSignal, but the wider goal here is "fail the page
 * render fast" regardless of which dependency is stuck (DNS, TLS, RLS
 * recursion, PostgREST, etc.). Promise.race with a timer is the
 * universal escape hatch.
 *
 * Default: 10s. Calibrated for production: a healthy Supabase query
 * returns in well under 1s; anything past 5s is suspicious; anything
 * past 10s is broken. Vercel default function timeout is 10s on the
 * Hobby plan, 60s on Pro — staying under both with this default.
 */

const DEFAULT_TIMEOUT_MS = 10_000;

export type TimeoutError = {
  message: string;
  code: "supabase_timeout";
  details?: string;
};

export type SupabaseQueryResult<T> = {
  data: T | null;
  error: { message: string; code?: string; details?: string } | null;
};

export async function withTimeout<T>(
  promise: PromiseLike<SupabaseQueryResult<T>>,
  options?: { timeoutMs?: number; label?: string },
): Promise<SupabaseQueryResult<T>> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const label = options?.label ?? "supabase_query";

  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<SupabaseQueryResult<T>>((resolve) => {
    timer = setTimeout(() => {
      console.error(
        `[${label}] timed out after ${timeoutMs}ms — failing fast.`,
      );
      resolve({
        data: null,
        error: {
          message: `Supabase query timed out after ${timeoutMs / 1000}s`,
          code: "supabase_timeout",
        },
      });
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Type guard: did this query result come back as a timeout?
 */
export function isTimeoutError(
  error: { code?: string } | null | undefined,
): boolean {
  return Boolean(error && error.code === "supabase_timeout");
}
