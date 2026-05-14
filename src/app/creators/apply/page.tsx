import type { Metadata } from "next";
import { Nav, Shell } from "@/components/ui";
import { CreatorApplyClient } from "@/components/creator-apply-client";
import { getSessionUser } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/roles";
import { getCreatorApplicationsForProfile } from "@/lib/repositories/creators";
import type { UICreatorApplication } from "@/lib/creator-marketplace";

export const metadata: Metadata = {
  title: "Apply as a media creator — Standard",
  description:
    "Apply to list your creator profile on Standard. Sellers discover creators for product showcases, thumbnails, trailers, reviews, and promos. Profiles are reviewed before appearing publicly.",
  alternates: { canonical: "/creators/apply" },
};

export default async function CreatorApplyPage() {
  const user = await getSessionUser();

  // Most recent application for this user (if any) — drives the "you
  // already applied" / "resubmit after rejection" states.
  let latestApplication: UICreatorApplication | null = null;
  if (user && isSupabaseConfigured()) {
    const res = await getCreatorApplicationsForProfile(user.id);
    latestApplication = res.data[0] ?? null;
  }

  return (
    <Shell>
      <Nav user={user} />
      <CreatorApplyClient
        loggedIn={Boolean(user)}
        defaultEmail={user?.email ?? null}
        latestApplication={latestApplication}
      />
    </Shell>
  );
}
