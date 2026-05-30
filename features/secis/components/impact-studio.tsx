"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Gauge } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/feedback/empty-state";
import { formatCurrency, formatCurrencyCompact } from "@/lib/secis";
import { useSecisStore } from "@/store/secis-store";
import { useChangeAnalysis, useHydrated } from "../hooks";
import { SecisShell, SecisCard, StatTile } from "./primitives";
import { HBars } from "./charts";
import { DimensionGrid, AffectedTable } from "./impact-view";
import { DetailSkeleton } from "./skeletons";

function ImpactFor({ eventId }: { eventId: string }) {
  const analysis = useChangeAnalysis(eventId);
  const systems = useSecisStore((s) => s.systems);

  const revenueBySystem = useMemo(() => {
    if (!analysis) return [];
    const map = new Map<string, number>();
    for (const a of analysis.propagation.affected) map.set(a.systemId, (map.get(a.systemId) ?? 0) + a.revenueAtRisk);
    return [...map.entries()].map(([systemId, value]) => ({ label: systems.find((s) => s.id === systemId)?.name ?? systemId, value, display: formatCurrencyCompact(value) })).sort((a, b) => b.value - a.value);
  }, [analysis, systems]);

  if (!analysis) return <EmptyState icon={Gauge} title="Event not found" description="Pick another event to analyse its impact." />;
  const { event, propagation, impact, risk } = analysis;

  return (
    <>
      <SecisCard title={event.name} description={impact.outcomeSummary} action={<Link href={`/secis/${event.id}` as Route} className="text-xs font-medium text-ai hover:underline">Open full detail</Link>}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Revenue at risk" value={formatCurrencyCompact(propagation.totalRevenueAtRisk)} tone="warning" />
          <StatTile label="Affected entities" value={String(propagation.affected.length)} tone="info" />
          <StatTile label="Affected systems" value={String(propagation.affectedSystemIds.length)} tone="info" />
          <StatTile label="Risk" value={`${risk.score}/100`} tone={risk.score >= 55 ? "danger" : "warning"} />
        </div>
      </SecisCard>

      <SecisCard title="Impact by dimension" description="Operational, financial, inventory, demand, supply, delivery, customer, and marketplace impact.">
        <DimensionGrid impact={impact} />
      </SecisCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SecisCard title="Dimension comparison" description="Relative impact across dimensions.">
          <HBars rows={impact.dimensions.map((d) => ({ label: d.label, value: d.score, display: `${d.score}/100`, tone: d.score >= 66 ? "danger" : d.score >= 40 ? "warning" : "brand" }))} />
        </SecisCard>
        <SecisCard title="Revenue at risk by system" description="Where the financial exposure sits.">
          {revenueBySystem.length === 0 ? <p className="text-sm text-secondary-text">No exposure.</p> : (
            <HBars rows={revenueBySystem.map((r) => ({ label: r.label, value: r.value, display: r.display, tone: "warning" }))} max={revenueBySystem[0]?.value ?? 1} />
          )}
          <p className="mt-3 text-xs text-secondary-text">Total: {formatCurrency(propagation.totalRevenueAtRisk)} / month</p>
        </SecisCard>
      </div>

      <SecisCard title="Affected entities" description="Operational impact across the blast radius.">
        <AffectedTable affected={propagation.affected} />
      </SecisCard>
    </>
  );
}

export function ImpactStudio() {
  const hydrated = useHydrated();
  const router = useRouter();
  const params = useSearchParams();
  const changeEvents = useSecisStore((s) => s.changeEvents);
  const eventId = params.get("event") ?? "";

  if (!hydrated) return <DetailSkeleton />;
  const active = changeEvents.filter((e) => e.status === "active");

  return (
    <SecisShell
      title="Impact Analysis Studio"
      description="See the full multi-dimensional impact of a change — operational, financial, inventory, demand, supply, delivery, customer, and marketplace — with charts, tables, and risk scores."
      actions={
        <Select value={eventId} onValueChange={(v) => router.push(`/secis/impact?event=${v}`)}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select a change event" /></SelectTrigger>
          <SelectContent>{active.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
        </Select>
      }
    >
      {eventId ? <ImpactFor eventId={eventId} /> : (
        active.length === 0 ? (
          <EmptyState icon={Gauge} title="No change events" description="Create a change event first, then analyse its impact here." />
        ) : (
          <SecisCard title="Choose an event" description="Select an event to open its impact analysis.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {active.map((e) => (
                <button key={e.id} type="button" onClick={() => router.push(`/secis/impact?event=${e.id}`)} className="rounded-lg border border-border bg-surface p-4 text-left focus-ring hover:bg-slate-50">
                  <p className="text-sm font-medium text-primary-text">{e.name}</p>
                  <p className="mt-1 text-xs text-secondary-text">magnitude {Math.round(e.magnitude * 100)}%</p>
                </button>
              ))}
            </div>
          </SecisCard>
        )
      )}
    </SecisShell>
  );
}
