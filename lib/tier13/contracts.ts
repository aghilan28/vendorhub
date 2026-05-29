import type { EvidenceClass, RfcSectionTrace, VerificationSurface } from "./types";

export interface Tier13BoundedContextContract {
  key: string;
  purpose: string;
  theoryStatus: EvidenceClass | "mixed" | "context_specific";
  runtimeOwner: string;
  entities: string[];
  workflows: string[];
  metrics: string[];
  invariants: string[];
  simulationHooks: string[];
  verificationRequirements: VerificationSurface[];
  rfcSections: number[];
}

export interface Tier13EntityContract {
  entity: string;
  requiredFields: string[];
  lifecycleStates: string[];
  rfcSection: number;
}

export interface Tier13RelationshipContract {
  relationship: string;
  domain: string;
  requiredProperties: string[];
  rfcSection: number;
}

export interface Tier13ApiGroupContract {
  path: string;
  styles: Array<"command" | "query" | "event" | "admin">;
  commandRequired: boolean;
  evidenceAndUncertainty: boolean;
  rfcSection: number;
}

export interface Tier13StorageContract {
  store: string;
  authority: string;
  retention: string;
  role: string;
  invariants: string[];
  rfcSection: number;
}

export interface Tier13VerificationMapping {
  artifact: string;
  surface: VerificationSurface;
  stateSpace: string[];
  safetyInvariants: string[];
  livenessProperties: string[];
  rfcSection: number;
}

export interface Tier13OpenProblem {
  rank: number;
  problemId: string;
  description: string;
  dependencies: string[];
  owner: string;
  maturity: "open" | "scoping" | "active" | "blocked" | "validated" | "closed";
  rfcSection: number;
}

