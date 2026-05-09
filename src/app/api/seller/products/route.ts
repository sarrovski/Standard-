import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/roles";
import { getSellerByProfileId } from "@/lib/repositories/seller";
import type { Database } from "@/lib/supabase/types";

/**
 * Seller product CRUD.
 *
 * Auth + ownership:
 *   - User must be authenticated.
 *   - User must have a sellers row (i.e. profile.role === 'seller' via the
 *     Stripe webhook flow). We look up sellers by profile_id; no sellers row
 *     means 403 with a hint to subscribe.
 *
 * RLS:
 *   - Migration 001 enforces seller-owns-product RLS, so even with the
 *     user-scoped client these inserts/updates are doubly safe.
 *
 * Demo mode (no Supabase): returns 503. The dashboard component is
 * responsible for routing builder writes through product-store in that case.
 */

type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

type CreateProductBody = {
  name?: unknown;
  slug?: unknown;
  game?: unknown;
  category?: unknown;
  website_url?: unknown;
  summary?: unknown;
  features?: unknown;
  price_points?: unknown;
  meta_title?: unknown;
  meta_description?: unknown;
};

type UpdateProductBody = CreateProductBody & {
  id?: unknown;
  status?: unknown;
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.length > 0);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || `product-${Date.now()}`;
}

async function requireSeller() {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase not configured", status: 503 } as const;
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 } as const;

  const { data: seller, error: sellerError } = await getSellerByProfileId(user.id);
  if (sellerError) {
    return { error: "Failed to look up seller record.", status: 500 } as const;
  }
  if (!seller) {
    return {
      error: "No seller account yet. Subscribe to a seller plan first.",
      status: 403,
    } as const;
  }
  return { user, seller, supabase } as const;
}

export async function POST(request: NextRequest) {
  const auth = await requireSeller();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let raw: CreateProductBody;
  try {
    raw = (await request.json()) as CreateProductBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = readString(raw.name);
  const game = readString(raw.game);
  const category = readString(raw.category);
  if (!name || !game || !category) {
    return NextResponse.json(
      { error: "name, game, and category are required." },
      { status: 400 },
    );
  }

  const insertRow: ProductInsert = {
    seller_id: auth.seller.id,
    slug: readString(raw.slug) ?? slugify(name),
    name,
    game,
    category,
    status: "draft",
    website_url: readString(raw.website_url),
    summary: readString(raw.summary),
    features: readStringArray(raw.features),
    price_points: readStringArray(raw.price_points),
    trust_score: null,
    meta_title: readString(raw.meta_title),
    meta_description: readString(raw.meta_description),
  };

  const { data, error } = await auth.supabase
    .from("products")
    .insert(insertRow as never)
    .select("id, slug, name, status")
    .single<{ id: string; slug: string; name: string; status: string }>();

  if (error) {
    console.error("[api/seller/products POST] insert failed:", error.message);
    // Slug uniqueness is the most likely failure here — surface a friendly msg.
    if (error.message.toLowerCase().includes("duplicate")) {
      return NextResponse.json(
        { error: "A product with that slug already exists. Try a different name." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Could not create product." },
      { status: 500 },
    );
  }

  return NextResponse.json({ product: data });
}

/**
 * Used for status changes (publish, archive) and field updates. The seller
 * can only update products that belong to them; RLS + the explicit seller_id
 * filter both enforce that.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireSeller();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let raw: UpdateProductBody;
  try {
    raw = (await request.json()) as UpdateProductBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const id = readString(raw.id);
  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const update: ProductUpdate = {};
  const name = readString(raw.name);
  if (name) update.name = name;
  const game = readString(raw.game);
  if (game) update.game = game;
  const category = readString(raw.category);
  if (category) update.category = category;
  const websiteUrl = readString(raw.website_url);
  if (raw.website_url !== undefined) update.website_url = websiteUrl;
  const summary = readString(raw.summary);
  if (raw.summary !== undefined) update.summary = summary;
  if (raw.features !== undefined) update.features = readStringArray(raw.features);
  if (raw.price_points !== undefined) {
    update.price_points = readStringArray(raw.price_points);
  }
  if (raw.meta_title !== undefined) update.meta_title = readString(raw.meta_title);
  if (raw.meta_description !== undefined) {
    update.meta_description = readString(raw.meta_description);
  }
  const status = readString(raw.status);
  if (status === "draft" || status === "published" || status === "archived") {
    update.status = status;
  } else if (status) {
    return NextResponse.json(
      { error: "Invalid status. Allowed: draft | published | archived." },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase
    .from("products")
    .update(update as never)
    .eq("id", id)
    .eq("seller_id", auth.seller.id)
    .select("id, slug, name, status")
    .single<{ id: string; slug: string; name: string; status: string }>();

  if (error) {
    console.error("[api/seller/products PATCH] update failed:", error.message);
    return NextResponse.json(
      { error: "Could not update product." },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: "Product not found or you don't own it." },
      { status: 404 },
    );
  }

  return NextResponse.json({ product: data });
}
