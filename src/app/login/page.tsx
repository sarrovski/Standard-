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
          title="One login, role-based access"
          text="In production this will be handled by real auth. For now, this mock flow shows where each account type lands."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {demoAccounts.map((account) => (
            <Card key={account.id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge tone={account.role === "Admin" ? "red" : account.role === "Seller" ? "purple" : account.role === "Reseller" ? "cyan" : "default"}>
                    {account.role}
                  </Badge>
                  <h2 className="mt-4 text-2xl font-black">{account.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{account.email}</p>
                </div>
                <div className="text-right text-sm text-slate-400">
                  <div>{account.subscription}</div>
                  {"plan" in account && <div className="text-xs text-slate-500">{account.plan}</div>}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-400">
                {account.role === "User" && "Users can save listings, post reviews, and manage payment preferences."}
                {account.role === "Seller" && "Sellers with an active subscription get access to product listings, builder, analytics, boosts, and reviews."}
                {account.role === "Reseller" && "Resellers with an active subscription get access to offers, stock, delivery, payment methods, and service reviews."}
                {account.role === "Admin" && "Admins review claims, sellers, payment risk, moderation, and audit logs."}
              </div>

              <Link
                href={account.redirect}
                className="mt-5 inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold"
              >
                Continue as {account.role}
              </Link>
            </Card>
          ))}
        </div>
      </section>
    </Shell>
  );
}
