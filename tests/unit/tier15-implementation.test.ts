import { describe, expect, it } from "vitest";
import {
  assessEpistemicSecurity,
  auditTier15PackageCoverage,
  auditTier15Traceability,
  buildTier15EntityEnvelope,
  calculateKnowledgeQuality,
  createUMKOGraph,
  detectKnowledgeDrift,
  evaluateCalibration,
  evaluateGovernance,
  generateHypothesis,
  migrateUMKOGraph,
  simulateDeepTimePreservation,
  tier15EntityKinds,
  tier15PackageManifests,
  tier15ResearchConcepts,
  tier15TraceabilityMatrix,
  transitionKnowledgeUnit,
  traverseUMKOGraph,
  validateDHoTT,
  validateTier15EntityEnvelope,
} from "@/lib/tier15";

describe("tier 15 meta-knowledge systems layer", () => {
  it("maps every frozen Tier 15 research concept to executable artifacts", () => {
    const audit = auditTier15Traceability();

    expect(tier15ResearchConcepts).toHaveLength(42);
    expect(tier15TraceabilityMatrix).toHaveLength(42);
    expect(tier15TraceabilityMatrix.every((row) => row.metrics.length > 0)).toBe(true);
    expect(tier15TraceabilityMatrix.every((row) => row.eventStream.length > 0)).toBe(true);
    expect(tier15TraceabilityMatrix.every((row) => row.securityLayer.length > 0)).toBe(true);
    expect(audit.accepted).toBe(true);
    expect(audit.missing).toEqual([]);
  });

  it("materializes every required package as a non-empty bounded context manifest", () => {
    const audit = auditTier15PackageCoverage();

    expect(tier15PackageManifests).toHaveLength(30);
    expect(audit.accepted).toBe(true);
    expect(audit.missing).toEqual([]);
    expect(audit.empty).toEqual([]);
    expect(audit.storageSurfaces).toEqual(["PostgreSQL", "Neo4j", "Qdrant", "Object Storage", "Hybrid Retrieval"]);
    expect(audit.apiSurfaces).toEqual(["REST", "gRPC", "GraphQL"]);
    expect(audit.observabilitySurfaces).toEqual(["OpenTelemetry", "Prometheus", "Grafana", "Jaeger"]);
    expect(audit.verificationSurfaces).toEqual(expect.arrayContaining(["TLA+", "Alloy", "SMT", "chaos-tests"]));
  });

  it("enforces UMKO envelope invariants and graph traversal/versioning", () => {
    const entity = buildTier15EntityEnvelope({
      id: "ku:tier15:meta-knowledge",
      kind: "KnowledgeUnit",
      tau: 15,
      confidence: 0.91,
      trustScore: 0.88,
      lineage: ["tier14"],
    });
    const validation = validateTier15EntityEnvelope(entity);
    const graph = createUMKOGraph();
    const traversal = traverseUMKOGraph("umko:KnowledgeUnit");
    const migration = migrateUMKOGraph(1, 2);

    expect(validation.valid).toBe(true);
    expect(graph.nodes).toHaveLength(tier15EntityKinds.length);
    expect(traversal.reachable).toContain("umko:ValidationProtocol");
    expect(migration.reversible).toBe(true);
  });

  it("executes auditable lifecycle state transitions with immutable replayable events", () => {
    const transition = transitionKnowledgeUnit({
      id: "ku:001",
      from: "HYPOTHESIZED",
      to: "VALIDATED",
      actor: "tier15-validation-engine",
      evidenceScore: 0.86,
      securityScore: 0.81,
      governanceScore: 0.77,
      tau: 15,
    });

    expect(transition.accepted).toBe(true);
    expect(transition.event.type).toBe("KnowledgeValidated");
    expect(transition.event.immutable).toBe(true);
    expect(transition.event.replayable).toBe(true);
  });

  it("runs validation, calibration, drift, DHoTT, and quality engines", () => {
    const validation = evaluateCalibration({ forecasts: [0.8, 0.7, 0.2, 0.1], outcomes: [1, 1, 0, 0] });
    const drift = detectKnowledgeDrift({
      previous: [0.1, 0.2, 0.3],
      current: [0.18, 0.31, 0.4],
      intrinsicPressure: 0.4,
      extrinsicPressure: 0.5,
    });
    const dhott = validateDHoTT({ tauVariance: 0, driftMagnitude: 0, ruptureMagnitude: 0, healingEvidence: 0 });
    const quality = calculateKnowledgeQuality({
      truthfulness: 0.9,
      predictivePower: 0.84,
      reproducibility: 0.86,
      explanatoryPower: 0.78,
      transferability: 0.75,
      robustness: 0.82,
    });

    expect(validation.predictiveAccuracy).toBeGreaterThan(0.9);
    expect(validation.conformalValid).toBe(true);
    expect(validation.vennAbersReady).toBe(true);
    expect(drift.state).toBe("VERIFIED");
    expect(dhott.standardHoTTRecovered).toBe(true);
    expect(dhott.typeEvolutionValid).toBe(true);
    expect(quality.accepted).toBe(true);
  });

  it("runs epistemic security, governance, discovery, and deep-time preservation engines", () => {
    const security = assessEpistemicSecurity({
      provenanceCompleteness: 0.72,
      embeddingShift: 0.62,
      narrativeCoordination: 0.7,
      accessAnomaly: 0.55,
      memoryGap: 0.35,
    });
    const governance = evaluateGovernance({
      ruleCompliance: 0.82,
      contributionDiversity: 0.76,
      conflictResolution: 0.74,
      accessFairness: 0.8,
    });
    const discovery = generateHypothesis({
      contradictionDensity: 0.7,
      evidenceNovelty: 0.78,
      causalSignal: 0.66,
      experimentFeasibility: 0.72,
    });
    const preservation = simulateDeepTimePreservation({
      years: 10000,
      mediumDurability: 0.94,
      redundancy: 0.9,
      custodyDiversity: 0.86,
      migrationReadiness: 0.8,
      recoveryFidelity: 0.88,
    });

    expect(security.threatDetected).toBe(true);
    expect(governance.gkcCompliant).toBe(true);
    expect(governance.iadFit).toBe(true);
    expect(discovery.popperFalsifiable).toBe(true);
    expect(discovery.autodiscoveryPriority).toBe(true);
    expect(preservation.mediumReady).toBe(true);
    expect(preservation.migrationRequired).toBe(true);
  });
});
