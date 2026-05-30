"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { BarChart3, Download, Share2, GitCompare, Gavel, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/feedback/empty-state";
import type { DecisionOutcome } from "@/lib/simulation";
import { useSimulationStore } from "@/store/simulation-store";
import { useHydrated, usePermission } from "../hooks";
import { relativeTime, formatRuntime } from "../format";
import { SimShell, SimCard, RunStatusBadge } from "./primitives";
import { ResultView } from "./result-view";
import { InsightList, RecommendationList } from "./lists";
import { DetailSkeleton } from "./skeletons";

function download(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function RunPicker() {
  const runs = useSimulationStore((s) => s.runs);
  const completed = [...runs].filter((r) => r.status === "completed").sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

  if (completed.length === 0) {
    return <EmptyState icon={BarChart3} title="No completed runs yet" description="Run a scenario from the Execution Center, then analyse the outcome here." />;
  }

  return (
    <SimCard title="Completed runs" description="Select a run to open the analysis studio.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {completed.map((run) => (
          <Link key={run.id} href={`/simulations/results?run=${run.id}` as Route} className="operational-surface rounded-lg p-4 focus-ring hover:bg-slate-50">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate font-medium text-primary-text">{run.label}</p>
              <RunStatusBadge status={run.status} />
            </div>
            <p className="mt-1 text-xs text-secondary-text">{run.scenarioName} · {relativeTime(run.startedAt)}</p>
            {run.result ? (
              <div className="mt-3 rounded-md bg-slate-50 p-2">
                <p className="text-[11px] text-secondary-text">{run.result.kpis[0]?.label}</p>
                <p className="text-sm font-semibold text-primary-text">{run.result.kpis[0]?.display}</p>
              </div>
            ) : null}
          </Link>
        ))}
      </div>
    </SimCard>
  );
}

function AnalysisFor({ runId }: { runId: string }) {
  const router = useRouter();
  const run = useSimulationStore((s) => s.runs.find((r) => r.id === runId));
  const insights = useSimulationStore((s) => s.insights.filter((i) => i.runId === runId));
  const recommendations = useSimulationStore((s) => s.recommendations.filter((r) => r.runId === runId));
  const simulation = useSimulationStore((s) => s.simulations.find((x) => x.id === run?.simulationId));
  const acceptRecommendation = useSimulationStore((s) => s.acceptRecommendation);
  const recordDecision = useSimulationStore((s) => s.recordDecision);
  const canDecide = usePermission("decision.record");

  const [shared, setShared] = useState(false);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionTitle, setDecisionTitle] = useState("");
  const [decisionOutcome, setDecisionOutcome] = useState<DecisionOutcome>("adopt");
  const [decisionImpact, setDecisionImpact] = useState<"low" | "medium" | "high">("medium");
  const [decisionRationale, setDecisionRationale] = useState("");

  const shareText = useMemo(() => {
    if (!run?.result) return "";
    return `Simulation: ${run.scenarioName}\nOutcome: ${run.result.outcomeSummary}\nRisk: ${run.result.risk.level} (${run.result.risk.score}/100)\nKPIs: ${run.result.kpis.map((k) => `${k.label} ${k.display}`).join("; ")}`;
  }, [run]);

  if (!run) {
    return <EmptyState icon={BarChart3} title="Run not found" description="This run may have been removed. Pick another from the results list." />;
  }
  if (run.status !== "completed" || !run.result) {
    return (
      <SimCard title={run.label}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-secondary-text">This run is {run.status}. Analysis is available once it completes.</p>
          <RunStatusBadge status={run.status} />
        </div>
      </SimCard>
    );
  }

  return (
    <>
      <SimCard
        title={run.label}
        description={`${run.scenarioName} · ${simulation?.name ?? "Standalone"} · completed ${relativeTime(run.completedAt ?? run.startedAt)} · ${formatRuntime(run.runtimeMs)}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => download(`${run.scenarioName.replace(/\s+/g, "-")}-result.json`, { run, insights, recommendations })}>
              <Download className="size-4" /> Export
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareText);
                  setShared(true);
                  setTimeout(() => setShared(false), 2000);
                } catch {
                  setShared(false);
                }
              }}
            >
              {shared ? <Check className="size-4" /> : <Share2 className="size-4" />} {shared ? "Copied" : "Share"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => router.push(`/simulations/compare?add=${run.id}`)}>
              <GitCompare className="size-4" /> Compare
            </Button>
            <Button size="sm" disabled={!canDecide} onClick={() => { setDecisionTitle(`Decision on ${run.scenarioName}`); setDecisionOpen(true); }}>
              <Gavel className="size-4" /> Record decision
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Seed {run.seed}</Badge>
          {simulation ? <Badge variant="ai">{simulation.category}</Badge> : null}
          <Badge variant="secondary">Deterministic · reproducible</Badge>
        </div>
      </SimCard>

      <ResultView result={run.result} modelKey={run.modelKey} />

      <div className="grid gap-6 xl:grid-cols-2">
        <SimCard title="Insights" description="Generated from this run.">
          <InsightList insights={insights} />
        </SimCard>
        <SimCard title="Recommendations" description="Actions suggested by the outcome.">
          <RecommendationList recommendations={recommendations} onAccept={acceptRecommendation} />
        </SimCard>
      </div>

      <Dialog open={decisionOpen} onOpenChange={setDecisionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a decision</DialogTitle>
            <DialogDescription>Capture the decision this analysis supports. It is logged to history.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <Input value={decisionTitle} onChange={(e) => setDecisionTitle(e.target.value)} placeholder="Decision title" />
            <div className="grid grid-cols-2 gap-3">
              <Select value={decisionOutcome} onValueChange={(v) => setDecisionOutcome(v as DecisionOutcome)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="adopt">Adopt</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                  <SelectItem value="defer">Defer</SelectItem>
                  <SelectItem value="investigate">Investigate</SelectItem>
                </SelectContent>
              </Select>
              <Select value={decisionImpact} onValueChange={(v) => setDecisionImpact(v as "low" | "medium" | "high")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low impact</SelectItem>
                  <SelectItem value="medium">Medium impact</SelectItem>
                  <SelectItem value="high">High impact</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea value={decisionRationale} onChange={(e) => setDecisionRationale(e.target.value)} placeholder="Rationale" />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDecisionOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                recordDecision({
                  simulationId: run.simulationId,
                  runId: run.id,
                  title: decisionTitle || `Decision on ${run.scenarioName}`,
                  outcome: decisionOutcome,
                  impact: decisionImpact,
                  rationale: decisionRationale || "Recorded from analysis studio.",
                });
                setDecisionOpen(false);
                setDecisionRationale("");
              }}
            >
              Record decision
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ResultsScreen() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const runId = params.get("run");

  if (!hydrated) return <DetailSkeleton />;

  return (
    <SimShell
      title="Result Analysis Studio"
      description="Charts, tables, outcome and trend analysis, risk and sensitivity analysis, constraint validation, insights, and recommendations for every completed run."
      actions={
        runId ? (
          <Link href={"/simulations/results" as Route} className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-primary-text focus-ring hover:bg-slate-50">
            All results
          </Link>
        ) : undefined
      }
    >
      {runId ? <AnalysisFor runId={runId} /> : <RunPicker />}
    </SimShell>
  );
}
