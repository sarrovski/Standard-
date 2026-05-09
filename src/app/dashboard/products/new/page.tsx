import { Nav, SectionHeader, Shell } from "@/components/ui";
import { ProductCreateClient } from "@/components/product-create-client";
import { isSupabaseConfigured, requireRole } from "@/lib/roles";

export default async function NewProductPage() {
  await requireRole(["seller", "admin"]);

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-5xl px-6 py-10">
        <SectionHeader
          eyebrow="Seller dashboard"
          title="New product"
          text="Create a draft product first, then manage status and media from Produits."
        />
        <ProductCreateClient supabaseConfigured={isSupabaseConfigured()} />
      </section>
    </Shell>
  );
}
