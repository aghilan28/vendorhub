// KARTEX M4 — SECIS engine. Browser-safe, deterministic change-impact analysis:
// propagation across the dependency graph, multi-dimensional impact, risk
// scoring, and evolution/recovery simulation with interventions.

import { buildAdjacency } from "./graph";
import type {
  ChangeEvent,
  DimensionImpact,
  EntityKind,
  EvolutionResult,
  ImpactAssessment,
  ImpactDimension,
  ImpactEvent,
  Intervention,
  PropagationPath,
  PropagationResult,
  RiskAssessment,
  RiskEvent,
  RiskLevel,
  SecisEdge,
  SecisEntity,
  SecisSettings,
} from "./types";

// ── Formatters (INR) ─────────────────────────────────────────────────────────

export function round(value: number, digits = 2) {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
export function formatNumber(v: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(v));
}
export function formatCompact(v: number) {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(v);
}
export function formatCurrency(v: number) {
  return `₹${formatNumber(v)}`;
}
export function formatCurrencyCompact(v: number) {
  return `₹${formatCompact(v)}`;
}
export function formatPercent(v: number, digits = 0) {
  return `${round(v, digits)}%`;
}

function clamp(v: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, v));
}

export function deterministicSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function riskLevelFromScore(score: number): RiskLevel {
  return score >= 78 ? "critical" : score >= 55 ? "high" : score >= 30 ? "medium" : "low";
}

// ── Kind → impact-dimension affinity ─────────────────────────────────────────

const KIND_DIMENSIONS: Record<EntityKind, Partial<Record<ImpactDimension, number>>> = {
  supplier: { supply: 1, inventory: 0.6, operational: 0.5, financial: 0.4 },
  warehouse: { inventory: 1, operational: 0.7, supply: 0.5, delivery: 0.4 },
  inventory_node: { inventory: 1, operational: 0.6, supply: 0.5 },
  dark_store: { operational: 0.8, delivery: 0.6, inventory: 0.6, customer: 0.5 },
  store: { operational: 0.8, customer: 0.6, delivery: 0.4, marketplace: 0.4 },
  product: { demand: 0.8, inventory: 0.6, financial: 0.6, marketplace: 0.6 },
  category: { demand: 0.8, marketplace: 0.7, financial: 0.5 },
  courier: { delivery: 1, operational: 0.6, customer: 0.6 },
  delivery_zone: { delivery: 0.9, customer: 0.7, operational: 0.5 },
  customer_segment: { customer: 1, demand: 0.8, marketplace: 0.6 },
  payment_gateway: { financial: 1, operational: 0.6, customer: 0.5 },
  pricing_engine: { financial: 0.9, demand: 0.7, marketplace: 0.6 },
  marketing_channel: { demand: 0.9, marketplace: 0.8, customer: 0.6 },
};

const KIND_RISK_CATEGORY: Record<EntityKind, RiskEvent["category"]> = {
  supplier: "dependency",
  warehouse: "operational",
  inventory_node: "operational",
  dark_store: "operational",
  store: "operational",
  product: "financial",
  category: "financial",
  courier: "operational",
  delivery_zone: "operational",
  customer_segment: "propagation",
  payment_gateway: "financial",
  pricing_engine: "financial",
  marketing_channel: "propagation",
};

const DIMENSION_LABELS: Record<ImpactDimension, string> = {
  operational: "Operational",
  financial: "Financial",
  inventory: "Inventory",
  demand: "Demand",
  supply: "Supply",
  delivery: "Delivery",
  customer: "Customer",
  marketplace: "Marketplace",
};

const ALL_DIMENSIONS: ImpactDimension[] = ["operational", "financial", "inventory", "demand", "supply", "delivery", "customer", "marketplace"];

// Per-hop decay so propagation always terminates.
const HOP_DECAY = 0.82;

// ── Propagation ──────────────────────────────────────────────────────────────

