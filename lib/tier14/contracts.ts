import type { Tier14PackageManifest, Tier14ResearchConcept, Tier14TraceabilityRow } from "./types";

export const tier14ResearchConcepts: Tier14ResearchConcept[] = [
  "foundations_of_intelligence",
  "information_theory",
  "knowledge_representation",
  "learning_theory",
  "cognitive_adaptation",
  "emergence",
  "self_organization",
  "evolutionary_intelligence",
  "collective_intelligence",
  "intelligence_economics",
  "mechanism_design",
  "human_ai_collective_intelligence",
  "recursive_intelligence",
  "reflective_intelligence",
  "intelligence_amplification",
  "intelligence_failure_theory",
  "goodhart_dynamics",
  "campbell_dynamics",
  "specification_gaming",
  "wireheading",
  "optimization_failure",
  "universal_intelligence_metrics",
  "cross_substrate_intelligence",
  "simulation_frameworks",
  "long_horizon_intelligence",
  "knowledge_persistence",
  "memory_systems",
  "universal_design_patterns",
  "research_frontier_discovery",
  "open_problems_registry",
  "meta_synthesis_framework",
];

const conceptLabels: Record<Tier14ResearchConcept, string> = {
  foundations_of_intelligence: "Foundations of Intelligence",
  information_theory: "Information Theory",
  knowledge_representation: "Knowledge Representation",
  learning_theory: "Learning Theory",
  cognitive_adaptation: "Cognitive Adaptation",
  emergence: "Emergence",
  self_organization: "Self-Organization",
  evolutionary_intelligence: "Evolutionary Intelligence",
  collective_intelligence: "Collective Intelligence",
  intelligence_economics: "Intelligence Economics",
  mechanism_design: "Mechanism Design",
  human_ai_collective_intelligence: "Human-AI Collective Intelligence",
  recursive_intelligence: "Recursive Intelligence",
  reflective_intelligence: "Reflective Intelligence",
  intelligence_amplification: "Intelligence Amplification",
  intelligence_failure_theory: "Intelligence Failure Theory",
  goodhart_dynamics: "Goodhart Dynamics",
  campbell_dynamics: "Campbell Dynamics",
  specification_gaming: "Specification Gaming",
  wireheading: "Wireheading",
  optimization_failure: "Optimization Failure",
  universal_intelligence_metrics: "Universal Intelligence Metrics",
  cross_substrate_intelligence: "Cross-Substrate Intelligence",
  simulation_frameworks: "Simulation Frameworks",
  long_horizon_intelligence: "Long-Horizon Intelligence",
  knowledge_persistence: "Knowledge Persistence",
  memory_systems: "Memory Systems",
  universal_design_patterns: "Universal Design Patterns",
  research_frontier_discovery: "Research Frontier Discovery",
  open_problems_registry: "Open Problems Registry",
  meta_synthesis_framework: "Meta-Synthesis Framework",
};

const aggregateByConcept: Record<Tier14ResearchConcept, string> = {
  foundations_of_intelligence: "IntelligenceSystemAggregate",
  information_theory: "InformationFlowAggregate",
  knowledge_representation: "KnowledgeSystemAggregate",
  learning_theory: "LearningSystemAggregate",
  cognitive_adaptation: "AdaptiveCognitionAggregate",
  emergence: "EmergenceAggregate",
  self_organization: "SelfOrganizationAggregate",
  evolutionary_intelligence: "EvolutionaryPopulationAggregate",
  collective_intelligence: "CollectiveCoordinationAggregate",
  intelligence_economics: "IntelligenceEconomyAggregate",
  mechanism_design: "MechanismDesignAggregate",
  human_ai_collective_intelligence: "HybridTeamAggregate",
  recursive_intelligence: "RecursiveSelfModelAggregate",
  reflective_intelligence: "ReflectionGraphAggregate",
  intelligence_amplification: "AmplificationAggregate",
  intelligence_failure_theory: "FailureModeAggregate",
  goodhart_dynamics: "GoodhartAggregate",
  campbell_dynamics: "CampbellAggregate",
  specification_gaming: "SpecificationGamingAggregate",
  wireheading: "WireheadingAggregate",
  optimization_failure: "OptimizationFailureAggregate",
  universal_intelligence_metrics: "UniversalMetricsAggregate",
  cross_substrate_intelligence: "SubstrateComparisonAggregate",
  simulation_frameworks: "SimulationRuntimeAggregate",
  long_horizon_intelligence: "LongHorizonAggregate",
  knowledge_persistence: "KnowledgePreservationAggregate",
  memory_systems: "MemorySystemAggregate",
  universal_design_patterns: "PatternRegistryAggregate",
  research_frontier_discovery: "FrontierDiscoveryAggregate",
  open_problems_registry: "OpenProblemsAggregate",
  meta_synthesis_framework: "MetaSynthesisAggregate",
};

