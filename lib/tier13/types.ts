export type EvidenceClass =
  | "established"
  | "strongly_supported"
  | "moderately_supported"
  | "weakly_supported"
  | "speculative";

export type LifecycleState =
  | "created"
  | "appraised"
  | "ingested"
  | "authenticated"
  | "linked"
  | "reviewed"
  | "validated"
  | "promoted"
  | "monitored"
  | "refreshed"
  | "migrated"
  | "revalidated"
  | "archived"
  | "contested"
  | "quarantined"
  | "adjudicating"
  | "repaired"
  | "paraconsistent_retained"
  | "corrupted"
  | "deprecated"
  | "lost";

export type InstitutionalLifecycleState =
  | "founding"
  | "consolidation"
  | "expansion"
  | "maturity"
  | "adaptation"
  | "drift"
  | "capture_risk"
  | "reform"
  | "legitimacy_crisis"
  | "emergency"
  | "reconstitution"
  | "collapse"
  | "fragmentation"
  | "successor_formation";

export type CivilizationalState =
  | "stable_complexity"
  | "rising_stress"
  | "buffer_drawdown"
  | "institutional_strain"
  | "adaptive_reform"
  | "legitimacy_crisis"
  | "cascading_failure"
  | "simplification"
  | "fragmentation"
  | "recovery"
  | "reconstitution"
  | "dark_age";

export type VerificationSurface = "tla" | "alloy" | "smt" | "simulation" | "rollback" | "legitimacy" | "evidence";

export interface RfcSectionTrace {
  section: number;
  title: string;
  artifacts: string[];
  primaryInvariant: string;
}

export interface ProvenanceInput {
  sourceIdentityPresent: boolean;
  sourceAuthorityPresent: boolean;
  custodyChainComplete: boolean;
  transformationsRecorded: boolean;
  contentHashPresent: boolean;
  representationInformationPresent: boolean;
  licenseRightsPresent: boolean;
  trustScore: number;
  evidenceClass: EvidenceClass;
}

export interface KnowledgeLifecycleInput {
  state: LifecycleState;
  nextState: LifecycleState;
  highImpact: boolean;
  provenanceComplete: boolean;
  evidenceClass: EvidenceClass;
  hasContradiction: boolean;
  dependentPolicyCount: number;
}

export interface KnowledgeLossRiskInput {
  carrierDecay: number;
  bitCorruption: number;
  formatObsolescence: number;
  semanticDrift: number;
  custodianFailure: number;
  accessSuppression: number;
  educationalDiscontinuity: number;
  redundancy: number;
  fixityAudit: number;
  translationBridges: number;
  distributedCustody: number;
}

export interface ConstitutionMutationInput {
  amendmentId: string;
  trustedEvidenceRatio: number;
  proofObligationsPassed: boolean;
  simulationPassed: boolean;
  simulationConfidence: number;
  captureShare: number;
  captureThreshold: number;
  quorumParticipation: number;
  quorumMinimum: number;
  approvalShare: number;
  approvalThreshold: number;
  rollbackCoverage: number;
  requiredRollbackCoverage: number;
  legitimacyScore: number;
  legitimacyThreshold: number;
  weakensCivilizationalInvariant: boolean;
  supermajorityShare: number;
}

export interface LegitimacyInput {
  legalValidity: number;
  consentParticipation: number;
  nonCoerciveCompliance: number;
  trust: number;
  fairnessPerception: number;
  outputPerformance: number;
  proceduralTransparency: number;
  rightsProtection: number;
  appealAvailability: number;
  manipulationRisk: number;
  privacyRisk: number;
}

export interface InstitutionalEntropyInput {
  ruleAccumulationRate: number;
  exceptionDensity: number;
  processLatencyGrowth: number;
  mandateOutputDistance: number;
  roleOverlapIndex: number;
  unreviewedRuleAge: number;
}

export interface InstitutionalStateInput {
  current: InstitutionalLifecycleState;
  entropy: number;
  legitimacy: number;
  adaptability: number;
  captureThreat: number;
  emergencyActive: boolean;
  recoveryCapacity: number;
}

export interface CivilizationalStateInput {
  current: CivilizationalState;
  stress: number;
  bufferAdequacy: number;
  institutionalLegitimacy: number;
  adaptiveCapacity: number;
  cascadeRisk: number;
  memoryContinuity: number;
  recoveryCapacity: number;
}

