import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/roles";
import type { Database } from "@/lib/supabase/types";

/**
 * Buyer-side account settings.
 *
 *   PATCH /api/account    body: { display_name }
 *
 * Only `display_name` is editable here. Email is owned by Supabase Auth
 * (changing it would invalidate the auth session), and `role` is
 * promoted by the Stripe webhook on successful seller subscription.
 */

type Body = { display_name?: unknown };
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

const MAX_DISPLAY_NAME = 64;

function readDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_DISPLAY_NAME) {
    return null;
  }
  return trimmed;
}

export async function PATCH(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase not configured." },
      { status: 503 },
    );
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: Body;
  try {
    raw = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const displayName = readDisplayName(raw.display_name);
  if (!displayName) {
    return NextResponse.json(
      {
        error: `display_name is required (1–${MAX_DISPLAY_NAME} characters).`,
      },
      { status: 400 },
    );
  }

  const update: ProfileUpdate = { display_name: displayName };

  const { data, error } = await supabase
    .from("profiles")
    .update(update as never)
    .eq("id", user.id)
    .select("id, display_name")
    .single<{ id: string; display_name: string | null }>();

  if (error) {
    console.error("[api/account PATCH]", error.message);
    return NextResponse.json(
      { error: "Could not update profile." },
      { status: 500 },
    );
  }

  return NextResponse.json({ profile: data });
}
