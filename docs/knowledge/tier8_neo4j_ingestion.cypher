CREATE CONSTRAINT knowledge_entity_id IF NOT EXISTS
FOR (n:KnowledgeEntity) REQUIRE n.id IS UNIQUE;

CREATE CONSTRAINT knowledge_domain_id IF NOT EXISTS
FOR (n:KnowledgeDomain) REQUIRE n.id IS UNIQUE;

CREATE INDEX knowledge_entity_type IF NOT EXISTS
FOR (n:KnowledgeEntity) ON (n.type);

CREATE INDEX knowledge_entity_name IF NOT EXISTS
FOR (n:KnowledgeEntity) ON (n.name);

UNWIND [
  {id:'dom-thermodynamics', name:'Thermodynamics', slug:'thermodynamics', criticality:'civilizational', knowledge_tier:'tier_8'},
  {id:'dom-consensus-systems', name:'Consensus Systems', slug:'consensus-systems', criticality:'critical', knowledge_tier:'tier_8'},
  {id:'dom-governance', name:'Governance', slug:'governance', criticality:'civilizational', knowledge_tier:'tier_8'},
  {id:'dom-recursive-self-improvement', name:'Recursive Self Improvement', slug:'recursive-self-improvement', criticality:'critical', knowledge_tier:'tier_8'},
  {id:'dom-alignment', name:'Alignment', slug:'alignment', criticality:'civilizational', knowledge_tier:'tier_8'},
  {id:'dom-knowledge-preservation', name:'Knowledge Preservation', slug:'knowledge-preservation', criticality:'critical', knowledge_tier:'tier_8'},
  {id:'dom-simulation-theory', name:'Simulation Theory', slug:'simulation-theory', criticality:'critical', knowledge_tier:'tier_8'},
  {id:'dom-game-theory', name:'Game Theory', slug:'game-theory', criticality:'high', knowledge_tier:'tier_8'},
  {id:'dom-constitutional-systems', name:'Constitutional Systems', slug:'constitutional-systems', criticality:'civilizational', knowledge_tier:'tier_8'},
  {id:'dom-formal-verification', name:'Formal Verification', slug:'formal-verification', criticality:'critical', knowledge_tier:'tier_8'},
  {id:'dom-cybernetics', name:'Cybernetics', slug:'cybernetics', criticality:'high', knowledge_tier:'tier_8'},
  {id:'dom-economic-systems', name:'Economic Systems', slug:'economic-systems', criticality:'high', knowledge_tier:'tier_8'},
  {id:'dom-epistemic-security', name:'Epistemic Security', slug:'epistemic-security', criticality:'critical', knowledge_tier:'tier_8'},
  {id:'dom-multi-agent-systems', name:'Multi-Agent Systems', slug:'multi-agent-systems', criticality:'high', knowledge_tier:'tier_8'}
] AS d
MERGE (domain:KnowledgeDomain {id:d.id})
SET domain += d;

