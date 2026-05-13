import { requireRole, isSupabaseConfigured } from "@/lib/roles";
import { Nav, Shell } from "@/components/ui";
import { AdminClient } from "@/components/admin-client";
import {
  getAllFeaturedSlotsForAdmin,
  getAllProductsForAdmin,
  getAllSellersForAdmin,
  getPendingPaymentVerificationRequests,
  getPendingProviderTagRequests,
  getPendingVerificationCountByProduct,
  getProductCountBySeller,
  getVerifiedPaymentMethodCountBySeller,
} from "@/lib/repositories/admin";
import {
  adaptAdminFeaturedSlot,
  adaptAdminPaymentRequest,
  adaptAdminProduct,
  adaptAdminProviderTagRequest,
  adaptAdminSeller,
  type PaymentVerificationRequestWithJoins,
  type ProviderTagRequestWithJoins,
  type UIAdminFeaturedSlot,
  type UIAdminPaymentRequest,
  type UIAdminProduct,
  type UIAdminProviderTagRequest,
  type UIAdminSeller,
} from "@/lib/adapters";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type RealRiskSignal = {
  key: string;
  title: string;
  detail: string;
  severity: "high" | "medium" | "low";
};

function deriveSignals(opts: {
  sellers: UIAdminSeller[];
  paymentRequests: UIAdminPaymentRequest[];
  providerTagRequests: UIAdminProviderTagRequest[];
  paymentRows: PaymentVerificationRequestWithJoins[];
  tagRows: ProviderTagRequestWithJoins[];
}): RealRiskSignal[] {
  const out: RealRiskSignal[] = [];
  const now = Date.now();

  const stalePayments = opts.paymentRows.filter((row) => {
    const created = Date.parse(row.created_at);
    return Number.isFinite(created) && now - created > SEVEN_DAYS_MS;
  });
  if (stalePayments.length > 0) {
    out.push({
      key: "stale-payments",
      severity: "high",
      title: `${stalePayments.length} payment verification${stalePayments.length === 1 ? "" : "s"} stuck > 7 days`,
      detail:
        "Sellers are waiting on review. Open the Payment queue tab to clear the oldest.",
    });
  }

  const staleTags = opts.tagRows.filter((row) => {
    const created = Date.parse(row.created_at);
    return Number.isFinite(created) && now - created > SEVEN_DAYS_MS;
  });
  if (staleTags.length > 0) {
    out.push({
      key: "stale-tags",
      severity: "medium",
      title: `${staleTags.length} provider-tag request${staleTags.length === 1 ? "" : "s"} stuck > 7 days`,
      detail: "Approve or reject from the Provider tags tab.",
    });
  }

  const sellersMissingPayments = opts.sellers.filter(
    (seller) => seller.productsCount > 0 && seller.verifiedPaymentMethodsCount === 0,
  );
  if (sellersMissingPayments.length > 0) {
    out.push({
      key: "sellers-no-payments",
      severity: "medium",
      title: `${sellersMissingPayments.length} seller${sellersMissingPayments.length === 1 ? "" : "s"} have products but 0 verified payment methods`,
      detail:
        "These products may be live without verified checkout proofs. Worth a manual review.",
    });
  }

  const rejectedTagSellers = opts.sellers.filter(
    (seller) => seller.providerTag === "Rejected",
  );
  if (rejectedTagSellers.length > 0) {
    out.push({
      key: "rejected-tag-sellers",
      severity: "low",
      title: `${rejectedTagSellers.length} seller${rejectedTagSellers.length === 1 ? "" : "s"} previously rejected for Provider tag`,
      detail: "Cross-check if any have re-listed under a new identity.",
    });
  }

  return out;
}

async function loadAdminData(): Promise<{
  paymentRequests: UIAdminPaymentRequest[] | null;
  providerTagRequests: UIAdminProviderTagRequest[] | null;
  sellers: UIAdminSeller[] | null;
  products: UIAdminProduct[] | null;
  featuredSlots: UIAdminFeaturedSlot[] | null;
  realSignals: RealRiskSignal[];
}> {
  if (!isSupabaseConfigured()) {
    return {
      paymentRequests: null,
      providerTagRequests: null,
      sellers: null,
      products: null,
      featuredSlots: null,
      realSignals: [],
    };
  }

  const [
    paymentRes,
    tagRes,
    sellersRes,
    productCounts,
    paymentCounts,
    productsRes,
    pendingByProduct,
    featuredRes,
  ] = await Promise.all([
    getPendingPaymentVerificationRequests(),
    getPendingProviderTagRequests(),
    getAllSellersForAdmin(),
    getProductCountBySeller(),
    getVerifiedPaymentMethodCountBySeller(),
    getAllProductsForAdmin(),
    getPendingVerificationCountByProduct(),
    getAllFeaturedSlotsForAdmin(),
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
  if (productsRes.error) {
    console.error("[admin] products fetch failed:", productsRes.error.message);
  }
  if (featuredRes.error) {
    console.error("[admin] featured slots fetch failed:", featuredRes.error.message);
  }

  const paymentRows = (paymentRes.data ?? []) as unknown as PaymentVerificationRequestWithJoins[];
  const tagRows = (tagRes.data ?? []) as unknown as ProviderTagRequestWithJoins[];
  const sellerRows = (sellersRes.data ?? []) as unknown as Parameters<
    typeof adaptAdminSeller
  >[0][];
  const productRows = (productsRes.data ?? []) as unknown as Parameters<
    typeof adaptAdminProduct
  >[0][];
  const featuredRows = (featuredRes.data ?? []) as unknown as Parameters<
    typeof adaptAdminFeaturedSlot
  >[0][];

  const paymentRequests = paymentRows.map(adaptAdminPaymentRequest);
  const providerTagRequests = tagRows.map(adaptAdminProviderTagRequest);
  const sellers = sellerRows.map((row) =>
    adaptAdminSeller(
      row,
      productCounts.get(row.id) ?? 0,
      paymentCounts.get(row.id) ?? 0,
    ),
  );
  const products = productRows.map((row) =>
    adaptAdminProduct(row, pendingByProduct.get(row.id) ?? 0),
  );
  const featuredSlots = featuredRows.map(adaptAdminFeaturedSlot);

  const realSignals = deriveSignals({
    sellers,
    paymentRequests,
    providerTagRequests,
    paymentRows,
    tagRows,
  });

  return {
    paymentRequests,
    providerTagRequests,
    sellers,
    products,
    featuredSlots,
    realSignals,
  };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  await requireRole(["admin"]);
  const data = await loadAdminData();

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-8">
        <AdminClient
          initialPaymentRequests={data.paymentRequests}
          initialProviderTagRequests={data.providerTagRequests}
          initialSellers={data.sellers}
          initialProducts={data.products}
          initialFeaturedSlots={data.featuredSlots}
          realSignals={data.realSignals}
          initialTab={searchParams?.tab}
        />
      </section>
    </Shell>
  );
}
