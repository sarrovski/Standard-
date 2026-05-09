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
type ProductCreateStep =
  | "auth"
  | "ownership"
  | "seller_lookup"
  | "validation"
  | "product_insert";
type ProductApiError = {
  error: string;
  step: ProductCreateStep;
  code?: string;
  details?: string;
};
type SellerProductClient = ReturnType<typeof createClient>;

type CreateProductBody = {
  name?: unknown;
  slug?: unknown;
  game?: unknown;
  category?: unknown;
  website_url?: unknown;
  summary?: unknown;
  features?: unknown;
  price_points?: unknown;
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

function jsonError(
  status: number,
  error: string,
  step: ProductCreateStep,
  extra: Omit<ProductApiError, "error" | "step"> = {},
) {
  return NextResponse.json({ error, step, ...extra }, { status });
}

async function makeUniqueSlug(
  supabase: SellerProductClient,
  baseSlug: string,
): Promise<{ slug: string } | { error: ProductApiError }> {
  const base = slugify(baseSlug);
  for (let index = 0; index < 20; index += 1) {
    const candidate = index === 0 ? base : `${base}-${index + 1}`;
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle<{ id: string }>();

    if (error) {
      return {
        error: {
          error: "Could not check product slug availability.",
          step: "validation",
          code: error.code ?? "slug_lookup_failed",
          details: error.message,
        },
      };
    }
    if (!data) return { slug: candidate };
  }

  return {
    error: {
      error: "A product with that slug already exists. Try a different name.",
      step: "validation",
      code: "duplicate_slug",
    },
  };
}

async function requireSeller() {
  if (!isSupabaseConfigured()) {
    return {
      error: "Supabase not configured",
      status: 503,
      step: "auth",
      code: "supabase_not_configured",
    } as const;
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: "Unauthorized",
      status: 401,
      step: "auth",
      code: "unauthorized",
    } as const;
  }

  const { data: seller, error: sellerError } = await getSellerByProfileId(user.id);
  if (sellerError) {
    return {
      error: "Failed to look up seller record.",
      status: 500,
      step: "seller_lookup",
      code: sellerError.code ?? "seller_lookup_failed",
      details: sellerError.message,
    } as const;
  }
  if (!seller) {
    return {
      error: "Seller profile not found. Complete seller onboarding or contact admin.",
      status: 403,
      step: "seller_lookup",
      code: "seller_not_found",
    } as const;
  }
  return { user, seller, supabase } as const;
}

export async function POST(request: NextRequest) {
  const auth = await requireSeller();
  if ("error" in auth) {
    const status = typeof auth.status === "number" ? auth.status : 500;
    const error = typeof auth.error === "string" ? auth.error : "Unauthorized";
    const step = typeof auth.step === "string" ? auth.step : "auth";
    return jsonError(status, error, step as ProductCreateStep, {
      code: auth.code,
      details: auth.details,
    });
  }

  let raw: CreateProductBody;
  try {
    raw = (await request.json()) as CreateProductBody;
  } catch {
    return jsonError(400, "Invalid JSON body.", "validation", {
      code: "invalid_json",
    });
  }

  const name = readString(raw.name);
  const game = readString(raw.game);
  const category = readString(raw.category);
  if (!name || !game || !category) {
    return jsonError(400, "name, game, and category are required.", "validation", {
      code: "missing_required_fields",
    });
  }

  const requestedSlug = readString(raw.slug) ?? name;
  const slugResult = await makeUniqueSlug(auth.supabase, requestedSlug);
  if ("error" in slugResult) {
    return jsonError(
      slugResult.error.code === "duplicate_slug" ? 409 : 500,
      slugResult.error.error,
      slugResult.error.step,
      {
        code: slugResult.error.code,
        details: slugResult.error.details,
      },
    );
  }

  const insertRow: ProductInsert = {
    seller_id: auth.seller.id,
    slug: slugResult.slug,
    name,
    game,
    category,
    status: "draft",
    website_url: readString(raw.website_url),
    summary: readString(raw.summary),
    features: readStringArray(raw.features),
    price_points: readStringArray(raw.price_points),
    trust_score: null,
  };

  const { data, error } = await auth.supabase
    .from("products")
    .insert(insertRow as never)
    .select("id, slug, name, status")
    .single<{ id: string; slug: string; name: string; status: string }>();

  if (error) {
    console.error("[api/seller/products POST] insert failed:", error.message);
    const lowerMessage = error.message.toLowerCase();
    if (error.code === "23505" || lowerMessage.includes("duplicate")) {
      return jsonError(
        409,
        "A product with that slug already exists. Try a different name.",
        "validation",
        { code: "duplicate_slug", details: error.message },
      );
    }
    if (error.code === "42501" || lowerMessage.includes("row-level security")) {
      return jsonError(
        403,
        "Could not create product because ownership could not be verified.",
        "ownership",
        { code: error.code ?? "rls_denied", details: error.message },
      );
    }
    return jsonError(500, "Could not create product.", "product_insert", {
      code: error.code ?? "insert_failed",
      details: error.message,
    });
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
    const status = typeof auth.status === "number" ? auth.status : 500;
    const error = typeof auth.error === "string" ? auth.error : "Unauthorized";
    const step = typeof auth.step === "string" ? auth.step : "auth";
    return jsonError(status, error, step as ProductCreateStep, {
      code: auth.code,
      details: auth.details,
    });
  }

  let raw: UpdateProductBody;
  try {
    raw = (await request.json()) as UpdateProductBody;
  } catch {
    return jsonError(400, "Invalid JSON body.", "validation", {
      code: "invalid_json",
    });
  }

  const id = readString(raw.id);
  if (!id) {
    return jsonError(400, "id is required.", "validation", {
      code: "missing_product_id",
    });
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
  const status = readString(raw.status);
  if (status === "draft" || status === "published" || status === "archived") {
    update.status = status;
  } else if (status) {
    return jsonError(
      400,
      "Invalid status. Allowed: draft | published | archived.",
      "validation",
      { code: "invalid_status" },
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
    return jsonError(500, "Could not update product.", "product_insert", {
      code: error.code ?? "update_failed",
      details: error.message,
    });
  }
  if (!data) {
    return jsonError(404, "Product not found or you don't own it.", "ownership", {
      code: "product_not_found",
    });
  }

  return NextResponse.json({ product: data });
}
