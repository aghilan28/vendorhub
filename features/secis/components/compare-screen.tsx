"use client";

import { useState } from "react";
import { GitCompare, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/feedback/empty-state";
import { getIntervention } from "@/lib/secis";
import { useSecisStore } from "@/store/secis-store";
import { useHydrated } from "../hooks";
import { relativeTime } from "../format";
import { SecisShell, SecisCard } from "./primitives";
import { SecisLineChart } from "./charts";

const COLORS = ["brand", "ai", "warning", "danger", "neutral"] as const;
const KPI_ROWS: Array<{ key: string; label: string; lowerBetter?: boolean }> = [
  { key: "resilience", label: "Resilience score" },
  { key: "recovery_intv", label: "Recovery (with action)", lowerBetter: true },
  { key: "residual", label: "Residual impact", lowerBetter: true },
  { key: "avoided", label: "Avoided loss" },
  { key: "cost", label: "Intervention cost", lowerBetter: true },
];

export function CompareScreen() {
  const hydrated = useHydrated();
  const runs = useSecisStore((s) => s.evolutionRuns);
  const [selected, setSelected] = useState<string[]>([]);

  if (!hydrated) {
    return <SecisShell title="Compare" description="Compare evolution runs, recovery paths, and interventions."><div /></SecisShell>;
  }

  const completed = runs.filter((r) => r.status === "completed" && r.result);
  if (completed.length < 2) {
    return (
      <SecisShell title="Comparison Engine" description="Compare evolution runs, recovery paths, and interventions side by side.">
        <EmptyState icon={GitCompare} title="Need at least two completed runs" description="Run two or more evolution analyses (e.g. with and without interventions), then compare them here." />
      </SecisShell>
    );
  }

  const selectedRuns = completed.filter((r) => selected.includes(r.id));
  const bestRunId = selectedRuns.length ? [...selectedRuns].sort((a, b) => (b.result?.resilienceScore ?? 0) - (a.result?.resilienceScore ?? 0))[0].id : undefined;

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function kpiDisplay(runId: string, key: string) {
    const r = selectedRuns.find((x) => x.id === runId);
    return r?.result?.kpis.find((k) => k.key === key)?.display ?? "—";
  }

  return (
    <SecisShell title="Comparison Engine" description="Compare recovery paths and interventions across evolution runs to choose the most resilient, cost-effective response.">
      <SecisCard title="Select runs to compare" description={`${selected.length} selected · pick two or more completed runs.`}>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {completed.map((r) => {
            const isSel = selected.includes(r.id);
            return (
              <button key={r.id} type="button" onClick={() => toggle(r.id)} className={`flex items-start justify-between gap-2 rounded-md border p-3 text-left focus-ring ${isSel ? "border-brand bg-emerald-50" : "border-border bg-surface hover:bg-slate-50"}`}>
                <div className="min-w-0"><p className="truncate text-sm font-medium text-primary-text">{r.name}</p><p className="text-xs text-secondary-text">{r.changeEventName} · {relativeTime(r.startedAt)}</p></div>
                {isSel ? <Badge variant="default">selected</Badge> : null}
              </button>
            );
          })}
        </div>
      </SecisCard>

      {selectedRuns.length >= 2 ? (
        <>
          {bestRunId ? (
            <SecisCard title="Most resilient option">
              <div className="flex items-center gap-3 rounded-md bg-emerald-50 p-3">
                <Trophy className="size-5 text-success" />
                <div>
                  <p className="text-sm font-semibold text-primary-text">{selectedRuns.find((r) => r.id === bestRunId)?.name}</p>
                  <p className="text-xs text-secondary-text">{selectedRuns.find((r) => r.id === bestRunId)?.result?.outcomeSummary}</p>
                </div>
              </div>
            </SecisCard>
          ) : null}

          <SecisCard title="Recovery paths" description="System health over time for each run.">
            <SecisLineChart
              series={selectedRuns.map((r, i) => ({ key: r.id, label: r.name, color: COLORS[i % COLORS.length], points: r.result!.interventionSeries }))}
              yFormatter={(v) => v.toFixed(0)}
            />
          </SecisCard>

          <SecisCard title="KPI comparison">
            <div className="responsive-table-shell">
              <Table>
                <TableHeader><TableRow><TableHead>Metric</TableHead>{selectedRuns.map((r) => <TableHead key={r.id}>{r.name}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {KPI_ROWS.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium text-primary-text">{row.label}</TableCell>
                      {selectedRuns.map((r) => <TableCell key={r.id} className={r.id === bestRunId && row.key === "resilience" ? "font-semibold text-success" : ""}>{kpiDisplay(r.id, row.key)}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SecisCard>

          <SecisCard title="Interventions per run">
            <div className="grid gap-3 md:grid-cols-2">
              {selectedRuns.map((r) => (
                <div key={r.id} className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium text-primary-text">{r.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.interventionIds.length === 0 ? <Badge variant="secondary">No interventions</Badge> : r.interventionIds.map((id) => <Badge key={id} variant="ai">{getIntervention(id)?.name ?? id}</Badge>)}
                  </div>
                </div>
              ))}
            </div>
          </SecisCard>
        </>
      ) : (
        <SecisCard title="Comparison"><p className="text-sm text-secondary-text">Select at least two runs to compare recovery paths and interventions.</p></SecisCard>
      )}
    </SecisShell>
  );
}
