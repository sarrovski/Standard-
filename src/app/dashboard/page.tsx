import { requireRole, isSupabaseConfigured } from "@/lib/roles";
import { Nav, SectionHeader, Shell } from "@/components/ui";
import { DashboardClient, type DashboardInitialData } from "@/components/dashboard-client";
import { getSellerDashboardData } from "@/lib/repositories/seller";
import {
  adaptProviderTagStatus,
  adaptSellerPaymentRequest,
  adaptSellerProductCard,
} from "@/lib/adapters";

async function loadDashboardData(): Promise<DashboardInitialData> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  // requireRole already authenticates and authorizes (seller | admin). After
  // it returns we still need the user object for the seller lookup.
  // We re-fetch via createClient(); cheap and keeps roles.ts simple.
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const data = await getSellerDashboardData(user.id);
  if (!data) {
    // Profile is seller (per requireRole) but no sellers row exists yet —
    // could happen if the Stripe webhook hasn't fired yet. Fall back to a
    // minimal data shape so the dashboard doesn't crash.
    return {
      products: [],
      paymentRequests: [],
      providerTagStatus: "Not requested",
      sellerName: "Pending",
    };
  }

  return {
    products: data.products.map(adaptSellerProductCard),
    paymentRequests: data.paymentRequests.map((row) =>
      adaptSellerPaymentRequest(row),
    ),
    providerTagStatus: adaptProviderTagStatus(data.providerTagRequest),
    sellerName: data.seller.seller_name,
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  await requireRole(["seller", "admin"]);
  const initialData = await loadDashboardData();

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeader
          eyebrow="Seller dashboard"
          title={
            initialData
              ? `Dashboard${initialData.sellerName ? ` • ${initialData.sellerName}` : ""}`
              : "Dashboard"
          }
          text="Manage products, builder, payment verification, analytics, provider tag, and billing."
        />
        <DashboardClient
          initialTab={searchParams?.tab}
          initialData={initialData}
        />
      </section>
    </Shell>
  );
}
