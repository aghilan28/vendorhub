import { describe, expect, it } from "vitest";
import {
  assessConstitutionMutation,
  auditTier13AcceptanceCoverage,
  buildMessageEnvelope,
  calculateInstitutionalEntropy,
  calculateKnowledgeLossRisk,
  calculateLegitimacy,
  certifySimulationRun,
  checkQuorumSmtObligation,
  computeFitness,
  computeMetricContract,
  detectKnowledgeDrift,
  detectOntologyCorruption,
  evaluateProvenance,
  getTier13ExecutableCatalog,
  tier13RfcSectionTrace,
  validateArchiveReplicaInvariant,
  validateConstitutionCompilation,
  validateGraphClaimInvariant,
  validateGraphDecisionInvariant,
  validateTier13CommandRequest,
  validateTier13RestoreDrill,
  validateTier13VectorRetrieval,
  transitionCivilizationalState,
  transitionInstitutionalLifecycle,
  transitionKnowledgeLifecycle,
  updateTrustReputation,
  verifyFormalObligations,
} from "@/lib/tier13";

describe("tier 13 architecture execution kernel", () => {
  it("keeps every RFC section traceable to executable artifacts", () => {
    expect(tier13RfcSectionTrace).toHaveLength(50);
    expect(tier13RfcSectionTrace[0].primaryInvariant).toBe("RFC13-S01-Mission-and-Scope");
    expect(tier13RfcSectionTrace.every((section) => section.artifacts.length > 0)).toBe(true);

    const acceptance = auditTier13AcceptanceCoverage();

    expect(acceptance.accepted).toBe(true);
    expect(acceptance.missing).toEqual([]);
  });

  it("materializes Tier 13 RFC catalogs for contexts, APIs, events, storage, and verification", () => {
    const catalog = getTier13ExecutableCatalog();

    expect(catalog.boundedContexts).toHaveLength(16);
    expect(catalog.boundedContexts.every((context) => context.entities.length > 0)).toBe(true);
    expect(catalog.boundedContexts.every((context) => context.verificationRequirements.length > 0)).toBe(true);
    expect(catalog.ontologyClasses).toContain("Civilization");
    expect(catalog.relationshipContracts).toHaveLength(19);
    expect(catalog.graphLabels).toContain("SimulationRun");
    expect(catalog.vectorCollections).toContain("tier13_open_problems_v1");
    expect(catalog.apiGroups.map((group) => group.path)).toContain("/v1/constitutional/*");
    expect(catalog.eventTopics).toContain("tier13.constitution.events.v1");
    expect(catalog.commandFamilies).toContain("activate constitution");
    expect(catalog.requiredEvents).toContain("RollbackVerified");
    expect(catalog.storageContracts.map((store) => store.store)).toEqual([
      "Postgres",
      "Neo4j/property graph",
      "Vector DB",
      "Object storage",
      "Lakehouse",
      "Time series",
      "Ledger",
    ]);
    expect(catalog.verificationMappings.map((mapping) => mapping.surface)).toEqual(
      expect.arrayContaining(["tla", "alloy", "smt"]),
    );
    expect(catalog.openProblems).toHaveLength(20);
  });

  it("enforces knowledge provenance and lifecycle promotion gates", () => {
    const provenance = evaluateProvenance({
      sourceIdentityPresent: true,
      sourceAuthorityPresent: true,
      custodyChainComplete: true,
      transformationsRecorded: true,
      contentHashPresent: true,
      representationInformationPresent: true,
      licenseRightsPresent: true,
      trustScore: 0.91,
      evidenceClass: "strongly_supported",
    });
    const blockedPromotion = transitionKnowledgeLifecycle({
      state: "validated",
      nextState: "promoted",
      highImpact: true,
      provenanceComplete: true,
      evidenceClass: "moderately_supported",
      hasContradiction: false,
      dependentPolicyCount: 0,
    });

    expect(provenance.operationallyPromotable).toBe(true);
    expect(provenance.completeness).toBe(1);
    expect(blockedPromotion.allowed).toBe(false);
    expect(blockedPromotion.promotionBlocked).toBe(true);
  });

  it("scores knowledge preservation and blocks unsafe constitutional mutation", () => {
    const loss = calculateKnowledgeLossRisk({
      carrierDecay: 0.2,
      bitCorruption: 0.15,
      formatObsolescence: 0.4,
      semanticDrift: 0.45,
      custodianFailure: 0.25,
      accessSuppression: 0.1,
      educationalDiscontinuity: 0.35,
      redundancy: 0.8,
      fixityAudit: 0.9,
      translationBridges: 0.75,
      distributedCustody: 0.85,
    });
    const mutation = assessConstitutionMutation({
      amendmentId: "amend-tier13-capture-threshold",
      trustedEvidenceRatio: 0.88,
      proofObligationsPassed: true,
      simulationPassed: true,
      simulationConfidence: 0.97,
      captureShare: 0.36,
      captureThreshold: 0.33,
      quorumParticipation: 0.72,
      quorumMinimum: 0.6,
      approvalShare: 0.7,
      approvalThreshold: 0.67,
      rollbackCoverage: 1,
      requiredRollbackCoverage: 1,
      legitimacyScore: 0.82,
      legitimacyThreshold: 0.75,
      weakensCivilizationalInvariant: false,
      supermajorityShare: 0.7,
    });

    expect(loss.state).toBe("resilient");
    expect(loss.semanticContinuityRequired).toBe(true);
    expect(mutation.activationAllowed).toBe(false);
    expect(mutation.failedGates).toContain("capture_threshold");
  });

  it("computes legitimacy, institutional evolution, and civilizational state transitions", () => {
    const legitimacy = calculateLegitimacy({
      legalValidity: 0.9,
      consentParticipation: 0.78,
      nonCoerciveCompliance: 0.83,
      trust: 0.74,
      fairnessPerception: 0.72,
      outputPerformance: 0.76,
      proceduralTransparency: 0.8,
      rightsProtection: 0.88,
      appealAvailability: 0.91,
      manipulationRisk: 0.12,
      privacyRisk: 0.1,
    });
    const entropy = calculateInstitutionalEntropy({
      ruleAccumulationRate: 0.7,
      exceptionDensity: 0.8,
      processLatencyGrowth: 0.7,
      mandateOutputDistance: 0.85,
      roleOverlapIndex: 0.6,
      unreviewedRuleAge: 0.75,
    });
    const institutionState = transitionInstitutionalLifecycle({
      current: "drift",
      entropy: entropy.entropy,
      legitimacy: 0.38,
      adaptability: 0.4,
      captureThreat: 0.42,
      emergencyActive: false,
      recoveryCapacity: 0.3,
    });
    const civilizationState = transitionCivilizationalState({
      current: "legitimacy_crisis",
      stress: 0.82,
      bufferAdequacy: 0.25,
      institutionalLegitimacy: 0.28,
      adaptiveCapacity: 0.32,
      cascadeRisk: 0.68,
      memoryContinuity: 0.61,
      recoveryCapacity: 0.45,
    });

    expect(legitimacy.state).toBe("legitimate");
    expect(legitimacy.automationAllowed).toBe(true);
    expect(entropy.state).toBe("drift");
    expect(institutionState).toBe("capture_risk");
    expect(civilizationState).toBe("cascading_failure");
  });

  it("certifies simulations only with immutable frozen inputs and reports epistemic attacks", () => {
    const simulation = certifySimulationRun({
      scenarioHashPresent: true,
      inputSnapshotHashPresent: true,
      seedRecorded: true,
      outputDigestPresent: true,
      invariantReportPassed: true,
      uncertaintyReportPresent: true,
      frozenInputs: [
        "constitution",
        "authority_graph",
        "policy_graph",
        "knowledge_graph",
        "resource_state",
        "metric_definitions",
        "shock_parameters",
      ],
    });
    const ontology = detectOntologyCorruption({
      relationDrift: 0.5,
      embeddingDisplacement: 0.45,
      classMergeSplitImpact: 0.62,
      ambiguousTermRate: 0.2,
      rdfGraphDivergence: 0.3,
      dependentPolicyImpact: 0.55,
      untrustedEditShare: 0.4,
    });
    const drift = detectKnowledgeDrift({
      beliefDistributionShift: 0.4,
      ontologySemanticDistance: 0.55,
      sourceTrustDelta: 0.3,
      evidenceContextLoss: 0.35,
      contradictionRateDelta: 0.3,
      dependentPolicyChange: 0.5,
      repairEffectiveness: 0.1,
    });

    expect(simulation.certified).toBe(true);
    expect(ontology.quarantineRequired).toBe(true);
    expect(ontology.constitutionalReviewRequired).toBe(true);
    expect(drift.reviewRequired).toBe(true);
  });

  it("bounds reputation, formal verification, quorum, metrics, fitness, and message envelopes", () => {
    const reputation = updateTrustReputation({
      prior: 0.52,
      forecastAccuracy: 0.9,
      replicationOutcome: 0.85,
      evidenceQuality: 0.88,
      auditPenalty: 0,
      conflictPenalty: 0.05,
      maxDelta: 0.08,
    });
    const formal = verifyFormalObligations({
      obligations: [
        { id: "NoActivationWithoutProof", surface: "tla", passed: true, civilizational: true },
        { id: "NoDelegationCycle", surface: "alloy", passed: true, civilizational: false },
        { id: "QuorumArithmetic", surface: "smt", passed: true, civilizational: true },
      ],
    });
    const quorum = checkQuorumSmtObligation({
      eligiblePower: 100,
      participatingPower: 72,
      yesPower: 52,
      minimumParticipation: 0.6,
      approvalThreshold: 0.67,
      maxCoalitionShare: 0.28,
      captureThreshold: 0.33,
    });
    const metric = computeMetricContract({
      metricKey: "constitutional_health_index",
      componentValues: {
        constitutionalIntegrity: 0.9,
        rollbackCoverage: 1,
        legitimacyScore: 0.82,
        proofPassRate: 0.95,
      },
      weights: {
        constitutionalIntegrity: 0.3,
        rollbackCoverage: 0.25,
        legitimacyScore: 0.25,
        proofPassRate: 0.2,
      },
      validityLimitBreached: false,
      antiGoodhartControlsPresent: true,
    });
    const fitness = computeFitness({
      subjectId: "institution-knowledge-council",
      dimensions: {
        legitimacy: 0.78,
        effectiveness: 0.82,
        rightsProtection: 0.9,
        resilience: 0.8,
        adaptability: 0.7,
        epistemicQuality: 0.91,
        costEfficiency: 0.72,
        lowComplexity: 0.65,
        reversibility: 0.88,
        alignment: 0.86,
        sustainability: 0.77,
      },
    });
    const envelope = buildMessageEnvelope({
      messageType: "AmendmentValidated",
      aggregateType: "amendment",
      aggregateId: "amend-tier13-capture-threshold",
      sequence: 7,
      actorId: "did:kmos:formal-methods-guild",
      scope: "constitution.amendment",
      constitutionVersion: "13.0.0",
      payloadHash: "sha256:payload",
      idempotencyKey: "idem-1",
    });

    expect(reputation.delta).toBeLessThanOrEqual(0.08);
    expect(formal.passed).toBe(true);
    expect(quorum.passed).toBe(true);
    expect(metric.validForHighImpactDecision).toBe(true);
    expect(fitness.retirementAllowed).toBe(false);
    expect(envelope.signatureRequired).toBe(true);
    expect(envelope.messageId).toHaveLength(64);
  });

  it("enforces API, graph, vector, compilation, and restore invariants from RFC sections 41-49", () => {
    const command = validateTier13CommandRequest({
      messageType: "ActivateConstitution",
      aggregateType: "constitution",
      aggregateId: "constitution-13",
      sequence: 1,
      actorId: "did:kmos:constitutional-core",
      scope: "constitutional.activation",
      constitutionVersion: "13.0.0",
      payloadHash: "sha256:activation",
      idempotencyKey: "idem-activate-13",
      signaturePresent: true,
      authorityResolved: true,
      highImpact: true,
    });
    const decision = validateGraphDecisionInvariant({
      decisionId: "decision-policy-execution",
      authorityPathActive: true,
      constitutionActive: true,
      auditEnvelopePresent: true,
      appealPathAvailable: true,
    });
    const claim = validateGraphClaimInvariant({
      claimId: "claim-critical-provenance",
      highImpact: true,
      supportEdgeCount: 1,
      contradictionEdgeCount: 0,
      provenancePresent: true,
      evidenceClass: "strongly_supported",
    });
    const archive = validateArchiveReplicaInvariant({
      artifactId: "artifact-constitution-bundle",
      critical: true,
      replicaCount: 3,
      custodyJurisdictions: ["IN", "EU", "US"],
      representationInformationPresent: true,
    });
    const vector = validateTier13VectorRetrieval({
      collection: "tier13_evidence_v1",
      quarantineState: "quarantined",
      warningAttached: true,
      usedForPolicySupport: true,
      retrievalPoisoningScanFresh: true,
    });
    const compilation = validateConstitutionCompilation({
      sourceValid: true,
      typeValid: true,
      staticInvariantsValid: true,
      formalValid: true,
      simulationValid: true,
      identityValid: true,
      epistemicValid: true,
      activationValid: true,
      artifactHashes: ["hash-policy-graph", "hash-tla", "hash-smt"],
    });
    const restore = validateTier13RestoreDrill({
      constitutionRestored: true,
      authorityRestored: true,
      claimsRestored: true,
      evidenceRestored: true,
      auditRestored: true,
      graphDigestMatched: true,
      eventReplayVerified: true,
      optionalProjectionsRestoredBeforeCore: false,
    });

    expect(command.accepted).toBe(true);
    expect(decision.executable).toBe(true);
    expect(claim.policyEligible).toBe(true);
    expect(archive.survivable).toBe(true);
    expect(vector.retrievable).toBe(false);
    expect(vector.failed).toContain("automatic_policy_support");
    expect(compilation.bundleEmittable).toBe(true);
    expect(compilation.merkleRoot).toHaveLength(64);
    expect(restore.drillPassed).toBe(true);
  });
});
