import Link from "next/link";
import { Badge, Card, Nav, Shell } from "@/components/ui";

export default function SignupPage() {
  return (
    <Shell>
      <Nav />
      <section className="mx-auto grid min-h-[calc(100vh-96px)] max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <Badge tone="cyan">Create account</Badge>
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

        <Card className="p-6 md:p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-black">Create your account</h2>
            <p className="mt-2 text-sm text-slate-400">
              One account can become a buyer, seller, or admin depending on permissions.
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
              <span className="mb-2 block text-sm text-slate-400">Password</span>
              <input
                type="password"
                placeholder="Create a password"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400/50"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm text-slate-400">Primary use</span>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-purple-400/30 bg-purple-500/10 p-4">
                  <div className="font-semibold">Browse / buy</div>
                  <div className="mt-1 text-xs text-slate-400">Default account mode</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="font-semibold">Sell on Standard</div>
                  <div className="mt-1 text-xs text-slate-400">Enable seller onboarding after signup</div>
                </div>
              </div>
            </label>

            <Link
              href="/account"
              className="inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20"
            >
              Create account
            </Link>
          </form>

          <div className="mt-6 border-t border-white/10 pt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-purple-300 hover:text-purple-200">
              Sign in
            </Link>
          </div>
        </Card>
      </section>
    </Shell>
  );
}
