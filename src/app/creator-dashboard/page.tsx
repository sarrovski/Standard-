import { redirect } from "next/navigation";
import { Nav, Shell } from "@/components/ui";
import { CreatorDashboardClient } from "@/components/creator-dashboard-client";
import { isSupabaseConfigured } from "@/lib/roles";
import { getSessionUser } from "@/lib/session";
import {
  getCreatorProfileByProfileId,
  getCreatorRequestsForCreator,
} from "@/lib/repositories/creators";

/**
 * Creator dashboard — /creator-dashboard.
 *
 * A dedicated role-style dashboard (mirrors /dashboard for sellers and
 * /admin for admins). Creator-ness is a linked creator_profiles row, not
 * a profile role, so the guard here is: signed in AND owns a creator
 * profile. Users without a profile are bounced to /creators/apply;
 * signed-out users to /login.
 *
 * Tabs: Creator Profile · Portfolio · Requests.
 */
export default async function CreatorDashboardPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const user = await getSessionUser();

  if (!isSupabaseConfigured()) {
    // Demo mode: render the shell with an inert message.
    return (
      <Shell>
        <Nav user={user} />
        <section className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h1 className="text-3xl font-black tracking-tight">
            Creator dashboard
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            The creator dashboard loads once Supabase is connected.
          </p>
        </section>
      </Shell>
    );
  }

  if (!user) redirect("/login");

  const profileRes = await getCreatorProfileByProfileId(user.id);
  if (!profileRes.data) {
    // Signed in but not a creator yet → send them to apply.
    redirect("/creators/apply");
  }

  const { profile, items } = profileRes.data;
  const requestsRes = await getCreatorRequestsForCreator(profile.id);

  return (
    <Shell>
      <Nav user={user} />
      <section className="mx-auto max-w-7xl px-6 py-8">
        <CreatorDashboardClient
          profile={profile}
          portfolioItems={items}
          requests={requestsRes.data}
          initialTab={searchParams?.tab}
        />
      </section>
    </Shell>
  );
}
