import { Nav, SectionHeader, Shell } from "@/components/ui";
import { AdminClient } from "@/components/admin-client";

export default function AdminPage() {
  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeader
          eyebrow="Admin"
          title="Control sellers, provider tags, payments, and moderation"
          text="This working MVP lets admin approve local payment requests and update product payment visibility."
        />
        <AdminClient />
      </section>
    </Shell>
  );
}
