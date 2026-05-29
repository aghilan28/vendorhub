import { createHash } from "crypto";
import type {
  CivilizationalState,
  CivilizationalStateInput,
  ConstitutionMutationInput,
  EvidenceClass,
  FitnessInput,
  FormalVerificationInput,
  InstitutionalEntropyInput,
  InstitutionalLifecycleState,
  InstitutionalStateInput,
  KnowledgeDriftInput,
  KnowledgeLifecycleInput,
  KnowledgeLossRiskInput,
  LegitimacyInput,
  LifecycleState,
  MessageEnvelopeInput,
  MetricContractInput,
  OntologyCorruptionInput,
  ProvenanceInput,
  QuorumInput,
  ReputationUpdateInput,
  RfcSectionTrace,
  SimulationCertificationInput,
  Tier13ArchiveReplicaInput,
  Tier13CommandRequestInput,
  Tier13CompilationInput,
  Tier13GraphClaimInput,
  Tier13GraphDecisionInput,
  Tier13RestoreDrillInput,
  Tier13VectorRetrievalInput,
} from "./types";
import {
  buildTier13SectionTrace,
  tier13ApiGroups,
  tier13BoundedContexts,
  tier13CommandFamilies,
  tier13EventTopics,
  tier13GraphLabels,
  tier13OntologyClasses,
  tier13OpenProblemsRegistry,
  tier13RelationshipContracts,
  tier13RequiredEvents,
  tier13StorageContracts,
  tier13VectorCollections,
  tier13VerificationMappings,
} from "./contracts";

