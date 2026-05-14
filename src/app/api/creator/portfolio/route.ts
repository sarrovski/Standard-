import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/roles";
import {
  LIMITS,
  PORTFOLIO_ITEM_TYPES,
  validateEnum,
  validateOptionalText,
  validateOptionalUrl,
  validateRequiredText,
} from "@/lib/creator-marketplace";
import type { Database } from "@/lib/supabase/types";

/**
 * Add a portfolio item to the caller's own creator profile.
 *
 *   POST /api/creator/portfolio
 *     body: { title, description?, item_type?, game?, platform?,
 *             external_url?, thumbnail_url?, sort_order?, is_public? }
 *
 * The creator_id is resolved from the caller's own profile — never taken
 * from the body. Insert goes through the user-scoped client so RLS
 * double-checks ownership.
 */

type Body = Record<string, unknown>;

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const admin = createAdminClient();
  const ownRes = await admin
    .from("creator_profiles")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle<{ id: string }>();
  if (!ownRes.data) {
    return NextResponse.json(
      { error: "no creator profile for this account" },
      { status: 404 },
    );
  }

  const title = validateRequiredText(body.title, "Title", LIMITS.itemTitle);
  if (!title.ok)
    return NextResponse.json({ error: title.error }, { status: 400 });
  const description = validateOptionalText(
    body.description,
    "Description",
    LIMITS.itemDescription.max,
  );
  if (!description.ok)
    return NextResponse.json({ error: description.error }, { status: 400 });
  const game = validateOptionalText(body.game, "Game", LIMITS.itemGame.max);
  if (!game.ok)
    return NextResponse.json({ error: game.error }, { status: 400 });
  const platform = validateOptionalText(
    body.platform,
    "Platform",
    LIMITS.itemPlatform.max,
  );
  if (!platform.ok)
    return NextResponse.json({ error: platform.error }, { status: 400 });
  const externalUrl = validateOptionalUrl(body.external_url, "External URL");
  if (!externalUrl.ok)
    return NextResponse.json({ error: externalUrl.error }, { status: 400 });
  const thumbnailUrl = validateOptionalUrl(body.thumbnail_url, "Thumbnail URL");
  if (!thumbnailUrl.ok)
    return NextResponse.json({ error: thumbnailUrl.error }, { status: 400 });

  let itemType: Database["public"]["Tables"]["creator_portfolio_items"]["Row"]["item_type"] =
    "other";
  if (body.item_type !== undefined && body.item_type !== null) {
    const parsed = validateEnum(body.item_type, PORTFOLIO_ITEM_TYPES, "Type");
    if (!parsed.ok)
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    itemType = parsed.value;
  }

  const sortOrder =
    typeof body.sort_order === "number" && Number.isFinite(body.sort_order)
      ? Math.trunc(body.sort_order)
      : 0;
  const isPublic =
    typeof body.is_public === "boolean" ? body.is_public : true;

  type ItemInsert =
    Database["public"]["Tables"]["creator_portfolio_items"]["Insert"];
  const payload: ItemInsert = {
    creator_id: ownRes.data.id,
    title: title.value,
    description: description.value,
    item_type: itemType,
    game: game.value,
    platform: platform.value,
    external_url: externalUrl.value,
    thumbnail_url: thumbnailUrl.value,
    sort_order: sortOrder,
    is_public: isPublic,
  };

  const { error } = await supabase
    .from("creator_portfolio_items")
    .insert(payload as never);
  if (error) {
    console.error("[creator/portfolio POST] insert failed:", error.message);
    return NextResponse.json(
      { error: "couldn't add portfolio item" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
