import Link from "next/link";
import { ArrowRight, Play, ShieldCheck } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { demoFlowSteps, demoReadinessSignals } from "@/features/demo/demo-flow";

export default function DemoPage() {
  return (
    <PageContainer className="space-y-6">
      <section className="polished-surface p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="default"><Play className="size-3" /> 5 minute showcase</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-normal text-primary-text">VendorHub demo command path</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-secondary-text">
              A fast, judge-ready route through buyer discovery, intelligent search, checkout, realtime operations, seller tooling, and admin governance.
            </p>
          </div>
          <Button size="lg" asChild>
            <Link href="/home">Start demo <ArrowRight /></Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {demoReadinessSignals.map((signal) => (
          <div key={signal} className="rounded-lg border border-border bg-surface p-3 shadow-sm">
            <ShieldCheck className="size-4 text-brand" />
            <p className="mt-2 text-sm font-medium text-primary-text">{signal}</p>
          </div>
        ))}
      </section>

      <section className="polished-surface overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="font-semibold text-primary-text">Presentation flow</h2>
          <p className="mt-1 text-sm text-secondary-text">Each step has one clear story beat, proof point, and direct route.</p>
        </div>
        <div className="divide-y divide-border">
          {demoFlowSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="grid gap-3 p-4 transition hover:bg-slate-50 md:grid-cols-[56px_1fr_120px_120px] md:items-center">
                <div className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-brand ring-1 ring-emerald-100">
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary-text">{index + 1}. {step.title}</p>
                  <p className="mt-1 text-sm text-secondary-text">{step.proof}</p>
                </div>
                <Badge variant="secondary">{step.timing}</Badge>
                <Button size="sm" variant="secondary" asChild>
                  <Link href={step.route}>Open <ArrowRight /></Link>
                </Button>
              </div>
            );
          })}
        </div>
      </section>
    </PageContainer>
  );
}
