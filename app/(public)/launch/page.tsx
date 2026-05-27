import Link from "next/link";
import { CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { launchCertificationChecks } from "@/features/demo/demo-flow";
import { getEnvironmentReadiness } from "@/lib/env";
import { demoAccounts } from "@/lib/production/demo-accounts";

export default function LaunchCertificationPage() {
  const readiness = getEnvironmentReadiness();

  return (
    <PageContainer className="space-y-6">
      <section className="polished-surface p-5">
        <Badge variant={readiness.mode === "production-ready" ? "default" : "warning"}>
          <ShieldCheck className="size-3" /> {readiness.mode}
        </Badge>
        <h1 className="mt-4 text-3xl font-semibold text-primary-text">VendorHub launch certification</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-secondary-text">
          Deployment, fallback, demo safety, and environment readiness are visible here without exposing secrets.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild><Link href="/demo">Open demo flow</Link></Button>
          <Button variant="secondary" asChild><Link href="/api/readiness">Readiness JSON <ExternalLink /></Link></Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {launchCertificationChecks.map((check) => (
          <div key={check.label} className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-primary-text">{check.label}</h2>
              <Badge variant="default"><CheckCircle2 className="size-3" /> {check.state}</Badge>
            </div>
            <p className="mt-2 text-sm text-secondary-text">{check.detail}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="polished-surface p-4">
          <h2 className="font-semibold text-primary-text">Environment checklist</h2>
          <div className="mt-4 divide-y divide-border">
            {readiness.checks.map((item) => (
              <div key={item.key} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-primary-text">{item.key}</p>
                  <p className="text-xs text-secondary-text">{item.requiredFor}</p>
                </div>
                <Badge variant={item.configured ? "default" : item.public ? "warning" : "secondary"}>
                  {item.configured ? "Configured" : item.public ? "Required for production" : "Optional secret"}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="polished-surface p-4">
          <h2 className="font-semibold text-primary-text">Demo accounts</h2>
          <div className="mt-4 space-y-3">
            {demoAccounts.map((account) => (
              <div key={account.email} className="rounded-md border border-border bg-slate-50 p-3">
                <p className="text-sm font-semibold text-primary-text">{account.role}: {account.name}</p>
                <p className="mt-1 text-xs text-secondary-text">{account.email}</p>
                <p className="mt-2 text-xs text-secondary-text">{account.promise}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {readiness.missingRequired.length ? (
        <EmptyState
          icon={ShieldCheck}
          title="Production credentials still need to be attached"
          description="The app remains demo-safe with fallback data. Add Supabase public credentials in Vercel before marking production-ready."
          action={<Button variant="secondary" asChild><Link href="/demo">Continue demo-safe</Link></Button>}
        />
      ) : null}
    </PageContainer>
  );
}
