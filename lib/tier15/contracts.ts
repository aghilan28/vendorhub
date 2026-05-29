import type { Tier15EntityKind, Tier15PackageManifest, Tier15ResearchConcept, Tier15TraceabilityRow } from "./types";

export const tier15ResearchConcepts: Tier15ResearchConcept[] = [
  "second_order_cybernetics",
  "autopoiesis",
  "eigenforms",
  "conversation_theory",
  "radical_constructivism",
  "automated_discovery",
  "robot_scientists",
  "popper",
  "autodiscovery",
  "hypothesis_generation",
  "causal_discovery",
  "forecasting_systems",
  "calibration_systems",
  "brier_scoring",
  "conformal_prediction",
  "venn_abers_calibration",
  "e_value_validation",
  "ontology_evolution",
  "taxonomy_evolution",
  "concept_drift",
  "semantic_drift",
  "intrinsic_drift",
  "extrinsic_drift",
  "gkc",
  "iad",
  "rules_in_use",
  "commons_governance",
  "epistemic_corruption",
  "belief_hijacking",
  "narrative_warfare",
  "data_poisoning",
  "organizational_forgetting",
  "dna_archives",
  "quartz_archives",
  "deep_time_storage",
  "conservation_paleobiology",
  "umko",
  "dhott",
  "state_machines",
  "invariants",
  "apis",
  "runtime_constraints",
];

export const tier15EntityKinds: Tier15EntityKind[] = [
  "KnowledgeUnit",
  "ValidationProtocol",
  "EvolutionEvent",
  "GovernancePolicy",
  "DiscoveryAgent",
  "PreservationMedium",
  "EpistemicSecurityGuard",
  "ConceptSignature",
  "KnowledgeLineage",
  "KnowledgeCommons",
];

export const tier15RequiredPackages = [
  "meta-intelligence",
  "knowledge-units",
  "knowledge-graphs",
  "knowledge-evolution",
  "knowledge-validation",
  "knowledge-governance",
  "knowledge-economics",
  "discovery-engines",
  "epistemic-security",
  "ontology-runtime",
  "concept-drift",
  "dhott-runtime",
  "forecasting",
  "conformal-engine",
  "calibration-engine",
  "commons-governance",
  "lineage-engine",
  "preservation-systems",
  "deep-time-storage",
  "knowledge-quality",
  "open-problems",
  "frontier-discovery",
  "umko",
  "translation-layer",
  "api",
  "events",
  "observability",
  "security",
  "verification",
  "infrastructure",
] as const;

const labels: Record<Tier15ResearchConcept, string> = Object.fromEntries(
  tier15ResearchConcepts.map((concept) => [
    concept,
    concept
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
  ]),
) as Record<Tier15ResearchConcept, string>;

function pascal(concept: string) {
  return concept
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export const tier15TraceabilityMatrix: Tier15TraceabilityRow[] = tier15ResearchConcepts.map((concept) => {
  const name = pascal(concept);
  return {
    researchConcept: concept,
    domainModel: `${name}DomainModel`,
    storageSchema: `tier15_${concept}`,
    graphModel: `(:${name})-[:VALIDATED_BY|EVOLVED_BY|GOVERNED_BY|PRESERVED_IN]->(:UMKOArtifact)`,
    vectorModel: `tier15_${concept}_temporal_embedding_v1`,
    service: `${name}Service`,
    workflow: `${name}KnowledgeWorkflow`,
    api: `/api/tier15/${concept.replaceAll("_", "-")}`,
    eventStream: `tier15.${concept}.events.v1`,
    securityLayer: `${name}EpistemicGuard`,
    metrics: [`${concept}_confidence`, `${concept}_trust`, `${concept}_drift`, `${concept}_coverage`],
    dashboard: concept.includes("drift")
      ? "Knowledge Drift"
      : concept.includes("archive") || concept.includes("storage")
        ? "Archive Integrity"
        : concept.includes("governance") || concept === "gkc" || concept === "iad"
          ? "Governance Health"
          : concept.includes("poisoning") || concept.includes("warfare") || concept.includes("hijacking")
            ? "Epistemic Security"
            : "Knowledge Health",
    verificationRule: `${name}TraceabilityInvariant`,
    testSuite: `tier15.${concept}.acceptance`,
  };
});

export const tier15PackageManifests: Tier15PackageManifest[] = tier15RequiredPackages.map((packageName, index) => {
  const related = tier15TraceabilityMatrix.filter((row, rowIndex) => {
    const normalized = packageName.replaceAll("-", "_");
    return row.researchConcept.includes(normalized) || rowIndex % tier15RequiredPackages.length === index;
  });
  const rows = related.length > 0 ? related : [tier15TraceabilityMatrix[index % tier15TraceabilityMatrix.length]];
  return {
    packageName,
    boundedContext: `${packageName}-tier15-context`,
    entities: rows.map((row) => row.domainModel),
    services: rows.map((row) => row.service),
    workflows: rows.map((row) => row.workflow),
    events: rows.map((row) => row.eventStream),
    apiContracts: rows.map((row) => row.api),
    storageSchemas: rows.map((row) => row.storageSchema),
    graphModels: rows.map((row) => row.graphModel),
    vectorModels: rows.map((row) => row.vectorModel),
    securityLayers: rows.map((row) => row.securityLayer),
    metrics: rows.flatMap((row) => row.metrics),
    dashboards: Array.from(new Set(rows.map((row) => row.dashboard))),
    verificationRules: rows.map((row) => row.verificationRule),
    testSuites: rows.map((row) => row.testSuite),
  };
});

export const tier15StorageSurfaces = ["PostgreSQL", "Neo4j", "Qdrant", "Object Storage", "Hybrid Retrieval"];
export const tier15ApiSurfaces = ["REST", "gRPC", "GraphQL"];
export const tier15ObservabilitySurfaces = ["OpenTelemetry", "Prometheus", "Grafana", "Jaeger"];
export const tier15VerificationSurfaces = ["TLA+", "Alloy", "SMT", "unit-tests", "integration-tests", "property-tests", "simulation-tests", "mutation-tests", "chaos-tests", "security-tests"];
export const tier15EventTypes = [
  "KnowledgeCreated",
  "KnowledgeValidated",
  "KnowledgeVerified",
  "KnowledgeDrifted",
  "KnowledgeRuptured",
  "KnowledgeHealed",
  "KnowledgeArchived",
  "ThreatDetected",
  "HypothesisGenerated",
  "DiscoveryValidated",
];

export function getTier15ConceptLabel(concept: Tier15ResearchConcept) {
  return labels[concept];
}
