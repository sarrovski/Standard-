
import { Badge, ButtonLink, Nav, Shell } from "@/components/ui";
import { LoginClient } from "@/components/login-client";
import { isSupabaseConfigured } from "@/lib/roles";
import { getSiteUrl } from "@/lib/site-url";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "missing-code":
    "The magic link didn't include a verification code. Try requesting a new one.",
  "exchange-failed":
    "Couldn't verify the magic link — it may have expired or already been used. Request a new one.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { auth?: string };
}) {
  const supabaseConfigured = isSupabaseConfigured();
  const siteUrl = getSiteUrl();
  const authError = searchParams?.auth;
  const authErrorMessage = authError
    ? (AUTH_ERROR_MESSAGES[authError] ?? `Sign-in failed: ${authError}`)
    : null;

  return (
    <Shell>
      <Nav />
      <section className="mx-auto grid min-h-[calc(100vh-96px)] max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <Badge tone="orange">Standard account</Badge>
          <h1 className="mt-5 text-5xl font-black tracking-tight md:text-6xl">
            Welcome back.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-400">
            Sign in once. Standard automatically routes you to the right place based on your account:
            buyer account, seller dashboard, seller onboarding, or admin control.
          </p>

          {authErrorMessage && (
            <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
              {authErrorMessage}
            </div>
          )}

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
