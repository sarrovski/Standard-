import { Nav, Shell } from "@/components/ui";
import { ProductCreateClient } from "@/components/product-create-client";
import { isSupabaseConfigured, requireRole } from "@/lib/roles";
import { getSessionUser } from "@/lib/session";

export default async function NewProductPage() {
  await requireRole(["seller", "admin"]);
  const user = await getSessionUser();

  return (
    <Shell>
      <Nav user={user} />
      <section className="mx-auto max-w-4xl px-6 py-8">
        <ProductCreateClient supabaseConfigured={isSupabaseConfigured()} />
      </section>
    </Shell>
  );
}
