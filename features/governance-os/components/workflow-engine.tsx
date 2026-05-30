"use client";

import Link from "next/link";
import type { Route } from "next";
import { Workflow, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DECISION_ORDER, DECISION_TRANSITIONS, WORKFLOW_DEFINITIONS, type DecisionStatus } from "@/lib/governance-os";
import { useGovernanceStore } from "@/store/governance-store";
import { useHydrated, usePermission } from "../hooks";
import { DECISION_STATUS_META, relativeTime } from "../format";
import { GovShell, GovCard, DecisionStatusBadge } from "./primitives";
import { ListSkeleton } from "./skeletons";

export function WorkflowEngine() {
  const hydrated = useHydrated();
  const decisions = useGovernanceStore((s) => s.decisions);
  const audit = useGovernanceStore((s) => s.audit);
  const transitionDecision = useGovernanceStore((s) => s.transitionDecision);
  const canApprove = usePermission("decision.approve");
  const canReview = usePermission("decision.review");
  if (!hydrated) return <ListSkeleton />;

  const transitions = audit.filter((a) => a.action === "decision_transition" || a.action === "policy_transition").slice(0, 12);

  return (
    <GovShell title="Approval Workflow Engine" description="The governed lifecycle for decisions: Draft → Review → Approved / Rejected / Exception → Archived. Every transition is tracked, timestamped, and attributed.">
      <GovCard title="Workflow definitions">
        <div className="space-y-4">
          {WORKFLOW_DEFINITIONS.map((wf) => (
            <div key={wf.id}>
              <p className="mb-1.5 text-sm font-medium text-primary-text">{wf.name} <span className="text-xs text-secondary-text">({wf.objectType})</span></p>
              <div className="flex flex-wrap items-center gap-2">
                {wf.states.map((st, i) => <span key={st} className="flex items-center gap-2"><Badge variant="secondary">{st}</Badge>{i < wf.states.length - 1 ? <ChevronRight className="size-3.5 text-secondary-text" /> : null}</span>)}
              </div>
            </div>
          ))}
        </div>
      </GovCard>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {DECISION_ORDER.map((st) => {
          const items = decisions.filter((d) => d.status === st);
          return (
            <GovCard key={st} title={DECISION_STATUS_META[st].label} description={`${items.length} decision${items.length === 1 ? "" : "s"}`}>
              {items.length === 0 ? <p className="text-sm text-secondary-text">None.</p> : (
                <div className="space-y-3">
                  {items.map((d) => (
                    <div key={d.id} className="rounded-md border border-border p-3">
                      <div className="flex items-start justify-between gap-2"><Link href={`/governance/decisions/${d.id}` as Route} className="truncate text-sm font-medium text-primary-text hover:underline">{d.title}</Link><DecisionStatusBadge status={d.status} /></div>
                      <p className="mt-1 text-xs text-secondary-text">{d.ownerName} · {relativeTime(d.updatedAt)}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {DECISION_TRANSITIONS[d.status].map((to) => <Button key={to} size="sm" variant="secondary" disabled={!canApprove && !canReview} onClick={() => transitionDecision(d.id, to as DecisionStatus)}>→ {DECISION_STATUS_META[to].label}</Button>)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GovCard>
          );
        })}
      </div>

      <GovCard title="Recent transitions" action={<Workflow className="size-4 text-secondary-text" />}>
        {transitions.length === 0 ? <p className="text-sm text-secondary-text">No transitions yet.</p> : (
          <div className="space-y-2">{transitions.map((t) => <div key={t.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2"><p className="text-sm text-primary-text">{t.objectLabel}: {t.summary}</p><span className="text-xs text-secondary-text">{t.actorName} · {relativeTime(t.at)}</span></div>)}</div>
        )}
      </GovCard>
    </GovShell>
  );
}
