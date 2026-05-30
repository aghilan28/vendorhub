"use client";

import Link from "next/link";
import type { Route } from "next";
import { Workflow, ChevronRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WORKFLOW_ORDER, WORKFLOW_TRANSITIONS, type WorkflowState } from "@/lib/simulation";
import { useSimulationStore } from "@/store/simulation-store";
import { useHydrated, usePermission } from "../hooks";
import { WORKFLOW_META, relativeTime } from "../format";
import { SimShell, SimCard, WorkflowBadge } from "./primitives";
import { ListSkeleton } from "./skeletons";

export function WorkflowEngine() {
  const hydrated = useHydrated();
  const simulations = useSimulationStore((s) => s.simulations);
  const history = useSimulationStore((s) => s.history);
  const transitionWorkflow = useSimulationStore((s) => s.transitionWorkflow);
  const saveVersion = useSimulationStore((s) => s.saveVersion);
  const canEdit = usePermission("simulation.edit");

  if (!hydrated) return <ListSkeleton />;

  const transitions = history.filter((h) => h.action === "workflow_transition").slice(0, 12);

  return (
    <SimShell
      title="Workflow Engine"
      description="Govern every simulation through Draft → Review → Approved → Scheduled → Running → Completed → Archived. Every transition is tracked, timestamped, and attributed."
    >
      <SimCard title="Lifecycle" description="The governed state machine all simulations move through.">
        <div className="flex flex-wrap items-center gap-2">
          {WORKFLOW_ORDER.map((state, i) => (
            <span key={state} className="flex items-center gap-2">
              <Badge variant={WORKFLOW_META[state].variant}>{WORKFLOW_META[state].label}</Badge>
              {i < WORKFLOW_ORDER.length - 1 ? <ChevronRight className="size-4 text-secondary-text" /> : null}
            </span>
          ))}
        </div>
      </SimCard>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {WORKFLOW_ORDER.map((state) => {
          const items = simulations.filter((s) => s.workflowState === state);
          return (
            <SimCard key={state} title={WORKFLOW_META[state].label} description={`${items.length} simulation${items.length === 1 ? "" : "s"}`}>
              {items.length === 0 ? (
                <p className="text-sm text-secondary-text">None.</p>
              ) : (
                <div className="space-y-3">
                  {items.map((sim) => (
                    <div key={sim.id} className="rounded-md border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/simulations/${sim.id}` as Route} className="truncate text-sm font-medium text-primary-text hover:underline">{sim.name}</Link>
                        <WorkflowBadge state={sim.workflowState} />
                      </div>
                      <p className="mt-1 text-xs text-secondary-text">v{sim.version} · {sim.ownerName} · {relativeTime(sim.updatedAt)}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {WORKFLOW_TRANSITIONS[sim.workflowState].map((next) => (
                          <Button key={next} size="sm" variant="secondary" disabled={!canEdit} onClick={() => transitionWorkflow(sim.id, next as WorkflowState)}>
                            → {WORKFLOW_META[next].label}
                          </Button>
                        ))}
                        <Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => saveVersion(sim.id, `Snapshot at ${WORKFLOW_META[sim.workflowState].label}`)}>
                          <Save className="size-4" /> Version
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SimCard>
          );
        })}
      </div>

      <SimCard title="Recent transitions" description="Tracked, timestamped workflow changes." action={<Workflow className="size-4 text-secondary-text" />}>
        {transitions.length === 0 ? (
          <p className="text-sm text-secondary-text">No transitions recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {transitions.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <p className="text-sm text-primary-text">{t.summary}</p>
                <span className="text-xs text-secondary-text">{t.actorName} · {relativeTime(t.at)}</span>
              </div>
            ))}
          </div>
        )}
      </SimCard>
    </SimShell>
  );
}
