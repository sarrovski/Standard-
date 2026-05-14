import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import {
  REMEMBER_COOKIE,
  applyRememberToCookieOptions,
  readRememberCookieValue,
} from "@/lib/supabase/remember";

export async function middleware(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Honour the "Remember me" marker so a refresh during navigation
          // doesn't re-extend a session-only cookie back to 400 days.
          const remember = readRememberCookieValue(
            request.cookies.get(REMEMBER_COOKIE)?.value,
          );
          const finalOptions = applyRememberToCookieOptions(options, remember);
          request.cookies.set({ name, value, ...finalOptions });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value, ...finalOptions });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/account/:path*", "/auth/callback"],
};
