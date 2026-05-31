"use client";

// KARTEX M8.3 — Execution Command Center
// Live operational overview: health, active portfolio, open/blocked work,
// escalations, KPI status and recent outcomes. No placeholders.

import { Activity, AlertTriangle, Flame, Gauge, ListChecks, Rocket, Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import { useExecutionStore } from "../store";
import {
  healthTone,
  initiativeProgress,
  kpiAttainmentPct,
  kpiStatusTone,
  ownerName,
  severityTone,
} from "../helpers";
import { ProgressBar, SectionGrid, Stat, StatusBadge } from "./shared";

export function ExecutionCommandCenter() {
  const data = useExecutionStore((s) => s.data);
  const snapshot = useExecutionStore((s) => s.snapshot);

  const activeInitiatives = data.initiatives.filter(
    (i) => i.status === "executing" || i.status === "approved" || i.status === "blocked",
  );
  const openActions = data.actionPlans.filter(
    (a) => a.status !== "completed" && a.status !== "archived",
  );
  const blockedActions = data.actionPlans.filter((a) => a.status === "blocked");
  const openEscalations = data.escalations.filter((e) => e.status !== "resolved");
  const recordedOutcomes = data.outcomes.filter((o) => o.actual !== null);
  const recentEvents = data.events.slice(0, 6);

  return (
    <div className="space-y-6">
      <GovernanceCard
        title="Execution health"
        description="Real-time operational status converting intelligence into measurable execution."
        action={
          <Badge variant={healthTone(snapshot.health.tone)}>
            <Gauge className="size-3" /> {snapshot.health.label} · {snapshot.health.score}/100
          </Badge>
        }
      >
        <p className="text-sm text-secondary-text">{snapshot.health.detail}</p>
        <div className="mt-4">
          <ProgressBar value={snapshot.health.score} />
        </div>
        <div className="mt-4">
          <SectionGrid cols={4}>
            <Stat label="Active programs" value={snapshot.counts.activePrograms} hint={`${snapshot.counts.programs} total`} />
            <Stat label="Active initiatives" value={snapshot.counts.activeInitiatives} hint={`${snapshot.counts.initiatives} total`} />
            <Stat label="Open actions" value={snapshot.counts.openActions} />
            <Stat
              label="Blocked actions"
              value={snapshot.counts.blockedActions}
              tone={snapshot.counts.blockedActions > 0 ? "danger" : "default"}
            />
          </SectionGrid>
        </div>
        <div className="mt-3">
          <SectionGrid cols={4}>
            <Stat
              label="Open escalations"
              value={snapshot.counts.openEscalations}
              tone={snapshot.counts.openEscalations > 0 ? "warning" : "default"}
            />
            <Stat label="KPI attainment" value={`${snapshot.kpis.averageAttainment}%`} tone="ai" />
            <Stat label="Outcome success" value={`${snapshot.outcomes.successRate}%`} />
            <Stat label="Pending decisions" value={snapshot.counts.pendingDecisions} />
          </SectionGrid>
        </div>
      </GovernanceCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GovernanceCard title="Active initiatives" description="In-flight execution across the portfolio.">
          <ul className="space-y-3">
            {activeInitiatives.map((initiative) => (
              <li key={initiative.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary-text">{initiative.name}</p>
                    <p className="text-xs text-secondary-text">
                      {initiative.code} · {ownerName(data, initiative.ownerId)}
                    </p>
                  </div>
                  <StatusBadge status={initiative.status} />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <ProgressBar value={initiativeProgress(initiative)} />
                  <span className="text-xs tabular-nums text-secondary-text">
                    {initiativeProgress(initiative)}%
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </GovernanceCard>

        <GovernanceCard
          title="Escalations"
          description="Blocked work, risks and breached tolerances requiring attention."
          action={<Flame className="size-4 text-amber-500" />}
        >
          {openEscalations.length === 0 ? (
            <p className="text-sm text-secondary-text">No open escalations.</p>
          ) : (
            <ul className="space-y-2">
              {openEscalations.map((escalation) => (
                <li key={escalation.id} className="flex items-start justify-between gap-2 rounded-md border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary-text">{escalation.title}</p>
                    <p className="text-xs text-secondary-text">{escalation.reason}</p>
                  </div>
                  <Badge variant={severityTone(escalation.severity)}>{escalation.severity}</Badge>
                </li>
              ))}
            </ul>
          )}
        </GovernanceCard>

        <GovernanceCard title="KPI status" description="Indicators driving execution outcomes." action={<Target className="size-4 text-blue-500" />}>
          <ul className="space-y-2">
            {data.kpis.map((kpi) => (
              <li key={kpi.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-primary-text">{kpi.name}</p>
                  <p className="text-xs text-secondary-text">
                    {kpi.current}
                    {kpi.unit} / target {kpi.target}
                    {kpi.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs tabular-nums text-secondary-text">{kpiAttainmentPct(kpi)}%</span>
                  <Badge variant={kpiStatusTone(kpi.status)}>{kpi.status.replace("_", " ")}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </GovernanceCard>

        <GovernanceCard title="Recent outcomes" description="Measured results vs expectations." action={<TrendingUp className="size-4 text-emerald-500" />}>
          {recordedOutcomes.length === 0 ? (
            <p className="text-sm text-secondary-text">No outcomes recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {recordedOutcomes.map((outcome) => (
                <li key={outcome.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-primary-text">{outcome.metric}</p>
                    <p className="text-xs text-secondary-text">
                      actual {outcome.actual}
                      {outcome.unit} vs expected {outcome.expected}
                      {outcome.unit}
                    </p>
                  </div>
                  <Badge
                    variant={
                      outcome.status === "achieved"
                        ? "default"
                        : outcome.status === "partial"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {outcome.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </GovernanceCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GovernanceCard title="Open actions" description="Action plans currently in flight." action={<ListChecks className="size-4 text-secondary-text" />}>
          <ul className="space-y-2">
            {openActions.map((action) => (
              <li key={action.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-primary-text">{action.title}</p>
                  <p className="text-xs text-secondary-text">
                    {action.code} · {ownerName(data, action.ownerId)}
                  </p>
                </div>
                <StatusBadge status={action.status} />
              </li>
            ))}
            {blockedActions.length > 0 ? (
              <li className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                <AlertTriangle className="size-4" /> {blockedActions.length} action(s) blocked and need intervention.
              </li>
            ) : null}
          </ul>
        </GovernanceCard>

        <GovernanceCard title="Recent execution events" description="Audited, timestamped, owned activity stream." action={<Activity className="size-4 text-secondary-text" />}>
          <ol className="space-y-2">
            {recentEvents.map((event) => (
              <li key={event.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">{event.type.replace("_", " ")}</Badge>
                  <span className="text-xs text-secondary-text">{new Date(event.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="mt-1 text-sm text-primary-text">{event.note}</p>
                <p className="text-xs text-secondary-text">by {event.actorName}</p>
              </li>
            ))}
          </ol>
        </GovernanceCard>
      </div>

      <div className="flex items-center gap-2 text-xs text-secondary-text">
        <Rocket className="size-3" />
        Snapshot generated {new Date(snapshot.generatedAt).toLocaleString()}.
      </div>
    </div>
  );
}
