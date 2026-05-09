import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Badge, Nav, Shell } from "@/components/ui";
import { isSupabaseConfigured, requireRole } from "@/lib/roles";
import {
  getSellerByProfileId,
  getSellerProductById,
} from "@/lib/repositories/seller";
import { createClient } from "@/lib/supabase/server";
import { ProductEditClient } from "@/components/product-edit-client";
import type { Database } from "@/lib/supabase/types";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ProductMediaRow = Database["public"]["Tables"]["product_media"]["Row"];
type ProductWithMedia = ProductRow & {
  product_media: ProductMediaRow[] | null;
};

/**
 * Edit page for a single product. Server-side ownership is enforced before
 * rendering: a seller who tries to edit a product they don't own (or a
 * non-existent id) gets bounced to /dashboard?tab=products.
 *
 * Demo mode (no Supabase): shows a friendly message rather than crashing.
 */
export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["seller", "admin"]);

  if (!isSupabaseConfigured()) {
    return (
      <Shell>
        <Nav />
        <section className="mx-auto max-w-3xl px-6 py-16">
          <Badge tone="amber">Demo mode</Badge>
          <h1 className="mt-4 text-3xl font-black">
            Product editing requires Supabase
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Connect Supabase to create and edit real products. The dashboard is
            still browseable for previewing the UI.
          </p>
          <Link
            href="/dashboard?tab=products"
            className="mt-6 inline-flex rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200"
          >
            ← Back to products
          </Link>
        </section>
      </Shell>
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Sellers must have a seller row. Admins can edit too — they look up via
  // their own seller_id when present, otherwise we fall through to a 404 to
  // keep the route behavior consistent (admins editing other sellers'
  // products is a separate moderation flow).
  const sellerRes = await getSellerByProfileId(user.id);
  if (!sellerRes.data) {
    redirect("/dashboard?tab=products");
  }

  const productRes = await getSellerProductById(sellerRes.data.id, params.id);
  if (productRes.error) {
    console.error(
      "[dashboard/products/[id]/edit] lookup failed:",
      productRes.error.message,
    );
  }
  const product = productRes.data as unknown as ProductWithMedia | null;
  if (!product) {
    notFound();
  }

  return (
    <Shell>
      <Nav />
      <ProductEditClient
        product={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          game: product.game,
          category: product.category,
          status: product.status,
          summary: product.summary,
          websiteUrl: product.website_url,
          features: product.features ?? [],
          pricePoints: product.price_points ?? [],
          metaTitle: product.meta_title,
          metaDescription: product.meta_description,
          media: (product.product_media ?? [])
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((m) => ({
              id: m.id,
              storagePath: m.storage_path,
              publicUrl: m.public_url,
              altText: m.alt_text,
              sortOrder: m.sort_order,
            })),
        }}
      />
    </Shell>
  );
}
