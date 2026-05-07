import Link from "next/link";
import { Badge, ButtonLink, Card, Nav, Shell } from "@/components/ui";
import { AccountMenuPreview } from "@/components/account-menu";
import { mockSessions, getPostLoginRedirect } from "@/lib/auth";

export default function LoginPage() {
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

        <div className="space-y-5">
          <Card className="p-6 md:p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-black">Sign in</h2>
              <p className="mt-2 text-sm text-slate-400">
                Access your account, seller tools, or admin workspace.
              </p>
            </div>

            <form className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm text-slate-400">Email</span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400/50"
                />
              </label>

              <label className="block">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">Password</span>
                  <Link href="/login" className="text-xs text-purple-300 hover:text-purple-200">
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400/50"
                />
              </label>

              <Link
                href="/auth-routing?session=seller-active"
                className="inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20"
              >
                Sign in
              </Link>
            </form>

            <div className="mt-6 border-t border-white/10 pt-6 text-center text-sm text-slate-400">
              New to Standard?{" "}
              <Link href="/signup" className="font-semibold text-purple-300 hover:text-purple-200">
                Create an account
              </Link>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-bold">Demo redirects</div>
                <p className="mt-1 text-sm text-slate-500">
                  Temporary preview until real auth is connected.
                </p>
              </div>
              <Badge tone="amber">Mock</Badge>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {mockSessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/auth-routing?session=${session.id}`}
                  className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-300 transition hover:border-purple-400/40 hover:text-white"
                >
                  <div className="font-semibold">{session.name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {session.role} → {getPostLoginRedirect(session)}
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          <AccountMenuPreview />
        </div>
      </section>
    </Shell>
  );
}
