import { Card, Nav, SectionHeader, Shell, Badge, ButtonLink } from "@/components/ui";
import { AccountDashboardClient } from "@/components/account-dashboard-client";
import { SellerLaunchChecklist } from "@/components/seller-launch-checklist";
import { isSupabaseConfigured, requireRole } from "@/lib/roles";
import { getSavedProductsForProfile } from "@/lib/repositories/buyer";

type AccountProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: "user" | "seller" | "admin";
};

async function loadProfile(): Promise<AccountProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, display_name, role")
    .eq("id", user.id)
    .maybeSingle<AccountProfile>();
  return profile ?? null;
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: { view?: string; tab?: string };
}) {
  await requireRole(["user", "seller", "admin"]);
  const sellView = searchParams?.view === "sell";

  if (sellView) {
    return (
      <Shell>
        <Nav />
        <section className="mx-auto max-w-5xl px-6 py-10">
          <SectionHeader
            eyebrow="Seller onboarding"
            title="Become a seller on Standard"
            text="Standard is a discovery and verification layer for gaming-tool sellers. Pick a plan, build your seller profile, verify your payment methods, and start receiving qualified traffic to your official site."
          />

          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/plans">View seller plans</ButtonLink>
            <ButtonLink href="/start-selling" variant="secondary">
              Read the full guide
            </ButtonLink>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[
              ["Qualified traffic", "Buyers reach your product page from game and category landing pages, the marketplace, and search."],
              ["Buyer confidence", "Verification badges and verified payment methods reduce hesitation before a buyer clicks through to your site."],
              ["Trust signals", "Seller verification, payment proof, and review history are surfaced on every product page."],
              ["Product discovery", "Each product appears across multiple indexed entry points — better organic-search coverage."],
              ["Seller profile", "Your seller profile carries across every product you publish. Verify once, applied everywhere."],
              ["Verified payment methods", "Verified payment methods are one of the strongest trust signals buyers see on a product page."],
            ].map(([title, text]) => (
              <Card key={title} className="p-5">
                <h3 className="text-base font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
              </Card>
            ))}
          </div>

          <div className="mt-12">
            <SellerLaunchChecklist intro="Eight steps from new seller to a published product with verified payment methods. The dashboard unlocks once your subscription is active." />
          </div>

          <Card className="mt-10 border-amber-400/20 bg-amber-500/10 p-6">
            <Badge tone="amber">Verification still matters</Badge>
            <p className="mt-3 text-sm leading-6 text-amber-100/90">
              A subscription gives you access to the seller dashboard. It does
              not auto-verify your payment methods or grant the Provider /
              Developer tag — both are reviewed independently. Featured slots
              improve placement only; they never change verification status
              or trust signals.
            </p>
          </Card>
        </section>
      </Shell>
    );
  }

  const profile = await loadProfile();

  // Supabase configured but no user → real sign-in CTA.
  if (!profile && isSupabaseConfigured()) {
    return (
      <Shell>
        <Nav />
        <section className="mx-auto max-w-3xl px-6 py-12">
          <SectionHeader
            eyebrow="Buyer workspace"
            title="Sign in to use your account"
            text="Saved products, recently viewed, and account settings live here once you're signed in."
          />
          <div className="mt-8 flex gap-3">
            <ButtonLink href="/login">Sign in</ButtonLink>
            <ButtonLink href="/marketplace" variant="secondary">Browse marketplace</ButtonLink>
          </div>
        </section>
      </Shell>
    );
  }

  // Demo mode (no Supabase env): render the dashboard shell with a
  // placeholder profile + empty saved list so the layout is reviewable
  // without auth. Forms are inert (see AccountDashboardClient demoMode).
  const isDemoMode = !profile;
  const renderedProfile: AccountProfile = profile ?? {
    id: "demo-buyer",
    email: "demo@standard.example",
    display_name: "Demo Buyer",
    role: "user",
  };
  const savedRes = profile
    ? await getSavedProductsForProfile(profile.id)
    : { data: [], error: null };

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-8">
        <AccountDashboardClient
          profile={renderedProfile}
          savedProducts={savedRes.data}
          initialTab={searchParams?.tab}
          demoMode={isDemoMode}
        />
      </section>
    </Shell>
  );
}
