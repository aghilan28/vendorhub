/**
 * Phase F — Commerce Intelligence operating layer types.
 * An intelligence capability "exists" only when data enters, a decision occurs,
 * an action occurs, the outcome is recorded, failures are handled, and operators
 * can audit/control it. These types model that lifecycle uniformly.
 */
export type IntelligenceDomain =
  | "pricing"
  | "forecasting"
  | "inventory"
  | "supply"
  | "routing"
  | "fulfillment"
  | "search"
  | "recommendation"
  | "seller"
  | "buyer"
  | "telemetry";

export type DecisionAction = "advisory" | "proposed" | "applied" | "auto" | "rolled_back";

export type IntelligenceDecisionInput = {
  domain: IntelligenceDomain;
  decisionType: string;
  modelKey?: string;
  subjectType?: string;
  subjectId?: string;
  inputs?: Record<string, unknown>;
  decision: Record<string, unknown>;
  action?: DecisionAction;
  reversible?: boolean;
  confidence?: number;
  actorId?: string;
  traceId?: string;
};

export type RecordedDecision = IntelligenceDecisionInput & {
  id: string;
  persisted: boolean;
  recordedAt: string;
};

export type PricingStrategy = "static" | "promotional" | "inventory_based" | "demand_based" | "competitive" | "distress";

export type PriceProposal = {
  productId: string;
  vendorId?: string;
  currentPriceMinor: number;
  proposedPriceMinor: number;
  currency: string;
  strategy: PricingStrategy;
  changePct: number;
  reasons: string[];
  guardrailBreached: boolean;
  risk: "low" | "medium" | "high" | "critical";
  /** governance: high-risk or guardrail-breaching changes are NEVER auto-applied */
  autoApplyEligible: boolean;
};
