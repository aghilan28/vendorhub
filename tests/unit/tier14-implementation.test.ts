import { describe, expect, it } from "vitest";
import {
  assessCollectiveIntelligenceRisk,
  assessLearningSystem,
  assessMemoryHorizon,
  auditTier14PackageCoverage,
  auditTier14Traceability,
  buildTier14EntityEnvelope,
  calculateCrossEntropy,
  calculateJensenShannonDivergence,
  calculateKLDivergence,
  calculateMinimumDescriptionLength,
  calculateShannonEntropy,
  calculateUniversalIntelligenceIndex,
  detectIntelligenceFailure,
  simulateTier14Runtime,
  tier14PackageManifests,
  tier14ResearchConcepts,
  tier14TraceabilityMatrix,
  tier14UniversalEntities,
  validateTier14EntityEnvelope,
} from "@/lib/tier14";

describe("tier 14 intelligence operating system kernel", () => {
  it("maps every frozen Tier 14 research concept to executable artifacts", () => {
    const audit = auditTier14Traceability();

    expect(tier14ResearchConcepts).toHaveLength(31);
    expect(tier14TraceabilityMatrix).toHaveLength(31);
    expect(tier14TraceabilityMatrix.every((row) => row.metrics.length > 0)).toBe(true);
    expect(tier14TraceabilityMatrix.every((row) => row.verificationRules.length > 0)).toBe(true);
    expect(audit.accepted).toBe(true);
    expect(audit.missing).toEqual([]);
  });

  it("materializes every required repository package as a non-empty bounded context manifest", () => {
    const audit = auditTier14PackageCoverage();

    expect(tier14PackageManifests).toHaveLength(27);
    expect(audit.accepted).toBe(true);
    expect(audit.missing).toEqual([]);
    expect(audit.empty).toEqual([]);
    expect(audit.storageSurfaces).toEqual(["PostgreSQL", "Neo4j", "Qdrant", "OpenTelemetry", "Prometheus", "Grafana", "Jaeger"]);
    expect(audit.verificationSurfaces).toEqual(expect.arrayContaining(["TLA+", "Alloy", "SMT"]));
    expect(audit.universalEntities).toEqual(tier14UniversalEntities);
  });

  it("enforces the universal entity envelope invariants", () => {
    const entity = buildTier14EntityEnvelope({
      uuid: "018f-tier14-intelligence-system",
      sourceReference: "tier14-research-corpus",
      provenance: ["phase0-traceability"],
      confidence: 0.93,
      trustScore: 0.88,
    });
    const validation = validateTier14EntityEnvelope(entity);

    expect(entity.verificationState).toBe("verified");
    expect(validation.valid).toBe(true);
    expect(validation.failed).toEqual([]);
  });

  it("executes information theory measures for entropy, divergence, compression, and description length", () => {
    const entropy = calculateShannonEntropy({ probabilities: [0.25, 0.25, 0.25, 0.25] });
    const crossEntropy = calculateCrossEntropy({ p: [0.5, 0.5], q: [0.9, 0.1] });
    const kl = calculateKLDivergence({ p: [0.5, 0.5], q: [0.9, 0.1] });
    const js = calculateJensenShannonDivergence({ p: [1, 0], q: [0, 1] });
    const mdl = calculateMinimumDescriptionLength({ modelBits: 128, dataBits: 1024, compressionRatio: 0.5 });

    expect(entropy.entropy).toBe(2);
    expect(entropy.normalizedEntropy).toBe(1);
    expect(crossEntropy.crossEntropy).toBeGreaterThan(1);
    expect(kl.finite).toBe(true);
    expect(js.bounded).toBe(true);
    expect(mdl.compressedEnoughForArchive).toBe(true);
  });

  it("scores learning, collective intelligence, failure dynamics, memory, simulations, and universal intelligence", () => {
    const learning = assessLearningSystem({
      examplesSeen: 10000,
      hypothesisClassSize: 128,
      empiricalRisk: 0.08,
      confidence: 0.95,
      transferSimilarity: 0.72,
      priorTasks: 8,
      forgettingPressure: 0.25,
      interventionCost: 120,
    });
    const collective = assessCollectiveIntelligenceRisk({
      trustCentralization: 0.72,
      dissentSuppression: 0.64,
      coordinationLatency: 0.4,
      eliteControlShare: 0.42,
      cascadeCorrelation: 0.68,
      privatePreferenceGap: 0.5,
    });
    const failure = detectIntelligenceFailure({
      proxyCorrelation: 0.45,
      proxyOptimizationIntensity: 0.86,
      targetOutcomeDelta: -0.18,
      rewardChannelAccess: 0.5,
      specificationAmbiguity: 0.62,
      feedbackDelay: 0.5,
    });
    const memory = assessMemoryHorizon({
      years: 1000,
      redundancy: 0.9,
      fixityAudits: 0.85,
      semanticRefreshRate: 0.88,
      custodyDiversity: 0.92,
      substrateObsolescence: 0.2,
      institutionalContinuity: 0.86,
    });
    const simulation = simulateTier14Runtime({
      agentCount: 1000000,
      interactionDensity: 0.55,
      heterogeneity: 0.72,
      shockIntensity: 0.45,
      steps: 10000,
    });
    const index = calculateUniversalIntelligenceIndex({
      generality: 0.82,
      adaptability: 0.78,
      forecasting: 0.76,
      transferability: 0.74,
      robustness: 0.81,
      coordination: 0.77,
      exploration: 0.72,
      failureResistance: 0.79,
    });

    expect(learning.generalization).toBeGreaterThan(0.85);
    expect(collective.reviewRequired).toBe(true);
    expect(failure.interventionRequired).toBe(true);
    expect(memory.civilizationalMemoryReady).toBe(true);
    expect(simulation.partitioningRequired).toBe(true);
    expect(index.band).toBe("broad");
  });
});
