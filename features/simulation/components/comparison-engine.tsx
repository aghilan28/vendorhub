"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GitCompare, Save, Trophy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ComparisonBarChart } from "@/components/charts/comparison-bar-chart";
import { EmptyState } from "@/components/feedback/empty-state";
import { compareRuns } from "@/lib/simulation";
import { useSimulationStore } from "@/store/simulation-store";
import { useHydrated, usePermission } from "../hooks";
import { relativeTime, riskVariant } from "../format";
import { SimShell, SimCard } from "./primitives";
import { ListSkeleton } from "./skeletons";

export function ComparisonEngine() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const runs = useSimulationStore((s) => s.runs);
  const recommendations = useSimulationStore((s) => s.recommendations);
  const decisions = useSimulationStore((s) => s.decisions);
  const savedComparisons = useSimulationStore((s) => s.comparisons);
  const createComparison = useSimulationStore((s) => s.createComparison);
  const deleteComparison = useSimulationStore((s) => s.deleteComparison);
  const canCompare = usePermission("scenario.run");

  const completed = useMemo(() => runs.filter((r) => r.status === "completed"), [runs]);
  const [selected, setSelected] = useState<string[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [cmpName, setCmpName] = useState("");
  const [cmpNote, setCmpNote] = useState("");

  const addParam = params.get("add");
  useEffect(() => {
    if (addParam && completed.some((r) => r.id === addParam)) {
      setSelected((prev) => (prev.includes(addParam) ? prev : [...prev, addParam]));
    }
  }, [addParam, completed]);

  if (!hydrated) return <ListSkeleton />;

  if (completed.length < 2) {
    return (
      <SimShell title="Simulation Comparison Engine" description="Compare runs, scenarios, outcomes, risks, recommendations, and decisions side by side.">
        <EmptyState icon={GitCompare} title="Need at least two completed runs" description="Run two or more scenarios, then compare their outcomes, risks, and recommendations here." />
      </SimShell>
    );
  }

  const selectedRuns = completed.filter((r) => selected.includes(r.id));
  const comparison = compareRuns(selectedRuns);
  const barGroups = comparison.sharedKpis.map((row) => ({
    label: row.label,
    values: row.values.map((v) => ({ key: v.runId, value: v.value, display: v.display })),
  }));
  const runLabels = selectedRuns.map((r) => r.label);
  const linkedDecisions = decisions.filter((d) => d.runId && selected.includes(d.runId));

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <SimShell
      title="Simulation Comparison Engine"
      description="Compare runs, scenarios, outcomes, risks, recommendations, and decisions side by side to choose the best path."
      actions={
        <Button disabled={selected.length < 2} onClick={() => { setCmpName(`Comparison of ${selected.length} runs`); setSaveOpen(true); }}>
          <Save className="size-4" /> Save comparison
        </Button>
      }
    >
      <SimCard title="Select runs to compare" description={`${selected.length} selected · pick two or more completed runs.`}>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {completed.map((run) => {
            const isSel = selected.includes(run.id);
            return (
              <button
                key={run.id}
                type="button"
                onClick={() => toggle(run.id)}
                className={`flex items-start justify-between gap-2 rounded-md border p-3 text-left focus-ring ${isSel ? "border-brand bg-emerald-50" : "border-border bg-surface hover:bg-slate-50"}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-primary-text">{run.label}</p>
                  <p className="text-xs text-secondary-text">{run.scenarioName} · {relativeTime(run.startedAt)}</p>
                </div>
                {isSel ? <Badge variant="default">selected</Badge> : null}
              </button>
            );
          })}
        </div>
      </SimCard>

      {selected.length >= 2 ? (
        <>
          {comparison.bestRunId ? (
            <SimCard title="Recommended option" description="Heuristic best run across shared KPIs, penalised by risk.">
              <div className="flex items-center gap-3 rounded-md bg-emerald-50 p-3">
                <Trophy className="size-5 text-success" />
                <div>
                  <p className="text-sm font-semibold text-primary-text">{selectedRuns.find((r) => r.id === comparison.bestRunId)?.label}</p>
                  <p className="text-xs text-secondary-text">{comparison.outcomeByRun.find((o) => o.runId === comparison.bestRunId)?.summary}</p>
                </div>
              </div>
            </SimCard>
          ) : null}

          <SimCard title="KPI comparison" description="Each metric across the selected runs.">
            <ComparisonBarChart groups={barGroups} seriesLabels={runLabels} />
          </SimCard>

          <SimCard title="KPI table">
            <div className="responsive-table-shell">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    {selectedRuns.map((r) => (
                      <TableHead key={r.id}>{r.label}</TableHead>
                    ))}
                    <TableHead>Spread</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparison.sharedKpis.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium text-primary-text">{row.label}</TableCell>
                      {selectedRuns.map((r) => {
                        const v = row.values.find((x) => x.runId === r.id);
                        return (
                          <TableCell key={r.id} className={row.best === r.id ? "font-semibold text-success" : ""}>
                            {v?.display}
                            {row.best === r.id ? " ★" : ""}
                          </TableCell>
                        );
                      })}
                      <TableCell>{row.spread}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SimCard>

          <div className="grid gap-6 xl:grid-cols-2">
            <SimCard title="Risk comparison">
              <div className="space-y-2">
                {comparison.riskByRun.map((r) => (
                  <div key={r.runId} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <span className="truncate text-sm text-primary-text">{r.label}</span>
                    <Badge variant={riskVariant(r.level as "low" | "medium" | "high")}>{r.level} · {r.score}</Badge>
                  </div>
                ))}
              </div>
            </SimCard>

            <SimCard title="Outcome comparison">
              <div className="space-y-2">
                {comparison.outcomeByRun.map((o) => (
                  <div key={o.runId} className="rounded-md border border-border p-3">
                    <p className="text-sm font-medium text-primary-text">{o.label}</p>
                    <p className="mt-1 text-xs text-secondary-text">{o.summary}</p>
                  </div>
                ))}
              </div>
            </SimCard>
          </div>

          <SimCard title="Recommendation comparison" description="Top recommendation per run.">
            <div className="grid gap-3 md:grid-cols-2">
              {selectedRuns.map((run) => {
                const rec = recommendations.find((r) => r.runId === run.id);
                return (
                  <div key={run.id} className="rounded-md border border-border p-3">
                    <p className="text-sm font-medium text-primary-text">{run.label}</p>
                    {rec ? (
                      <>
                        <p className="mt-1 text-sm text-primary-text">{rec.title}</p>
                        <p className="text-xs text-secondary-text">{rec.expectedImpact}</p>
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-secondary-text">No recommendation.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </SimCard>

          {linkedDecisions.length > 0 ? (
            <SimCard title="Decisions on these runs">
              <div className="space-y-2">
                {linkedDecisions.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <span className="text-sm text-primary-text">{d.title}</span>
                    <Badge variant={d.outcome === "adopt" ? "default" : d.outcome === "reject" ? "danger" : "warning"}>{d.outcome}</Badge>
                  </div>
                ))}
              </div>
            </SimCard>
          ) : null}
        </>
      ) : (
        <SimCard title="Comparison">
          <p className="text-sm text-secondary-text">Select at least two runs above to see a side-by-side comparison.</p>
        </SimCard>
      )}

      {savedComparisons.length > 0 ? (
        <SimCard title="Saved comparisons">
          <div className="space-y-2">
            {savedComparisons.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-primary-text">{c.name}</p>
                  <p className="text-xs text-secondary-text">{c.runIds.length} runs · {relativeTime(c.createdAt)} · {c.note}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setSelected(c.runIds.filter((id) => completed.some((r) => r.id === id)))}>Load</Button>
                  <Button size="sm" variant="ghost" className="text-danger" onClick={() => deleteComparison(c.id)} aria-label="Delete comparison">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </SimCard>
      ) : null}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save comparison</DialogTitle>
            <DialogDescription>Save this set of runs to revisit the comparison later.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <Input value={cmpName} onChange={(e) => setCmpName(e.target.value)} placeholder="Comparison name" />
            <Textarea value={cmpNote} onChange={(e) => setCmpNote(e.target.value)} placeholder="Note (optional)" />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button
              disabled={!canCompare}
              onClick={() => {
                createComparison(cmpName || "Untitled comparison", selected, cmpNote);
                setSaveOpen(false);
                setCmpNote("");
              }}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SimShell>
  );
}
