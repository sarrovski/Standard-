import { Nav, SectionHeader, Shell } from "@/components/ui";
import { requireRole } from "@/lib/roles";
import { ProductCreateForm } from "@/components/product-create-form";

/**
 * Standalone product-create page. The seller fills name + game + category +
 * a short summary, hits "Create product", and the API drops a draft row.
 * Right after, the client redirects to /dashboard/products/[id]/edit, which
 * is where the heavier sections (media, features, price points, SEO) live.
 *
 * We keep this page intentionally light: a seller's first 30 seconds in the
 * app should be "fill 4 fields, click create, see your product". Everything
 * else can wait for the edit page.
 */
export default async function NewProductPage() {
  await requireRole(["seller", "admin"]);

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-3xl px-6 py-10">
        <SectionHeader
          eyebrow="New product"
          title="Create your product"
          text="Fill the basics — you can add images, features, and SEO meta on the next screen."
        />
        <ProductCreateForm />
      </section>
    </Shell>
  );
}
