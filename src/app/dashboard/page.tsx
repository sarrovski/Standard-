import { requireRole, isSupabaseConfigured } from "@/lib/roles";
import { getSessionUser } from "@/lib/session";
import { Nav, Shell } from "@/components/ui";
import { DashboardClient, type DashboardInitialData } from "@/components/dashboard-client";
import {
  getActiveSellerFeaturedSlots,
  getProductTrafficStats,
  getSellerDashboardData,
  getVerifiedPaymentMethodCount,
} from "@/lib/repositories/seller";
import { getReviewsForSeller } from "@/lib/repositories/reviews";
import { getCreatorRequestsForSeller } from "@/lib/repositories/creators";
import type { SellerReview } from "@/components/seller-reviews-tab";
import type { UICreatorRequest } from "@/lib/creator-marketplace";
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
      reviews: [],
      creatorRequests: [],
      activeFeaturedSlots: [],
    };
  }

  const [
    verifiedPaymentMethodCount,
    trafficStats,
    reviewsRes,
    creatorRequestsRes,
    featuredSlotsRes,
  ] = await Promise.all([
    getVerifiedPaymentMethodCount(data.seller.id),
    getProductTrafficStats(data.seller.id),
    getReviewsForSeller(data.seller.id),
    getCreatorRequestsForSeller(data.seller.id),
    getActiveSellerFeaturedSlots(data.seller.id),
  ]);

  type FeaturedSlotRow = {
    id: string;
    ends_at: string | null;
    products?: {
      name: string;
      slug: string;
      game: string;
      category: string;
    } | null;
  };
  const activeFeaturedSlots = (
    (featuredSlotsRes.data ?? []) as unknown as FeaturedSlotRow[]
  ).map((row) => ({
    id: row.id,
    productName: row.products?.name ?? "—",
    productSlug: row.products?.slug ?? "",
    game: row.products?.game ?? "—",
    category: row.products?.category ?? "—",
    endsAt: row.ends_at,
  }));

  const reviews: SellerReview[] = reviewsRes.data.map((row) => ({
    id: row.id,
    productName: row.product?.name ?? "Unknown product",
    productSlug: row.product?.slug ?? "",
    reviewerDisplayName: row.reviewer?.display_name ?? null,
    rating: row.rating,
    body: row.body,
    status: row.status,
    appealReason: row.appeal_reason,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  }));

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
    reviews,
    creatorRequests: creatorRequestsRes.data,
    activeFeaturedSlots,
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  await requireRole(["seller", "admin"]);
  const [initialData, user] = await Promise.all([
    loadDashboardData(),
    getSessionUser(),
  ]);

  return (
    <Shell>
      <Nav user={user} />
      <section className="mx-auto max-w-7xl px-6 py-8">
        <DashboardClient
          initialTab={searchParams?.tab}
          initialData={initialData}
        />
      </section>
    </Shell>
  );
}
