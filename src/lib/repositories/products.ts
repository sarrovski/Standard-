import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import { withTimeout } from "@/lib/repositories/query-timeout";

/**
 * Read-only product repositories used by Marketplace and product detail pages.
 * These are called from server components when isSupabaseConfigured() is true.
 * Writes belong elsewhere (Batch 5).
 *
 * Every public-facing query is wrapped in withTimeout() so a stuck request
 * surfaces as a typed error in 10s instead of hanging until Vercel's 300s
 * edge timeout (Batch 15A).
 */

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type FeaturedSlotRow = Database["public"]["Tables"]["featured_slots"]["Row"];
type SellerPaymentMethodRow =
  Database["public"]["Tables"]["seller_payment_methods"]["Row"];
type PaymentMethodRow = Database["public"]["Tables"]["payment_methods"]["Row"];

type VerifiedSellerPaymentMethod = SellerPaymentMethodRow & {
  payment_methods: PaymentMethodRow | null;
};
type PublishedProductRow = ProductRow & {
  sellers: Database["public"]["Tables"]["sellers"]["Row"] | null;
  product_media: Database["public"]["Tables"]["product_media"]["Row"][] | null;
};
type PublishedProductDetailRow = PublishedProductRow & {
  trust_signals: Database["public"]["Tables"]["trust_signals"]["Row"][] | null;
};

async function getVerifiedSellerPaymentMethodsBySellerIds(
  sellerIds: string[],
) {
  const uniqueSellerIds = Array.from(new Set(sellerIds));
  if (uniqueSellerIds.length === 0) {
    return { data: [] as VerifiedSellerPaymentMethod[], error: null };
  }

  const supabase = createClient();
  return withTimeout(
    supabase
      .from("seller_payment_methods")
      .select("*, payment_methods(*)")
      .in("seller_id", uniqueSellerIds)
      .eq("status", "verified"),
    { label: "getVerifiedSellerPaymentMethodsBySellerIds" },
  );
}

function attachVerifiedPaymentMethods<
  TProduct extends Pick<ProductRow, "seller_id">,
>(
  products: TProduct[],
  paymentMethods: VerifiedSellerPaymentMethod[],
) {
  const bySellerId = new Map<string, VerifiedSellerPaymentMethod[]>();
  for (const method of paymentMethods) {
    const existing = bySellerId.get(method.seller_id) ?? [];
    existing.push(method);
    bySellerId.set(method.seller_id, existing);
  }

  return products.map((product) => ({
    ...product,
    seller_payment_methods: bySellerId.get(product.seller_id) ?? [],
  }));
}

export async function getPublishedProducts() {
  const supabase = createClient();
  const productsRes = await withTimeout(
    supabase
      .from("products")
      .select("*, sellers(*), product_media(*)")
      .eq("status", "published")
      .order("created_at", { ascending: false }),
    { label: "getPublishedProducts" },
  );

  if (productsRes.error || !productsRes.data) {
    return productsRes;
  }

  const products = (productsRes.data ?? []) as unknown as PublishedProductRow[];
  const paymentRes = await getVerifiedSellerPaymentMethodsBySellerIds(
    products.map((product) => product.seller_id),
  );
  if (paymentRes.error) {
    return { data: null, error: paymentRes.error };
  }

  return {
    data: attachVerifiedPaymentMethods(products, paymentRes.data ?? []),
    error: null,
  };
}

export async function getActiveFeaturedProductIds(now = new Date()) {
  const supabase = createClient();
  const nowIso = now.toISOString();
  const slotsRes = await withTimeout(
    supabase
      .from("featured_slots")
      .select("product_id, starts_at")
      .eq("status", "active")
      .lte("starts_at", nowIso)
      .gt("ends_at", nowIso)
      .not("product_id", "is", null)
      .order("starts_at", { ascending: false }),
    { label: "getActiveFeaturedProductIds" },
  );

  if (slotsRes.error) {
    return { data: null, error: slotsRes.error };
  }

  if (!slotsRes.data) {
    return { data: [] as string[], error: null };
  }

  const seen = new Set<string>();
  const productIds = ((slotsRes.data ?? []) as Pick<
    FeaturedSlotRow,
    "product_id" | "starts_at"
  >[])
    .map((slot) => slot.product_id)
    .filter((productId): productId is string => {
      if (!productId || seen.has(productId)) return false;
      seen.add(productId);
      return true;
    });

  return { data: productIds, error: null };
}

export async function getPublishedProductBySlug(productSlug: string) {
  const supabase = createClient();
  const productRes = await withTimeout(
    supabase
      .from("products")
      .select("*, sellers(*), product_media(*), trust_signals(*)")
      .eq("slug", productSlug)
      .eq("status", "published")
      .maybeSingle(),
    { label: "getPublishedProductBySlug" },
  );

  if (productRes.error || !productRes.data) {
    return productRes;
  }

  const product = productRes.data as unknown as PublishedProductDetailRow;
  const paymentRes = await getVerifiedSellerPaymentMethodsBySellerIds([
    product.seller_id,
  ]);
  if (paymentRes.error) {
    return { data: null, error: paymentRes.error };
  }

  return {
    data: attachVerifiedPaymentMethods([product], paymentRes.data ?? [])[0] ?? null,
    error: null,
  };
}

export async function getVerifiedSellerPaymentMethods(sellerId: string) {
  const supabase = createClient();
  return supabase
    .from("seller_payment_methods")
    .select("*, payment_methods(*)")
    .eq("seller_id", sellerId)
    .eq("status", "verified");
}

export async function getAvailableFeaturedSlot(game: string, category: string) {
  const supabase = createClient();
  return supabase
    .from("featured_slots")
    .select("*")
    .eq("game", game)
    .eq("category", category)
    .neq("status", "active")
    .maybeSingle();
}
