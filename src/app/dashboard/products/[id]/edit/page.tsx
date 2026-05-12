import { notFound, redirect } from "next/navigation";
import { Nav, Shell } from "@/components/ui";
import { ProductEditClient } from "@/components/product-edit-client";
import { isSupabaseConfigured, requireRole } from "@/lib/roles";
import { getSellerByProfileId } from "@/lib/repositories/seller";

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
      "id, slug, name, game, category, website_url, summary, features, status",
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
    status: "draft" | "published" | "archived";
  }>();

  if (!product) {
    notFound();
  }

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-3xl px-6 py-8">
        <ProductEditClient
          product={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            game: product.game,
            category: product.category,
            website_url: product.website_url ?? "",
            summary: product.summary ?? "",
            features: product.features ?? [],
            status: product.status,
          }}
        />
      </section>
    </Shell>
  );
}
