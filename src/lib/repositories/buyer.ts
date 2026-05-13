import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

/**
 * Read-only repositories for the buyer-side dashboard.
 *
 * All queries are scoped to the authenticated user's profile id and run
 * through the user-scoped Supabase client. RLS (migration 007) enforces
 * the same scoping at the DB level, so even if these helpers were
 * invoked with a foreign profile id the request would return nothing.
 */

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type SellerRow = Database["public"]["Tables"]["sellers"]["Row"];
type ProductMediaRow = Database["public"]["Tables"]["product_media"]["Row"];

export type SavedProductRow = {
  id: string;
  saved_at: string;
  product: ProductRow & {
    sellers: SellerRow | null;
    product_media: ProductMediaRow[] | null;
  };
};

/**
 * Fetch the user's saved products, newest-first, with enough joined data
 * to render thumbnail + name + seller + game on a dashboard card.
 *
 * Returns an empty array (not an error) if the user has saved nothing,
 * so callers can render a clean empty state.
 */
export async function getSavedProductsForProfile(
  profileId: string,
): Promise<{ data: SavedProductRow[]; error: { message: string } | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("saved_products")
    .select("id, created_at, products(*, sellers(*), product_media(*))")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error: { message: error.message } };
  }

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    created_at: string;
    products: SavedProductRow["product"] | null;
  }>;

  return {
    data: rows
      .filter(
        (row): row is { id: string; created_at: string; products: SavedProductRow["product"] } =>
          row.products !== null,
      )
      .map((row) => ({
        id: row.id,
        saved_at: row.created_at,
        product: row.products,
      })),
    error: null,
  };
}

/**
 * Cheap existence check used by the public product page to decide
 * whether the save button starts in "saved" state.
 */
export async function isProductSavedByProfile(
  profileId: string,
  productId: string,
): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from("saved_products")
    .select("id")
    .eq("profile_id", profileId)
    .eq("product_id", productId)
    .maybeSingle<{ id: string }>();
  return Boolean(data);
}
