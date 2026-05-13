import { Card, Nav, SectionHeader, Shell, Badge, ButtonLink } from "@/components/ui";
import { AccountDashboardClient } from "@/components/account-dashboard-client";
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
        <section className="mx-auto max-w-7xl px-6 py-10">
          <SectionHeader
            eyebrow="Seller onboarding"
            title="Become a seller on Standard"
            text="If you do not have an active seller subscription yet, start here. Choose a plan, then unlock the seller dashboard."
          />

          <div className="mt-8 space-y-8">
            <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="p-6">
                <Badge tone="orange">Start Selling</Badge>
                <h2 className="mt-4 text-2xl font-black">How selling on Standard works</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Standard helps sellers create trusted product announcements, verify payment methods, and send qualified users to their own website.
                </p>

                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {[
                    ["1. Create your seller account", "Start from one Standard account and enable seller access."],
                    ["2. Choose a seller plan", "Unlock product announcements, builder access, payment verification, and analytics."],
                    ["3. Build your product page", "Use the builder to add product details, media, pricing, features, FAQ, and website CTA."],
                    ["4. Verify payment methods", "Submit proof before a payment method appears publicly as accepted."],
                    ["5. Request Provider / Developer tag", "Official developers can submit website, Discord, Telegram, and proof for admin review."],
                    ["6. Drive traffic to your site", "Your Standard page builds trust, then pushes buyers to your official website or offer page."],
                  ].map(([title, text]) => (
                    <div key={title} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <div className="font-bold">{title}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-400">{text}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <ButtonLink href="/plans">View seller plan</ButtonLink>
                </div>
              </Card>

              <Card className="p-6">
                <Badge tone="default">Seller tools</Badge>
                <h2 className="mt-4 text-2xl font-black">What you unlock</h2>
                <div className="mt-5 grid gap-3">
                  {[
                    "Product announcements",
                    "Advanced product page builder",
                    "Image upload and media gallery",
                    "Verified payment method workflow",
                    "Outbound click analytics",
                    "Featured category placement (sold separately)",
                    "Provider / Developer tag request",
                  ].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm">
                      {item}
                    </div>
                  ))}
                </div>
              </Card>
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <Card className="p-6">
                <Badge tone="green">Featured slots</Badge>
                <h2 className="mt-4 text-2xl font-black">Pay to appear higher</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Once you have an active subscription, featured placements are
                  reserved from <code className="text-slate-300">/dashboard/billing</code>.
                  One active slot per game/category, paid up-front per slot.
                </p>
              </Card>

              <Card className="p-6">
                <Badge tone="amber">Verification still matters</Badge>
                <h2 className="mt-4 text-2xl font-black">Trust isn&apos;t bought</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Featured boosts visibility, but it does not replace verification.
                  Payments, provider tag, and trust signals are reviewed separately.
                </p>
              </Card>
            </section>
          </div>
        </section>
      </Shell>
    );
  }

  const profile = await loadProfile();
  if (!profile) {
    // Demo mode (no Supabase env) or unauthenticated — fall back to a
    // minimal placeholder so /account never errors out.
    return (
      <Shell>
        <Nav />
        <section className="mx-auto max-w-3xl px-6 py-12">
          <SectionHeader
            eyebrow="Buyer workspace"
            title="Sign in to use your account"
            text="Saved products, recently viewed, and account settings live here once you're signed in. In demo mode (no Supabase env configured) the dashboard is read-only."
          />
          <div className="mt-8 flex gap-3">
            <ButtonLink href="/login">Sign in</ButtonLink>
            <ButtonLink href="/marketplace" variant="secondary">Browse marketplace</ButtonLink>
          </div>
        </section>
      </Shell>
    );
  }

  const savedRes = await getSavedProductsForProfile(profile.id);

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-8">
        <AccountDashboardClient
          profile={profile}
          savedProducts={savedRes.data}
          initialTab={searchParams?.tab}
        />
      </section>
    </Shell>
  );
}
