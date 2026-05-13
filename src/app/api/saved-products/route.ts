import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/roles";
import type { Database } from "@/lib/supabase/types";

/**
 * Buyer-side "save product" (wishlist) API.
 *
 *   POST   /api/saved-products    body: { product_id }
 *   DELETE /api/saved-products    body or query: product_id
 *
 * Auth: any authenticated user. We don't require the seller role here —
 * this is a buyer feature.
 *
 * Storage: public.saved_products, RLS-scoped to profile_id = auth.uid().
 * The unique (profile_id, product_id) constraint makes POST idempotent;
 * we map the 23505 duplicate code to a 200 so the UI doesn't spuriously
 * error out when a user clicks "save" twice quickly.
 */

type Body = { product_id?: unknown };
type SavedProductInsert =
  Database["public"]["Tables"]["saved_products"]["Insert"];

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

async function readProductId(request: NextRequest): Promise<string | null> {
  const fromQuery = readString(new URL(request.url).searchParams.get("product_id"));
  if (fromQuery) return fromQuery;
  try {
    const raw = (await request.json()) as Body;
    return readString(raw.product_id);
  } catch {
    return null;
  }
}

async function requireUser() {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase not configured.", status: 503 } as const;
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Unauthorized", status: 401 } as const;
  }
  return { user, supabase } as const;
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const productId = await readProductId(request);
  if (!productId) {
    return NextResponse.json(
      { error: "product_id is required." },
      { status: 400 },
    );
  }

  // Ownership of the action belongs to the auth user; products table only
  // matters insofar as the FK must resolve. RLS prevents anyone from
  // saving against another user's profile id.
  const insertRow: SavedProductInsert = {
    profile_id: auth.user.id,
    product_id: productId,
  };

  const { data, error } = await auth.supabase
    .from("saved_products")
    .insert(insertRow as never)
    .select("id, product_id")
    .single<{ id: string; product_id: string }>();

  if (error) {
    // 23505 = duplicate. Treat as idempotent success; look up the
    // existing row so we can return its id.
    if (error.code === "23505") {
      const { data: existing } = await auth.supabase
        .from("saved_products")
        .select("id, product_id")
        .eq("profile_id", auth.user.id)
        .eq("product_id", productId)
        .maybeSingle<{ id: string; product_id: string }>();
      if (existing) {
        return NextResponse.json({ saved: existing, already_saved: true });
      }
    }
    if (error.code === "23503") {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 },
      );
    }
    console.error("[api/saved-products POST]", error.message);
    return NextResponse.json(
      { error: "Could not save product." },
      { status: 500 },
    );
  }

  return NextResponse.json({ saved: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const productId = await readProductId(request);
  if (!productId) {
    return NextResponse.json(
      { error: "product_id is required." },
      { status: 400 },
    );
  }

  const { error } = await auth.supabase
    .from("saved_products")
    .delete()
    .eq("profile_id", auth.user.id)
    .eq("product_id", productId);

  if (error) {
    console.error("[api/saved-products DELETE]", error.message);
    return NextResponse.json(
      { error: "Could not unsave product." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