export const tier13BoundedContexts: Tier13BoundedContextContract[] = [
  {
    key: "knowledge_commons",
    purpose: "Steward claims, evidence, archives, provenance, custodians, continuity rituals, and semantic preservation.",
    theoryStatus: "mixed",
    runtimeOwner: "Knowledge Council",
    entities: ["Claim", "Evidence", "KnowledgeAsset", "Artifact"],
    workflows: ["knowledge_lifecycle", "provenance_review", "archive_fixity_audit"],
    metrics: ["provenance_completeness", "replication_coverage", "knowledge_loss_risk"],
    invariants: ["no_policy_on_unsupported_claim", "critical_asset_decoding_required"],
    simulationHooks: ["knowledge_discontinuity", "archive_loss", "semantic_migration"],
    verificationRequirements: ["evidence", "simulation"],
    rfcSections: [2, 7, 8],
  },
  {
    key: "epistemic_security",
    purpose: "Detect falsehood, provenance attacks, ontology poisoning, drift, and synthetic consensus.",
    theoryStatus: "moderately_supported",
    runtimeOwner: "Epistemic Security Board",
    entities: ["Incident", "Claim", "Evidence", "ReputationNode"],
    workflows: ["attack_classification", "quarantine_adjudication", "dependent_policy_blocking"],
    metrics: ["corruption_anomaly_score", "contradiction_half_life", "retrieval_poisoning_rate"],
    invariants: ["quarantined_claim_cannot_support_policy", "release_requires_verification"],
    simulationHooks: ["narrative_attack_campaign", "ontology_poisoning", "citation_laundering"],
    verificationRequirements: ["tla", "alloy", "evidence"],
    rfcSections: [2, 26, 27, 28, 29],
  },
  {
    key: "collective_intelligence",
    purpose: "Coordinate deliberation, consensus, peer prediction, validation markets, and expertise-weighted synthesis.",
    theoryStatus: "strongly_supported",
    runtimeOwner: "Knowledge Council",
    entities: ["ConsensusSession", "ForecastQuestion", "MechanismExperiment"],
    workflows: ["delphi_round", "peer_prediction", "validation_market_settlement"],
    metrics: ["convergence_rounds", "calibration_score", "dissent_preservation_score"],
    invariants: ["minority_reports_preserved", "conflicts_disclosed"],
    simulationHooks: ["expert_panel", "swarm_voting", "thin_market_stress"],
    verificationRequirements: ["simulation", "evidence"],
    rfcSections: [2, 9, 30],
  },
  {
    key: "mechanism_design_lab",
    purpose: "Design, simulate, and validate voting, markets, incentives, slashing, royalties, and commons rules.",
    theoryStatus: "context_specific",
    runtimeOwner: "Economic Council",
    entities: ["Mechanism", "MechanismSpec", "IncentiveModel", "SettlementRule", "CommonsRule"],
    workflows: ["mechanism_design", "attack_simulation", "settlement_audit"],
    metrics: ["budget_balance", "collusion_resistance", "participation_incentives"],
    invariants: ["rights_constraints_required", "simulation_before_approval"],
    simulationHooks: ["honest_baseline", "strategic_manipulation", "coalition_capture"],
    verificationRequirements: ["smt", "simulation", "alloy"],
    rfcSections: [2, 10],
  },
  {
    key: "governance_engine",
    purpose: "Manage proposals, decisions, appeals, overrides, disputes, policies, authority traces, and execution audits.",
    theoryStatus: "strongly_supported",
    runtimeOwner: "Governance Council",
    entities: ["Decision", "Rule", "Office", "Incident"],
    workflows: ["proposal_lifecycle", "appeal_adjudication", "emergency_override"],
    metrics: ["authority_trace_completeness", "appeal_accessibility", "execution_success"],
    invariants: ["execution_requires_authority", "appealable_actions_require_path"],
    simulationHooks: ["deadlock", "override_abuse", "quorum_failure"],
    verificationRequirements: ["tla", "alloy", "smt", "rollback"],
    rfcSections: [2, 11, 39],
  },
  {
    key: "constitutional_core",
    purpose: "Define principles, rights, offices, roles, invariants, amendment rules, emergency powers, and rollback rules.",
    theoryStatus: "established",
    runtimeOwner: "Constitutional Core Council",
    entities: ["Constitution", "Amendment", "Rule", "Office"],
    workflows: ["dsl_compile", "artifact_verification", "activation"],
    metrics: ["constitutional_health_index", "proof_pass_rate", "rollback_coverage"],
    invariants: ["single_active_constitution", "no_activation_without_proof"],
    simulationHooks: ["threshold_change", "emergency_power_change", "rollback_drill"],
    verificationRequirements: ["tla", "alloy", "smt", "rollback"],
    rfcSections: [2, 12, 13, 31, 32, 33, 34],
  },
  {
    key: "mutation_framework",
    purpose: "Propose, validate, simulate, approve, activate, and rollback constitutional mutations.",
    theoryStatus: "strongly_supported",
    runtimeOwner: "Amendment Orchestrator",
    entities: ["Amendment", "SimulationRun", "MetricDefinition"],
    workflows: ["mutation_lifecycle", "formal_validation", "legitimacy_review"],
    metrics: ["amendment_viability", "capture_share", "simulation_confidence"],
    invariants: ["rollback_manifest_required", "legitimacy_review_required"],
    simulationHooks: ["hypermutable_constitution", "frozen_constitution", "capture_threshold"],
    verificationRequirements: ["tla", "smt", "simulation", "legitimacy", "rollback"],
    rfcSections: [2, 14],
  },
  {
    key: "legitimacy_framework",
    purpose: "Measure consent, compliance, fairness perception, legal validity, output performance, trust, and participation.",
    theoryStatus: "strongly_supported",
    runtimeOwner: "Audit Council",
    entities: ["MetricDefinition", "Decision", "Incident"],
    workflows: ["signal_intake", "privacy_review", "repair_recommendation"],
    metrics: ["legitimacy_score", "rights_incident_rate", "coercion_dependency_index"],
    invariants: ["privacy_review_before_aggregation", "no_metric_as_silent_sovereignty"],
    simulationHooks: ["legitimacy_rupture", "participation_suppression", "manipulation_attack"],
    verificationRequirements: ["legitimacy", "evidence"],
    rfcSections: [2, 15],
  },
  {
    key: "institutional_evolution",
    purpose: "Track entropy, drift, capture, lifecycle, reform, reconstitution, fitness, and capability migration.",
    theoryStatus: "mixed",
    runtimeOwner: "Evolution Council",
    entities: ["Institution", "MetricDefinition", "Decision"],
    workflows: ["fitness_review", "reform_candidate_generation", "capability_migration"],
    metrics: ["institutional_entropy", "fitness_score", "adaptive_latency"],
    invariants: ["migration_requires_governance_approval", "fitness_cannot_retire_rights"],
    simulationHooks: ["capture_risk", "reconstitution", "collapse"],
    verificationRequirements: ["tla", "simulation", "rollback"],
    rfcSections: [2, 16, 36, 37],
  },
  {
    key: "civilizational_state",
    purpose: "Model capacity, complexity, memory, trust, resource adequacy, redundancy, recovery, and collapse states.",
    theoryStatus: "mixed",
    runtimeOwner: "Resilience Council",
    entities: ["Civilization", "Scenario", "Incident"],
    workflows: ["state_transition", "early_warning", "recovery_pathway"],
    metrics: ["capacity_buffer", "memory_continuity", "cascade_risk"],
    invariants: ["collapse_states_are_simulation_abstractions", "recovery_requires_memory_continuity"],
    simulationHooks: ["polycrisis", "buffer_drawdown", "dark_age"],
    verificationRequirements: ["simulation", "evidence"],
    rfcSections: [2, 17, 25],
  },
  {
    key: "simulator",
    purpose: "Run scenario, agent, institutional, economic, epistemic, AI alignment, shock, and recovery simulations.",
    theoryStatus: "moderately_supported",
    runtimeOwner: "Simulation Council",
    entities: ["SimulationWorld", "SimulationRun", "Agent", "Scenario"],
    workflows: ["world_freeze", "run_execution", "certification"],
    metrics: ["simulation_certification_rate", "calibration_error", "invariant_pass_rate"],
    invariants: ["frozen_inputs_immutable", "certified_result_has_digest"],
    simulationHooks: ["agent_population", "shock_schedule", "recovery_options"],
    verificationRequirements: ["tla", "simulation"],
    rfcSections: [2, 18, 19, 20, 24, 25],
  },
  {
    key: "research_frontier",
    purpose: "Generate hypotheses, open problems, experiments, uncertainty maps, and discovery priorities.",
    theoryStatus: "strongly_supported",
    runtimeOwner: "Research Council",
    entities: ["OpenProblem", "ResearchProblem", "ForecastQuestion"],
    workflows: ["frontier_scan", "problem_ranking", "experiment_routing"],
    metrics: ["research_velocity", "open_problem_aging", "failed_assumption_discovery_rate"],
    invariants: ["uncertainty_preserved", "minority_theories_trackable"],
    simulationHooks: ["research_priority_scenario", "experiment_portfolio"],
    verificationRequirements: ["evidence", "simulation"],
    rfcSections: [2, 21, 22, 40],
  },
  {
    key: "forecasting",
    purpose: "Manage questions, forecasts, calibration, scenario probabilities, and early-warning indicators.",
    theoryStatus: "strongly_supported",
    runtimeOwner: "Forecasting Council",
    entities: ["ForecastQuestion", "Scenario", "MetricDefinition"],
    workflows: ["question_open", "forecast_submit", "resolution"],
    metrics: ["brier_score", "log_score", "forecast_calibration"],
    invariants: ["resolution_criteria_required", "deep_time_uncertainty_bounded"],
    simulationHooks: ["scenario_probability_update", "early_warning_indicator"],
    verificationRequirements: ["evidence", "simulation"],
    rfcSections: [2, 23, 24],
  },
  {
    key: "formal_verification",
    purpose: "Map constitutional, governance, knowledge, security, and simulation invariants into TLA+, Alloy, and SMT.",
    theoryStatus: "established",
    runtimeOwner: "Formal Methods Guild",
    entities: ["Constitution", "Rule", "SimulationRun"],
    workflows: ["model_extraction", "bounded_model_check", "counterexample_storage"],
    metrics: ["proof_pass_rate", "counterexample_count", "surface_coverage"],
    invariants: ["counterexamples_immutable", "empirical_assumptions_not_proven_by_formal_pass"],
    simulationHooks: ["counterexample_replay", "proof_scope_variation"],
    verificationRequirements: ["tla", "alloy", "smt"],
    rfcSections: [2, 31, 32, 33, 34],
  },
  {
    key: "metrics_layer",
    purpose: "Compute health, coordination, governance, research velocity, epistemic integrity, and institutional fitness.",
    theoryStatus: "mixed",
    runtimeOwner: "Observability Guild",
    entities: ["MetricDefinition", "Incident"],
    workflows: ["metric_compute", "threshold_alert", "anti_goodhart_review"],
    metrics: ["coordination_health", "governance_efficiency_index", "capture_threat_index"],
    invariants: ["no_high_impact_single_metric", "composite_exposes_components"],
    simulationHooks: ["metric_manipulation", "threshold_sensitivity"],
    verificationRequirements: ["smt", "evidence"],
    rfcSections: [2, 35, 38, 39, 40],
  },
  {
    key: "kmos_integration",
    purpose: "Integrate Postgres, graph, vector DB, lakehouse, object storage, Kafka, Temporal, policy engines, and dashboards.",
    theoryStatus: "established",
    runtimeOwner: "Platform SRE",
    entities: ["Incident", "MetricDefinition", "Artifact"],
    workflows: ["event_replay", "graph_projection", "disaster_recovery"],
    metrics: ["event_lag", "projection_digest_match", "restore_drill_pass_rate"],
    invariants: ["critical_restore_order", "object_lock_for_constitution_artifacts"],
    simulationHooks: ["projection_rebuild", "consumer_pause_resume", "dr_restore"],
    verificationRequirements: ["rollback", "simulation"],
    rfcSections: [2, 41, 42, 43, 44, 45, 46, 47, 48, 49],
  },
];

