/**
 * KARTEX Phase F — Commerce Intelligence operating layer.
 *
 * Turns Tier 4-9 intelligence ALGORITHMS into OPERATED software: a unified
 * decision ledger (storage + audit), a domain seam (inference governance +
 * decision recording + metrics), and a governed pricing service. Operators can
 * audit every decision, control pricing, and monitor domain freshness.
 */
export { recordIntelligenceDecision, listIntelligenceDecisions } from "./decision-log";
export { operateDomain } from "./domain";
export { computePriceProposal } from "./pricing/engine";
export type { PricingSignals } from "./pricing/engine";
export { proposePrice, listPricingProposals } from "./pricing/service";
export type {
  IntelligenceDomain,
  DecisionAction,
  IntelligenceDecisionInput,
  RecordedDecision,
  PriceProposal,
  PricingStrategy,
} from "./types";
