/**
 * KARTEX Phase G — Advanced Intelligence & Knowledge Systems operating layer.
 *
 * Turns Tier 10-15 architectures (pure compute + contracts) into OPERATED
 * systems: an auditable decision ledger, a governance policy/rule engine +
 * constitution registry, a stateful+audited simulation runtime (wrapping Tier 10
 * compute), and a knowledge runtime with validation + lineage.
 */
export { recordAdvancedDecision, listAdvancedDecisions } from "./decision-log";
export { evaluateRule, evaluatePolicies, loadActivePolicies, decideWithGovernance, registerConstitution } from "./governance";
export { runSimulation } from "./simulation";
export { createKnowledgeUnit, validateKnowledgeUnit, evaluateKnowledgeValidation, listKnowledgeUnits } from "./knowledge";
export { ADVANCED_OPERATIONALIZATION, buildAdvancedOperationsSnapshot } from "./operations";
export type {
  AdvancedDomain,
  AdvancedDecisionInput,
  RecordedAdvancedDecision,
  GovernancePolicy,
  PolicyRule,
  RuleCondition,
  GovernanceEvaluation,
  PolicyResult,
} from "./types";