export const tier13OntologyClasses = [
  "Civilization",
  "Institution",
  "Constitution",
  "Rule",
  "Decision",
  "Claim",
  "Evidence",
  "Artifact",
  "Agent",
  "Mechanism",
  "Scenario",
  "SimulationRun",
  "ForecastQuestion",
  "ResearchProblem",
] as const;

export const tier13GraphLabels = [
  "Civilization",
  "Institution",
  "Constitution",
  "Office",
  "Rule",
  "Decision",
  "Claim",
  "Evidence",
  "Archive",
  "Artifact",
  "Resource",
  "Market",
  "Commons",
  "AISystem",
  "AlignmentEvaluation",
  "Scenario",
  "SimulationRun",
  "FailureMode",
  "RecoveryPathway",
  "ResearchProblem",
  "ForecastQuestion",
  "Mechanism",
  "Agent",
  "Metric",
] as const;

export const tier13RelationshipContracts: Tier13RelationshipContract[] = [
  ["GOVERNS", "Constitution/Rule -> Institution/Scope", ["validity_window", "authority_source", "constraint_level"]],
  ["AUTHORIZES", "AuthoritySource/Office -> Decision/Actor", ["delegation_path", "proof", "expiry"]],
  ["AMENDS", "Amendment -> Constitution/Rule", ["target_version", "change_type", "activation_time"]],
  ["DELEGATES_TO", "Actor/Office -> Actor/Office", ["scope", "revocability", "depth", "expiry"]],
  ["CONSTRAINS", "Rule/Invariant -> Action/Mechanism", ["severity", "verifier", "rollback"]],
  ["PRODUCES", "Institution/Agent -> Decision/Claim/Artifact", ["role", "timestamp", "source"]],
  ["SUPPORTS", "Evidence/Claim -> Claim", ["support_strength", "evidence_class"]],
  ["CONTRADICTS", "Claim/Evidence -> Claim", ["contradiction_type", "adjudication_state"]],
  ["DEPENDS_ON", "Claim/Rule/Mechanism -> Entity", ["dependency_kind", "criticality"]],
  ["PRESERVED_BY", "Artifact/KnowledgeAsset -> Custodian/Archive", ["replica_class", "jurisdiction", "fixity"]],
  ["VALIDATED_BY", "Claim/Rule/Mechanism -> Evidence/Proof/Simulation", ["method", "result", "confidence"]],
  ["SIMULATED_IN", "Amendment/Mechanism/Shock -> SimulationRun", ["scenario", "seed", "result_digest"]],
  ["FAILS_BY", "Entity -> FailureMode", ["severity", "likelihood", "detection"]],
  ["RECOVERS_THROUGH", "FailureMode -> RecoveryPathway", ["preconditions", "expected_recovery_time"]],
  ["CAPTURED_BY", "Scope/Institution -> CaptureVector/Coalition", ["control_share", "opacity", "mitigation"]],
  ["DRIFTS_FROM", "EntityVersion -> PriorVersion/Objective", ["semantic_distance", "impact"]],
  ["ALIGNED_WITH", "AISystem/Decision -> Principle/Constitution", ["alignment_score", "evidence"]],
  ["RISKS", "Shock/Attack/Failure -> Entity", ["probability_posture", "impact"]],
  ["MITIGATES", "Control/Mechanism -> Risk/Failure", ["expected_effect", "confidence"]],
].map(([relationship, domain, requiredProperties]) => ({
  relationship: relationship as string,
  domain: domain as string,
  requiredProperties: requiredProperties as string[],
  rfcSection: 5,
}));

