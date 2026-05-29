CREATE CONSTRAINT tier11_scientific_claim_id IF NOT EXISTS FOR (n:ScientificClaim) REQUIRE n.claim_id IS UNIQUE;
CREATE CONSTRAINT tier11_replication_contract_id IF NOT EXISTS FOR (n:ReplicationContract) REQUIRE n.contract_id IS UNIQUE;
CREATE CONSTRAINT tier11_validation_market_id IF NOT EXISTS FOR (n:ValidationMarket) REQUIRE n.market_id IS UNIQUE;
CREATE CONSTRAINT tier11_market_participant_id IF NOT EXISTS FOR (n:MarketParticipant) REQUIRE n.participant_id IS UNIQUE;
CREATE CONSTRAINT tier11_forecast_position_id IF NOT EXISTS FOR (n:ForecastPosition) REQUIRE n.position_id IS UNIQUE;
CREATE CONSTRAINT tier11_claim_settlement_id IF NOT EXISTS FOR (n:ClaimSettlement) REQUIRE n.settlement_id IS UNIQUE;
CREATE CONSTRAINT tier11_verification_evidence_id IF NOT EXISTS FOR (n:VerificationEvidence) REQUIRE n.evidence_id IS UNIQUE;
CREATE CONSTRAINT tier11_consensus_session_id IF NOT EXISTS FOR (n:ConsensusSession) REQUIRE n.session_id IS UNIQUE;
CREATE CONSTRAINT tier11_reputation_node_id IF NOT EXISTS FOR (n:ReputationNode) REQUIRE n.reputation_node_id IS UNIQUE;
CREATE CONSTRAINT tier11_knowledge_asset_id IF NOT EXISTS FOR (n:KnowledgeAsset) REQUIRE n.asset_id IS UNIQUE;
CREATE CONSTRAINT tier11_simulation_world_id IF NOT EXISTS FOR (n:SimulationWorld) REQUIRE n.world_id IS UNIQUE;
CREATE CONSTRAINT tier11_hypothesis_id IF NOT EXISTS FOR (n:Hypothesis) REQUIRE n.hypothesis_id IS UNIQUE;
CREATE CONSTRAINT tier11_policy_manifest_id IF NOT EXISTS FOR (n:PolicyManifest) REQUIRE n.manifest_id IS UNIQUE;
CREATE CONSTRAINT tier11_immune_claim_id IF NOT EXISTS FOR (n:ImmuneClaim) REQUIRE n.claim_id IS UNIQUE;
CREATE CONSTRAINT tier11_research_problem_id IF NOT EXISTS FOR (n:ResearchProblem) REQUIRE n.problem_id IS UNIQUE;

CREATE INDEX tier11_claim_lifecycle IF NOT EXISTS FOR (n:ScientificClaim) ON (n.lifecycle_state);
CREATE INDEX tier11_market_state IF NOT EXISTS FOR (n:ValidationMarket) ON (n.market_state);
CREATE INDEX tier11_reputation_subject IF NOT EXISTS FOR (n:ReputationNode) ON (n.subject_id, n.subject_type);
CREATE INDEX tier11_asset_hash IF NOT EXISTS FOR (n:KnowledgeAsset) ON (n.content_hash);
CREATE INDEX tier11_policy_state IF NOT EXISTS FOR (n:PolicyManifest) ON (n.state);
CREATE INDEX tier11_research_status IF NOT EXISTS FOR (n:ResearchProblem) ON (n.status, n.priority);

// Core SECIS validation market ontology.
// (:ScientificClaim)-[:HAS_REPLICATION_CONTRACT]->(:ReplicationContract)
// (:ScientificClaim)-[:VALIDATED_BY_MARKET]->(:ValidationMarket)
// (:ValidationMarket)-[:ACCEPTS_POSITION]->(:ForecastPosition)
// (:MarketParticipant)-[:SUBMITTED_POSITION]->(:ForecastPosition)
// (:ValidationMarket)-[:SETTLED_BY]->(:ClaimSettlement)
// (:VerificationEvidence)-[:SUPPORTS|CONTRADICTS|QUALIFIES]->(:ScientificClaim)
// (:ClaimSettlement)-[:ADJUSTS_REPUTATION]->(:ReputationNode)

