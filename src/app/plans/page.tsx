import { Badge, Card, Nav, SectionHeader, Shell } from "@/components/ui";
import { featuredSlots, sellerPlans } from "@/lib/data";
import { PlanCheckoutButton } from "@/components/plan-checkout-button";

export default function PlansPage() {
  return (
    <Shell>
      <Nav />
      <section className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeader
          eyebrow="Plans"
          title="Seller plans and featured placement"
          text="Choose a seller plan to publish product announcements, then optionally reserve a featured slot to appear at the top of a game category."
        />

        <section className="mt-8 grid gap-5 lg:grid-cols-4">
          {sellerPlans.map((plan) => (
            <Card
              key={plan.name}
              className={`p-6 ${plan.highlighted ? "border-purple-400/40 bg-purple-500/10" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black">{plan.name}</h2>
                {plan.highlighted && <Badge tone="purple">Popular</Badge>}
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">{plan.description}</p>
              <div className="mt-5">
                <span className="text-4xl font-black">{plan.price}</span>
                <span className="text-sm text-slate-500">{plan.period}</span>
              </div>
              <div className="mt-6 grid gap-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-300">
                    {feature}
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <PlanCheckoutButton
                  label={`Start with ${plan.name}`}
                  variant={plan.highlighted ? "primary" : "secondary"}
                />
              </div>
            </Card>
          ))}
        </section>

        <section id="featured" className="mt-12 grid gap-6 scroll-mt-24 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="p-6">
            <Badge tone="cyan">Featured placement</Badge>
            <h2 className="mt-4 text-3xl font-black">Appear at the top of a category</h2>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              Featured placement is category-based. Only one product can be featured in a game category at a time.
              If another seller already owns the slot, the option is unavailable until the slot expires.
            </p>

            <div className="mt-6 grid gap-3">
              {[
                "Featured product appears above normal marketplace results",
                "Featured badge shown on the product card",
                "Outbound click tracking included",
                "Availability is checked per category",
                "Featured does not change trust score or verification status",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                  {item}
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-white/10 p-5">
              <h2 className="text-xl font-bold">Featured slot availability</h2>
              <p className="mt-1 text-sm text-slate-400">
                Sellers can only buy the slot if the category is currently available.
              </p>
            </div>
            <div className="divide-y divide-white/10">
              {featuredSlots.map((slot) => (
                <div key={slot.category} className="p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold">{slot.category}</h3>
                        <Badge tone={slot.status === "Available" ? "green" : "amber"}>
                          {slot.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        {slot.status === "Available"
                          ? `Available now • ${slot.price}`
                          : `${slot.product} by ${slot.seller} until ${slot.endsAt}`}
                      </p>
                    </div>

                    <button
                      className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                        slot.status === "Available"
                          ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 text-white"
                          : "border border-white/10 bg-white/[0.04] text-slate-500"
                      }`}
                    >
                      {slot.status === "Available" ? "Reserve featured slot" : "Unavailable"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </section>
    </Shell>
  );
}
