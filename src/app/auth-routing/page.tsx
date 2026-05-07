import Link from "next/link";
import { Badge, Card, Nav, SectionHeader, Shell } from "@/components/ui";
import { authLogicSteps, getPostLoginRedirect, mockSessions } from "@/lib/auth";

export default function AuthRoutingPage({
  searchParams,
}: {
  searchParams?: { session?: string };
}) {
  const fallback = mockSessions[1] ?? mockSessions[0];
  if (!fallback) throw new Error("mockSessions is empty");
  const session = mockSessions.find((item) => item.id === searchParams?.session) ?? fallback;
  const redirect = getPostLoginRedirect(session);

  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeader
          eyebrow="Auth routing"
          title="After login, Standard detects the account type"
          text="This page simulates what the backend will do automatically once real authentication is connected."
        />

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="p-6">
            <Badge tone="purple">Current mock session</Badge>
            <h2 className="mt-4 text-2xl font-black">{session.name}</h2>
            <div className="mt-5 grid gap-3">
              <Info label="Email" value={session.email} />
              <Info label="Role" value={session.role} />
              <Info label="Seller subscription" value={session.sellerSubscriptionStatus} />
              <Info label="Seller tag" value={session.sellerTag} />
              <Info label="Redirect" value={redirect} />
            </div>
            <Link
              href={redirect}
              className="mt-6 inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white"
            >
              Continue to destination
            </Link>
          </Card>

          <Card className="p-6">
            <h2 className="text-2xl font-black">Routing rules</h2>
            <div className="mt-5 grid gap-3">
              {authLogicSteps.map((step) => (
                <div key={step.label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-bold">{step.label}</div>
                    <Badge tone="cyan">{step.redirect}</Badge>
                  </div>
                  <div className="mt-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-slate-400">
                    {step.condition}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{step.description}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </section>
    </Shell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
