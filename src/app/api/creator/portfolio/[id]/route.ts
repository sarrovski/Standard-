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
 * Edit / delete a single portfolio item owned by the caller.
 *
 *   PATCH  /api/creator/portfolio/[id]  -> edit fields
 *   DELETE /api/creator/portfolio/[id]  -> remove the item
 *
 * Ownership is verified server-side: we load the item, join its parent
 * creator profile, and confirm profile_id = auth.uid() before touching
 * anything. Writes go through the service-role admin client.
 */

type Body = Record<string, unknown>;

async function resolveOwnedItem(itemId: string, userId: string) {
  const admin = createAdminClient();
  const res = await admin
    .from("creator_portfolio_items")
    .select("id, creator:creator_profiles(id, profile_id)")
    .eq("id", itemId)
    .maybeSingle<{
      id: string;
      creator: { id: string; profile_id: string | null } | null;
    }>();
  if (res.error || !res.data) return { ok: false as const, status: 404 };
  if (res.data.creator?.profile_id !== userId) {
    return { ok: false as const, status: 403 };
  }
  return { ok: true as const, admin };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, demo: true });
  }
  const itemId = params.id;
  if (!itemId) {
    return NextResponse.json({ error: "missing item id" }, { status: 400 });
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

  const owned = await resolveOwnedItem(itemId, user.id);
  if (!owned.ok) {
    return NextResponse.json(
      { error: owned.status === 403 ? "forbidden" : "item not found" },
      { status: owned.status },
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

  type ItemUpdate =
    Database["public"]["Tables"]["creator_portfolio_items"]["Update"];
  const update: ItemUpdate = {
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

  const { error } = await owned.admin
    .from("creator_portfolio_items")
    .update(update as never)
    .eq("id", itemId);
  if (error) {
    console.error("[creator/portfolio PATCH] update failed:", error.message);
    return NextResponse.json(
      { error: "couldn't save portfolio item" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true, demo: true });
  }
  const itemId = params.id;
  if (!itemId) {
    return NextResponse.json({ error: "missing item id" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }

  const owned = await resolveOwnedItem(itemId, user.id);
  if (!owned.ok) {
    return NextResponse.json(
      { error: owned.status === 403 ? "forbidden" : "item not found" },
      { status: owned.status },
    );
  }

  const { error } = await owned.admin
    .from("creator_portfolio_items")
    .delete()
    .eq("id", itemId);
  if (error) {
    console.error("[creator/portfolio DELETE] delete failed:", error.message);
    return NextResponse.json(
      { error: "couldn't delete portfolio item" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
