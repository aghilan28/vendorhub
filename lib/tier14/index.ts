import { createHash } from "crypto";
import {
  getTier14ConceptLabel,
  tier14PackageManifests,
  tier14ResearchConcepts,
  tier14StorageSurfaces,
  tier14TraceabilityMatrix,
  tier14UniversalEntities,
  tier14VerificationSurfaces,
} from "./contracts";
import type {
  CollectiveRiskInput,
  DivergenceInput,
  FailureAnalysisInput,
  InformationDistribution,
  LearningAssessmentInput,
  MemoryHorizonInput,
  SimulationRuntimeInput,
  Tier14EntityEnvelope,
  Tier14PackageManifest,
  UniversalIndexInput,
} from "./types";

export type * from "./types";
export * from "./contracts";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 6) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function log2(value: number) {
  return Math.log(value) / Math.log(2);
}

function normalize(probabilities: number[]) {
  const sanitized = probabilities.map((value) => Math.max(0, value));
  const total = sanitized.reduce((sum, value) => sum + value, 0);
  return total === 0 ? sanitized.map(() => 0) : sanitized.map((value) => value / total);
}

function hash(parts: Array<string | number | boolean>) {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

export function buildTier14EntityEnvelope(input: {
  uuid: string;
  sourceReference: string;
  provenance: string[];
  confidence: number;
  trustScore: number;
  lineage?: string[];
  version?: number;
}): Tier14EntityEnvelope {
  const lineage = input.lineage ?? [];
  const valid =
    input.uuid.length > 0 &&
    input.sourceReference.length > 0 &&
    input.provenance.length > 0 &&
    input.confidence >= 0 &&
    input.trustScore >= 0;

  return {
    uuid: input.uuid,
    version: input.version ?? 1,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    lineage,
    provenance: input.provenance,
    confidence: round(clamp(input.confidence)),
    verificationState: valid ? "verified" : "failed",
    trustScore: round(clamp(input.trustScore)),
    sourceReference: input.sourceReference,
  };
}

export function validateTier14EntityEnvelope(entity: Tier14EntityEnvelope) {
  const failed = [
    entity.uuid ? "" : "uuid",
    entity.version > 0 ? "" : "version",
    entity.createdAt ? "" : "created_at",
    entity.updatedAt ? "" : "updated_at",
    Array.isArray(entity.lineage) ? "" : "lineage",
    entity.provenance.length > 0 ? "" : "provenance",
    entity.confidence >= 0 && entity.confidence <= 1 ? "" : "confidence",
    entity.trustScore >= 0 && entity.trustScore <= 1 ? "" : "trust_score",
    entity.sourceReference ? "" : "source_reference",
  ].filter(Boolean);

  return {
    valid: failed.length === 0 && entity.verificationState !== "failed",
    failed,
    replayKey: hash(["tier14-entity", entity.uuid, failed.join(",")]),
  };
}

export function calculateShannonEntropy(input: InformationDistribution) {
  const probabilities = normalize(input.probabilities);
  const entropy = probabilities.reduce((sum, probability) => {
    return probability === 0 ? sum : sum - probability * log2(probability);
  }, 0);

  return {
    entropy: round(entropy),
    normalizedEntropy: probabilities.length <= 1 ? 0 : round(entropy / log2(probabilities.length)),
    replayKey: hash(["entropy", probabilities.map((value) => value.toFixed(8)).join(",")]),
  };
}

export function calculateCrossEntropy(input: DivergenceInput) {
  const p = normalize(input.p);
  const q = normalize(input.q);
  const epsilon = 1e-12;
  const crossEntropy = p.reduce((sum, probability, index) => {
    return probability === 0 ? sum : sum - probability * log2(Math.max(q[index] ?? 0, epsilon));
  }, 0);

  return {
    crossEntropy: round(crossEntropy),
    replayKey: hash(["cross-entropy", p.join(","), q.join(",")]),
  };
}

export function calculateKLDivergence(input: DivergenceInput) {
  const p = normalize(input.p);
  const q = normalize(input.q);
  const epsilon = 1e-12;
  const divergence = p.reduce((sum, probability, index) => {
    return probability === 0 ? sum : sum + probability * log2(probability / Math.max(q[index] ?? 0, epsilon));
  }, 0);

  return {
    divergence: round(divergence),
    finite: Number.isFinite(divergence),
    replayKey: hash(["kl", p.join(","), q.join(",")]),
  };
}

export function calculateJensenShannonDivergence(input: DivergenceInput) {
  const p = normalize(input.p);
  const q = normalize(input.q);
  const m = p.map((value, index) => (value + (q[index] ?? 0)) / 2);
  const divergence = (calculateKLDivergence({ p, q: m }).divergence + calculateKLDivergence({ p: q, q: m }).divergence) / 2;

  return {
    divergence: round(divergence),
    bounded: divergence >= 0 && divergence <= 1,
    replayKey: hash(["js", p.join(","), q.join(",")]),
  };
}

export function calculateMinimumDescriptionLength(input: { modelBits: number; dataBits: number; compressionRatio: number }) {
  const mdl = Math.max(0, input.modelBits) + Math.max(0, input.dataBits) * clamp(input.compressionRatio, 0, 10);

  return {
    descriptionLength: round(mdl),
    compressedEnoughForArchive: input.compressionRatio <= 0.65 && mdl > 0,
    replayKey: hash(["mdl", input.modelBits, input.dataBits, input.compressionRatio]),
  };
}

export function assessLearningSystem(input: LearningAssessmentInput) {
  const pacBound = Math.sqrt((Math.log(Math.max(input.hypothesisClassSize, 2)) + Math.log(2 / Math.max(input.confidence, 0.000001))) / Math.max(input.examplesSeen, 1));
  const generalization = clamp(1 - input.empiricalRisk - pacBound);
  const transferability = clamp(input.transferSimilarity * (1 - 1 / Math.max(input.priorTasks + 1, 1)));
  const forgettingRate = clamp(input.forgettingPressure * (1 - transferability));
  const learningCost = clamp(input.interventionCost / Math.max(input.examplesSeen, 1));

  return {
    sampleEfficiency: round(clamp(1 / Math.sqrt(Math.max(input.examplesSeen, 1)) + transferability)),
    generalization: round(generalization),
    transferability: round(transferability),
    adaptationRate: round(clamp(generalization * 0.55 + transferability * 0.45)),
    forgettingRate: round(forgettingRate),
    learningCost: round(learningCost),
    replayKey: hash(["learning", input.examplesSeen, input.hypothesisClassSize, input.empiricalRisk]),
  };
}

export function assessCollectiveIntelligenceRisk(input: CollectiveRiskInput) {
  const groupthink = clamp(input.dissentSuppression * 0.55 + input.trustCentralization * 0.25 + input.cascadeCorrelation * 0.2);
  const coordinationCollapse = clamp(input.coordinationLatency * 0.5 + (1 - input.trustCentralization) * 0.25 + input.privatePreferenceGap * 0.25);
  const eliteCapture = clamp(input.eliteControlShare * 0.65 + input.trustCentralization * 0.2 + input.dissentSuppression * 0.15);

  return {
    groupthink: round(groupthink),
    coordinationCollapse: round(coordinationCollapse),
    informationCascade: round(clamp(input.cascadeCorrelation * 0.75 + input.trustCentralization * 0.25)),
    preferenceFalsification: round(clamp(input.privatePreferenceGap * 0.7 + input.dissentSuppression * 0.3)),
    eliteCapture: round(eliteCapture),
    reviewRequired: Math.max(groupthink, coordinationCollapse, eliteCapture) >= 0.6,
    replayKey: hash(["collective-risk", input.trustCentralization, input.dissentSuppression, input.eliteControlShare]),
  };
}

export function detectIntelligenceFailure(input: FailureAnalysisInput) {
  const proxyDivergence = clamp(input.proxyOptimizationIntensity * (1 - input.proxyCorrelation) + Math.max(0, -input.targetOutcomeDelta));
  const wireheadingRisk = clamp(input.rewardChannelAccess * input.proxyOptimizationIntensity);
  const specificationGamingRisk = clamp(input.specificationAmbiguity * input.proxyOptimizationIntensity);
  const controlInstability = clamp(input.feedbackDelay * 0.45 + proxyDivergence * 0.35 + wireheadingRisk * 0.2);

  return {
    proxyDivergence: round(proxyDivergence),
    goodhartRisk: round(clamp(proxyDivergence * 0.7 + input.proxyOptimizationIntensity * 0.3)),
    campbellRisk: round(clamp(input.proxyOptimizationIntensity * input.specificationAmbiguity)),
    wireheadingRisk: round(wireheadingRisk),
    specificationGamingRisk: round(specificationGamingRisk),
    optimizationFailureRisk: round(controlInstability),
    interventionRequired: Math.max(proxyDivergence, wireheadingRisk, specificationGamingRisk, controlInstability) >= 0.55,
    replayKey: hash(["failure", input.proxyCorrelation, input.proxyOptimizationIntensity, input.specificationAmbiguity]),
  };
}

export function assessMemoryHorizon(input: MemoryHorizonInput) {
  const horizonPenalty = Math.log10(input.years) / 4;
  const durability =
    input.redundancy * 0.22 +
    input.fixityAudits * 0.18 +
    input.semanticRefreshRate * 0.2 +
    input.custodyDiversity * 0.18 +
    input.institutionalContinuity * 0.22 -
    input.substrateObsolescence * horizonPenalty;
  const score = clamp(durability);

  return {
    horizonYears: input.years,
    persistenceScore: round(score),
    decayRisk: round(clamp(1 - score)),
    civilizationalMemoryReady: input.years >= 100 && score >= 0.72,
    replayKey: hash(["memory", input.years, score.toFixed(8)]),
  };
}

export function simulateTier14Runtime(input: SimulationRuntimeInput) {
  const scalePenalty = Math.log10(input.agentCount) / 6;
  const complexity = clamp(input.interactionDensity * 0.35 + input.heterogeneity * 0.25 + input.shockIntensity * 0.25 + scalePenalty * 0.15);
  const stability = clamp(1 - complexity * 0.65 + Math.min(input.steps, 10000) / 50000);

  return {
    agentCount: input.agentCount,
    complexity: round(complexity),
    stability: round(stability),
    partitioningRequired: input.agentCount >= 100000 || complexity >= 0.65,
    invariantSamplingRate: input.agentCount >= 100000 ? 0.01 : input.agentCount >= 10000 ? 0.05 : 1,
    replayKey: hash(["simulation", input.agentCount, input.steps, complexity.toFixed(8)]),
  };
}

export function calculateUniversalIntelligenceIndex(input: UniversalIndexInput) {
  const score =
    input.generality * 0.15 +
    input.adaptability * 0.14 +
    input.forecasting * 0.13 +
    input.transferability * 0.12 +
    input.robustness * 0.14 +
    input.coordination * 0.12 +
    input.exploration * 0.1 +
    input.failureResistance * 0.1;

  return {
    index: round(clamp(score)),
    band: score >= 0.8 ? "universal" : score >= 0.62 ? "broad" : score >= 0.42 ? "situated" : "fragile",
    replayKey: hash(["uii", score.toFixed(8)]),
  };
}

export function auditTier14Traceability() {
  const missing = tier14TraceabilityMatrix
    .filter((row) => {
      return (
        !row.domainEntity ||
        !row.aggregate ||
        !row.service ||
        !row.workflow ||
        !row.event ||
        !row.api ||
        !row.storageSchema ||
        !row.graphSchema ||
        !row.vectorRepresentation ||
        row.metrics.length === 0 ||
        row.dashboards.length === 0 ||
        row.tests.length === 0 ||
        row.verificationRules.length === 0
      );
    })
    .map((row) => row.researchConcept);

  return {
    accepted: missing.length === 0 && tier14TraceabilityMatrix.length === tier14ResearchConcepts.length,
    missing,
    rows: tier14TraceabilityMatrix.length,
    concepts: tier14ResearchConcepts.map((concept) => getTier14ConceptLabel(concept)),
    replayKey: hash(["traceability", tier14TraceabilityMatrix.length, missing.join(",")]),
  };
}

export function auditTier14PackageCoverage(manifests: Tier14PackageManifest[] = tier14PackageManifests) {
  const required = [
    "intelligence-core",
    "information-theory",
    "knowledge-representation",
    "learning-systems",
    "evolutionary-intelligence",
    "collective-intelligence",
    "intelligence-economics",
    "mechanism-design",
    "human-ai-intelligence",
    "recursive-intelligence",
    "failure-analysis",
    "intelligence-metrics",
    "substrate-modeling",
    "simulation-runtime",
    "memory-systems",
    "knowledge-preservation",
    "frontier-discovery",
    "open-problems",
    "meta-synthesis",
    "graph-engine",
    "vector-engine",
    "verification",
    "observability",
    "security",
    "orchestration",
    "api",
    "infrastructure",
  ];
  const names = manifests.map((manifest) => manifest.packageName);
  const missing = required.filter((name) => !names.includes(name));
  const empty = manifests
    .filter((manifest) => {
      return (
        manifest.entities.length === 0 ||
        manifest.services.length === 0 ||
        manifest.workflows.length === 0 ||
        manifest.events.length === 0 ||
        manifest.apiContracts.length === 0 ||
        manifest.storageSchemas.length === 0 ||
        manifest.graphLabels.length === 0 ||
        manifest.vectorCollections.length === 0 ||
        manifest.metrics.length === 0 ||
        manifest.dashboards.length === 0 ||
        manifest.verificationRules.length === 0
      );
    })
    .map((manifest) => manifest.packageName);

  return {
    accepted: missing.length === 0 && empty.length === 0 && manifests.length === required.length,
    missing,
    empty,
    storageSurfaces: tier14StorageSurfaces,
    verificationSurfaces: tier14VerificationSurfaces,
    universalEntities: tier14UniversalEntities,
    replayKey: hash(["package-coverage", manifests.length, missing.join(","), empty.join(",")]),
  };
}