UNWIND [
  {id:'ent-landauer-principle', type:'ScientificConcept', name:'Landauer Principle', domain:'dom-thermodynamics'},
  {id:'ent-thermodynamic-consensus', type:'Theory', name:'Thermodynamic Consensus', domain:'dom-consensus-systems'},
  {id:'ent-nsrsa', type:'VerificationProtocol', name:'NSRSA', domain:'dom-alignment'},
  {id:'ent-mcmea', type:'GovernanceFramework', name:'MCMEA', domain:'dom-governance'},
  {id:'ent-constitutional-mutation-engine', type:'GovernanceEngine', name:'ConstitutionalMutationEngine', domain:'dom-constitutional-systems'},
  {id:'ent-tla-plus', type:'VerificationRule', name:'TLA+', domain:'dom-formal-verification'},
  {id:'ent-tlaps', type:'VerificationRule', name:'TLAPS', domain:'dom-formal-verification'},
  {id:'ent-markov-governance-matrix', type:'Model', name:'Markov Governance Matrix', domain:'dom-governance'},
  {id:'ent-replicator-mutator-equation', type:'Equation', name:'Replicator-Mutator Equation', domain:'dom-game-theory'},
  {id:'ent-lyapunov-stability-equation', type:'Equation', name:'Lyapunov Stability Equation', domain:'dom-formal-verification'},
  {id:'ent-epistemic-defense-layer', type:'Framework', name:'Epistemic Defense Layer', domain:'dom-epistemic-security'},
  {id:'ent-long-horizon-simulation-framework', type:'Simulation', name:'Long Horizon Simulation Framework', domain:'dom-simulation-theory'},
  {id:'ent-preservation-layer', type:'Framework', name:'Preservation Layer', domain:'dom-knowledge-preservation'},
  {id:'ent-civilization-stability-framework', type:'Framework', name:'Civilization Stability Framework', domain:'dom-constitutional-systems'},
  {id:'ent-governance-stability-simulator', type:'Simulation', name:'Governance Stability Simulator', domain:'dom-simulation-theory'},
  {id:'ent-elite-capture-simulator', type:'Simulation', name:'Elite Capture Simulator', domain:'dom-game-theory'},
  {id:'ent-civilizational-collapse-simulator', type:'Simulation', name:'Civilizational Collapse Simulator', domain:'dom-simulation-theory'},
  {id:'ent-alignment-drift-simulator', type:'Simulation', name:'Alignment Drift Simulator', domain:'dom-alignment'},
  {id:'ent-thermodynamic-growth-simulator', type:'Simulation', name:'Thermodynamic Growth Simulator', domain:'dom-thermodynamics'},
  {id:'ent-elite-capture', type:'Threat', name:'Elite Capture', domain:'dom-governance'},
  {id:'ent-ontology-poisoning', type:'Threat', name:'Ontology Poisoning', domain:'dom-epistemic-security'},
  {id:'ent-alignment-drift', type:'Threat', name:'Alignment Drift', domain:'dom-alignment'},
  {id:'ent-compute-monopoly', type:'Threat', name:'Compute Monopoly', domain:'dom-economic-systems'},
  {id:'ent-coalition-attack', type:'Threat', name:'Coalition Attack', domain:'dom-multi-agent-systems'},
  {id:'ent-epistemic-corruption', type:'Threat', name:'Epistemic Corruption', domain:'dom-epistemic-security'},
  {id:'ent-recursive-misalignment', type:'Threat', name:'Recursive Misalignment', domain:'dom-recursive-self-improvement'},
  {id:'ent-governance-state-transition', type:'Model', name:'Governance State Transition', domain:'dom-governance'},
  {id:'ent-constitutional-invariant', type:'Invariant', name:'Constitutional Invariant', domain:'dom-constitutional-systems'},
  {id:'ent-rollback-protocol', type:'Protocol', name:'Rollback Protocol', domain:'dom-governance'},
  {id:'ent-capture-resistance-rule', type:'GovernanceRule', name:'CaptureResistanceRule', domain:'dom-governance'},
  {id:'ent-legitimacy-rule', type:'GovernanceRule', name:'LegitimacyRule', domain:'dom-constitutional-systems'},
  {id:'ent-mutation-rule', type:'GovernanceRule', name:'MutationRule', domain:'dom-constitutional-systems'},
  {id:'ent-safety-rule', type:'GovernanceRule', name:'SafetyRule', domain:'dom-alignment'},
  {id:'ent-preservation-rule', type:'GovernanceRule', name:'PreservationRule', domain:'dom-knowledge-preservation'}
] AS e
MERGE (entity:KnowledgeEntity {id:e.id})
SET entity.type = e.type,
    entity.name = e.name,
    entity.source_document = 'doc-tier8-constitutional-knowledge-system',
    entity.knowledge_tier = 'tier_8'
WITH entity, e
MATCH (domain:KnowledgeDomain {id:e.domain})
MERGE (entity)-[:IN_DOMAIN]->(domain);