export const tier13VectorCollections = [
  "tier13_evidence_v1",
  "tier13_claims_v1",
  "tier13_constitutional_rules_v1",
  "tier13_governance_arguments_v1",
  "tier13_simulation_scenarios_v1",
  "tier13_open_problems_v1",
  "tier13_ontology_terms_v1",
] as const;

export const tier13ApiGroups: Tier13ApiGroupContract[] = [
  "/v1/knowledge/*",
  "/v1/epistemic-security/*",
  "/v1/collective-intelligence/*",
  "/v1/mechanisms/*",
  "/v1/governance/*",
  "/v1/constitutional/*",
  "/v1/evolution/*",
  "/v1/simulation/*",
  "/v1/forecasting/*",
  "/v1/research-frontier/*",
  "/v1/metrics/*",
  "/v1/incidents/*",
].map((path) => ({
  path,
  styles: ["command", "query", "event", "admin"],
  commandRequired: true,
  evidenceAndUncertainty: path.includes("knowledge") || path.includes("forecasting") || path.includes("research"),
  rfcSection: 45,
}));

export const tier13EventTopics = [
  "tier13.knowledge.events.v1",
  "tier13.epistemic_security.events.v1",
  "tier13.collective_intelligence.events.v1",
  "tier13.mechanism.events.v1",
  "tier13.governance.events.v1",
  "tier13.constitution.events.v1",
  "tier13.evolution.events.v1",
  "tier13.civilization_state.events.v1",
  "tier13.simulation.events.v1",
  "tier13.forecasting.events.v1",
  "tier13.research.events.v1",
  "tier13.metrics.events.v1",
  "tier13.security.events.v1",
  "tier13.incident.events.v1",
] as const;

