"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Pause, Play, Square, Terminal, Timer, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSimulationStore } from "@/store/simulation-store";
import { useHydrated, usePermission } from "../hooks";
import { formatRuntime, relativeTime } from "../format";
import { SimShell, SimCard, RunStatusBadge } from "./primitives";
import { ListSkeleton } from "./skeletons";

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${Math.max(2, value)}%` }} />
    </div>
  );
}

export function ExecutionCenter() {
  const hydrated = useHydrated();
  const scenarios = useSimulationStore((s) => s.scenarios);
  const runs = useSimulationStore((s) => s.runs);
  const startRun = useSimulationStore((s) => s.startRun);
  const pauseRun = useSimulationStore((s) => s.pauseRun);
  const resumeRun = useSimulationStore((s) => s.resumeRun);
  const cancelRun = useSimulationStore((s) => s.cancelRun);
  const canRun = usePermission("scenario.run");
  const [selectedScenario, setSelectedScenario] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!hydrated) return <ListSkeleton />;

  const activeScenarios = scenarios.filter((s) => s.status === "active");
  const liveRuns = runs.filter((r) => r.status === "running" || r.status === "paused");
  const recent = [...runs].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

  return (
    <SimShell
      title="Simulation Execution Center"
      description="Launch, monitor, and control simulation runs. Track live progress, pause and resume, cancel, and inspect run logs, metrics, and runtime."
    >
      <SimCard title="Launch a run" description="Pick a scenario and execute it. Runs progress live and complete automatically.">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-primary-text">Scenario</label>
            <Select value={selectedScenario} onValueChange={setSelectedScenario}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select a scenario to run" />
              </SelectTrigger>
              <SelectContent>
                {activeScenarios.map((sc) => (
                  <SelectItem key={sc.id} value={sc.id}>
                    {sc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={!selectedScenario || !canRun}
            onClick={() => {
              const sc = activeScenarios.find((x) => x.id === selectedScenario);
              if (sc) {
                startRun(sc.id, `${sc.name} · run`);
                setSelectedScenario("");
              }
            }}
          >
            <Play className="size-4" /> Run simulation
          </Button>
        </div>
        {!canRun ? <p className="mt-2 text-xs text-danger">Your role cannot execute runs. Switch to Analyst, Reviewer, or Admin in the header.</p> : null}
      </SimCard>

      <SimCard title="Live runs" description="Currently executing or paused. Controls update in real time." action={<Badge variant={liveRuns.length ? "ai" : "secondary"}>{liveRuns.length} live</Badge>}>
        {liveRuns.length === 0 ? (
          <p className="text-sm text-secondary-text">No live runs. Launch one above to watch it execute.</p>
        ) : (
          <div className="space-y-4">
            {liveRuns.map((run) => (
              <div key={run.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-primary-text">{run.label}</p>
                    <p className="text-xs text-secondary-text">{run.scenarioName} · started {relativeTime(run.startedAt)}</p>
                  </div>
                  <RunStatusBadge status={run.status} />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <ProgressBar value={run.progress} />
                  <span className="w-12 shrink-0 text-right text-sm font-semibold text-primary-text">{Math.round(run.progress)}%</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {run.status === "running" ? (
                    <Button size="sm" variant="secondary" onClick={() => pauseRun(run.id)}>
                      <Pause className="size-4" /> Pause
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => resumeRun(run.id)}>
                      <Play className="size-4" /> Resume
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => cancelRun(run.id)}>
                    <Square className="size-4" /> Cancel
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setExpanded(expanded === run.id ? null : run.id)}>
                    <Terminal className="size-4" /> {expanded === run.id ? "Hide" : "View"} logs
                  </Button>
                </div>
                {expanded === run.id ? (
                  <div className="mt-3 max-h-40 overflow-y-auto rounded-md bg-slate-900 p-3 font-mono text-xs text-emerald-200">
                    {run.logs.map((log, i) => (
                      <p key={i} className={log.level === "error" ? "text-red-300" : log.level === "warn" ? "text-amber-200" : ""}>
                        <span className="text-slate-500">{new Date(log.at).toLocaleTimeString("en-IN")}</span> {log.message}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </SimCard>

      <SimCard title="Run history" description="Every run with status, runtime, and a link to full analysis.">
        {recent.length === 0 ? (
          <p className="text-sm text-secondary-text">No runs yet.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((run) => (
              <div key={run.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-primary-text">{run.label}</p>
                  <p className="text-xs text-secondary-text">
                    {run.scenarioName} · {relativeTime(run.startedAt)}
                    {run.status === "completed" ? (
                      <>
                        {" "}
                        · <Timer className="inline size-3" /> {formatRuntime(run.runtimeMs)} · <Gauge className="inline size-3" /> {run.result ? `${run.result.risk.level} risk` : ""}
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <RunStatusBadge status={run.status} />
                  {run.status === "completed" ? (
                    <Link href={`/simulations/results?run=${run.id}` as Route} className="inline-flex min-h-9 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-primary-text focus-ring hover:bg-slate-50">
                      Analyse
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </SimCard>
    </SimShell>
  );
}