export interface SimulationCertificationInput {
  scenarioHashPresent: boolean;
  inputSnapshotHashPresent: boolean;
  seedRecorded: boolean;
  outputDigestPresent: boolean;
  invariantReportPassed: boolean;
  uncertaintyReportPresent: boolean;
  frozenInputs: Array<"constitution" | "authority_graph" | "policy_graph" | "knowledge_graph" | "resource_state" | "metric_definitions" | "shock_parameters">;
}

export interface OntologyCorruptionInput {
  relationDrift: number;
  embeddingDisplacement: number;
  classMergeSplitImpact: number;
  ambiguousTermRate: number;
  rdfGraphDivergence: number;
  dependentPolicyImpact: number;
  untrustedEditShare: number;
}

export interface KnowledgeDriftInput {
  beliefDistributionShift: number;
  ontologySemanticDistance: number;
  sourceTrustDelta: number;
  evidenceContextLoss: number;
  contradictionRateDelta: number;
  dependentPolicyChange: number;
  repairEffectiveness: number;
}

export interface ReputationUpdateInput {
  prior: number;
  forecastAccuracy: number;
  replicationOutcome: number;
  evidenceQuality: number;
  auditPenalty: number;
  conflictPenalty: number;
  maxDelta: number;
}

export interface FormalVerificationInput {
  obligations: Array<{ id: string; surface: VerificationSurface; passed: boolean; civilizational: boolean }>;
}

export interface QuorumInput {
  eligiblePower: number;
  participatingPower: number;
  yesPower: number;
  minimumParticipation: number;
  approvalThreshold: number;
  maxCoalitionShare: number;
  captureThreshold: number;
}

export interface MetricContractInput {
  metricKey: string;
  componentValues: Record<string, number>;
  weights: Record<string, number>;
  validityLimitBreached: boolean;
  antiGoodhartControlsPresent: boolean;
}

export interface FitnessInput {
  subjectId: string;
  dimensions: {
    legitimacy: number;
    effectiveness: number;
    rightsProtection: number;
    resilience: number;
    adaptability: number;
    epistemicQuality: number;
    costEfficiency: number;
    lowComplexity: number;
    reversibility: number;
    alignment: number;
    sustainability: number;
  };
}

export interface MessageEnvelopeInput {
  messageType: string;
  aggregateType: string;
  aggregateId: string;
  sequence: number;
  actorId: string;
  scope: string;
  constitutionVersion: string;
  payloadHash: string;
  idempotencyKey: string;
}

export interface Tier13CommandRequestInput extends MessageEnvelopeInput {
  signaturePresent: boolean;
  authorityResolved: boolean;
  highImpact: boolean;
}

export interface Tier13GraphDecisionInput {
  decisionId: string;
  authorityPathActive: boolean;
  constitutionActive: boolean;
  auditEnvelopePresent: boolean;
  appealPathAvailable: boolean;
}

export interface Tier13GraphClaimInput {
  claimId: string;
  highImpact: boolean;
  supportEdgeCount: number;
  contradictionEdgeCount: number;
  provenancePresent: boolean;
  evidenceClass: EvidenceClass;
}

export interface Tier13ArchiveReplicaInput {
  artifactId: string;
  critical: boolean;
  replicaCount: number;
  custodyJurisdictions: string[];
  representationInformationPresent: boolean;
}

export interface Tier13VectorRetrievalInput {
  collection: string;
  quarantineState: "clean" | "quarantined" | "deprecated";
  warningAttached: boolean;
  usedForPolicySupport: boolean;
  retrievalPoisoningScanFresh: boolean;
}

export interface Tier13CompilationInput {
  sourceValid: boolean;
  typeValid: boolean;
  staticInvariantsValid: boolean;
  formalValid: boolean;
  simulationValid: boolean;
  identityValid: boolean;
  epistemicValid: boolean;
  activationValid: boolean;
  artifactHashes: string[];
}

export interface Tier13RestoreDrillInput {
  constitutionRestored: boolean;
  authorityRestored: boolean;
  claimsRestored: boolean;
  evidenceRestored: boolean;
  auditRestored: boolean;
  graphDigestMatched: boolean;
  eventReplayVerified: boolean;
  optionalProjectionsRestoredBeforeCore: boolean;
}