MATCH (claim:ScientificClaim)-[:VALIDATED_BY_MARKET]->(market:ValidationMarket)
OPTIONAL MATCH (market)-[:ACCEPTS_POSITION]->(position:ForecastPosition)<-[:SUBMITTED_POSITION]-(participant:MarketParticipant)
RETURN claim.claim_id AS claim_id,
       claim.lifecycle_state AS lifecycle_state,
       market.market_state AS market_state,
       count(position) AS forecast_count,
       collect(distinct participant.did) AS participants;

// Collective intelligence and reputation.
// (:ConsensusSession)-[:HAS_ROUND]->(:ConsensusRound)
// (:ConsensusRound)-[:HAS_SWARM_VOTE]->(:SwarmVote)<-[:CAST_VOTE]-(:SwarmNode)
// (:ConsensusRound)-[:HAS_PEER_PREDICTION]->(:PeerPrediction)
// (:ConsensusSession)-[:PRODUCED_OUTCOME]->(:ConsensusOutcome)
// (:ReputationNode)-[:CONTRIBUTED_TO|VERIFIED|CITED|CONTRADICTED|DELEGATED_TRUST|SLASHED_BY]->(:ReputationNode)

MATCH (source:ReputationNode)-[edge:CONTRIBUTED_TO|VERIFIED|CITED|CONTRADICTED|DELEGATED_TRUST|SLASHED_BY]->(target:ReputationNode)
RETURN source.subject_id AS source,
       type(edge) AS relation,
       target.subject_id AS target,
       edge.weight AS weight,
       edge.evidence_ref AS evidence_ref;

// Epistemic economics and PROV-O aligned lineage.
// (:KnowledgeAsset)-[:WAS_DERIVED_FROM]->(:KnowledgeAsset)
// (:KnowledgeAsset)-[:WAS_ATTRIBUTED_TO]->(:KnowledgeOwner)
// (:KnowledgeAsset)-[:GENERATED_REVENUE]->(:CitationRevenue)
// (:CitationRevenue)-[:ROUTES_TO]->(:KnowledgeOwner|:KnowledgeAsset)

MATCH path = (asset:KnowledgeAsset)-[:WAS_DERIVED_FROM*0..8]->(root:KnowledgeAsset)
WHERE asset.asset_id <> root.asset_id
RETURN asset.asset_id AS asset_id,
       collect(distinct root.asset_id) AS lineage_assets,
       length(path) AS lineage_depth;

// Cliodynamic simulation graph.
// (:SimulationWorld)-[:HAS_TICK]->(:SimulationTick)
// (:SimulationTick)-[:HAS_POPULATION_STATE]->(:PopulationState)
// (:SimulationTick)-[:HAS_ELITE_STATE]->(:EliteState)
// (:SimulationTick)-[:HAS_INSTITUTION_STATE]->(:InstitutionState)
// (:SimulationTick)-[:HAS_GOVERNANCE_STATE]->(:GovernanceState)
// (:SimulationTick)-[:HAS_ECONOMIC_STATE]->(:EconomicState)

MATCH (world:SimulationWorld)-[:HAS_TICK]->(tick:SimulationTick)
RETURN world.world_id AS world_id,
       tick.tick_number AS tick_number,
       tick.psi AS psi,
       tick.gini AS gini,
       tick.trust AS trust
ORDER BY world_id, tick_number;

// Discovery, constitutional compiler, immune system, legitimacy, and registry.
// (:Hypothesis)-[:HAS_EXPERIMENT]->(:Experiment)-[:HAS_PLAN]->(:ExperimentPlan)
// (:Experiment)-[:HAS_RUN]->(:ExecutionRun)-[:EMITTED_OBSERVATION]->(:Observation)
// (:Hypothesis)-[:EXPLAINED_BY]->(:SymbolicModel)
// (:PolicyManifest)-[:COMPILED_TO]->(:CompiledPolicy)-[:SUPPORTED_BY_PROOF]->(:VerificationProof)
// (:ImmuneClaim)-[:SUPPORTS|CONTRADICTS|DEPENDS_ON|SUPERSEDES]->(:ImmuneClaim)
// (:Contradiction)-[:QUARANTINES]->(:QuarantineRecord)
// (:LegitimacySignal)-[:TRIGGERS]->(:LegitimacyPolicy)
// (:ResearchProblem)-[:DEPENDS_ON|BLOCKS|INFORMS]->(:ResearchProblem)