UNWIND [
  {s:'ent-landauer-principle', t:'ent-thermodynamic-consensus', r:'CONSTRAINS'},
  {s:'ent-thermodynamic-consensus', t:'ent-landauer-principle', r:'DEPENDS_ON'},
  {s:'ent-nsrsa', t:'ent-recursive-misalignment', r:'MITIGATES'},
  {s:'ent-nsrsa', t:'ent-constitutional-invariant', r:'VALIDATES'},
  {s:'ent-constitutional-mutation-engine', t:'ent-tla-plus', r:'USES'},
  {s:'ent-constitutional-mutation-engine', t:'ent-tlaps', r:'USES'},
  {s:'ent-mcmea', t:'ent-governance-state-transition', r:'GOVERNS'},
  {s:'ent-constitutional-mutation-engine', t:'ent-governance-state-transition', r:'APPLIES'},
  {s:'ent-rollback-protocol', t:'ent-governance-state-transition', r:'REVERTS'},
  {s:'ent-markov-governance-matrix', t:'ent-governance-state-transition', r:'MODELS'},
  {s:'ent-lyapunov-stability-equation', t:'ent-governance-stability-simulator', r:'VERIFIES'},
  {s:'ent-replicator-mutator-equation', t:'ent-coalition-attack', r:'MODELS'},
  {s:'ent-epistemic-defense-layer', t:'ent-ontology-poisoning', r:'MITIGATES'},
  {s:'ent-epistemic-defense-layer', t:'ent-epistemic-corruption', r:'MITIGATES'},
  {s:'ent-long-horizon-simulation-framework', t:'ent-governance-stability-simulator', r:'RUNS'},
  {s:'ent-long-horizon-simulation-framework', t:'ent-elite-capture-simulator', r:'RUNS'},
  {s:'ent-long-horizon-simulation-framework', t:'ent-civilizational-collapse-simulator', r:'RUNS'},
  {s:'ent-long-horizon-simulation-framework', t:'ent-alignment-drift-simulator', r:'RUNS'},
  {s:'ent-long-horizon-simulation-framework', t:'ent-thermodynamic-growth-simulator', r:'RUNS'},
  {s:'ent-preservation-layer', t:'ent-civilization-stability-framework', r:'PRESERVES'},
  {s:'ent-civilization-stability-framework', t:'ent-thermodynamic-consensus', r:'INTEGRATES'},
  {s:'ent-civilization-stability-framework', t:'ent-mcmea', r:'INTEGRATES'},
  {s:'ent-civilization-stability-framework', t:'ent-epistemic-defense-layer', r:'INTEGRATES'},
  {s:'ent-civilization-stability-framework', t:'ent-preservation-layer', r:'INTEGRATES'},
  {s:'ent-capture-resistance-rule', t:'ent-elite-capture', r:'MITIGATES'},
  {s:'ent-legitimacy-rule', t:'ent-constitutional-mutation-engine', r:'GOVERNS'},
  {s:'ent-mutation-rule', t:'ent-constitutional-mutation-engine', r:'GOVERNS'},
  {s:'ent-safety-rule', t:'ent-recursive-misalignment', r:'BLOCKS'},
  {s:'ent-preservation-rule', t:'ent-preservation-layer', r:'GOVERNS'},
  {s:'ent-compute-monopoly', t:'ent-coalition-attack', r:'AMPLIFIES'},
  {s:'ent-alignment-drift', t:'ent-recursive-misalignment', r:'AMPLIFIES'},
  {s:'ent-ontology-poisoning', t:'ent-epistemic-corruption', r:'CAUSES'}
] AS edge
MATCH (source:KnowledgeEntity {id:edge.s})
MATCH (target:KnowledgeEntity {id:edge.t})
FOREACH (_ IN CASE WHEN edge.r = 'CONSTRAINS' THEN [1] ELSE [] END |
  MERGE (source)-[:CONSTRAINS {source_document:'doc-tier8-constitutional-knowledge-system'}]->(target))
FOREACH (_ IN CASE WHEN edge.r = 'DEPENDS_ON' THEN [1] ELSE [] END |
  MERGE (source)-[:DEPENDS_ON {source_document:'doc-tier8-constitutional-knowledge-system'}]->(target))
