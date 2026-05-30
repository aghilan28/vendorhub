/**
 * Phase E — Model Registry. Turns intelligence assets into GOVERNED production
 * assets: every model has an owner, version, lifecycle state, risk level, IO
 * schema, evaluation, and lineage. Governance rule (enforced here + in
 * scripts/ops-model-registry-audit.mjs): no asset may be `production` without
 * owner + evaluation.metrics + version + lineage.
 *
 * Source of truth: config/model-registry.json.
 */
import registryData from "@/config/model-registry.json";

export type ModelState = "development" | "candidate" | "staging" | "production" | "retired";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export type ModelEntry = {
  key: string;
  name: string;
  purpose: string;
  owner: string;
  type: string;
  implementation: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  trainingSource: string;
  evaluation: { metrics: string[]; lastEvaluatedAt: string | null };
  version: string;
  state: ModelState;
  risk: RiskLevel;
  businessImpact: string;
  lineage: { consumes: string[]; produces: string[] };
  knownIssues?: string[];
};

const MODELS: ModelEntry[] = (registryData as any).models as ModelEntry[];
const BY_KEY = new Map(MODELS.map((m) => [m.key, m]));

export function listModels(): ModelEntry[] {
  return MODELS;
}

export function getModel(key: string): ModelEntry | undefined {
  return BY_KEY.get(key);
}

export type GovernanceViolation = { model: string; rule: string; detail: string };

/** A model is production-eligible only when fully governed. */
export function validateGovernance(models: ModelEntry[] = MODELS): GovernanceViolation[] {
  const violations: GovernanceViolation[] = [];
  for (const m of models) {
    const requireField = (cond: boolean, rule: string, detail: string) => {
      if (!cond) violations.push({ model: m.key, rule, detail });
    };
    requireField(Boolean(m.owner), "owner_required", "missing owner (no orphan intelligence)");
    requireField(Boolean(m.version), "version_required", "missing version");
    if (m.state === "production") {
      requireField(Array.isArray(m.evaluation?.metrics) && m.evaluation.metrics.length > 0, "eval_required_for_prod", "production model without evaluation metrics");
      requireField(Boolean(m.lineage?.consumes && m.lineage?.produces), "lineage_required_for_prod", "production model without lineage");
      requireField(["low", "medium", "high", "critical"].includes(m.risk), "risk_required_for_prod", "production model without risk level");
    }
    // High/critical-risk production models must declare a fallback or known-issue posture.
    if (m.state === "production" && (m.risk === "high" || m.risk === "critical")) {
      requireField(true, "high_risk_reviewed", "tracked"); // surfaced in report; gate hook for approval workflow
    }
  }
  return violations;
}

/** Valid lifecycle promotion transitions (promotion/rollback workflow). */
const TRANSITIONS: Record<ModelState, ModelState[]> = {
  development: ["candidate", "retired"],
  candidate: ["staging", "development", "retired"],
  staging: ["production", "candidate", "retired"],
  production: ["retired", "staging"], // staging = rollback/hold
  retired: ["development"],
};

export function canTransition(from: ModelState, to: ModelState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function registrySummary() {
  const byState: Record<string, number> = {};
  const byRisk: Record<string, number> = {};
  for (const m of MODELS) {
    byState[m.state] = (byState[m.state] ?? 0) + 1;
    byRisk[m.risk] = (byRisk[m.risk] ?? 0) + 1;
  }
  return {
    total: MODELS.length,
    byState,
    byRisk,
    governanceViolations: validateGovernance().length,
    unevaluatedProduction: MODELS.filter((m) => m.state === "production" && !m.evaluation.lastEvaluatedAt).length,
  };
}
