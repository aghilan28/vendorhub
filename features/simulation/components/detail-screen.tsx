"use client";

import Link from "next/link";
import type { Route } from "next";
import { Play, Plus, Users, GitBranch, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { WORKFLOW_TRANSITIONS, visibilityLabel, roleLabel, type WorkflowState } from "@/lib/simulation";
import { useSimulationStore } from "@/store/simulation-store";
import { useHydrated, usePermission } from "../hooks";
import { WORKFLOW_META, relativeTime } from "../format";
import { SimShell, SimCard, WorkflowBadge, RunStatusBadge, StatTile } from "./primitives";
import { DetailSkeleton } from "./skeletons";

export function SimulationDetail({ simulationId }: { simulationId: string }) {
  const hydrated = useHydrated();
  const simulation = useSimulationStore((s) => s.simulations.find((x) => x.id === simulationId));
  const scenarios = useSimulationStore((s) => s.scenarios.filter((x) => x.simulationId === simulationId));
  const runs = useSimulationStore((s) => s.runs.filter((x) => x.simulationId === simulationId));
  const reviews = useSimulationStore((s) => s.reviews.filter((x) => x.simulationId === simulationId));
  const approvals = useSimulationStore((s) => s.approvals.filter((x) => x.simulationId === simulationId));
  const versions = useSimulationStore((s) => s.versions.filter((x) => x.simulationId === simulationId));
  const decisions = useSimulationStore((s) => s.decisions.filter((x) => x.simulationId === simulationId));
  const transitionWorkflow = useSimulationStore((s) => s.transitionWorkflow);
  const startRun = useSimulationStore((s) => s.startRun);
  const canEdit = usePermission("simulation.edit");
  const canRun = usePermission("scenario.run");

  if (!hydrated) return <DetailSkeleton />;

  if (!simulation) {
    return (
      <SimShell title="Simulation" description="Detailed view of a single simulation.">
        <EmptyState icon={GitBranch} title="Simulation not found" description="This simulation may have been removed." action={<Link href={"/simulations" as Route} className="inline-flex min-h-11 items-center rounded-md bg-brand px-3 text-sm font-medium text-white">Back to command center</Link>} />
      </SimShell>
    );
  }

  const completedRuns = runs.filter((r) => r.status === "completed");

  return (
    <SimShell
      title={simulation.name}
      description={simulation.description}
      actions={
        <Button asChild>
          <Link href={`/simulations/scenarios?sim=${simulation.id}`}>
            <Plus className="size-4" /> Add scenario
          </Link>
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <WorkflowBadge state={simulation.workflowState} />
        <Badge variant="secondary">{simulation.category}</Badge>
        <Badge variant="secondary">v{simulation.version}</Badge>
        <Badge variant="ai">{visibilityLabel(simulation.visibility)}</Badge>
        {simulation.tags.map((t) => (
          <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-secondary-text">{t}</span>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Scenarios" value={String(scenarios.length)} tone="info" />
        <StatTile label="Runs" value={String(runs.length)} tone="neutral" />
        <StatTile label="Completed" value={String(completedRuns.length)} tone="success" />
        <StatTile label="Decisions" value={String(decisions.length)} tone="neutral" />
      </div>

      <SimCard title="Workflow" description="Advance this simulation through its lifecycle.">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-secondary-text">Current:</span>
          <WorkflowBadge state={simulation.workflowState} />
          <span className="mx-2 text-secondary-text">→</span>
          {WORKFLOW_TRANSITIONS[simulation.workflowState].map((next) => (
            <Button key={next} size="sm" variant="secondary" disabled={!canEdit} onClick={() => transitionWorkflow(simulation.id, next as WorkflowState)}>
              {WORKFLOW_META[next].label}
            </Button>
          ))}
        </div>
      </SimCard>

      <SimCard title="Scenarios" description="Configured parameter sets under this simulation.">
        {scenarios.length === 0 ? (
          <p className="text-sm text-secondary-text">No scenarios yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {scenarios.map((sc) => (
              <div key={sc.id} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/simulations/scenarios?scenario=${sc.id}` as Route} className="text-sm font-medium text-primary-text hover:underline">{sc.name}</Link>
                  {sc.isBaseline ? <Badge variant="ai">baseline</Badge> : <Badge variant="secondary">{sc.status}</Badge>}
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-secondary-text">{sc.description || "No description."}</p>
                <div className="mt-2">
                  <Button size="sm" disabled={!canRun} onClick={() => startRun(sc.id, `${sc.name} · run`)}>
                    <Play className="size-4" /> Run
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SimCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SimCard title="Runs" description="Executions for this simulation.">
          {runs.length === 0 ? (
            <p className="text-sm text-secondary-text">No runs yet.</p>
          ) : (
            <div className="space-y-2">
              {[...runs].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)).map((run) => (
                <div key={run.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary-text">{run.label}</p>
                    <p className="text-xs text-secondary-text">{relativeTime(run.startedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <RunStatusBadge status={run.status} />
                    {run.status === "completed" ? (
                      <Link href={`/simulations/results?run=${run.id}` as Route} className="text-xs font-medium text-ai hover:underline">Analyse</Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SimCard>

        <SimCard title="Contributors" description="People with access to this simulation." action={<Users className="size-4 text-secondary-text" />}>
          <div className="space-y-2">
            {simulation.contributors.map((c) => (
              <div key={c.userId} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <span className="text-sm text-primary-text">{c.name}</span>
                <Badge variant="secondary">{roleLabel(c.role === "owner" ? "admin" : c.role === "editor" ? "analyst" : c.role === "reviewer" ? "reviewer" : "viewer")}</Badge>
              </div>
            ))}
          </div>
        </SimCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SimCard title="Versions" description="Saved configuration snapshots." action={<GitBranch className="size-4 text-secondary-text" />}>
          {versions.length === 0 ? (
            <p className="text-sm text-secondary-text">No versions saved yet.</p>
          ) : (
            <div className="space-y-2">
              {[...versions].sort((a, b) => b.version - a.version).map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-primary-text">v{v.version} · {v.label}</p>
                    <p className="text-[11px] text-secondary-text">{relativeTime(v.createdAt)}</p>
                  </div>
                  <Badge variant="secondary">{v.snapshot.scenarioCount} scenarios</Badge>
                </div>
              ))}
            </div>
          )}
        </SimCard>

        <SimCard title="Decisions" description="Decisions recorded for this simulation." action={<Gavel className="size-4 text-secondary-text" />}>
          {decisions.length === 0 ? (
            <p className="text-sm text-secondary-text">No decisions recorded.</p>
          ) : (
            <div className="space-y-2">
              {decisions.map((d) => (
                <div key={d.id} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-primary-text">{d.title}</p>
                    <Badge variant={d.outcome === "adopt" ? "default" : d.outcome === "reject" ? "danger" : "warning"}>{d.outcome}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-secondary-text">{d.rationale}</p>
                </div>
              ))}
            </div>
          )}
        </SimCard>
      </div>

      {(reviews.length > 0 || approvals.length > 0) && (
        <SimCard title="Reviews & approvals">
          <div className="grid gap-3 md:grid-cols-2">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-primary-text">{r.reviewerName}</p>
                  <Badge variant={r.decision === "approved" ? "default" : r.decision === "rejected" ? "danger" : "warning"}>{r.decision.replace(/_/g, " ")}</Badge>
                </div>
                <p className="mt-1 text-xs text-secondary-text">{r.comment}</p>
              </div>
            ))}
            {approvals.map((a) => (
              <div key={a.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-primary-text">{a.approverName}</p>
                  <Badge variant={a.approved ? "default" : "danger"}>{a.approved ? "approved" : "declined"}</Badge>
                </div>
                <p className="mt-1 text-xs text-secondary-text">{a.note}</p>
              </div>
            ))}
          </div>
        </SimCard>
      )}
    </SimShell>
  );
}
