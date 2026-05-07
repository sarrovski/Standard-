import { requireRole, isSupabaseConfigured } from "@/lib/roles";
import { Nav, SectionHeader, Shell } from "@/components/ui";
import { DashboardClient, type DashboardInitialData } from "@/components/dashboard-client";
import { getSellerDashboardData } from "@/lib/repositories/seller";
import {
  adaptPaymentMethodOption,
  adaptProviderTagStatus,
  adaptSellerPaymentRequest,
  adaptSellerProductCard,
  adaptSellerSubscription,
} from "@/lib/adapters";

async function loadDashboardData(): Promise<DashboardInitialData> {
  if (!isSupabaseConfigured()) {
    return null;
  }

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
    // could happen if the Stripe webhook hasn't fired yet.
    return {
      products: [],
      paymentRequests: [],
      providerTagStatus: "Not requested",
      sellerName: "Pending",
      paymentMethods: [],
      subscription: null,
    };
  }

  return {
    products: data.products.map(adaptSellerProductCard),
    paymentRequests: data.paymentRequests.map((row) =>
      adaptSellerPaymentRequest(row),
    ),
    providerTagStatus: adaptProviderTagStatus(data.providerTagRequest),
    sellerName: data.seller.seller_name,
    paymentMethods: data.paymentMethods.map(adaptPaymentMethodOption),
    subscription: adaptSellerSubscription(data.subscription),
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