export function propagate(
  changeEvent: Pick<ChangeEvent, "originEntityId" | "magnitude" | "horizonPeriods">,
  entities: SecisEntity[],
  edges: SecisEdge[],
  settings: Pick<SecisSettings, "severityThreshold" | "maxDepth">,
): PropagationResult {
  const entityMap = new Map(entities.map((e) => [e.id, e]));
  const adj = buildAdjacency(edges);
  const threshold = settings.severityThreshold;
  const maxDepth = settings.maxDepth;

  interface State {
    severity: number;
    depth: number;
    period: number;
    path: string[];
    edgeTypes: SecisEdge["type"][];
  }

  const best = new Map<string, State>();
  const origin = entityMap.get(changeEvent.originEntityId);
  if (!origin) {
    return {
      originEntityId: changeEvent.originEntityId,
      affected: [],
      paths: [],
      affectedSystemIds: [],
      maxDepth: 0,
      totalRevenueAtRisk: 0,
      timeline: [],
    };
  }

  best.set(origin.id, { severity: clamp(changeEvent.magnitude), depth: 0, period: 0, path: [origin.id], edgeTypes: [] });
  const queue: string[] = [origin.id];

  while (queue.length) {
    const id = queue.shift()!;
    const state = best.get(id)!;
    if (state.depth >= maxDepth) continue;
    for (const edge of adj.downstream.get(id) ?? []) {
      const target = entityMap.get(edge.targetId);
      if (!target || target.status !== "active") continue;
      const childSeverity = clamp(state.severity * edge.weight * (0.5 + target.vulnerability * 0.5) * HOP_DECAY);
      if (childSeverity < threshold) continue;
      const arrival = state.period + Math.max(1, Math.round((1 - edge.weight) * 2) + 1);
      const existing = best.get(target.id);
      if (!existing || childSeverity > existing.severity) {
        best.set(target.id, {
          severity: childSeverity,
          depth: state.depth + 1,
          period: arrival,
          path: [...state.path, target.id],
          edgeTypes: [...state.edgeTypes, edge.type],
        });
        queue.push(target.id);
      }
    }
  }

  const affected: ImpactEvent[] = [];
  const paths: PropagationPath[] = [];
  const systemIds = new Set<string>();
  let totalRevenueAtRisk = 0;

  for (const [id, state] of best.entries()) {
    const entity = entityMap.get(id)!;
    const revenueAtRisk = round(state.severity * entity.monthlyRevenueExposure);
    totalRevenueAtRisk += revenueAtRisk;
    systemIds.add(entity.systemId);
    affected.push({
      entityId: id,
      entityName: entity.name,
      entityKind: entity.kind,
      systemId: entity.systemId,
      depth: state.depth,
      severity: round(state.severity, 3),
      arrivalPeriod: state.period,
      revenueAtRisk,
    });
    if (state.depth > 0) {
      paths.push({
        nodeIds: state.path,
        labels: state.path.map((nid) => entityMap.get(nid)?.name ?? nid),
        edgeTypes: state.edgeTypes,
        terminalSeverity: round(state.severity, 3),
      });
    }
  }

  affected.sort((a, b) => b.severity - a.severity);
  paths.sort((a, b) => b.terminalSeverity - a.terminalSeverity);

  // Timeline: cumulative severity reaching the network over periods.
  const maxPeriod = Math.max(changeEvent.horizonPeriods, ...affected.map((a) => a.arrivalPeriod), 1);
  const timeline: PropagationResult["timeline"] = [];
  for (let p = 0; p <= maxPeriod; p += 1) {
    const arrivedByNow = affected.filter((a) => a.arrivalPeriod <= p);
    const newly = affected.filter((a) => a.arrivalPeriod === p).length;
    timeline.push({
      period: p,
      cumulativeSeverity: round(arrivedByNow.reduce((s, a) => s + a.severity, 0), 3),
      newlyAffected: newly,
    });
  }

  return {
    originEntityId: origin.id,
    affected,
    paths,
    affectedSystemIds: [...systemIds],
    maxDepth: Math.max(...affected.map((a) => a.depth), 0),
    totalRevenueAtRisk: round(totalRevenueAtRisk),
    timeline,
  };
}

// ── Impact assessment ────────────────────────────────────────────────────────

