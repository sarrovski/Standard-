import { requireRole, isSupabaseConfigured } from "@/lib/roles";
import { Nav, Shell } from "@/components/ui";
import { AdminClient } from "@/components/admin-client";
import {
  getAllSellersForAdmin,
  getPendingPaymentVerificationRequests,
  getPendingProviderTagRequests,
  getProductCountBySeller,
  getVerifiedPaymentMethodCountBySeller,
} from "@/lib/repositories/admin";
import {
  adaptAdminPaymentRequest,
  adaptAdminProviderTagRequest,
  adaptAdminSeller,
  type PaymentVerificationRequestWithJoins,
  type ProviderTagRequestWithJoins,
  type UIAdminPaymentRequest,
  type UIAdminProviderTagRequest,
  type UIAdminSeller,
} from "@/lib/adapters";

async function loadAdminData(): Promise<{
  paymentRequests: UIAdminPaymentRequest[] | null;
  providerTagRequests: UIAdminProviderTagRequest[] | null;
  sellers: UIAdminSeller[] | null;
}> {
  if (!isSupabaseConfigured()) {
    return {
      paymentRequests: null,
      providerTagRequests: null,
      sellers: null,
    };
  }

  const [paymentRes, tagRes, sellersRes, productCounts, paymentCounts] =
    await Promise.all([
      getPendingPaymentVerificationRequests(),
      getPendingProviderTagRequests(),
      getAllSellersForAdmin(),
      getProductCountBySeller(),
      getVerifiedPaymentMethodCountBySeller(),
    ]);

  if (paymentRes.error) {
    console.error("[admin] payment fetch failed:", paymentRes.error.message);
  }
  if (tagRes.error) {
    console.error("[admin] provider tag fetch failed:", tagRes.error.message);
  }
  if (sellersRes.error) {
    console.error("[admin] sellers fetch failed:", sellersRes.error.message);
  }

  const paymentRows = (paymentRes.data ??
    []) as unknown as PaymentVerificationRequestWithJoins[];
  const tagRows = (tagRes.data ?? []) as unknown as ProviderTagRequestWithJoins[];
  const sellerRows = (sellersRes.data ?? []) as unknown as Parameters<
    typeof adaptAdminSeller
  >[0][];

  return {
    paymentRequests: paymentRows.map(adaptAdminPaymentRequest),
    providerTagRequests: tagRows.map(adaptAdminProviderTagRequest),
    sellers: sellerRows.map((row) =>
      adaptAdminSeller(
        row,
        productCounts.get(row.id) ?? 0,
        paymentCounts.get(row.id) ?? 0,
      ),
    ),
  };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  await requireRole(["admin"]);
  const { paymentRequests, providerTagRequests, sellers } = await loadAdminData();

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-8">
        <AdminClient
          initialPaymentRequests={paymentRequests}
          initialProviderTagRequests={providerTagRequests}
          initialSellers={sellers}
          initialTab={searchParams?.tab}
        />
      </section>
    </Shell>
  );
}