export const tier13CommandFamilies = [
  "submit claim",
  "quarantine claim",
  "resolve contradiction",
  "create forecast question",
  "submit forecast",
  "create mechanism experiment",
  "submit governance proposal",
  "cast ballot",
  "submit amendment",
  "activate constitution",
  "create simulation world",
  "run simulation",
  "register open problem",
  "compute metric",
  "open incident",
] as const;

export const tier13RequiredEvents = [
  "ClaimSubmitted",
  "EvidenceAuthenticated",
  "ContradictionDetected",
  "ClaimQuarantined",
  "ClaimResolved",
  "ForecastQuestionOpened",
  "ForecastSubmitted",
  "ForecastResolved",
  "MechanismExperimentCreated",
  "MechanismSimulationCertified",
  "ProposalSubmitted",
  "VoteFinalized",
  "DecisionExecuted",
  "AppealResolved",
  "AmendmentSubmitted",
  "AmendmentValidated",
  "AmendmentActivated",
  "AmendmentRolledBack",
  "OntologyDriftDetected",
  "OntologyMigrationApproved",
  "SimulationRunStarted",
  "SimulationRunCertified",
  "SimulationRunRejected",
  "MetricThresholdBreached",
  "IncidentOpened",
  "RollbackVerified",
] as const;

export const tier13StorageContracts: Tier13StorageContract[] = [
  ["Postgres", "transactional source of record", "indefinite for governance, evidence, constitution, provenance", "entities, lifecycles, audit tables"],
  ["Neo4j/property graph", "relationship projection", "rebuildable plus versioned snapshots", "authority, knowledge, ontology, trust, simulation, research graph"],
  ["Vector DB", "semantic retrieval projection", "rebuildable from source artifacts; snapshots for audit", "evidence, policy, scenario, argument embeddings"],
  ["Object storage", "immutable artifacts", "permanent for constitution, proof, evidence, audit", "bundles, proofs, datasets, checkpoints"],
  ["Lakehouse", "analytic event archive", "permanent for governance/security; downsampled metric history", "events, simulations, metrics, lineage"],
  ["Time series", "hot observability", "18-24 months hot, archived after", "metrics and alerts"],
  ["Ledger", "financial settlement and royalty records", "statutory/permanent", "market settlement, royalties, allocations"],
].map(([store, authority, retention, role]) => ({
  store,
  authority,
  retention,
  role,
  invariants: ["restore_drill_required", "audit_refs_preserved"],
  rfcSection: 41,
}));

