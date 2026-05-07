import { requireRole, isSupabaseConfigured } from "@/lib/roles";
import { Nav, SectionHeader, Shell } from "@/components/ui";
import { AdminClient } from "@/components/admin-client";
import {
  getPendingPaymentVerificationRequests,
  getPendingProviderTagRequests,
} from "@/lib/repositories/admin";
import {
  adaptAdminPaymentRequest,
  adaptAdminProviderTagRequest,
  type PaymentVerificationRequestWithJoins,
  type ProviderTagRequestWithJoins,
  type UIAdminPaymentRequest,
  type UIAdminProviderTagRequest,
} from "@/lib/adapters";

async function loadAdminData(): Promise<{
  paymentRequests: UIAdminPaymentRequest[] | null;
  providerTagRequests: UIAdminProviderTagRequest[] | null;
}> {
  if (!isSupabaseConfigured()) {
    return { paymentRequests: null, providerTagRequests: null };
  }

  const [paymentRes, tagRes] = await Promise.all([
    getPendingPaymentVerificationRequests(),
    getPendingProviderTagRequests(),
  ]);

  if (paymentRes.error) {
    console.error("[admin] payment fetch failed:", paymentRes.error.message);
  }
  if (tagRes.error) {
    console.error("[admin] provider tag fetch failed:", tagRes.error.message);
  }

  const paymentRows = (paymentRes.data ??
    []) as unknown as PaymentVerificationRequestWithJoins[];
  const tagRows = (tagRes.data ?? []) as unknown as ProviderTagRequestWithJoins[];

  return {
    paymentRequests: paymentRows.map(adaptAdminPaymentRequest),
    providerTagRequests: tagRows.map(adaptAdminProviderTagRequest),
  };
}

export default async function AdminPage() {
  await requireRole(["admin"]);
  const { paymentRequests, providerTagRequests } = await loadAdminData();

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeader
          eyebrow="Admin"
          title="Control sellers, provider tags, payments, and moderation"
          text="This working MVP lets admin approve local payment requests and update product payment visibility."
        />
        <AdminClient
          initialPaymentRequests={paymentRequests}
          initialProviderTagRequests={providerTagRequests}
        />
      </section>
    </Shell>
  );
}
