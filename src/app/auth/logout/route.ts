import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/roles";
import { getSiteUrl } from "@/lib/stripe";

export async function POST() {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(`${getSiteUrl()}/login`);
}
