import { requireRole, isSupabaseConfigured } from "@/lib/roles";
import { Nav, Shell } from "@/components/ui";
import { DashboardClient, type DashboardInitialData } from "@/components/dashboard-client";
import {
  getProductTrafficStats,
  getSellerDashboardData,
  getVerifiedPaymentMethodCount,
} from "@/lib/repositories/seller";
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
      verifiedPaymentMethodCount: 0,
    };
  }

  const [verifiedPaymentMethodCount, trafficStats] = await Promise.all([
    getVerifiedPaymentMethodCount(data.seller.id),
    getProductTrafficStats(data.seller.id),
  ]);

  return {
    products: data.products.map((row) =>
      adaptSellerProductCard(row, trafficStats.get(row.id)),
    ),
    paymentRequests: data.paymentRequests.map((row) =>
      adaptSellerPaymentRequest(row),
    ),
    providerTagStatus: adaptProviderTagStatus(data.providerTagRequest),
    sellerName: data.seller.seller_name,
    paymentMethods: data.paymentMethods.map(adaptPaymentMethodOption),
    subscription: adaptSellerSubscription(data.subscription),
    verifiedPaymentMethodCount,
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
      <section className="mx-auto max-w-7xl px-6 py-8">
        <DashboardClient
          initialTab={searchParams?.tab}
          initialData={initialData}
        />
      </section>
    </Shell>
  );
}
