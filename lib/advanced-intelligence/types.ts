/**
 * Phase G — Advanced Intelligence & Knowledge Systems operating layer types.
 * Tier 10-15 architectures become OPERATED systems: data enters, state changes,
 * workflows execute, decisions are auditable, operators can manage them.
 */
export type AdvancedDomain =
  | "knowledge"
  | "ontology"
  | "research"
  | "simulation"
  | "governance"
  | "constitution"
  | "meta"
  | "civilizational";

export type AdvancedDecisionInput = {
  domain: AdvancedDomain;
  decisionType: string;
  subjectType?: string;
  subjectId?: string;
  inputs?: Record<string, unknown>;
  decision: Record<string, unknown>;
  action?: "advisory" | "proposed" | "applied" | "auto" | "rolled_back";
  reversible?: boolean;
  confidence?: number;
  actorId?: string;
  traceId?: string;
};

export type RecordedAdvancedDecision = AdvancedDecisionInput & {
  id: string;
  persisted: boolean;
  recordedAt: string;
};

// ---- Governance policy/rule engine ----
export type RuleOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "exists" | "truthy";

export type RuleCondition = {
  field: string;
  op: RuleOp;
  value?: unknown;
};

export type PolicyRule = {
  allOf?: RuleCondition[];
  anyOf?: RuleCondition[];
  none?: RuleCondition[];
};

export type GovernancePolicy = {
  policyKey: string;
  title: string;
  rule: PolicyRule;
  severity: "low" | "medium" | "high" | "critical";
};

export type PolicyResult = { policyKey: string; severity: GovernancePolicy["severity"]; passed: boolean; reasons: string[] };

export type GovernanceOutcome = "approved" | "rejected" | "escalated";

export type GovernanceEvaluation = {
  outcome: GovernanceOutcome;
  results: PolicyResult[];
  failedCritical: string[];
  failedHigh: string[];
};
