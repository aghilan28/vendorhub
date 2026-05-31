// MCP-0E.9/.10/.11 — Activation connectors.
// Recommendations become EXECUTION decisions/initiatives, GOVERNANCE risk
// signals + enforcement, or SIMULATION scenarios on the live fabric. This is
// what makes intelligence operable rather than isolated.

import { activateDecision, type ActionPlan, type Decision, type Initiative } from "@/lib/execution";
import {
  isReversibleEnforcement,
  recommendedEnforcement,
  type GovernanceEnforcementType,
  type GovernanceRiskSignalType,
  type RiskSignal,
} from "@/features/governance/trust-engine";
import { buildScenario, runMarketplaceScenario, type MarketplaceScenario, type MarketplaceScenarioKind, type ScenarioOutcome } from "./simulation";
import type { IntelligenceRecommendation, MarketplaceFabric, Severity } from "./types";

// ── Execution activation ──────────────────────────────────────────────────────

/** Build an execution Decision (source = "commerce") from a recommendation. */
export function recommendationToDecision(rec: IntelligenceRecommendation, now?: string): Decision {
  return {
    id: rec.id,
    title: rec.title,
    description: `${rec.detail} Recommended action: ${rec.action}`,
    source: "commerce",
    status: "approved",
    approvedBy: "commerce-intelligence",
    approvedAt: now ?? new Date().toISOString(),
    activatedInitiativeId: null,
    recommendedPriority: rec.priority,
  };
}

export interface ExecutionActivation {
  activation: "execution";
  recommendationId: string;
  decision: Decision;
  initiative: Initiative;
  actionPlan: ActionPlan;
}

/** Convert a recommendation into a live initiative + action plan. */
export function activateToExecution(rec: IntelligenceRecommendation, opts: { ownerId?: string | null; now?: string } = {}): ExecutionActivation {
  const decision = recommendationToDecision(rec, opts.now);
  const { initiative, actionPlan, decision: activated } = activateDecision(decision, opts);
  return { activation: "execution", recommendationId: rec.id, decision: activated, initiative, actionPlan };
}

// ── Governance activation ─────────────────────────────────────────────────────

function toGovSeverity(severity: Severity): RiskSignal["severity"] {
  if (severity === "critical") return "critical";
  if (severity === "warning") return "high";
  if (severity === "watch" || severity === "opportunity") return "medium";
  return "low";
}

function toSignalType(rec: IntelligenceRecommendation): GovernanceRiskSignalType {
  if (rec.kind === "trust_risk") return "REVIEW_MANIPULATION";
  if (rec.kind === "seller_risk") return "SELLER_MANIPULATION";
  return "MODERATION_HISTORY";
}

export interface GovernanceActivation {
  activation: "governance";
  recommendationId: string;
  signal: RiskSignal;
  enforcement: GovernanceEnforcementType;
  reversible: boolean;
}

/** Convert a trust/seller risk recommendation into a governance signal + enforcement. */
export function activateToGovernance(rec: IntelligenceRecommendation): GovernanceActivation {
  const signal: RiskSignal = {
    type: toSignalType(rec),
    score: Math.round(rec.score),
    severity: toGovSeverity(rec.severity),
    explanation: `${rec.title}: ${rec.detail}`,
  };
  const enforcement = recommendedEnforcement(signal);
  return { activation: "governance", recommendationId: rec.id, signal, enforcement, reversible: isReversibleEnforcement(enforcement) };
}

// ── Simulation activation ─────────────────────────────────────────────────────

function scenarioKindFor(rec: IntelligenceRecommendation): MarketplaceScenarioKind {
  if (rec.kind === "growth_opportunity") return "demand_surge";
  if (rec.kind === "promotion") return "promotion";
  if (rec.kind === "price_optimization") return "price_change";
  if (rec.kind === "stockout_risk") return "stockout_shock";
  return "growth_expansion";
}

export interface SimulationActivation {
  activation: "simulation";
  recommendationId: string;
  scenario: MarketplaceScenario;
  outcome: ScenarioOutcome;
}

/** Run a scenario derived from a recommendation against the live fabric. */
export function activateToSimulation(rec: IntelligenceRecommendation, fabric: MarketplaceFabric): SimulationActivation {
  const category = rec.scope === "category" ? rec.refId : undefined;
  const scenario = buildScenario(scenarioKindFor(rec), { category });
  const outcome = runMarketplaceScenario(fabric, scenario);
  return { activation: "simulation", recommendationId: rec.id, scenario, outcome };
}

// ── Unified dispatch ──────────────────────────────────────────────────────────

export type ActivationResult = ExecutionActivation | GovernanceActivation | SimulationActivation;

export function activateRecommendation(
  rec: IntelligenceRecommendation,
  ctx: { fabric: MarketplaceFabric; ownerId?: string | null; now?: string },
): ActivationResult {
  if (rec.activation === "governance") return activateToGovernance(rec);
  if (rec.activation === "simulation") return activateToSimulation(rec, ctx.fabric);
  return activateToExecution(rec, { ownerId: ctx.ownerId, now: ctx.now });
}

/** Activate the top N recommendations across all layers (for surfaces/tests). */
export function activateRecommendations(
  recommendations: IntelligenceRecommendation[],
  ctx: { fabric: MarketplaceFabric; limit?: number; now?: string },
): ActivationResult[] {
  return recommendations.slice(0, ctx.limit ?? 12).map((rec) => activateRecommendation(rec, ctx));
}
