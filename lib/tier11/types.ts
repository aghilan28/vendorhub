export type ValidationLifecycleState =
  | "CLAIM_SUBMITTED"
  | "MARKET_CREATED"
  | "FORECASTING"
  | "REPLICATION_RUNNING"
  | "EVIDENCE_COLLECTION"
  | "SETTLEMENT"
  | "REPUTATION_UPDATE"
  | "ARCHIVED";

export type SettlementOutcome = "replicated" | "not_replicated" | "inconclusive" | "invalid";
export type ScoringRule = "brier" | "log" | "quadratic";
export type ConsensusState = "created" | "round_open" | "round_closed" | "converged" | "escalated" | "archived";
export type QuarantineState = "open" | "isolated" | "under_review" | "released" | "deprecated";
export type PolicyDeploymentState = "draft" | "parsed" | "validated" | "compiled" | "verified" | "deployed" | "revoked";

export interface ForecastPositionInput {
  participantId: string;
  probability: number;
  stake: number;
  outcome: boolean;
  scoringRule: ScoringRule;
}

export interface ScoreResult {
  participantId: string;
  scoringRule: ScoringRule;
  rawScore: number;
  payoutWeight: number;
  auditHash: string;
}

export interface DelphiForecast {
  participantId: string;
  estimate: number;
  expertiseWeight: number;
  reputationWeight: number;
}

export interface ConsensusRoundInput {
  sessionId: string;
  roundNumber: number;
  forecasts: DelphiForecast[];
  convergenceEpsilon: number;
}

export interface BradleyTerryItem {
  itemId: string;
  rating: number;
}

export interface BradleyTerryComparison {
  winnerId: string;
  loserId: string;
  weight: number;
}

export interface ReputationInput {
  participantId: string;
  prior: number;
  accuracyScore: number;
  lineageScore: number;
  slashingPenalty: number;
  decayRate: number;
  elapsedPeriods: number;
}

export interface RoyaltyInput {
  assetId: string;
  grossRevenue: number;
  ownerShares: Array<{ ownerId: string; share: number }>;
  dependencyShares: Array<{ assetId: string; share: number }>;
  protocolFeeRate: number;
}

export interface CliodynamicPrimitiveInput {
  medianWage: number;
  subsistenceWage: number;
  youthShare: number;
  elitePopulation: number;
  elitePositions: number;
  topWealthShare: number;
  fiscalDistress: number;
  massMobilization: number;
  institutionalTrust: number;
  publicDebtToGdp: number;
}

export interface DiscoveryValidationInput {
  hypothesisId: string;
  pValue: number;
  effectSize: number;
  minimumEffectSize: number;
  replicationCount: number;
  requiredReplications: number;
  evidenceIntegrity: number;
}

export interface ClaimAuditInput {
  claimId: string;
  supportWeight: number;
  contradictionWeight: number;
  lineageCompleteness: number;
  evidenceIntegrity: number;
}

export interface LegitimacySignalInput {
  scopeId: string;
  psi: number;
  trust: number;
  gini: number;
  debt: number;
  eliteDensity: number;
}
