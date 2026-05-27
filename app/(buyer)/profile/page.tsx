import { Bell, CreditCard, Home, MapPin, ShieldCheck, User } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  return (
    <PageContainer className="space-y-6">
      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-lg bg-brand text-xl font-semibold text-white">A</div>
            <div>
              <h1 className="text-2xl font-semibold text-primary-text">Ananya Rao</h1>
              <p className="mt-1 text-sm text-secondary-text">Buyer account · Malleswaram service zone</p>
            </div>
          </div>
          <Badge variant="default"><ShieldCheck className="size-3" /> Verified email</Badge>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <SectionWrapper title="Addresses">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["Home", "12, 8th Cross, Malleswaram, Bengaluru", "Default"],
                ["Work", "CMH Road, Indiranagar, Bengaluru", "Saved"],
              ].map(([label, address, status]) => (
                <article key={label} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="flex items-center gap-2 font-semibold text-primary-text"><Home className="size-4" /> {label}</h2>
                    <Badge variant="secondary">{status}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-secondary-text">{address}</p>
                </article>
              ))}
            </div>
          </SectionWrapper>

          <SectionWrapper title="Preferences" description="Buyer notification and commerce preferences.">
            <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
              {[
                ["Order updates", "In-app and email notifications enabled", Bell],
                ["Local availability", "Prioritize sellers within 3 km", MapPin],
                ["Review prompts", "Ask after delivered orders", User],
              ].map(([title, body, Icon]) => (
                <div key={title as string} className="flex items-center justify-between gap-4 border-b border-border py-3 first:pt-0 last:border-0 last:pb-0">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium text-primary-text"><Icon className="size-4 text-brand" /> {title as string}</p>
                    <p className="mt-1 text-sm text-secondary-text">{body as string}</p>
                  </div>
                  <Button variant="secondary" size="sm">Edit</Button>
                </div>
              ))}
            </div>
          </SectionWrapper>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold text-primary-text"><CreditCard className="size-4" /> Saved payments</h2>
            <p className="mt-3 rounded-md border border-dashed border-border p-3 text-sm text-secondary-text">Add UPI, card, or wallet options for faster checkout.</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="font-semibold text-primary-text">Account settings</h2>
            <div className="mt-3 grid gap-2">
              <Button variant="secondary">Edit profile</Button>
              <Button variant="secondary">Manage addresses</Button>
              <Button variant="outline">Download order history</Button>
            </div>
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}
