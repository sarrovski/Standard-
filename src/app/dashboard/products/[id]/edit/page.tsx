import { notFound, redirect } from "next/navigation";
import { Nav, Shell } from "@/components/ui";
import { ProductEditClient } from "@/components/product-edit-client";
import { isSupabaseConfigured, requireRole } from "@/lib/roles";
import {
  getSellerByProfileId,
  getVerifiedPaymentMethodCount,
} from "@/lib/repositories/seller";
import { sortedProductMedia } from "@/lib/adapters";
import {
  groupsFromFlatFeatures,
  parseFeatureGroups,
} from "@/lib/product-features";
import { parseFaq } from "@/lib/product-faq";
import type { Database } from "@/lib/supabase/types";

/**
 * Per-product edit page. Reached from the kebab menu on the dashboard
 * Produits tab.
 *
 * Demo mode (no Supabase env) doesn't have real products to edit, so we
 * redirect back to the dashboard. The kebab menu also hides "Edit" in
 * demo mode for the same reason.
 */
export default async function ProductEditPage({
  params,
}: {
  params: { id: string };
}) {
  const role = await requireRole(["seller", "admin"]);
  if (!isSupabaseConfigured()) {
    redirect("/dashboard?tab=products");
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: seller } = await getSellerByProfileId(user.id);
  const isAdmin = role.role === "admin";
  if (!seller && !isAdmin) {
    redirect("/account");
  }

  let query = supabase
    .from("products")
    .select(
      "id, slug, name, game, category, website_url, summary, features, features_grouped, faq, status, product_media(*)",
    )
    .eq("id", params.id);
  if (!isAdmin && seller) {
    query = query.eq("seller_id", seller.id);
  }
  const { data: product } = await query.maybeSingle<{
    id: string;
    slug: string;
    name: string;
    game: string;
    category: string;
    website_url: string | null;
    summary: string | null;
    features: string[] | null;
    features_grouped: unknown;
    faq: unknown;
    status: "draft" | "published" | "archived";
    product_media:
      | Database["public"]["Tables"]["product_media"]["Row"][]
      | null;
  }>();

  if (!product) {
    notFound();
  }

  const initialMedia = sortedProductMedia(product.product_media);
  // Prefer the canonical grouped value (migration 008 backfills it from
  // the legacy flat array); fall back to the flat array if grouped is
  // somehow empty.
  const parsedGroups = parseFeatureGroups(product.features_grouped);
  const featureGroups =
    parsedGroups.length > 0
      ? parsedGroups
      : groupsFromFlatFeatures(product.features ?? []);

  // Admins can edit any product; their own verified-payment count is
  // unrelated to this seller's score, so only credit a "verified payment
  // method" check when we know which seller owns the product.
  const verifiedPaymentMethodCount = seller
    ? await getVerifiedPaymentMethodCount(seller.id)
    : undefined;

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-4xl px-6 py-8">
        <ProductEditClient
          product={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            game: product.game,
            category: product.category,
            website_url: product.website_url ?? "",
            summary: product.summary ?? "",
            featureGroups,
            faq: parseFaq(product.faq),
            status: product.status,
          }}
          initialMedia={initialMedia}
          verifiedPaymentMethodCount={verifiedPaymentMethodCount}
        />
      </section>
    </Shell>
  );
}
