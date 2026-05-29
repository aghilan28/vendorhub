export type Tier14VerificationState = "draft" | "verified" | "contested" | "failed" | "retired";

export type Tier14Substrate =
  | "biological"
  | "neural"
  | "market"
  | "institutional"
  | "machine"
  | "hybrid"
  | "ecological";

export type Tier14ResearchConcept =
  | "foundations_of_intelligence"
  | "information_theory"
  | "knowledge_representation"
  | "learning_theory"
  | "cognitive_adaptation"
  | "emergence"
  | "self_organization"
  | "evolutionary_intelligence"
  | "collective_intelligence"
  | "intelligence_economics"
  | "mechanism_design"
  | "human_ai_collective_intelligence"
  | "recursive_intelligence"
  | "reflective_intelligence"
  | "intelligence_amplification"
  | "intelligence_failure_theory"
  | "goodhart_dynamics"
  | "campbell_dynamics"
  | "specification_gaming"
  | "wireheading"
  | "optimization_failure"
  | "universal_intelligence_metrics"
  | "cross_substrate_intelligence"
  | "simulation_frameworks"
  | "long_horizon_intelligence"
  | "knowledge_persistence"
  | "memory_systems"
  | "universal_design_patterns"
  | "research_frontier_discovery"
  | "open_problems_registry"
  | "meta_synthesis_framework";

export interface Tier14EntityEnvelope {
  uuid: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  lineage: string[];
  provenance: string[];
  confidence: number;
  verificationState: Tier14VerificationState;
  trustScore: number;
  sourceReference: string;
}

export interface Tier14TraceabilityRow {
  researchConcept: Tier14ResearchConcept;
  domainEntity: string;
  aggregate: string;
  service: string;
  workflow: string;
  event: string;
  api: string;
  storageSchema: string;
  graphSchema: string;
  vectorRepresentation: string;
  metrics: string[];
  dashboards: string[];
  tests: string[];
  verificationRules: string[];
}

export interface Tier14PackageManifest {
  packageName: string;
  boundedContext: string;
  entities: string[];
  services: string[];
  workflows: string[];
  events: string[];
  apiContracts: string[];
  storageSchemas: string[];
  graphLabels: string[];
  vectorCollections: string[];
  metrics: string[];
  dashboards: string[];
  verificationRules: string[];
}

export interface InformationDistribution {
  probabilities: number[];
}

export interface DivergenceInput {
  p: number[];
  q: number[];
}

export interface LearningAssessmentInput {
  examplesSeen: number;
  hypothesisClassSize: number;
  empiricalRisk: number;
  confidence: number;
  transferSimilarity: number;
  priorTasks: number;
  forgettingPressure: number;
  interventionCost: number;
}

export interface CollectiveRiskInput {
  trustCentralization: number;
  dissentSuppression: number;
  coordinationLatency: number;
  eliteControlShare: number;
  cascadeCorrelation: number;
  privatePreferenceGap: number;
}

export interface FailureAnalysisInput {
  proxyCorrelation: number;
  proxyOptimizationIntensity: number;
  targetOutcomeDelta: number;
  rewardChannelAccess: number;
  specificationAmbiguity: number;
  feedbackDelay: number;
}

export interface MemoryHorizonInput {
  years: 10 | 25 | 50 | 100 | 250 | 500 | 1000;
  redundancy: number;
  fixityAudits: number;
  semanticRefreshRate: number;
  custodyDiversity: number;
  substrateObsolescence: number;
  institutionalContinuity: number;
}

export interface SimulationRuntimeInput {
  agentCount: 10 | 100 | 1000 | 10000 | 100000 | 1000000;
  interactionDensity: number;
  heterogeneity: number;
  shockIntensity: number;
  steps: number;
}

export interface UniversalIndexInput {
  generality: number;
  adaptability: number;
  forecasting: number;
  transferability: number;
  robustness: number;
  coordination: number;
  exploration: number;
  failureResistance: number;
}
