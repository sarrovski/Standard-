import Link from "next/link";
import { Badge, Card, Nav, SectionHeader, Shell } from "@/components/ui";
import { demoAccounts } from "@/lib/data";

export default function LoginPage() {
  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-6xl px-6 py-10">
        <SectionHeader
          eyebrow="Login"
          title="One access point, clear role logic"
          text="Everyone logs in from here. Buyers go to their account, sellers with an active subscription get the seller dashboard, sellers without a subscription go to onboarding, and admins go to moderation."
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="p-6">
            <h2 className="text-2xl font-black">How access works</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {[
                ["Buyer", "Log in → Account", "Save listings, set payment preferences, and write reviews."],
                ["Seller with active subscription", "Log in → Dashboard", "Manage listings, offers, payment methods, analytics, and provider tag requests."],
                ["Seller without subscription", "Log in → Onboarding", "Upgrade to unlock the seller dashboard and publish listings."],
                ["Admin", "Log in → Admin", "Review provider tags, listings, payment risk, and moderation signals."],
              ].map(([title, flow, desc]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="font-bold">{title}</div>
                  <div className="mt-1 text-sm text-purple-300">{flow}</div>
                  <div className="mt-2 text-sm text-slate-400">{desc}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-2xl font-black">Demo access</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Use one of these mock accounts to preview the current logic.
            </p>
            <div className="mt-5 space-y-3">
              {demoAccounts.map((account) => (
                <div key={account.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={account.role === "Admin" ? "red" : account.role === "Seller" ? "purple" : "default"}>{account.role}</Badge>
                        {"sellerTag" in account && (
                          <Badge tone={account.sellerTag === "Provider / Developer" ? "green" : "cyan"}>{account.sellerTag}</Badge>
                        )}
                      </div>
                      <div className="mt-3 font-bold">{account.name}</div>
                      <div className="mt-1 text-sm text-slate-500">{account.email}</div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>{account.subscription}</div>
                      {"plan" in account && <div>{account.plan}</div>}
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
                    Access: {account.access}
                  </div>
                  <Link href={account.redirect} className="mt-4 inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold">
                    Continue
                  </Link>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </Shell>
  );
}
