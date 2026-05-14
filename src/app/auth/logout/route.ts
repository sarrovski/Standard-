import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/roles";
import { getSiteUrl } from "@/lib/stripe";

/**
 * Sign out and bounce to /login.
 *
 * Triggered from the account-menu sign-out form (POST). We respond with
 * a 303 See Other so the browser converts the redirect into a GET and
 * lands cleanly on /login. Without 303, NextResponse.redirect defaults
 * to 307 which preserves the POST method and 405s on /login.
 *
 * Demo mode (no Supabase env) skips signOut and just redirects.
 */
export async function POST() {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(`${getSiteUrl()}/login`, { status: 303 });
}
