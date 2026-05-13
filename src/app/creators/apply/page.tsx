import type { Metadata } from "next";
import { Nav, Shell } from "@/components/ui";
import { CreatorApplyClient } from "@/components/creator-apply-client";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Creator application — Standard",
  description:
    "Apply to feature gaming-tool reviews and walkthroughs as a Standard creator partner.",
  alternates: { canonical: "/creators/apply" },
};

export default async function CreatorApplyPage() {
  const user = await getSessionUser();
  return (
    <Shell>
      <Nav user={user} />
      <CreatorApplyClient />
    </Shell>
  );
}
