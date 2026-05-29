export type Tier15VerificationState = "draft" | "validated" | "verified" | "contested" | "failed" | "archived";

export type Tier15KnowledgeState =
  | "DRAFT"
  | "HYPOTHESIZED"
  | "VALIDATED"
  | "VERIFIED"
  | "DRIFTED"
  | "RUPTURED"
  | "HEALED"
  | "ARCHIVED"
  | "DEPRECATED";

export type Tier15ResearchConcept =
  | "second_order_cybernetics"
  | "autopoiesis"
  | "eigenforms"
  | "conversation_theory"
  | "radical_constructivism"
  | "automated_discovery"
  | "robot_scientists"
  | "popper"
  | "autodiscovery"
  | "hypothesis_generation"
  | "causal_discovery"
  | "forecasting_systems"
  | "calibration_systems"
  | "brier_scoring"
  | "conformal_prediction"
  | "venn_abers_calibration"
  | "e_value_validation"
  | "ontology_evolution"
  | "taxonomy_evolution"
  | "concept_drift"
  | "semantic_drift"
  | "intrinsic_drift"
  | "extrinsic_drift"
  | "gkc"
  | "iad"
  | "rules_in_use"
  | "commons_governance"
  | "epistemic_corruption"
  | "belief_hijacking"
  | "narrative_warfare"
  | "data_poisoning"
  | "organizational_forgetting"
  | "dna_archives"
  | "quartz_archives"
  | "deep_time_storage"
  | "conservation_paleobiology"
  | "umko"
  | "dhott"
  | "state_machines"
  | "invariants"
  | "apis"
  | "runtime_constraints";

export type Tier15EntityKind =
  | "KnowledgeUnit"
  | "ValidationProtocol"
  | "EvolutionEvent"
  | "GovernancePolicy"
  | "DiscoveryAgent"
  | "PreservationMedium"
  | "EpistemicSecurityGuard"
  | "ConceptSignature"
  | "KnowledgeLineage"
  | "KnowledgeCommons";

export interface Tier15EntityEnvelope {
  id: string;
  kind: Tier15EntityKind;
  version: number;
  tau: number;
  lineage: string[];
  confidence: number;
  verificationState: Tier15VerificationState;
  trustScore: number;
  sourceReferences: string[];
  securityState: "trusted" | "watched" | "quarantined" | "compromised";
  governanceState: "open" | "review" | "restricted" | "retired";
}

export interface Tier15TraceabilityRow {
  researchConcept: Tier15ResearchConcept;
  domainModel: string;
  storageSchema: string;
  graphModel: string;
  vectorModel: string;
  service: string;
  workflow: string;
  api: string;
  eventStream: string;
  securityLayer: string;
  metrics: string[];
  dashboard: string;
  verificationRule: string;
  testSuite: string;
}

export interface Tier15PackageManifest {
  packageName: string;
  boundedContext: string;
  entities: string[];
  services: string[];
  workflows: string[];
  events: string[];
  apiContracts: string[];
  storageSchemas: string[];
  graphModels: string[];
  vectorModels: string[];
  securityLayers: string[];
  metrics: string[];
  dashboards: string[];
  verificationRules: string[];
  testSuites: string[];
}

export interface Tier15GraphNode {
  id: string;
  kind: Tier15EntityKind;
  version: number;
}

export interface Tier15GraphEdge {
  from: string;
  to: string;
  relation:
    | "VALIDATED_BY"
    | "EVOLVED_BY"
    | "GOVERNED_BY"
    | "DISCOVERED_BY"
    | "PRESERVED_IN"
    | "GUARDED_BY"
    | "SIGNED_BY"
    | "DESCENDS_FROM"
    | "COMMONS_MEMBER";
  tau: number;
}

export interface KnowledgeTransitionInput {
  id: string;
  from: Tier15KnowledgeState;
  to: Tier15KnowledgeState;
  actor: string;
  evidenceScore: number;
  securityScore: number;
  governanceScore: number;
  tau: number;
}

export interface ForecastInput {
  forecasts: number[];
  outcomes: Array<0 | 1>;
}

export interface DriftInput {
  previous: number[];
  current: number[];
  intrinsicPressure: number;
  extrinsicPressure: number;
}

export interface SecurityInput {
  provenanceCompleteness: number;
  embeddingShift: number;
  narrativeCoordination: number;
  accessAnomaly: number;
  memoryGap: number;
}

export interface GovernanceInput {
  ruleCompliance: number;
  contributionDiversity: number;
  conflictResolution: number;
  accessFairness: number;
}

export interface DiscoveryInput {
  contradictionDensity: number;
  evidenceNovelty: number;
  causalSignal: number;
  experimentFeasibility: number;
}

export interface PreservationInput {
  years: 100 | 1000 | 10000 | 100000;
  mediumDurability: number;
  redundancy: number;
  custodyDiversity: number;
  migrationReadiness: number;
  recoveryFidelity: number;
}
