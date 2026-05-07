import { createClient } from "@/lib/supabase/server";

export async function getPublishedProducts() {
  const supabase = createClient();
  return supabase
    .from("products")
    .select("*, sellers(*), product_media(*)")
    .eq("status", "published")
    .order("created_at", { ascending: false });
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
