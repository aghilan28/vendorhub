"use client";

import Link from "next/link";
import type { Route } from "next";
import { Workflow, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WORKFLOW_ORDER, WORKFLOW_TRANSITIONS, type WorkflowState } from "@/lib/secis";
import { useSecisStore } from "@/store/secis-store";
import { useHydrated, usePermission } from "../hooks";
import { WORKFLOW_META, relativeTime } from "../format";
import { SecisShell, SecisCard, WorkflowBadge } from "./primitives";
import { ListSkeleton } from "./skeletons";

export function WorkflowEngine() {
  const hydrated = useHydrated();
  const changeEvents = useSecisStore((s) => s.changeEvents);
  const history = useSecisStore((s) => s.history);
  const transitionWorkflow = useSecisStore((s) => s.transitionWorkflow);
  const canRun = usePermission("event.run");

  if (!hydrated) return <ListSkeleton />;

  const transitions = history.filter((h) => h.action === "workflow_transition").slice(0, 12);

  return (
    <SecisShell title="Workflow Engine" description="Govern every change event through Draft → Review → Approved → Running → Completed → Archived. Every transition is tracked, timestamped, and attributed.">
      <SecisCard title="Lifecycle">
        <div className="flex flex-wrap items-center gap-2">
          {WORKFLOW_ORDER.map((state, i) => (
            <span key={state} className="flex items-center gap-2">
              <Badge variant={WORKFLOW_META[state].variant}>{WORKFLOW_META[state].label}</Badge>
              {i < WORKFLOW_ORDER.length - 1 ? <ChevronRight className="size-4 text-secondary-text" /> : null}
            </span>
          ))}
        </div>
      </SecisCard>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {WORKFLOW_ORDER.map((state) => {
          const items = changeEvents.filter((e) => e.workflowState === state);
          return (
            <SecisCard key={state} title={WORKFLOW_META[state].label} description={`${items.length} event${items.length === 1 ? "" : "s"}`}>
              {items.length === 0 ? <p className="text-sm text-secondary-text">None.</p> : (
                <div className="space-y-3">
                  {items.map((e) => (
                    <div key={e.id} className="rounded-md border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/secis/${e.id}` as Route} className="truncate text-sm font-medium text-primary-text hover:underline">{e.name}</Link>
                        <WorkflowBadge state={e.workflowState} />
                      </div>
                      <p className="mt-1 text-xs text-secondary-text">{e.ownerName} · {relativeTime(e.updatedAt)}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {WORKFLOW_TRANSITIONS[e.workflowState].map((next) => (
                          <Button key={next} size="sm" variant="secondary" disabled={!canRun} onClick={() => transitionWorkflow(e.id, next as WorkflowState)}>→ {WORKFLOW_META[next].label}</Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SecisCard>
          );
        })}
      </div>

      <SecisCard title="Recent transitions" action={<Workflow className="size-4 text-secondary-text" />}>
        {transitions.length === 0 ? <p className="text-sm text-secondary-text">No transitions yet.</p> : (
          <div className="space-y-2">
            {transitions.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2"><p className="text-sm text-primary-text">{t.summary}</p><span className="text-xs text-secondary-text">{t.actorName} · {relativeTime(t.at)}</span></div>
            ))}
          </div>
        )}
      </SecisCard>
    </SecisShell>
  );
}
