import { products as demoProducts } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/roles";
import { getPublishedProducts } from "@/lib/repositories/products";

type Filter = { game?: string; category?: string };

/**
 * Count products for a landing page. Uses Supabase published products when
 * configured, falling back to the demo `products` array. Returns 0 on any
 * Supabase error so the page still renders rather than failing.
 */
export async function countProducts(filter: Filter): Promise<number> {
  const matches = (p: { game: string; category: string }) =>
    (filter.game == null || p.game === filter.game) &&
    (filter.category == null || p.category === filter.category);

  if (!isSupabaseConfigured()) {
    return demoProducts.filter(matches).length;
  }
  const { data, error } = await getPublishedProducts();
  if (error || !data) return 0;
  return data.filter(matches).length;
}
