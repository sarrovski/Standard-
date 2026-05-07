
import { Badge, ButtonLink, Nav, Shell } from "@/components/ui";
import { LoginClient } from "@/components/login-client";
import { isSupabaseConfigured } from "@/lib/roles";
import { getSiteUrl } from "@/lib/site-url";


export default function LoginPage() {
  const supabaseConfigured = isSupabaseConfigured();
  const siteUrl = getSiteUrl();

  return (
    <Shell>
      <Nav />
      <section className="mx-auto grid min-h-[calc(100vh-96px)] max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <Badge tone="purple">Standard account</Badge>
          <h1 className="mt-5 text-5xl font-black tracking-tight md:text-6xl">
            Welcome back.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-400">
            Sign in once. Standard automatically routes you to the right place based on your account:
            buyer account, seller dashboard, seller onboarding, or admin control.
          </p>

          <div className="mt-8 grid gap-3 text-sm text-slate-400">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              No public role picker. Your account permissions determine your access.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              Sellers need an active subscription before they access the full seller dashboard.
            </div>
          </div>

          <div className="mt-8">
            <ButtonLink href="/auth-routing" variant="secondary">View routing logic</ButtonLink>
          </div>
        </div>

        <LoginClient supabaseConfigured={supabaseConfigured} siteUrl={siteUrl} />
      </section>
    </Shell>
  );
}