export function assessImpact(changeEvent: ChangeEvent, propagation: PropagationResult, entities: SecisEntity[]): ImpactAssessment {
  const entityMap = new Map(entities.map((e) => [e.id, e]));
  const raw = new Map<ImpactDimension, number>();
  for (const dim of ALL_DIMENSIONS) raw.set(dim, 0);

  for (const impact of propagation.affected) {
    const entity = entityMap.get(impact.entityId);
    if (!entity) continue;
    const dims = KIND_DIMENSIONS[entity.kind] ?? {};
    for (const dim of ALL_DIMENSIONS) {
      const weight = dims[dim] ?? 0;
      if (weight <= 0) continue;
      raw.set(dim, raw.get(dim)! + impact.severity * weight * (0.5 + entity.criticality * 0.5));
    }
  }

  // Normalise: divide by a soft scale so a broad, severe event approaches 100.
  const scale = Math.max(1.5, propagation.affected.length * 0.35);
  const dimensions: DimensionImpact[] = ALL_DIMENSIONS.map((dim) => {
    const score = Math.round(clamp(raw.get(dim)! / scale) * 100);
    const level = riskLevelFromScore(score);
    let value: string;
    if (dim === "financial") {
      value = formatCurrencyCompact(propagation.totalRevenueAtRisk);
    } else {
      value = formatPercent(score);
    }
    return { dimension: dim, label: DIMENSION_LABELS[dim], score, value, level, detail: dimensionDetail(dim, score, propagation) };
  }).sort((a, b) => b.score - a.score);

  const top = dimensions[0];
  return {
    changeEventId: changeEvent.id,
    headlineValue: formatCurrencyCompact(propagation.totalRevenueAtRisk),
    totalRevenueAtRisk: propagation.totalRevenueAtRisk,
    affectedEntities: propagation.affected.length,
    affectedSystems: propagation.affectedSystemIds.length,
    dimensions,
    outcomeSummary: `The event reaches ${propagation.affected.length} entities across ${propagation.affectedSystemIds.length} systems (depth ${propagation.maxDepth}), exposing ${formatCurrency(propagation.totalRevenueAtRisk)}/month. The dominant impact is ${top.label.toLowerCase()} (${top.score}/100).`,
  };
}

function dimensionDetail(dim: ImpactDimension, score: number, propagation: PropagationResult): string {
  if (dim === "financial") return `${formatCurrency(propagation.totalRevenueAtRisk)} of monthly revenue exposed.`;
  const band = score >= 78 ? "critical" : score >= 55 ? "high" : score >= 30 ? "moderate" : "low";
  return `${band} ${dim} impact across the affected network.`;
}

// ── Risk assessment ──────────────────────────────────────────────────────────

export function assessRisk(changeEvent: ChangeEvent, propagation: PropagationResult, impact: ImpactAssessment, entities: SecisEntity[]): RiskAssessment {
  const entityMap = new Map(entities.map((e) => [e.id, e]));
  const events: RiskEvent[] = propagation.affected
    .filter((a) => a.depth > 0 || a.severity > 0.4)
    .slice(0, 12)
    .map((a) => {
      const entity = entityMap.get(a.entityId)!;
      const score = Math.round(clamp(a.severity * (0.55 + entity.criticality * 0.45)) * 100);
      return {
        id: `risk_${changeEvent.id}_${a.entityId}`,
        entityId: a.entityId,
        entityName: a.entityName,
        label: `${a.entityName} exposure`,
        level: riskLevelFromScore(score),
        score,
        category: KIND_RISK_CATEGORY[entity.kind],
        detail: `Severity ${formatPercent(a.severity * 100)} arriving at depth ${a.depth} (period ${a.arrivalPeriod}).`,
      };
    })
    .sort((a, b) => b.score - a.score);

  const affectedRatio = entities.length ? propagation.affected.length / entities.length : 0;
  const financialNorm = clamp(propagation.totalRevenueAtRisk / 5_000_000);
  const topDim = impact.dimensions[0]?.score ?? 0;
  const criticalInvolved = propagation.affected.some((a) => (entityMap.get(a.entityId)?.criticality ?? 0) >= 0.8 && a.severity >= 0.4);

  const overall = Math.round(clamp(0.38 * (topDim / 100) + 0.27 * affectedRatio + 0.25 * financialNorm + (criticalInvolved ? 0.1 : 0)) * 100);

  const factors: RiskAssessment["factors"] = [
    { label: "Blast radius", level: riskLevelFromScore(affectedRatio * 100 * 1.6), detail: `${propagation.affected.length} of ${entities.length} entities affected (depth ${propagation.maxDepth}).` },
    { label: "Financial exposure", level: riskLevelFromScore(financialNorm * 100), detail: `${formatCurrency(propagation.totalRevenueAtRisk)}/month at risk.` },
    { label: "Critical-node involvement", level: criticalInvolved ? "high" : "low", detail: criticalInvolved ? "A high-criticality node is materially affected." : "No critical node is severely affected." },
  ];

  return { changeEventId: changeEvent.id, level: riskLevelFromScore(overall), score: overall, events, factors };
}

