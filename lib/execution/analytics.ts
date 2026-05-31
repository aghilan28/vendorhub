// KARTEX M8 — Execution Analytics (Sections M8.3, M8.8, M8.12)
// Pure, deterministic aggregations over an ExecutionDataset. Powers the
// Command Center, Outcome Tracking and Execution Analytics dashboards.

import { computeKpiAttainment } from "./factory";
import { isActive, isOpen } from "./workflow";
import type { ExecutionDataset, KPI, Owner, Tone } from "./types";

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return round((part / total) * 100, 1);
}

export interface ExecutionHealth {
  score: number; // 0..100
  tone: Tone;
  label: string;
  detail: string;
}

export interface ExecutionCounts {
  programs: number;
  activePrograms: number;
  initiatives: number;
  activeInitiatives: number;
  projects: number;
  activeProjects: number;
  openActions: number;
  blockedActions: number;
  escalations: number;
  openEscalations: number;
  pendingDecisions: number;
}

export interface OutcomeSummary {
  tracked: number;
  achieved: number;
  partial: number;
  missed: number;
  pending: number;
  successRate: number; // %
  failureRate: number; // %
  averageVariance: number; // % deviation of actual vs expected
  averageAttainment: number; // %
}

export interface KpiSummary {
  total: number;
  onTrack: number;
  atRisk: number;
  offTrack: number;
  averageAttainment: number; // %
}

export interface OwnerPerformance {
  ownerId: string;
  name: string;
  assigned: number;
  completed: number;
  blocked: number;
  completionRate: number; // %
}

export interface ExecutionAnalytics {
  completionRate: number; // % of action plans completed
  executionVelocity: number; // completed tasks / total tasks * 100
  initiativeSuccessRate: number; // % initiatives completed of those finished+active
  programSuccessRate: number;
  kpiPerformance: number; // avg KPI attainment %
  ownerPerformance: OwnerPerformance[];
  riskExposure: number; // sum of open risk scores
  riskTrend: Tone;
}

export interface ExecutionSnapshot {
  generatedAt: string;
  health: ExecutionHealth;
  counts: ExecutionCounts;
  outcomes: OutcomeSummary;
  kpis: KpiSummary;
  analytics: ExecutionAnalytics;
}

export function summariseKpi(kpi: KPI): number {
  return computeKpiAttainment(kpi.current, kpi.target, kpi.direction);
}

export function computeCounts(data: ExecutionDataset): ExecutionCounts {
  return {
    programs: data.programs.length,
    activePrograms: data.programs.filter((p) => isActive(p.status)).length,
    initiatives: data.initiatives.length,
    activeInitiatives: data.initiatives.filter((i) => isActive(i.status)).length,
    projects: data.projects.length,
    activeProjects: data.projects.filter((p) => isActive(p.status)).length,
    openActions: data.actionPlans.filter((a) => isOpen(a.status)).length,
    blockedActions: data.actionPlans.filter((a) => a.status === "blocked").length,
    escalations: data.escalations.length,
    openEscalations: data.escalations.filter((e) => e.status !== "resolved").length,
    pendingDecisions: data.decisions.filter((d) => d.status !== "activated").length,
  };
}

export function computeOutcomeSummary(data: ExecutionDataset): OutcomeSummary {
  const tracked = data.outcomes.length;
  const recorded = data.outcomes.filter((o) => o.actual !== null);
  const achieved = data.outcomes.filter((o) => o.status === "achieved").length;
  const partial = data.outcomes.filter((o) => o.status === "partial").length;
  const missed = data.outcomes.filter((o) => o.status === "missed").length;
  const pending = data.outcomes.filter((o) => o.status === "pending").length;

  const variances = recorded.map((o) =>
    o.expected === 0 ? 0 : Math.abs(((o.actual as number) - o.expected) / o.expected) * 100,
  );
  const attainments = recorded.map((o) =>
    o.expected === 0 ? 100 : Math.min(150, ((o.actual as number) / o.expected) * 100),
  );

  return {
    tracked,
    achieved,
    partial,
    missed,
    pending,
    successRate: pct(achieved, recorded.length),
    failureRate: pct(missed, recorded.length),
    averageVariance: variances.length
      ? round(variances.reduce((a, b) => a + b, 0) / variances.length, 1)
      : 0,
    averageAttainment: attainments.length
      ? round(attainments.reduce((a, b) => a + b, 0) / attainments.length, 1)
      : 0,
  };
}

export function computeKpiSummary(data: ExecutionDataset): KpiSummary {
  const total = data.kpis.length;
  const attainments = data.kpis.map((k) => summariseKpi(k));
  return {
    total,
    onTrack: data.kpis.filter((k) => k.status === "on_track").length,
    atRisk: data.kpis.filter((k) => k.status === "at_risk").length,
    offTrack: data.kpis.filter((k) => k.status === "off_track").length,
    averageAttainment: total
      ? round((attainments.reduce((a, b) => a + b, 0) / total) * 100, 1)
      : 0,
  };
}

