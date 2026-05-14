import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/roles";
import { getSiteUrl } from "@/lib/stripe";
import { REMEMBER_COOKIE } from "@/lib/supabase/remember";

export async function POST() {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    await supabase.auth.signOut();
  }
  const response = NextResponse.redirect(`${getSiteUrl()}/login`);
  // Clear the "Remember me" marker so a stale preference doesn't carry into
  // the next sign-in. (signOut() already clears the Supabase auth cookies.)
  response.cookies.set({ name: REMEMBER_COOKIE, value: "", maxAge: 0, path: "/" });
  return response;
}
