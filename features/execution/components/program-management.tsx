"use client";

// KARTEX M8.6 — Program Management
// Manage programs and view program health, dependencies, risks and outcomes.

import { Boxes, GitBranch, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import { useExecutionStore } from "../store";
import {
  healthTone,
  initiativeProgress,
  ownerName,
  programInitiatives,
} from "../helpers";
import { ProgressBar, StatusBadge, WorkflowControls } from "./shared";
import type { Tone } from "@/lib/execution";

function programHealth(progressAvg: number, openRisk: number): { tone: Tone; label: string } {
  const score = progressAvg - Math.min(40, openRisk * 2);
  if (score >= 70) return { tone: "healthy", label: "Healthy" };
  if (score >= 50) return { tone: "watch", label: "Watch" };
  if (score >= 30) return { tone: "degraded", label: "Degraded" };
  return { tone: "critical", label: "Critical" };
}

export function ProgramManagement() {
  const data = useExecutionStore((s) => s.data);
  const transitionEntity = useExecutionStore((s) => s.transitionEntity);

  return (
    <div className="space-y-6">
      {data.programs.map((program) => {
        const initiatives = programInitiatives(data, program);
        const progressAvg = initiatives.length
          ? Math.round(initiatives.reduce((s, i) => s + i.progress, 0) / initiatives.length)
          : 0;
        const risks = data.risks.filter((r) => program.riskIds.includes(r.id));
        const openRisk = risks.filter((r) => r.status !== "closed").reduce((s, r) => s + r.score, 0);
        const dependencies = data.dependencies.filter((d) => program.dependencyIds.includes(d.id));
        const kpis = data.kpis.filter((k) => program.kpiIds.includes(k.id));
        const outcomes = data.outcomes.filter((o) =>
          initiatives.some((i) => i.id === o.initiativeId),
        );
        const health = programHealth(progressAvg, openRisk);

        return (
          <GovernanceCard
            key={program.id}
            title={program.name}
            description={program.description}
            action={
              <div className="flex items-center gap-2">
                <Badge variant={healthTone(health.tone)}>{health.label}</Badge>
                <StatusBadge status={program.status} />
              </div>
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-secondary-text">
                {program.code} · Owner: {ownerName(data, program.ownerId)} · Window{" "}
                {new Date(program.startDate).toLocaleDateString()} →{" "}
                {new Date(program.targetDate).toLocaleDateString()}
              </p>
              <WorkflowControls
                entityType="program"
                entityId={program.id}
                status={program.status}
                onTransition={transitionEntity}
              />
            </div>

            <div className="mt-3 flex items-center gap-2">
              <ProgressBar value={progressAvg} />
              <span className="text-xs tabular-nums text-secondary-text">{progressAvg}% avg</span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-md border border-border p-3">
                <p className="flex items-center gap-1 text-xs font-semibold text-primary-text">
                  <Boxes className="size-3" /> Initiatives ({initiatives.length})
                </p>
                <ul className="mt-2 space-y-2">
                  {initiatives.map((initiative) => (
                    <li key={initiative.id} className="text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-primary-text">{initiative.name}</span>
                        <StatusBadge status={initiative.status} />
                      </div>
                      <ProgressBar className="mt-1" value={initiativeProgress(initiative)} />
                    </li>
                  ))}
                  {initiatives.length === 0 ? <li className="text-xs text-secondary-text">None</li> : null}
                </ul>
              </div>

              <div className="rounded-md border border-border p-3">
                <p className="flex items-center gap-1 text-xs font-semibold text-primary-text">
                  <ShieldAlert className="size-3" /> Risks ({risks.length})
                </p>
                <ul className="mt-2 space-y-2">
                  {risks.map((risk) => (
                    <li key={risk.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-primary-text">{risk.title}</span>
                      <Badge variant={risk.score >= 12 ? "danger" : risk.score >= 8 ? "warning" : "secondary"}>
                        {risk.score}
                      </Badge>
                    </li>
                  ))}
                  {risks.length === 0 ? <li className="text-xs text-secondary-text">None</li> : null}
                </ul>
                <p className="mt-2 text-xs text-secondary-text">Open exposure: {openRisk}</p>
              </div>

              <div className="rounded-md border border-border p-3">
                <p className="flex items-center gap-1 text-xs font-semibold text-primary-text">
                  <GitBranch className="size-3" /> Dependencies ({dependencies.length})
                </p>
                <ul className="mt-2 space-y-2">
                  {dependencies.map((dependency) => (
                    <li key={dependency.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-primary-text">
                        {dependency.fromId} {dependency.type} {dependency.toId}
                      </span>
                      <Badge variant={dependency.status === "satisfied" ? "default" : "warning"}>
                        {dependency.status}
                      </Badge>
                    </li>
                  ))}
                  {dependencies.length === 0 ? <li className="text-xs text-secondary-text">None</li> : null}
                </ul>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-md border border-border p-3">
                <p className="text-xs font-semibold text-primary-text">Program KPIs</p>
                <ul className="mt-2 space-y-1">
                  {kpis.map((kpi) => (
                    <li key={kpi.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-primary-text">{kpi.name}</span>
                      <span className="tabular-nums text-secondary-text">
                        {kpi.current}
                        {kpi.unit} / {kpi.target}
                        {kpi.unit}
                      </span>
                    </li>
                  ))}
                  {kpis.length === 0 ? <li className="text-xs text-secondary-text">None</li> : null}
                </ul>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs font-semibold text-primary-text">Outcomes</p>
                <ul className="mt-2 space-y-1">
                  {outcomes.map((outcome) => (
                    <li key={outcome.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-primary-text">{outcome.metric}</span>
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
                    </li>
                  ))}
                  {outcomes.length === 0 ? <li className="text-xs text-secondary-text">None</li> : null}
                </ul>
              </div>
            </div>
          </GovernanceCard>
        );
      })}
    </div>
  );
}
