import { Badge, Nav, Shell } from "@/components/ui";
import { SignupClient } from "@/components/signup-client";
import { isSupabaseConfigured } from "@/lib/roles";
import { getSiteUrl } from "@/lib/site-url";

export default function SignupPage() {
  const supabaseConfigured = isSupabaseConfigured();
  const siteUrl = getSiteUrl();

  return (
    <Shell>
      <Nav />
      <section className="mx-auto grid min-h-[calc(100vh-96px)] max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <Badge tone="default">Create account</Badge>
          <h1 className="mt-5 text-5xl font-black tracking-tight md:text-6xl">
            Join Standard.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-400">
            Start as a buyer. If you want to sell, you can enable seller access after account creation
            and choose a seller subscription.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-slate-400">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              Buyer accounts can save products, write reviews, and set payment preferences.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              Seller access is enabled after signup from your account onboarding.
            </div>
          </div>
        </div>

        <SignupClient supabaseConfigured={supabaseConfigured} siteUrl={siteUrl} />
      </section>
    </Shell>
  );
}
