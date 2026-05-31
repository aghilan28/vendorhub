"use client";

// KARTEX M8.8 + M8.12 — Outcome Tracking & Execution Analytics
// Completion rate, velocity, success rates, KPI performance, owner performance,
// risk trends and expected-vs-actual outcome variance.

import { useState } from "react";
import { BarChart3, Gauge, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import { DataTable } from "@/components/dashboard/data-table";
import { useExecutionStore } from "../store";
import { healthTone, initiativeName } from "../helpers";
import { ProgressBar, SectionGrid, Stat } from "./shared";

function variancePct(expected: number, actual: number | null): string {
  if (actual === null || expected === 0) return "—";
  const v = ((actual - expected) / expected) * 100;
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

export function ExecutionAnalytics() {
  const data = useExecutionStore((s) => s.data);
  const snapshot = useExecutionStore((s) => s.snapshot);
  const recordOutcome = useExecutionStore((s) => s.recordOutcome);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const submitOutcome = (outcomeId: string) => {
    const raw = drafts[outcomeId];
    if (raw === undefined || raw === "") return;
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    if (recordOutcome(outcomeId, value)) {
      setDrafts((prev) => ({ ...prev, [outcomeId]: "" }));
    }
  };

  const ownerRows = snapshot.analytics.ownerPerformance.map((o) => [
    o.name,
    String(o.assigned),
    String(o.completed),
    String(o.blocked),
    `${o.completionRate}%`,
  ]);

  return (
    <div className="space-y-6">
      <GovernanceCard title="Execution analytics" description="Throughput, success and risk across the portfolio." action={<BarChart3 className="size-4 text-secondary-text" />}>
        <SectionGrid cols={4}>
          <Stat label="Completion rate" value={`${snapshot.analytics.completionRate}%`} hint="action plans completed" />
          <Stat label="Execution velocity" value={`${snapshot.analytics.executionVelocity}%`} hint="tasks completed" />
          <Stat label="Initiative progress" value={`${snapshot.analytics.initiativeSuccessRate}%`} hint="avg / success" tone="ai" />
          <Stat label="KPI performance" value={`${snapshot.analytics.kpiPerformance}%`} hint="avg attainment" />
        </SectionGrid>
        <div className="mt-3">
          <SectionGrid cols={3}>
            <Stat
              label="Risk exposure"
              value={snapshot.analytics.riskExposure}
              tone={snapshot.analytics.riskTrend === "healthy" ? "default" : "warning"}
            />
            <Stat label="Outcome success" value={`${snapshot.outcomes.successRate}%`} />
            <Stat
              label="Outcome failure"
              value={`${snapshot.outcomes.failureRate}%`}
              tone={snapshot.outcomes.failureRate > 0 ? "danger" : "default"}
            />
          </SectionGrid>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-secondary-text">
          <Gauge className="size-3" /> Risk trend:
          <Badge variant={healthTone(snapshot.analytics.riskTrend)}>{snapshot.analytics.riskTrend}</Badge>
        </div>
      </GovernanceCard>

      <GovernanceCard title="Owner performance" description="Delivery throughput by owner.">
        {ownerRows.length > 0 ? (
          <DataTable columns={["Owner", "Assigned", "Completed", "Blocked", "Completion"]} rows={ownerRows} />
        ) : (
          <p className="text-sm text-secondary-text">No owner assignments yet.</p>
        )}
      </GovernanceCard>

      <GovernanceCard title="Outcome tracking" description="Expected vs actual results, variance and value realization." action={<TrendingUp className="size-4 text-emerald-500" />}>
        <div className="mb-4">
          <SectionGrid cols={4}>
            <Stat label="Tracked outcomes" value={snapshot.outcomes.tracked} />
            <Stat label="Achieved" value={snapshot.outcomes.achieved} />
            <Stat label="Avg attainment" value={`${snapshot.outcomes.averageAttainment}%`} tone="ai" />
            <Stat label="Avg variance" value={`${snapshot.outcomes.averageVariance}%`} />
          </SectionGrid>
        </div>
        <div className="space-y-3">
          {data.outcomes.map((outcome) => (
            <div key={outcome.id} className="rounded-md border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary-text">{outcome.metric}</p>
                  <p className="text-xs text-secondary-text">
                    Initiative: {initiativeName(data, outcome.initiativeId)} · expected {outcome.expected}
                    {outcome.unit}
                    {outcome.actual !== null ? ` · actual ${outcome.actual}${outcome.unit}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      outcome.status === "achieved"
                        ? "default"
                        : outcome.status === "partial"
                          ? "warning"
                          : outcome.status === "missed"
                            ? "danger"
                            : "secondary"
                    }
                  >
                    {outcome.status}
                  </Badge>
                  <span className="text-xs tabular-nums text-secondary-text">
                    {variancePct(outcome.expected, outcome.actual)}
                  </span>
                </div>
              </div>
              {outcome.actual !== null ? (
                <div className="mt-3">
                  <ProgressBar
                    value={
                      outcome.expected === 0
                        ? 100
                        : Math.min(100, Math.round((outcome.actual / outcome.expected) * 100))
                    }
                  />
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <Input
                    type="number"
                    step="any"
                    className="w-40"
                    placeholder="Record actual"
                    value={drafts[outcome.id] ?? ""}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [outcome.id]: e.target.value }))}
                    aria-label={`Record outcome for ${outcome.metric}`}
                  />
                  <Button size="sm" variant="secondary" onClick={() => submitOutcome(outcome.id)}>
                    Record outcome
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </GovernanceCard>
    </div>
  );
}