export function computeOwnerPerformance(data: ExecutionDataset): OwnerPerformance[] {
  return data.owners
    .map((owner: Owner) => {
      const assigned = data.actionPlans.filter((a) => a.ownerId === owner.id);
      const completed = assigned.filter((a) => a.status === "completed").length;
      const blocked = assigned.filter((a) => a.status === "blocked").length;
      return {
        ownerId: owner.id,
        name: owner.name,
        assigned: assigned.length,
        completed,
        blocked,
        completionRate: pct(completed, assigned.length),
      };
    })
    .filter((o) => o.assigned > 0)
    .sort((a, b) => b.completionRate - a.completionRate);
}

export function computeAnalytics(data: ExecutionDataset): ExecutionAnalytics {
  const totalActions = data.actionPlans.length;
  const completedActions = data.actionPlans.filter((a) => a.status === "completed").length;
  const totalTasks = data.tasks.length;
  const completedTasks = data.tasks.filter((t) => t.completed).length;

  const finishedInitiatives = data.initiatives.filter(
    (i) => i.status === "completed" || i.status === "archived",
  ).length;
  const succeededInitiatives = data.initiatives.filter((i) => i.status === "completed").length;
  const finishedPrograms = data.programs.filter(
    (p) => p.status === "completed" || p.status === "archived",
  ).length;
  const succeededPrograms = data.programs.filter((p) => p.status === "completed").length;

  const openRiskScore = data.risks
    .filter((r) => r.status !== "closed")
    .reduce((sum, r) => sum + r.score, 0);

  const kpiSummary = computeKpiSummary(data);

  const riskTrend: Tone =
    openRiskScore >= 30
      ? "critical"
      : openRiskScore >= 20
        ? "degraded"
        : openRiskScore >= 10
          ? "watch"
          : "healthy";

  return {
    completionRate: pct(completedActions, totalActions),
    executionVelocity: pct(completedTasks, totalTasks),
    initiativeSuccessRate: finishedInitiatives
      ? pct(succeededInitiatives, finishedInitiatives)
      : round(
          data.initiatives.reduce((s, i) => s + i.progress, 0) /
            Math.max(1, data.initiatives.length),
          1,
        ),
    programSuccessRate: finishedPrograms ? pct(succeededPrograms, finishedPrograms) : 0,
    kpiPerformance: kpiSummary.averageAttainment,
    ownerPerformance: computeOwnerPerformance(data),
    riskExposure: openRiskScore,
    riskTrend,
  };
}

export function computeHealth(data: ExecutionDataset): ExecutionHealth {
  const counts = computeCounts(data);
  const kpiSummary = computeKpiSummary(data);
  const analytics = computeAnalytics(data);

  // Weighted health: KPI attainment, action throughput, escalation/risk pressure.
  const kpiScore = Math.min(100, kpiSummary.averageAttainment);
  const throughputScore =
    counts.activeInitiatives > 0
      ? Math.min(
          100,
          round(
            data.initiatives.reduce((s, i) => s + i.progress, 0) /
              Math.max(1, data.initiatives.length),
            1,
          ),
        )
      : 50;
  const escalationPenalty = counts.openEscalations * 6;
  const blockedPenalty = counts.blockedActions * 5;
  const riskPenalty = Math.min(25, analytics.riskExposure / 2);

  const raw =
    kpiScore * 0.4 +
    throughputScore * 0.4 +
    25 -
    escalationPenalty * 0.4 -
    blockedPenalty * 0.4 -
    riskPenalty * 0.2;
  const score = Math.max(0, Math.min(100, round(raw, 0)));

  const tone: Tone =
    score >= 80 ? "healthy" : score >= 65 ? "watch" : score >= 45 ? "degraded" : "critical";
  const label =
    tone === "healthy"
      ? "Execution healthy"
      : tone === "watch"
        ? "Execution needs attention"
        : tone === "degraded"
          ? "Execution degraded"
          : "Execution critical";

  return {
    score,
    tone,
    label,
    detail: `${counts.activeInitiatives} active initiatives, ${counts.openActions} open actions, ${counts.openEscalations} open escalations, KPI attainment ${kpiSummary.averageAttainment}%.`,
  };
}

/** Builds the complete execution snapshot consumed by dashboards and the API. */
export function buildExecutionSnapshot(
  data: ExecutionDataset,
  generatedAt = new Date().toISOString(),
): ExecutionSnapshot {
  return {
    generatedAt,
    health: computeHealth(data),
    counts: computeCounts(data),
    outcomes: computeOutcomeSummary(data),
    kpis: computeKpiSummary(data),
    analytics: computeAnalytics(data),
  };
}
