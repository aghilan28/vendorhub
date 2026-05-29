import { createHash } from "crypto";
import {
  getTier15ConceptLabel,
  tier15ApiSurfaces,
  tier15EntityKinds,
  tier15EventTypes,
  tier15ObservabilitySurfaces,
  tier15PackageManifests,
  tier15RequiredPackages,
  tier15ResearchConcepts,
  tier15StorageSurfaces,
  tier15TraceabilityMatrix,
  tier15VerificationSurfaces,
} from "./contracts";
import type {
  DiscoveryInput,
  DriftInput,
  ForecastInput,
  GovernanceInput,
  KnowledgeTransitionInput,
  PreservationInput,
  SecurityInput,
  Tier15EntityEnvelope,
  Tier15GraphEdge,
  Tier15GraphNode,
  Tier15KnowledgeState,
  Tier15PackageManifest,
} from "./types";

export type * from "./types";
export * from "./contracts";

const allowedTransitions: Record<Tier15KnowledgeState, Tier15KnowledgeState[]> = {
  DRAFT: ["HYPOTHESIZED", "DEPRECATED"],
  HYPOTHESIZED: ["VALIDATED", "RUPTURED", "DEPRECATED"],
  VALIDATED: ["VERIFIED", "DRIFTED", "RUPTURED"],
  VERIFIED: ["DRIFTED", "ARCHIVED", "DEPRECATED"],
  DRIFTED: ["HEALED", "RUPTURED", "ARCHIVED"],
  RUPTURED: ["HEALED", "DEPRECATED"],
  HEALED: ["VALIDATED", "VERIFIED", "ARCHIVED"],
  ARCHIVED: ["DEPRECATED"],
  DEPRECATED: [],
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 6) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function hash(parts: Array<string | number | boolean>) {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

function distance(a: number[], b: number[]) {
  const length = Math.max(a.length, b.length, 1);
  const sum = Array.from({ length }).reduce<number>((acc, _, index) => acc + ((a[index] ?? 0) - (b[index] ?? 0)) ** 2, 0);
  return Math.sqrt(sum);
}

export function buildTier15EntityEnvelope(input: Partial<Tier15EntityEnvelope> & Pick<Tier15EntityEnvelope, "id" | "kind">): Tier15EntityEnvelope {
  return {
    id: input.id,
    kind: input.kind,
    version: input.version ?? 1,
    tau: input.tau ?? 0,
    lineage: input.lineage ?? [],
    confidence: round(clamp(input.confidence ?? 0.75)),
    verificationState: input.verificationState ?? "validated",
    trustScore: round(clamp(input.trustScore ?? 0.75)),
    sourceReferences: input.sourceReferences ?? ["tier15-frozen-research-corpus"],
    securityState: input.securityState ?? "trusted",
    governanceState: input.governanceState ?? "open",
  };
}

export function validateTier15EntityEnvelope(entity: Tier15EntityEnvelope) {
  const failed = [
    entity.id ? "" : "id",
    tier15EntityKinds.includes(entity.kind) ? "" : "kind",
    entity.version > 0 ? "" : "version",
    Number.isFinite(entity.tau) ? "" : "tau",
    Array.isArray(entity.lineage) ? "" : "lineage",
    entity.confidence >= 0 && entity.confidence <= 1 ? "" : "confidence",
    entity.trustScore >= 0 && entity.trustScore <= 1 ? "" : "trustScore",
    entity.sourceReferences.length > 0 ? "" : "sourceReferences",
    entity.securityState !== "compromised" ? "" : "securityState",
  ].filter(Boolean);
  return { valid: failed.length === 0, failed, replayKey: hash(["tier15-envelope", entity.id, failed.join(",")]) };
}

export function createUMKOGraph() {
  const nodes: Tier15GraphNode[] = tier15EntityKinds.map((kind) => ({ id: `umko:${kind}`, kind, version: 1 }));
  const edges: Tier15GraphEdge[] = [
    ["KnowledgeUnit", "ValidationProtocol", "VALIDATED_BY"],
    ["KnowledgeUnit", "EvolutionEvent", "EVOLVED_BY"],
    ["KnowledgeUnit", "GovernancePolicy", "GOVERNED_BY"],
    ["KnowledgeUnit", "DiscoveryAgent", "DISCOVERED_BY"],
    ["KnowledgeUnit", "PreservationMedium", "PRESERVED_IN"],
    ["KnowledgeUnit", "EpistemicSecurityGuard", "GUARDED_BY"],
    ["KnowledgeUnit", "ConceptSignature", "SIGNED_BY"],
    ["KnowledgeLineage", "KnowledgeUnit", "DESCENDS_FROM"],
    ["KnowledgeCommons", "KnowledgeUnit", "COMMONS_MEMBER"],
  ].map(([from, to, relation], index) => ({
    from: `umko:${from}`,
    to: `umko:${to}`,
    relation: relation as Tier15GraphEdge["relation"],
    tau: index,
  }));
  return { nodes, edges, version: hash(["umko", nodes.length, edges.length]) };
}

export function traverseUMKOGraph(start: string, relation?: Tier15GraphEdge["relation"]) {
  const graph = createUMKOGraph();
  const visited = new Set<string>();
  const queue = [start];
  while (queue.length > 0) {
    const node = queue.shift() as string;
    if (visited.has(node)) continue;
    visited.add(node);
    graph.edges
      .filter((edge) => edge.from === node && (!relation || edge.relation === relation))
      .forEach((edge) => queue.push(edge.to));
  }
  return { start, reachable: Array.from(visited), edgeCount: graph.edges.length, replayKey: hash(["umko-traverse", start, relation ?? "*"]) };
}

export function migrateUMKOGraph(fromVersion: number, toVersion: number) {
  const graph = createUMKOGraph();
  return {
    fromVersion,
    toVersion,
    migrations: graph.nodes.map((node) => `${node.kind}:v${fromVersion}->v${toVersion}`),
    reversible: fromVersion > 0 && toVersion >= fromVersion,
    replayKey: hash(["umko-migrate", fromVersion, toVersion, graph.version]),
  };
}

export function transitionKnowledgeUnit(input: KnowledgeTransitionInput) {
  const allowed = allowedTransitions[input.from].includes(input.to);
  const guardScore = clamp(input.evidenceScore * 0.45 + input.securityScore * 0.3 + input.governanceScore * 0.25);
  const accepted = allowed && guardScore >= 0.62;
  const eventType =
    input.to === "VALIDATED"
      ? "KnowledgeValidated"
      : input.to === "VERIFIED"
        ? "KnowledgeVerified"
        : input.to === "DRIFTED"
          ? "KnowledgeDrifted"
          : input.to === "RUPTURED"
            ? "KnowledgeRuptured"
            : input.to === "HEALED"
              ? "KnowledgeHealed"
              : input.to === "ARCHIVED"
                ? "KnowledgeArchived"
                : "KnowledgeCreated";
  const event = {
    type: eventType,
    id: hash(["event", input.id, input.from, input.to, input.tau]),
    stream: `tier15.knowledge-units.${input.id}`,
    immutable: true,
    replayable: true,
    payload: input,
  };
  return { accepted, guardScore: round(guardScore), event, auditHash: hash(["transition", event.id, accepted]) };
}

export function scoreBrier(input: ForecastInput) {
  const score =
    input.forecasts.reduce((sum, forecast, index) => sum + (clamp(forecast) - (input.outcomes[index] ?? 0)) ** 2, 0) /
    Math.max(input.forecasts.length, 1);
  return { brierScore: round(score), predictiveAccuracy: round(1 - clamp(score)), replayKey: hash(["brier", score]) };
}

export function evaluateCalibration(input: ForecastInput) {
  const brier = scoreBrier(input);
  const meanForecast = input.forecasts.reduce((sum, value) => sum + clamp(value), 0) / Math.max(input.forecasts.length, 1);
  const baseRate = input.outcomes.reduce((sum, value) => sum + value, 0) / Math.max(input.outcomes.length, 1);
  const calibrationError = Math.abs(meanForecast - baseRate);
  return {
    ...brier,
    calibrationError: round(calibrationError),
    coverage: round(clamp(1 - calibrationError)),
    truthfulness: round(clamp((1 - calibrationError) * (1 - brier.brierScore))),
    conformalValid: calibrationError <= 0.1,
    vennAbersReady: input.forecasts.length >= 4,
    eValue: round(1 / Math.max(0.000001, brier.brierScore + calibrationError)),
  };
}

export function detectKnowledgeDrift(input: DriftInput) {
  const semanticDistance = clamp(distance(input.previous, input.current) / Math.sqrt(Math.max(input.previous.length, input.current.length, 1)));
  const driftScore = clamp(semanticDistance * 0.5 + input.intrinsicPressure * 0.25 + input.extrinsicPressure * 0.25);
  return {
    semanticDistance: round(semanticDistance),
    intrinsicDrift: round(clamp(semanticDistance * input.intrinsicPressure)),
    extrinsicDrift: round(clamp(semanticDistance * input.extrinsicPressure)),
    driftScore: round(driftScore),
    state: driftScore >= 0.75 ? "RUPTURED" : driftScore >= 0.35 ? "DRIFTED" : "VERIFIED",
    replayKey: hash(["drift", semanticDistance, input.intrinsicPressure, input.extrinsicPressure]),
  };
}

export function assessEpistemicSecurity(input: SecurityInput) {
  const poisoning = clamp(input.embeddingShift * 0.4 + (1 - input.provenanceCompleteness) * 0.35 + input.accessAnomaly * 0.25);
  const narrative = clamp(input.narrativeCoordination * 0.65 + input.accessAnomaly * 0.2 + input.memoryGap * 0.15);
  const forgetting = clamp(input.memoryGap * 0.7 + (1 - input.provenanceCompleteness) * 0.3);
  const threatScore = Math.max(poisoning, narrative, forgetting);
  return {
    dataPoisoningRisk: round(poisoning),
    narrativeWarfareRisk: round(narrative),
    organizationalForgettingRisk: round(forgetting),
    threatScore: round(threatScore),
    threatDetected: threatScore >= 0.55,
    registryEvent: threatScore >= 0.55 ? "ThreatDetected" : "ThreatCleared",
    replayKey: hash(["security", poisoning, narrative, forgetting]),
  };
}

export function evaluateGovernance(input: GovernanceInput) {
  const commonsHealth = clamp(input.ruleCompliance * 0.32 + input.contributionDiversity * 0.24 + input.conflictResolution * 0.24 + input.accessFairness * 0.2);
  return {
    commonsHealth: round(commonsHealth),
    gkcCompliant: commonsHealth >= 0.7 && input.ruleCompliance >= 0.65,
    iadFit: input.conflictResolution >= 0.6 && input.accessFairness >= 0.6,
    governanceState: commonsHealth >= 0.7 ? "open" : commonsHealth >= 0.45 ? "review" : "restricted",
    replayKey: hash(["governance", commonsHealth]),
  };
}

export function generateHypothesis(input: DiscoveryInput) {
  const surprise = clamp(input.contradictionDensity * 0.35 + input.evidenceNovelty * 0.3 + input.causalSignal * 0.25 + input.experimentFeasibility * 0.1);
  return {
    hypothesisId: hash(["hypothesis", surprise, input.causalSignal]).slice(0, 16),
    bayesianSurprise: round(surprise),
    popperFalsifiable: input.experimentFeasibility >= 0.5 && input.causalSignal >= 0.4,
    autodiscoveryPriority: surprise >= 0.58,
    event: surprise >= 0.58 ? "HypothesisGenerated" : "DiscoveryValidated",
    replayKey: hash(["discovery", surprise]),
  };
}

export function simulateDeepTimePreservation(input: PreservationInput) {
  const horizonPenalty = Math.log10(input.years) / 5;
  const integrity = clamp(
    input.mediumDurability * 0.28 +
      input.redundancy * 0.22 +
      input.custodyDiversity * 0.18 +
      input.migrationReadiness * 0.16 +
      input.recoveryFidelity * 0.16 -
      horizonPenalty * 0.08,
  );
  return {
    horizonYears: input.years,
    archiveIntegrity: round(integrity),
    recoveryProbability: round(clamp(integrity * input.recoveryFidelity)),
    migrationRequired: input.years >= 1000 || input.migrationReadiness < 0.7,
    mediumReady: integrity >= 0.72,
    replayKey: hash(["preservation", input.years, integrity]),
  };
}

export function validateDHoTT(input: { tauVariance: number; driftMagnitude: number; ruptureMagnitude: number; healingEvidence: number }) {
  const standardHoTTRecovered = input.tauVariance === 0;
  const transportValid = input.driftMagnitude <= 0.5 || input.healingEvidence >= input.driftMagnitude;
  const healingVerified = input.ruptureMagnitude === 0 || input.healingEvidence >= input.ruptureMagnitude * 0.8;
  return {
    standardHoTTRecovered,
    transportValid,
    ruptureDetected: input.ruptureMagnitude >= 0.6,
    healingVerified,
    typeEvolutionValid: standardHoTTRecovered || (transportValid && healingVerified),
    replayKey: hash(["dhott", input.tauVariance, input.driftMagnitude, input.ruptureMagnitude, input.healingEvidence]),
  };
}

export function calculateKnowledgeQuality(input: {
  truthfulness: number;
  predictivePower: number;
  reproducibility: number;
  explanatoryPower: number;
  transferability: number;
  robustness: number;
}) {
  const quality =
    input.truthfulness * 0.22 +
    input.predictivePower * 0.18 +
    input.reproducibility * 0.18 +
    input.explanatoryPower * 0.15 +
    input.transferability * 0.12 +
    input.robustness * 0.15;
  return {
    knowledgeQualityIndex: round(clamp(quality)),
    knowledgeHealthScore: round(clamp(quality * 0.7 + input.robustness * 0.3)),
    knowledgeRiskScore: round(clamp(1 - quality)),
    accepted: quality >= 0.7,
    replayKey: hash(["quality", quality]),
  };
}

export function auditTier15Traceability() {
  const missing = tier15TraceabilityMatrix
    .filter(
      (row) =>
        !row.domainModel ||
        !row.storageSchema ||
        !row.graphModel ||
        !row.vectorModel ||
        !row.service ||
        !row.workflow ||
        !row.api ||
        !row.eventStream ||
        !row.securityLayer ||
        row.metrics.length === 0 ||
        !row.dashboard ||
        !row.verificationRule ||
        !row.testSuite,
    )
    .map((row) => row.researchConcept);
  return {
    accepted: missing.length === 0 && tier15TraceabilityMatrix.length === tier15ResearchConcepts.length,
    rows: tier15TraceabilityMatrix.length,
    missing,
    concepts: tier15ResearchConcepts.map((concept) => getTier15ConceptLabel(concept)),
    replayKey: hash(["tier15-traceability", tier15TraceabilityMatrix.length, missing.join(",")]),
  };
}

export function auditTier15PackageCoverage(manifests: Tier15PackageManifest[] = tier15PackageManifests) {
  const names = manifests.map((manifest) => manifest.packageName);
  const missing = tier15RequiredPackages.filter((name) => !names.includes(name));
  const empty = manifests
    .filter(
      (manifest) =>
        manifest.entities.length === 0 ||
        manifest.services.length === 0 ||
        manifest.workflows.length === 0 ||
        manifest.events.length === 0 ||
        manifest.apiContracts.length === 0 ||
        manifest.storageSchemas.length === 0 ||
        manifest.graphModels.length === 0 ||
        manifest.vectorModels.length === 0 ||
        manifest.securityLayers.length === 0 ||
        manifest.metrics.length === 0 ||
        manifest.dashboards.length === 0 ||
        manifest.verificationRules.length === 0 ||
        manifest.testSuites.length === 0,
    )
    .map((manifest) => manifest.packageName);
  return {
    accepted: missing.length === 0 && empty.length === 0 && manifests.length === tier15RequiredPackages.length,
    missing,
    empty,
    storageSurfaces: tier15StorageSurfaces,
    apiSurfaces: tier15ApiSurfaces,
    observabilitySurfaces: tier15ObservabilitySurfaces,
    verificationSurfaces: tier15VerificationSurfaces,
    eventTypes: tier15EventTypes,
    replayKey: hash(["tier15-packages", manifests.length, missing.join(","), empty.join(",")]),
  };
}
