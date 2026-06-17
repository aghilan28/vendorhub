"use client";

import { useEffect, useMemo, useState } from "react";
import { useSecisStore } from "@/store/secis-store";
import {
  analyzeChange,
  buildAdjacency,
  can,
  influenceReach,
  type ChangeEvent,
  type ImpactAssessment,
  type ImpactDimension,
  type Permission,
  type PropagationResult,
  type RiskAssessment,
} from "@/lib/secis";

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

export function useCurrentUser() {
  return useSecisStore((s) => s.users.find((u) => u.id === s.currentUserId) ?? s.users[0]);
}

export function usePermission(permission: Permission): boolean {
  const user = useCurrentUser();
  return can(user, permission);
}

export interface ChangeAnalysis {
  event: ChangeEvent;
  propagation: PropagationResult;
  impact: ImpactAssessment;
  risk: RiskAssessment;
}

export function useChangeAnalysis(eventId: string | undefined): ChangeAnalysis | null {
  const event = useSecisStore((s) => s.changeEvents.find((e) => e.id === eventId));
  const entities = useSecisStore((s) => s.entities);
  const edges = useSecisStore((s) => s.edges);
  const settings = useSecisStore((s) => s.settings);
  return useMemo(() => {
    if (!event) return null;
    const { propagation, impact, risk } = analyzeChange(event, entities, edges, { severityThreshold: settings.severityThreshold, maxDepth: settings.maxDepth });
    return { event, propagation, impact, risk };
  }, [event, entities, edges, settings]);
}

const ALL_DIMENSIONS: ImpactDimension[] = ["operational", "financial", "inventory", "demand", "supply", "delivery", "customer", "marketplace"];

export interface SecisAnalytics {
  systems: number;
  entities: number;
  edges: number;
  dependencyEdges: number;
  criticalEntities: number;
  singlePointsOfFailure: number;
  dependencyHealth: number; // 0..100
  activeEvents: number;
  analyzedEvents: number;
  eventsByState: Array<{ state: string; count: number }>;
  totalRuns: number;
  completedRuns: number;
  runningRuns: number;
  avgResilience: number;
  recommendations: number;
  acceptedRecommendations: number;
  portfolioRiskScore: number;
  portfolioRiskLevel: string;
  totalRevenueAtRiskMax: number;
  riskByEvent: Array<{ id: string; name: string; score: number; level: string; affected: number }>;
  impactByDimension: Array<{ dimension: ImpactDimension; score: number }>;
  decisions: number;
  mitigations: number;
}

export function useSecisAnalytics(): SecisAnalytics {
  const systems = useSecisStore((s) => s.systems);
  const entities = useSecisStore((s) => s.entities);
  const edges = useSecisStore((s) => s.edges);
  const changeEvents = useSecisStore((s) => s.changeEvents);
  const evolutionRuns = useSecisStore((s) => s.evolutionRuns);
  const recommendations = useSecisStore((s) => s.recommendations);
  const decisions = useSecisStore((s) => s.decisions);
  const mitigations = useSecisStore((s) => s.mitigations);
  const settings = useSecisStore((s) => s.settings);

  return useMemo(() => {
    const activeEntities = entities.filter((e) => e.status === "active");
    const adj = buildAdjacency(edges);
    const criticalEntities = activeEntities.filter((e) => e.criticality >= 0.8);
    const spof = criticalEntities.filter((e) => influenceReach(e.id, adj) >= 3).length;
    const avgVuln = activeEntities.length ? activeEntities.reduce((s, e) => s + e.vulnerability, 0) / activeEntities.length : 0;
    const dependencyHealth = Math.round(Math.max(0, Math.min(100, 100 - spof * 11 - avgVuln * 28)));

    const activeEvents = changeEvents.filter((e) => e.status === "active");
    const settingsLite = { severityThreshold: settings.severityThreshold, maxDepth: settings.maxDepth };
    const analyses = activeEvents.map((e) => ({ event: e, ...analyzeChange(e, entities, edges, settingsLite) }));

    const riskByEvent = analyses
      .map((a) => ({ id: a.event.id, name: a.event.name, score: a.risk.score, level: a.risk.level as string, affected: a.propagation.affected.length }))
      .sort((a, b) => b.score - a.score);

    const portfolioRiskScore = riskByEvent.length ? Math.max(...riskByEvent.map((r) => r.score)) : 0;
    const portfolioRiskLevel = portfolioRiskScore >= 78 ? "critical" : portfolioRiskScore >= 55 ? "high" : portfolioRiskScore >= 30 ? "medium" : "low";
    const totalRevenueAtRiskMax = analyses.length ? Math.max(...analyses.map((a) => a.propagation.totalRevenueAtRisk)) : 0;

    const dimAgg = new Map<ImpactDimension, number>();
    for (const dim of ALL_DIMENSIONS) dimAgg.set(dim, 0);
    for (const a of analyses) {
      for (const d of a.impact.dimensions) dimAgg.set(d.dimension, Math.max(dimAgg.get(d.dimension)!, d.score));
    }

    const completed = evolutionRuns.filter((r) => r.status === "completed" && r.result);
    const avgResilience = completed.length ? Math.round(completed.reduce((s, r) => s + (r.result?.resilienceScore ?? 0), 0) / completed.length) : 0;

    const stateOrder = ["draft", "review", "approved", "running", "completed", "archived"];
    const eventsByState = stateOrder.map((state) => ({ state, count: changeEvents.filter((e) => e.workflowState === state).length }));

    return {
      systems: systems.filter((s) => s.status === "active").length,
      entities: activeEntities.length,
      edges: edges.length,
      dependencyEdges: edges.filter((e) => e.category === "dependency").length,
      criticalEntities: criticalEntities.length,
      singlePointsOfFailure: spof,
      dependencyHealth,
      activeEvents: activeEvents.length,
      analyzedEvents: changeEvents.filter((e) => e.lastAnalyzedAt).length,
      eventsByState,
      totalRuns: evolutionRuns.length,
      completedRuns: completed.length,
      runningRuns: evolutionRuns.filter((r) => r.status === "running" || r.status === "paused").length,
      avgResilience,
      recommendations: recommendations.length,
      acceptedRecommendations: recommendations.filter((r) => r.accepted).length,
      portfolioRiskScore,
      portfolioRiskLevel,
      totalRevenueAtRiskMax,
      riskByEvent,
      impactByDimension: ALL_DIMENSIONS.map((dimension) => ({ dimension, score: dimAgg.get(dimension)! })).sort((a, b) => b.score - a.score),
      decisions: decisions.length,
      mitigations: mitigations.length,
    };
  }, [systems, entities, edges, changeEvents, evolutionRuns, recommendations, decisions, mitigations, settings]);
}
