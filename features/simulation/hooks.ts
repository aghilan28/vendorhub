"use client";

import { useEffect, useState } from "react";
import { useSimulationStore } from "@/store/simulation-store";
import { can, type Permission } from "@/lib/simulation";

// Guards against SSR/client hydration mismatch for persisted store data.
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

export function useCurrentUser() {
  return useSimulationStore((s) => s.users.find((u) => u.id === s.currentUserId) ?? s.users[0]);
}

export function usePermission(permission: Permission): boolean {
  const user = useCurrentUser();
  return can(user, permission);
}

export interface SimulationAnalytics {
  totalSimulations: number;
  activeSimulations: number;
  archivedSimulations: number;
  totalScenarios: number;
  activeScenarios: number;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  cancelledRuns: number;
  runningRuns: number;
  successRate: number;
  failureRate: number;
  avgRuntimeMs: number;
  scenarioCoverage: number; // % of scenarios that have at least one completed run
  totalInsights: number;
  totalRecommendations: number;
  acceptedRecommendations: number;
  recommendationAcceptance: number;
  totalDecisions: number;
  highImpactDecisions: number;
  runsByModel: Array<{ model: string; count: number }>;
  runsByCategory: Array<{ category: string; count: number }>;
  runsTrend: number[];
  pendingReviews: number;
  pendingApprovals: number;
}

const MODEL_LABELS: Record<string, string> = {
  market_adoption: "Market adoption",
  demand_forecast: "Demand forecast",
  revenue_projection: "Revenue projection",
  pricing_sensitivity: "Pricing",
  inventory_simulation: "Inventory",
  competitive_dynamics: "Competition",
};

export function useSimulationAnalytics(): SimulationAnalytics {
  return useSimulationStore((s) => {
    const activeSimulations = s.simulations.filter((x) => x.workflowState !== "archived");
    const activeScenarios = s.scenarios.filter((x) => x.status === "active");
    const completed = s.runs.filter((r) => r.status === "completed");
    const failed = s.runs.filter((r) => r.status === "failed");
    const cancelled = s.runs.filter((r) => r.status === "cancelled");
    const running = s.runs.filter((r) => r.status === "running" || r.status === "paused");
    const finished = completed.length + failed.length + cancelled.length;
    const coveredScenarios = new Set(completed.map((r) => r.scenarioId));

    const modelCounts = new Map<string, number>();
    const categoryCounts = new Map<string, number>();
    for (const r of s.runs) {
      modelCounts.set(r.modelKey, (modelCounts.get(r.modelKey) ?? 0) + 1);
      const sim = s.simulations.find((x) => x.id === r.simulationId);
      const cat = sim?.category ?? "Other";
      categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
    }

    // Bucket runs into 8 recency buckets for a trend sparkline.
    const buckets = new Array(8).fill(0);
    const sorted = [...s.runs].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
    sorted.forEach((r, i) => {
      const bucket = Math.min(7, Math.floor((i / Math.max(1, sorted.length)) * 8));
      buckets[bucket] += 1;
    });

    const acceptedRecs = s.recommendations.filter((r) => r.accepted).length;

    return {
      totalSimulations: s.simulations.length,
      activeSimulations: activeSimulations.length,
      archivedSimulations: s.simulations.length - activeSimulations.length,
      totalScenarios: s.scenarios.length,
      activeScenarios: activeScenarios.length,
      totalRuns: s.runs.length,
      completedRuns: completed.length,
      failedRuns: failed.length,
      cancelledRuns: cancelled.length,
      runningRuns: running.length,
      successRate: finished ? Math.round((completed.length / finished) * 100) : 0,
      failureRate: finished ? Math.round(((failed.length + cancelled.length) / finished) * 100) : 0,
      avgRuntimeMs: completed.length ? Math.round(completed.reduce((sum, r) => sum + r.runtimeMs, 0) / completed.length) : 0,
      scenarioCoverage: activeScenarios.length ? Math.round((coveredScenarios.size / activeScenarios.length) * 100) : 0,
      totalInsights: s.insights.length,
      totalRecommendations: s.recommendations.length,
      acceptedRecommendations: acceptedRecs,
      recommendationAcceptance: s.recommendations.length ? Math.round((acceptedRecs / s.recommendations.length) * 100) : 0,
      totalDecisions: s.decisions.length,
      highImpactDecisions: s.decisions.filter((d) => d.impact === "high").length,
      runsByModel: [...modelCounts.entries()].map(([model, count]) => ({ model: MODEL_LABELS[model] ?? model, count })).sort((a, b) => b.count - a.count),
      runsByCategory: [...categoryCounts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
      runsTrend: buckets,
      pendingReviews: s.reviews.filter((r) => r.decision === "pending").length,
      pendingApprovals: s.simulations.filter((x) => x.workflowState === "review").length,
    };
  });
}