export const tier13VerificationMappings: Tier13VerificationMapping[] = [
  {
    artifact: "Tier13Constitution",
    surface: "tla",
    stateSpace: ["constitution_versions", "amendments", "activation_locks", "rollback_states"],
    safetyInvariants: ["type_correctness", "single_active_constitution", "no_activation_without_proof", "rollback_available"],
    livenessProperties: ["approved_amendment_eventually_activates_rejects_or_rolls_back"],
    rfcSection: 32,
  },
  {
    artifact: "Tier13Governance",
    surface: "tla",
    stateSpace: ["proposals", "votes", "appeals", "overrides", "execution"],
    safetyInvariants: ["quorum_required", "one_ballot_per_voter", "bounded_emergency", "execution_requires_approval"],
    livenessProperties: ["approved_proposal_eventually_executes_or_expires"],
    rfcSection: 32,
  },
  {
    artifact: "Tier13Knowledge",
    surface: "tla",
    stateSpace: ["claims", "evidence", "contradictions", "quarantine", "repair"],
    safetyInvariants: ["active_belief_has_provenance", "contradiction_quarantined", "repair_traceable"],
    livenessProperties: ["open_contradiction_eventually_reviewed"],
    rfcSection: 32,
  },
  {
    artifact: "Tier13StructuralModel",
    surface: "alloy",
    stateSpace: ["Actor", "Office", "Role", "Authority", "Constitution", "Decision", "Claim", "Evidence", "SimulationRun"],
    safetyInvariants: ["no_delegation_cycles", "every_decision_has_active_authority_path", "critical_claim_has_provenance"],
    livenessProperties: [],
    rfcSection: 33,
  },
  {
    artifact: "Tier13ArithmeticObligations",
    surface: "smt",
    stateSpace: ["quorum", "resource_floor", "budget_balance", "reputation_bounds", "rollback_coverage"],
    safetyInvariants: ["quorum_pass", "protected_resource_floor", "ledger_balance", "bounded_reputation_delta"],
    livenessProperties: [],
    rfcSection: 34,
  },
];

export const tier13OpenProblemsRegistry: Tier13OpenProblem[] = Array.from({ length: 20 }, (_, index) => ({
  rank: index + 1,
  problemId: `tier13-open-problem-${String(index + 1).padStart(2, "0")}`,
  description: [
    "Calibrate civilizational simulation validity under sparse historical evidence.",
    "Measure legitimacy without converting observation into surveillance.",
    "Detect ontology corruption before governance semantics drift.",
    "Bound validation-market manipulation under thin liquidity.",
    "Preserve semantic continuity across deep-time archive migration.",
    "Separate real-world knowledge drift from measurement artifact.",
    "Quantify institutional capture across delegation and finance graphs.",
    "Prove rollback safety for constitutional mutation bundles.",
    "Model AI-agent alignment drift against constitutional principles.",
    "Preserve minority reports without amplifying false equivalence.",
    "Estimate deep-time forecast uncertainty without false precision.",
    "Route expertise while limiting reputation lock-in.",
    "Detect citation cartels across dependent evidence chains.",
    "Calibrate shock coupling and buffer effects across subsystems.",
    "Score fitness without allowing automatic rights erosion.",
    "Validate disaster recovery order for constitution, authority, claims, evidence, and audit.",
    "Prevent vector retrieval poisoning from becoming policy support.",
    "Backtest composite metrics against Goodhart pressure.",
    "Generate governed ontology migrations with impacted-claim proofs.",
    "Certify simulation outputs from immutable frozen inputs.",
  ][index],
  dependencies: index === 0 ? [] : [`tier13-open-problem-${String(Math.max(1, index)).padStart(2, "0")}`],
  owner: ["Research Council", "Audit Council", "Epistemic Security Board", "Simulation Council"][index % 4],
  maturity: "open",
  rfcSection: 22,
}));

export function buildTier13SectionTrace(sectionTitles: string[]): RfcSectionTrace[] {
  return sectionTitles.map((title, index) => {
    const section = index + 1;
    const artifacts = [
      tier13BoundedContexts.some((context) => context.rfcSections.includes(section)) ? "bounded-context-contracts" : "",
      section >= 3 && section <= 5 ? "ontology-relationship-contracts" : "",
      section >= 41 && section <= 44 ? "storage-projection-contracts" : "",
      section >= 45 && section <= 47 ? "api-event-message-contracts" : "",
      section >= 31 && section <= 34 ? "formal-verification-mappings" : "",
      section === 22 ? "open-problems-registry" : "",
      section === 50 ? "acceptance-audit" : "",
    ].filter(Boolean);

    return {
      section,
      title,
      artifacts: artifacts.length > 0 ? artifacts : ["execution-kernel"],
      primaryInvariant: `RFC13-S${String(section).padStart(2, "0")}-${title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    };
  });
}