FOREACH (_ IN CASE WHEN edge.r = 'MITIGATES' THEN [1] ELSE [] END |
  MERGE (source)-[:MITIGATES {source_document:'doc-tier8-constitutional-knowledge-system'}]->(target))
FOREACH (_ IN CASE WHEN edge.r = 'VALIDATES' THEN [1] ELSE [] END |
  MERGE (source)-[:VALIDATES {source_document:'doc-tier8-constitutional-knowledge-system'}]->(target))
FOREACH (_ IN CASE WHEN edge.r = 'USES' THEN [1] ELSE [] END |
  MERGE (source)-[:USES {source_document:'doc-tier8-constitutional-knowledge-system'}]->(target))
FOREACH (_ IN CASE WHEN edge.r = 'GOVERNS' THEN [1] ELSE [] END |
  MERGE (source)-[:GOVERNS {source_document:'doc-tier8-constitutional-knowledge-system'}]->(target))
FOREACH (_ IN CASE WHEN edge.r = 'APPLIES' THEN [1] ELSE [] END |
  MERGE (source)-[:APPLIES {source_document:'doc-tier8-constitutional-knowledge-system'}]->(target))
FOREACH (_ IN CASE WHEN edge.r = 'REVERTS' THEN [1] ELSE [] END |
  MERGE (source)-[:REVERTS {source_document:'doc-tier8-constitutional-knowledge-system'}]->(target))
FOREACH (_ IN CASE WHEN edge.r = 'MODELS' THEN [1] ELSE [] END |
  MERGE (source)-[:MODELS {source_document:'doc-tier8-constitutional-knowledge-system'}]->(target))
FOREACH (_ IN CASE WHEN edge.r = 'VERIFIES' THEN [1] ELSE [] END |
  MERGE (source)-[:VERIFIES {source_document:'doc-tier8-constitutional-knowledge-system'}]->(target))
FOREACH (_ IN CASE WHEN edge.r = 'RUNS' THEN [1] ELSE [] END |
  MERGE (source)-[:RUNS {source_document:'doc-tier8-constitutional-knowledge-system'}]->(target))
FOREACH (_ IN CASE WHEN edge.r = 'PRESERVES' THEN [1] ELSE [] END |
  MERGE (source)-[:PRESERVES {source_document:'doc-tier8-constitutional-knowledge-system'}]->(target))
FOREACH (_ IN CASE WHEN edge.r = 'INTEGRATES' THEN [1] ELSE [] END |
  MERGE (source)-[:INTEGRATES {source_document:'doc-tier8-constitutional-knowledge-system'}]->(target))
FOREACH (_ IN CASE WHEN edge.r = 'BLOCKS' THEN [1] ELSE [] END |
  MERGE (source)-[:BLOCKS {source_document:'doc-tier8-constitutional-knowledge-system'}]->(target))
FOREACH (_ IN CASE WHEN edge.r = 'AMPLIFIES' THEN [1] ELSE [] END |
  MERGE (source)-[:AMPLIFIES {source_document:'doc-tier8-constitutional-knowledge-system'}]->(target))
FOREACH (_ IN CASE WHEN edge.r = 'CAUSES' THEN [1] ELSE [] END |
  MERGE (source)-[:CAUSES {source_document:'doc-tier8-constitutional-knowledge-system'}]->(target));

MATCH path = (:KnowledgeEntity {id:'ent-civilization-stability-framework'})-[*1..3]->(:KnowledgeEntity)
RETURN path;

MATCH (threat:KnowledgeEntity {type:'Threat'})<-[:MITIGATES|BLOCKS]-(control:KnowledgeEntity)
RETURN threat.name AS threat, collect(control.name) AS controls;

MATCH (engine:KnowledgeEntity {id:'ent-constitutional-mutation-engine'})-[*1..2]-(asset)
RETURN engine.name AS engine, collect(distinct asset.name) AS connected_assets;