// ── Evolution / recovery simulation ──────────────────────────────────────────

export function runEvolution(
  changeEvent: ChangeEvent,
  propagation: PropagationResult,
  impact: ImpactAssessment,
  interventions: Intervention[],
  entities: SecisEntity[],
): EvolutionResult {
  const entityMap = new Map(entities.map((e) => [e.id, e]));
  const horizon = Math.max(6, changeEvent.horizonPeriods);
  const peakSeverity = Math.max(0.05, ...propagation.affected.map((a) => a.severity));

  // Average resilience of affected nodes drives baseline recovery rate.
  const affectedEntities = propagation.affected.map((a) => entityMap.get(a.entityId)).filter(Boolean) as SecisEntity[];
  const avgResilience = affectedEntities.length ? affectedEntities.reduce((s, e) => s + e.resilience, 0) / affectedEntities.length : 0.4;

  const severityReduction = clamp(interventions.reduce((s, i) => s + i.severityReduction, 0), 0, 0.85);
  const recoveryBoost = clamp(interventions.reduce((s, i) => s + i.recoveryBoost, 0), 0, 0.85);
  const interventionCost = interventions.reduce((s, i) => s + i.cost, 0);

  const baseRecovery = 0.12 + avgResilience * 0.18; // per-period recovery fraction
  const boostedRecovery = clamp(baseRecovery * (1 + recoveryBoost), 0, 0.95);

  const shockPeriod = 1;
  const baselineSeries: EvolutionResult["baselineSeries"] = [];
  const interventionSeries: EvolutionResult["interventionSeries"] = [];
  const severitySeries: EvolutionResult["severitySeries"] = [];

  let baseHealth = 100;
  let intvHealth = 100;
  const baseDrop = peakSeverity * 70; // health points lost at peak (no action)
  const intvDrop = peakSeverity * (1 - severityReduction) * 70;

  let baselineRecoveryPeriod = horizon;
  let interventionRecoveryPeriod = horizon;

  for (let p = 0; p <= horizon; p += 1) {
    const sev = p < shockPeriod ? 0 : peakSeverity * Math.exp(-(p - shockPeriod) * (0.2 + avgResilience * 0.15));
    severitySeries.push({ x: p, y: round(sev, 3) });

    if (p === shockPeriod) {
      baseHealth = 100 - baseDrop;
      intvHealth = 100 - intvDrop;
    } else if (p > shockPeriod) {
      baseHealth = baseHealth + (100 - baseHealth) * baseRecovery;
      intvHealth = intvHealth + (100 - intvHealth) * boostedRecovery;
    }
    baselineSeries.push({ x: p, y: round(baseHealth, 1) });
    interventionSeries.push({ x: p, y: round(intvHealth, 1) });
    if (baselineRecoveryPeriod === horizon && p >= shockPeriod && baseHealth >= 95) baselineRecoveryPeriod = p;
    if (interventionRecoveryPeriod === horizon && p >= shockPeriod && intvHealth >= 95) interventionRecoveryPeriod = p;
  }

  // Loss area = integral of (100 - health) — proportional to lost value.
  const baseLossArea = baselineSeries.reduce((s, pt) => s + (100 - pt.y), 0);
  const intvLossArea = interventionSeries.reduce((s, pt) => s + (100 - pt.y), 0);
  const avoidedFraction = baseLossArea > 0 ? clamp((baseLossArea - intvLossArea) / baseLossArea) : 0;
  const avoidedLoss = round(propagation.totalRevenueAtRisk * avoidedFraction);
  const residualImpactPct = round(100 - interventionSeries[interventionSeries.length - 1].y, 1);
  const resilienceScore = Math.round(
    clamp(0.4 * (1 - residualImpactPct / 100) + 0.3 * (1 - interventionRecoveryPeriod / horizon) + 0.3 * avoidedFraction) * 100,
  );

  const evolutionEvents: EvolutionResult["evolutionEvents"] = [
    { period: shockPeriod, label: `${changeEvent.name} hits the network`, kind: "shock" },
  ];
  if (interventions.length > 0) {
    evolutionEvents.push({ period: shockPeriod, label: `${interventions.length} intervention(s) activated`, kind: "intervention" });
  }
  if (interventionRecoveryPeriod < horizon) {
    evolutionEvents.push({ period: interventionRecoveryPeriod, label: "Recovered to 95% health (with interventions)", kind: "recovery" });
  }
  if (baselineRecoveryPeriod < horizon) {
    evolutionEvents.push({ period: baselineRecoveryPeriod, label: "Recovered to 95% health (no action)", kind: "milestone" });
  }
  evolutionEvents.sort((a, b) => a.period - b.period);

  const kpis: EvolutionResult["kpis"] = [
    { key: "resilience", label: "Resilience score", value: resilienceScore, display: `${resilienceScore}/100`, tone: resilienceScore >= 70 ? "success" : resilienceScore >= 45 ? "warning" : "danger" },
    { key: "recovery_intv", label: "Recovery (with action)", value: interventionRecoveryPeriod, display: interventionRecoveryPeriod < horizon ? `P${interventionRecoveryPeriod}` : `>P${horizon}`, tone: "info" },
    { key: "recovery_base", label: "Recovery (no action)", value: baselineRecoveryPeriod, display: baselineRecoveryPeriod < horizon ? `P${baselineRecoveryPeriod}` : `>P${horizon}`, tone: "neutral" },
    { key: "residual", label: "Residual impact", value: residualImpactPct, display: formatPercent(residualImpactPct), tone: residualImpactPct <= 5 ? "success" : residualImpactPct <= 15 ? "warning" : "danger" },
    { key: "avoided", label: "Avoided loss", value: avoidedLoss, display: formatCurrencyCompact(avoidedLoss), tone: "success" },
    { key: "cost", label: "Intervention cost", value: interventionCost, display: formatCurrencyCompact(interventionCost), tone: "neutral" },
  ];

  const summary =
    interventions.length > 0
      ? `With ${interventions.length} intervention(s), the network recovers to 95% health by ${interventionRecoveryPeriod < horizon ? `period ${interventionRecoveryPeriod}` : `beyond the horizon`} (vs ${baselineRecoveryPeriod < horizon ? `period ${baselineRecoveryPeriod}` : `>${horizon}`} with no action), avoiding ${formatCurrency(avoidedLoss)} for ${formatCurrency(interventionCost)} in cost. Resilience score ${resilienceScore}/100.`
      : `With no action, the network recovers to 95% health by ${baselineRecoveryPeriod < horizon ? `period ${baselineRecoveryPeriod}` : `beyond the ${horizon}-period horizon`}, leaving ${formatPercent(residualImpactPct)} residual impact. Add interventions to model recovery.`;

  return {
    baselineSeries,
    interventionSeries,
    severitySeries,
    kpis,
    recoveryPeriodBaseline: baselineRecoveryPeriod,
    recoveryPeriodIntervention: interventionRecoveryPeriod,
    resilienceScore,
    residualImpactPct,
    avoidedLoss,
    interventionCost,
    evolutionEvents,
    outcomeSummary: summary,
  };
}

// Progress stages for live evolution runs.
export const RUN_STAGES: Array<{ at: number; message: string }> = [
  { at: 8, message: "Loading dependency graph" },
  { at: 22, message: "Propagating change across edges" },
  { at: 42, message: "Computing multi-dimensional impact" },
  { at: 60, message: "Scoring risk" },
  { at: 78, message: "Simulating evolution and recovery" },
  { at: 92, message: "Evaluating interventions" },
  { at: 100, message: "Run completed" },
];


// ── Composite analysis (propagation + impact + risk) ─────────────────────────

export function analyzeChange(
  changeEvent: ChangeEvent,
  entities: SecisEntity[],
  edges: SecisEdge[],
  settings: Pick<SecisSettings, "severityThreshold" | "maxDepth">,
): { propagation: PropagationResult; impact: ImpactAssessment; risk: RiskAssessment } {
  const propagation = propagate(changeEvent, entities, edges, settings);
  const impact = assessImpact(changeEvent, propagation, entities);
  const risk = assessRisk(changeEvent, propagation, impact, entities);
  return { propagation, impact, risk };
}