export type * from "./types";
export * from "./contracts";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 6) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function tier13ReplayKey(parts: Array<string | number | boolean>) {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

const sectionTitles = [
  "Mission and Scope",
  "Domain Model Specification",
  "Ontology Specification",
  "Entity Definitions",
  "Relationship Definitions",
  "Knowledge Graph Architecture",
  "Knowledge Lifecycle Management",
  "Knowledge Provenance Model",
  "Collective Intelligence Framework",
  "Mechanism Design Framework",
  "Governance Engine Architecture",
  "Constitutional DSL Architecture",
  "Constitution Compilation Pipeline",
  "Constitution Mutation Architecture",
  "Legitimacy Preservation Framework",
  "Institutional Evolution Engine",
  "Civilizational State Machine",
  "Multi-Agent Simulation Framework",
  "Agent Taxonomy",
  "Agent Communication Protocols",
  "Research Frontier Discovery Engine",
  "Open Problems Registry",
  "Forecasting Framework",
  "Scenario Generation System",
  "Shock Modeling Framework",
  "Epistemic Security Architecture",
  "Narrative Attack Taxonomy",
  "Ontology Corruption Detection",
  "Knowledge Drift Detection",
  "Trust and Reputation Framework",
  "Formal Verification Strategy",
  "TLA+ Mapping",
  "Alloy Mapping",
  "SMT Mapping",
  "Metrics Framework",
  "Fitness Functions",
  "Institutional Health Metrics",
  "Coordination Metrics",
  "Governance Metrics",
  "Research Velocity Metrics",
  "Storage Architecture",
  "Graph Database Specification",
  "Vector Database Specification",
  "Relational Database Specification",
  "API Architecture",
  "Event Architecture",
  "Message Contracts",
  "Security Architecture",
  "Deployment Architecture",
  "Acceptance Criteria",
];

export const tier13RfcSectionTrace: RfcSectionTrace[] = buildTier13SectionTrace(sectionTitles);

const evidenceRank: Record<EvidenceClass, number> = {
  speculative: 0,
  weakly_supported: 1,
  moderately_supported: 2,
  strongly_supported: 3,
  established: 4,
};

export const knowledgeLifecycleTransitions: Record<LifecycleState, LifecycleState[]> = {
  created: ["appraised", "deprecated"],
  appraised: ["ingested", "deprecated"],
  ingested: ["authenticated", "contested"],
  authenticated: ["linked", "quarantined"],
  linked: ["reviewed", "contested"],
  reviewed: ["validated", "contested", "deprecated"],
  validated: ["promoted", "archived"],
  promoted: ["monitored", "deprecated"],
  monitored: ["refreshed", "corrupted", "deprecated", "lost", "archived"],
  refreshed: ["migrated", "revalidated"],
  migrated: ["revalidated", "corrupted"],
  revalidated: ["monitored", "archived"],
  archived: [],
  contested: ["quarantined", "adjudicating", "paraconsistent_retained"],
  quarantined: ["adjudicating", "deprecated"],
  adjudicating: ["repaired", "paraconsistent_retained", "deprecated"],
  repaired: ["revalidated"],
  paraconsistent_retained: ["monitored", "archived"],
  corrupted: ["repaired", "lost"],
  deprecated: ["archived"],
  lost: [],
};

export function evaluateProvenance(input: ProvenanceInput) {
  const completenessParts = [
    input.sourceIdentityPresent,
    input.sourceAuthorityPresent,
    input.custodyChainComplete,
    input.transformationsRecorded,
    input.contentHashPresent,
    input.representationInformationPresent,
    input.licenseRightsPresent,
  ];
  const completeness = completenessParts.filter(Boolean).length / completenessParts.length;
  const operationallyPromotable =
    completeness === 1 && input.trustScore >= 0.8 && evidenceRank[input.evidenceClass] >= evidenceRank.moderately_supported;

  return {
    completeness: round(completeness),
    operationallyPromotable,
    missingControls: [
      input.sourceIdentityPresent ? "" : "source_identity",
      input.sourceAuthorityPresent ? "" : "source_authority",
      input.custodyChainComplete ? "" : "custody_chain",
      input.transformationsRecorded ? "" : "transformations",
      input.contentHashPresent ? "" : "content_hash",
      input.representationInformationPresent ? "" : "representation_information",
      input.licenseRightsPresent ? "" : "license_rights",
    ].filter(Boolean),
    replayKey: tier13ReplayKey(["provenance", completeness.toFixed(6), input.trustScore.toFixed(6), input.evidenceClass]),
  };
}

export function transitionKnowledgeLifecycle(input: KnowledgeLifecycleInput) {
  const transitionAllowed = knowledgeLifecycleTransitions[input.state].includes(input.nextState);
  const promotionBlocked =
    input.nextState === "promoted" &&
    (input.hasContradiction ||
      !input.provenanceComplete ||
      (input.highImpact && evidenceRank[input.evidenceClass] < evidenceRank.strongly_supported));
  const policyDependencyBlocked = input.nextState === "quarantined" && input.dependentPolicyCount > 0;

  return {
    from: input.state,
    to: input.nextState,
    allowed: transitionAllowed && !promotionBlocked,
    promotionBlocked,
    policyDependencyBlocked,
    replayKey: tier13ReplayKey([
      "knowledge-lifecycle",
      input.state,
      input.nextState,
      transitionAllowed,
      promotionBlocked,
      policyDependencyBlocked,
    ]),
  };
}

export function calculateKnowledgeLossRisk(input: KnowledgeLossRiskInput) {
  const positiveRisk =
    input.carrierDecay +
    input.bitCorruption +
    input.formatObsolescence +
    input.semanticDrift +
    input.custodianFailure +
    input.accessSuppression +
    input.educationalDiscontinuity;
  const mitigations = input.redundancy + input.fixityAudit + input.translationBridges + input.distributedCustody;
  const risk = clamp(positiveRisk / 7 - mitigations / 4);

  return {
    risk: round(risk),
    state: risk >= 0.7 ? "critical" : risk >= 0.45 ? "watch" : "resilient",
    semanticContinuityRequired: input.semanticDrift >= 0.4 || input.formatObsolescence >= 0.4,
    replayKey: tier13ReplayKey(["knowledge-loss", positiveRisk.toFixed(6), mitigations.toFixed(6), risk.toFixed(6)]),
  };
}

export function assessConstitutionMutation(input: ConstitutionMutationInput) {
  const failedGates = [
    input.trustedEvidenceRatio >= 0.8 ? "" : "trusted_evidence_ratio",
    input.proofObligationsPassed ? "" : "formal_proof",
    input.simulationPassed && input.simulationConfidence >= 0.95 ? "" : "simulation_certification",
    input.captureShare < input.captureThreshold ? "" : "capture_threshold",
    input.quorumParticipation >= input.quorumMinimum ? "" : "quorum_participation",
    input.approvalShare >= input.approvalThreshold ? "" : "approval_threshold",
    input.rollbackCoverage >= input.requiredRollbackCoverage ? "" : "rollback_coverage",
    input.legitimacyScore >= input.legitimacyThreshold ? "" : "legitimacy",
    !input.weakensCivilizationalInvariant || input.supermajorityShare >= 0.75 ? "" : "civilizational_supermajority",
  ].filter(Boolean);

  return {
    amendmentId: input.amendmentId,
    activationAllowed: failedGates.length === 0,
    failedGates,
    hypermutableRisk: input.approvalThreshold < 0.5 || input.quorumMinimum < 0.4,
    frozenRisk: input.approvalThreshold > 0.85 || input.quorumMinimum > 0.8,
    replayKey: tier13ReplayKey(["mutation", input.amendmentId, failedGates.join(","), input.captureShare.toFixed(6)]),
  };
}

export function calculateLegitimacy(input: LegitimacyInput) {
  const constructive =
    input.legalValidity * 0.14 +
    input.consentParticipation * 0.12 +
    input.nonCoerciveCompliance * 0.1 +
    input.trust * 0.13 +
    input.fairnessPerception * 0.12 +
    input.outputPerformance * 0.1 +
    input.proceduralTransparency * 0.1 +
    input.rightsProtection * 0.12 +
    input.appealAvailability * 0.07;
  const riskPenalty = input.manipulationRisk * 0.12 + input.privacyRisk * 0.08;
  const score = clamp(constructive - riskPenalty);

  return {
    score: round(score),
    state: score >= 0.78 ? "legitimate" : score >= 0.58 ? "strained" : "legitimacy_crisis",
    automationAllowed: score >= 0.78 && input.manipulationRisk < 0.25 && input.privacyRisk < 0.25,
    replayKey: tier13ReplayKey(["legitimacy", score.toFixed(6), input.manipulationRisk.toFixed(6), input.privacyRisk.toFixed(6)]),
  };
}

export function calculateInstitutionalEntropy(input: InstitutionalEntropyInput) {
  const score =
    input.ruleAccumulationRate * 0.18 +
    input.exceptionDensity * 0.18 +
    input.processLatencyGrowth * 0.17 +
    input.mandateOutputDistance * 0.2 +
    input.roleOverlapIndex * 0.13 +
    input.unreviewedRuleAge * 0.14;

  return {
    entropy: round(clamp(score)),
    state: score >= 0.82 ? "critical" : score >= 0.62 ? "drift" : "healthy",
    replayKey: tier13ReplayKey(["institutional-entropy", score.toFixed(8)]),
  };
}

export function transitionInstitutionalLifecycle(input: InstitutionalStateInput): InstitutionalLifecycleState {
  if (input.current === "founding" && input.legitimacy >= 0.45) return "consolidation";
  if (input.current === "consolidation" && input.adaptability >= 0.55) return "expansion";
  if (input.current === "expansion" && input.entropy >= 0.45) return "maturity";
  if (input.current === "maturity" && input.adaptability >= 0.65 && input.entropy < 0.55) return "adaptation";
  if (input.current === "maturity" && input.entropy >= 0.62) return "drift";
  if (input.current === "drift" && input.captureThreat >= 0.33) return "capture_risk";
  if (input.current === "capture_risk" && input.legitimacy >= 0.55 && input.adaptability >= 0.55) return "reform";
  if (input.current === "capture_risk" && input.legitimacy < 0.4) return "legitimacy_crisis";
  if (input.current === "legitimacy_crisis" && input.emergencyActive) return "emergency";
  if (input.current === "emergency" && input.recoveryCapacity >= 0.6) return "reconstitution";
  if (input.current === "emergency" && input.recoveryCapacity < 0.25) return "collapse";
  if (input.current === "collapse") return "fragmentation";
  if (input.current === "fragmentation" && input.recoveryCapacity >= 0.5) return "successor_formation";
  return input.current;
}

export function transitionCivilizationalState(input: CivilizationalStateInput): CivilizationalState {
  if (input.current === "stable_complexity" && input.stress >= 0.45) return "rising_stress";
  if (input.current === "rising_stress" && input.bufferAdequacy < 0.5) return "buffer_drawdown";
  if (input.current === "buffer_drawdown" && input.institutionalLegitimacy < 0.55) return "institutional_strain";
  if (input.current === "institutional_strain" && input.adaptiveCapacity >= 0.65) return "adaptive_reform";
  if (input.current === "adaptive_reform" && input.stress < 0.35 && input.institutionalLegitimacy >= 0.6) return "stable_complexity";
  if (input.current === "institutional_strain" && input.institutionalLegitimacy < 0.35) return "legitimacy_crisis";
  if (input.current === "legitimacy_crisis" && input.cascadeRisk >= 0.6) return "cascading_failure";
  if (input.current === "cascading_failure" && input.memoryContinuity < 0.55) return "simplification";
  if (input.current === "simplification") return "fragmentation";
  if (input.current === "fragmentation" && input.recoveryCapacity >= 0.5) return "recovery";
  if (input.current === "fragmentation" && input.memoryContinuity < 0.25) return "dark_age";
  if (input.current === "recovery" && input.institutionalLegitimacy >= 0.55) return "reconstitution";
  return input.current;
}

export function certifySimulationRun(input: SimulationCertificationInput) {
  const requiredFrozenInputs: SimulationCertificationInput["frozenInputs"] = [
    "constitution",
    "authority_graph",
    "policy_graph",
    "knowledge_graph",
    "resource_state",
    "metric_definitions",
    "shock_parameters",
  ];
  const missingFrozenInputs = requiredFrozenInputs.filter((required) => !input.frozenInputs.includes(required));
  const missingArtifacts = [
    input.scenarioHashPresent ? "" : "scenario_hash",
    input.inputSnapshotHashPresent ? "" : "input_snapshot_hash",
    input.seedRecorded ? "" : "seed",
    input.outputDigestPresent ? "" : "output_digest",
    input.invariantReportPassed ? "" : "invariant_report",
    input.uncertaintyReportPresent ? "" : "uncertainty_report",
  ].filter(Boolean);
  const certified = missingArtifacts.length === 0 && missingFrozenInputs.length === 0;

  return {
    certified,
    missingArtifacts,
    missingFrozenInputs,
    replayKey: tier13ReplayKey(["simulation-cert", certified, missingArtifacts.join(","), missingFrozenInputs.join(",")]),
  };
}

export function detectOntologyCorruption(input: OntologyCorruptionInput) {
  const anomalyScore = clamp(
    input.relationDrift * 0.16 +
      input.embeddingDisplacement * 0.14 +
      input.classMergeSplitImpact * 0.18 +
      input.ambiguousTermRate * 0.12 +
      input.rdfGraphDivergence * 0.12 +
      input.dependentPolicyImpact * 0.18 +
      input.untrustedEditShare * 0.1,
  );

  return {
    anomalyScore: round(anomalyScore),
    quarantineRequired: anomalyScore >= 0.6 || input.dependentPolicyImpact >= 0.5,
    constitutionalReviewRequired: input.dependentPolicyImpact >= 0.35 || input.classMergeSplitImpact >= 0.5,
    replayKey: tier13ReplayKey(["ontology-corruption", anomalyScore.toFixed(8)]),
  };
}

export function detectKnowledgeDrift(input: KnowledgeDriftInput) {
  const raw =
    input.beliefDistributionShift +
    input.ontologySemanticDistance +
    input.sourceTrustDelta +
    input.evidenceContextLoss +
    input.contradictionRateDelta +
    input.dependentPolicyChange -
    input.repairEffectiveness;
  const drift = clamp(raw / 6);

  return {
    drift: round(drift),
    reviewRequired: drift >= 0.35 || input.dependentPolicyChange >= 0.4,
    quarantineCandidate: drift >= 0.55,
    replayKey: tier13ReplayKey(["knowledge-drift", raw.toFixed(8), drift.toFixed(8)]),
  };
}

export function updateTrustReputation(input: ReputationUpdateInput) {
  const evidence =
    input.forecastAccuracy * 0.28 +
    input.replicationOutcome * 0.24 +
    input.evidenceQuality * 0.22 -
    input.auditPenalty * 0.16 -
    input.conflictPenalty * 0.1;
  const target = clamp(evidence);
  const delta = Math.max(-input.maxDelta, Math.min(input.maxDelta, target - input.prior));
  const reputation = clamp(input.prior + delta);

  return {
    reputation: round(reputation),
    delta: round(delta),
    bounded: Math.abs(delta) <= input.maxDelta,
    trustBand: reputation >= 0.8 ? "high" : reputation >= 0.55 ? "medium" : reputation >= 0.3 ? "watch" : "restricted",
    replayKey: tier13ReplayKey(["reputation", input.prior.toFixed(6), target.toFixed(6), delta.toFixed(6)]),
  };
}

export function verifyFormalObligations(input: FormalVerificationInput) {
  const failed = input.obligations.filter((obligation) => !obligation.passed);
  const failedCivilizational = failed.filter((obligation) => obligation.civilizational);

  return {
    passed: failed.length === 0,
    failedObligations: failed.map((obligation) => obligation.id),
    activationBlocked: failedCivilizational.length > 0 || failed.length > 0,
    surfacesCovered: Array.from(new Set(input.obligations.map((obligation) => obligation.surface))).sort(),
    replayKey: tier13ReplayKey(["formal", failed.map((item) => item.id).join(",")]),
  };
}

export function checkQuorumSmtObligation(input: QuorumInput) {
  const participation = input.participatingPower / Math.max(input.eligiblePower, 0.000001);
  const approval = input.yesPower / Math.max(input.participatingPower, 0.000001);
  const passed =
    participation >= input.minimumParticipation &&
    approval >= input.approvalThreshold &&
    input.maxCoalitionShare < input.captureThreshold;

  return {
    passed,
    participation: round(participation),
    approval: round(approval),
    capturePassed: input.maxCoalitionShare < input.captureThreshold,
    replayKey: tier13ReplayKey(["quorum", participation.toFixed(8), approval.toFixed(8), input.maxCoalitionShare.toFixed(8)]),
  };
}

export function computeMetricContract(input: MetricContractInput) {
  const weightedSum = Object.entries(input.weights).reduce((sum, [key, weight]) => {
    return sum + clamp(input.componentValues[key] ?? 0) * weight;
  }, 0);
  const weightTotal = Object.values(input.weights).reduce((sum, weight) => sum + weight, 0);
  const value = weightTotal === 0 ? 0 : clamp(weightedSum / weightTotal);

  return {
    metricKey: input.metricKey,
    value: round(value),
    validForHighImpactDecision: !input.validityLimitBreached && input.antiGoodhartControlsPresent && Object.keys(input.componentValues).length > 1,
    replayKey: tier13ReplayKey(["metric", input.metricKey, value.toFixed(8), input.validityLimitBreached, input.antiGoodhartControlsPresent]),
  };
}

export function computeFitness(input: FitnessInput) {
  const d = input.dimensions;
  const score =
    d.legitimacy * 0.12 +
    d.effectiveness * 0.11 +
    d.rightsProtection * 0.12 +
    d.resilience * 0.1 +
    d.adaptability * 0.09 +
    d.epistemicQuality * 0.1 +
    d.costEfficiency * 0.07 +
    d.lowComplexity * 0.07 +
    d.reversibility * 0.08 +
    d.alignment * 0.08 +
    d.sustainability * 0.06;

  return {
    subjectId: input.subjectId,
    score: round(clamp(score)),
    retirementAllowed: false,
    governanceReviewRequired: score < 0.55 || d.rightsProtection < 0.7 || d.legitimacy < 0.55,
    replayKey: tier13ReplayKey(["fitness", input.subjectId, score.toFixed(8)]),
  };
}

export function buildMessageEnvelope(input: MessageEnvelopeInput) {
  const occurredAt = new Date(0).toISOString();
  const messageId = tier13ReplayKey([
    "message",
    input.messageType,
    input.aggregateType,
    input.aggregateId,
    input.sequence,
    input.idempotencyKey,
  ]);

  return {
    messageId,
    schemaVersion: "tier13.v1",
    messageType: input.messageType,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    sequence: input.sequence,
    correlationId: tier13ReplayKey(["correlation", input.aggregateId, input.idempotencyKey]),
    causationId: tier13ReplayKey(["causation", input.actorId, input.payloadHash]),
    actorId: input.actorId,
    scope: input.scope,
    constitutionVersion: input.constitutionVersion,
    occurredAt,
    replayKey: tier13ReplayKey(["replay", input.aggregateType, input.aggregateId, input.sequence]),
    idempotencyKey: input.idempotencyKey,
    payloadHash: input.payloadHash,
    signatureRequired: true,
  };
}

export function auditTier13AcceptanceCoverage() {
  const sectionCoverage = tier13RfcSectionTrace.map((section) => ({
    section: section.section,
    title: section.title,
    implemented: section.artifacts.length > 0,
    artifacts: section.artifacts,
  }));
  const boundedContextCoverage = tier13BoundedContexts.map((context) => ({
    key: context.key,
    implemented:
      context.entities.length > 0 &&
      context.workflows.length > 0 &&
      context.metrics.length > 0 &&
      context.invariants.length > 0 &&
      context.simulationHooks.length > 0 &&
      context.verificationRequirements.length > 0,
  }));
  const missing = [
    ...sectionCoverage.filter((section) => !section.implemented).map((section) => `section:${section.section}`),
    ...boundedContextCoverage.filter((context) => !context.implemented).map((context) => `context:${context.key}`),
    tier13OpenProblemsRegistry.length >= 20 ? "" : "open_problems_registry",
    tier13ApiGroups.length === 12 ? "" : "api_groups",
    tier13EventTopics.length === 14 ? "" : "event_topics",
    tier13RequiredEvents.length >= 26 ? "" : "required_events",
    tier13GraphLabels.length >= 24 ? "" : "graph_labels",
    tier13VectorCollections.length === 7 ? "" : "vector_collections",
    tier13StorageContracts.length === 7 ? "" : "storage_contracts",
    tier13VerificationMappings.some((mapping) => mapping.surface === "tla") ? "" : "tla_mapping",
    tier13VerificationMappings.some((mapping) => mapping.surface === "alloy") ? "" : "alloy_mapping",
    tier13VerificationMappings.some((mapping) => mapping.surface === "smt") ? "" : "smt_mapping",
  ].filter(Boolean);

  return {
    accepted: missing.length === 0,
    missing,
    sectionCoverage,
    boundedContextCoverage,
    replayKey: tier13ReplayKey([
      "acceptance",
      missing.join(","),
      tier13BoundedContexts.length,
      tier13OpenProblemsRegistry.length,
    ]),
  };
}

export function validateTier13CommandRequest(input: Tier13CommandRequestInput) {
  const envelope = buildMessageEnvelope(input);
  const commandFamilyKnown = tier13CommandFamilies.some((family) => {
    const normalizedFamily = family.replace(/\s+/g, "").toLowerCase();
    return input.messageType.replace(/[^a-z]/gi, "").toLowerCase().includes(normalizedFamily);
  });
  const failed = [
    input.idempotencyKey ? "" : "idempotency_key",
    input.actorId ? "" : "actor_identity",
    input.scope ? "" : "scope",
    input.constitutionVersion ? "" : "constitution_version",
    input.signaturePresent ? "" : "signature",
    !input.highImpact || input.authorityResolved ? "" : "authority_resolution",
    commandFamilyKnown ? "" : "command_family",
  ].filter(Boolean);

  return {
    accepted: failed.length === 0,
    failed,
    envelope,
    replayKey: tier13ReplayKey(["command-request", input.messageType, failed.join(","), envelope.messageId]),
  };
}

export function validateGraphDecisionInvariant(input: Tier13GraphDecisionInput) {
  const failed = [
    input.authorityPathActive ? "" : "authority_path",
    input.constitutionActive ? "" : "active_constitution",
    input.auditEnvelopePresent ? "" : "audit_envelope",
    input.appealPathAvailable ? "" : "appeal_path",
  ].filter(Boolean);

  return {
    decisionId: input.decisionId,
    executable: failed.length === 0,
    failed,
    replayKey: tier13ReplayKey(["graph-decision", input.decisionId, failed.join(",")]),
  };
}

export function validateGraphClaimInvariant(input: Tier13GraphClaimInput) {
  const evidenceLinked = input.supportEdgeCount + input.contradictionEdgeCount > 0;
  const failed = [
    input.provenancePresent ? "" : "provenance",
    !input.highImpact || evidenceLinked ? "" : "evidence_edge",
    !input.highImpact || evidenceRank[input.evidenceClass] >= evidenceRank.moderately_supported ? "" : "evidence_class",
  ].filter(Boolean);

  return {
    claimId: input.claimId,
    policyEligible: failed.length === 0,
    evidenceLinked,
    failed,
    replayKey: tier13ReplayKey(["graph-claim", input.claimId, failed.join(",")]),
  };
}

export function validateArchiveReplicaInvariant(input: Tier13ArchiveReplicaInput) {
  const custodyDiverse = new Set(input.custodyJurisdictions).size >= 3;
  const failed = [
    !input.critical || input.replicaCount >= 3 ? "" : "replica_count",
    !input.critical || custodyDiverse ? "" : "custody_diversity",
    input.representationInformationPresent ? "" : "representation_information",
  ].filter(Boolean);

  return {
    artifactId: input.artifactId,
    survivable: failed.length === 0,
    custodyDiverse,
    failed,
    replayKey: tier13ReplayKey(["archive-replica", input.artifactId, failed.join(",")]),
  };
}

export function validateTier13VectorRetrieval(input: Tier13VectorRetrievalInput) {
  const collectionKnown = tier13VectorCollections.includes(input.collection as (typeof tier13VectorCollections)[number]);
  const restrictedState = input.quarantineState === "quarantined" || input.quarantineState === "deprecated";
  const failed = [
    collectionKnown ? "" : "collection",
    !restrictedState || input.warningAttached ? "" : "warning",
    !(restrictedState && input.usedForPolicySupport) ? "" : "automatic_policy_support",
    input.retrievalPoisoningScanFresh ? "" : "retrieval_poisoning_scan",
  ].filter(Boolean);

  return {
    retrievable: failed.length === 0,
    policySupportAllowed: failed.length === 0 && !restrictedState && !input.usedForPolicySupport,
    failed,
    replayKey: tier13ReplayKey(["vector", input.collection, input.quarantineState, failed.join(",")]),
  };
}

export function validateConstitutionCompilation(input: Tier13CompilationInput) {
  const failedGates = [
    input.sourceValid ? "" : "source_validation",
    input.typeValid ? "" : "type_validation",
    input.staticInvariantsValid ? "" : "static_invariant_validation",
    input.formalValid ? "" : "formal_validation",
    input.simulationValid ? "" : "simulation_validation",
    input.identityValid ? "" : "identity_validation",
    input.epistemicValid ? "" : "epistemic_validation",
    input.activationValid ? "" : "activation_validation",
    input.artifactHashes.length > 0 ? "" : "artifact_hashes",
  ].filter(Boolean);
  const merkleRoot = tier13ReplayKey(["bundle", ...input.artifactHashes.sort()]);

  return {
    bundleEmittable: failedGates.length === 0,
    failedGates,
    merkleRoot,
    replayKey: tier13ReplayKey(["compile", failedGates.join(","), merkleRoot]),
  };
}

export function validateTier13RestoreDrill(input: Tier13RestoreDrillInput) {
  const coreRestored =
    input.constitutionRestored &&
    input.authorityRestored &&
    input.claimsRestored &&
    input.evidenceRestored &&
    input.auditRestored;
  const failed = [
    coreRestored ? "" : "core_restore_order",
    input.graphDigestMatched ? "" : "graph_digest",
    input.eventReplayVerified ? "" : "event_replay",
    !input.optionalProjectionsRestoredBeforeCore ? "" : "optional_projection_order",
  ].filter(Boolean);

  return {
    drillPassed: failed.length === 0,
    coreRestored,
    failed,
    replayKey: tier13ReplayKey(["restore", failed.join(","), coreRestored]),
  };
}

export function getTier13ExecutableCatalog() {
  return {
    boundedContexts: tier13BoundedContexts,
    ontologyClasses: tier13OntologyClasses,
    relationshipContracts: tier13RelationshipContracts,
    graphLabels: tier13GraphLabels,
    vectorCollections: tier13VectorCollections,
    apiGroups: tier13ApiGroups,
    eventTopics: tier13EventTopics,
    commandFamilies: tier13CommandFamilies,
    requiredEvents: tier13RequiredEvents,
    storageContracts: tier13StorageContracts,
    verificationMappings: tier13VerificationMappings,
    openProblems: tier13OpenProblemsRegistry,
    replayKey: tier13ReplayKey([
      "catalog",
      tier13BoundedContexts.length,
      tier13RelationshipContracts.length,
      tier13ApiGroups.length,
      tier13EventTopics.length,
      tier13OpenProblemsRegistry.length,
    ]),
  };
}
