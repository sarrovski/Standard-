import { requireRole } from "@/lib/roles";
import { Nav, SectionHeader, Shell } from "@/components/ui";
import { DashboardClient } from "@/components/dashboard-client";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  await requireRole(["seller", "admin"]);

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeader
          eyebrow="Seller Dashboard"
          title="Manage your products and build better announcements"
          text="This working MVP lets sellers create products, verify payments, reserve featured slots, and push users toward their website."
        />
        <DashboardClient initialTab={searchParams?.tab ?? "products"} />
      </section>
    </Shell>
  );
}