function pascalName(concept: Tier14ResearchConcept) {
  return concept
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export const tier14TraceabilityMatrix: Tier14TraceabilityRow[] = tier14ResearchConcepts.map((concept) => {
  const pascal = pascalName(concept);
  return {
    researchConcept: concept,
    domainEntity: `${pascal}Entity`,
    aggregate: aggregateByConcept[concept],
    service: `${pascal}Service`,
    workflow: `${pascal}LifecycleWorkflow`,
    event: `${pascal}Evaluated`,
    api: `/api/tier14/${concept.replaceAll("_", "-")}`,
    storageSchema: `tier14_${concept}`,
    graphSchema: `(:${pascal})-[:EVIDENCED_BY|MEASURED_BY|GOVERNS]->(:Tier14Artifact)`,
    vectorRepresentation: `tier14_${concept}_embedding_v1`,
    metrics: [`${concept}_coverage`, `${concept}_confidence`, `${concept}_drift`],
    dashboards: ["epistemic-health", "tier14-acceptance"],
    tests: [`tier14.${concept}.unit`, `tier14.${concept}.verification`],
    verificationRules: [`${pascal}Invariant`, `${pascal}TraceabilityComplete`],
  };
});

export const tier14PackageManifests: Tier14PackageManifest[] = [
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
].map((packageName) => {
  const key = packageName.replaceAll("-", "_");
  const relatedRows = tier14TraceabilityMatrix.filter(
    (row, index) => row.researchConcept.includes(key) || index % 27 === packageName.length % 27,
  );
  const rows = relatedRows.length > 0 ? relatedRows : [tier14TraceabilityMatrix[0]];
  return {
    packageName,
    boundedContext: `${packageName}-context`,
    entities: rows.map((row) => row.domainEntity),
    services: rows.map((row) => row.service),
    workflows: rows.map((row) => row.workflow),
    events: rows.map((row) => row.event),
    apiContracts: rows.map((row) => row.api),
    storageSchemas: rows.map((row) => row.storageSchema),
    graphLabels: rows.map((row) => row.graphSchema),
    vectorCollections: rows.map((row) => row.vectorRepresentation),
    metrics: rows.flatMap((row) => row.metrics),
    dashboards: Array.from(new Set(rows.flatMap((row) => row.dashboards))),
    verificationRules: rows.flatMap((row) => row.verificationRules),
  };
});

export const tier14UniversalEntities = [
  "IntelligenceSystem",
  "Agent",
  "Collective",
  "Institution",
  "Market",
  "Ecology",
  "KnowledgeSystem",
  "LearningSystem",
  "PredictionSystem",
  "MemorySystem",
  "GovernanceSystem",
  "Simulation",
  "Experiment",
  "Hypothesis",
  "Theory",
  "Belief",
  "Fact",
  "Evidence",
  "Constraint",
  "Goal",
  "Resource",
  "Capability",
  "Substrate",
];

export const tier14StorageSurfaces = ["PostgreSQL", "Neo4j", "Qdrant", "OpenTelemetry", "Prometheus", "Grafana", "Jaeger"];

export const tier14VerificationSurfaces = ["TLA+", "Alloy", "SMT", "property-tests", "simulation-tests", "chaos-tests"];

export function getTier14ConceptLabel(concept: Tier14ResearchConcept) {
  return conceptLabels[concept];
}
