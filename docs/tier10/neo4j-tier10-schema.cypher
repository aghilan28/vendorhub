CREATE CONSTRAINT tier10_institution_id IF NOT EXISTS FOR (n:Institution) REQUIRE n.institution_id IS UNIQUE;
CREATE CONSTRAINT tier10_governance_rule_id IF NOT EXISTS FOR (n:GovernanceRule) REQUIRE n.rule_id IS UNIQUE;
CREATE CONSTRAINT tier10_constitution_id IF NOT EXISTS FOR (n:Constitution) REQUIRE n.constitution_id IS UNIQUE;
CREATE CONSTRAINT tier10_amendment_id IF NOT EXISTS FOR (n:Amendment) REQUIRE n.amendment_id IS UNIQUE;
CREATE CONSTRAINT tier10_cycle_id IF NOT EXISTS FOR (n:CivilizationalCycle) REQUIRE n.cycle_id IS UNIQUE;
CREATE CONSTRAINT tier10_claim_id IF NOT EXISTS FOR (n:KnowledgeClaim) REQUIRE n.claim_id IS UNIQUE;
CREATE CONSTRAINT tier10_evidence_id IF NOT EXISTS FOR (n:EvidenceNode) REQUIRE n.evidence_id IS UNIQUE;
CREATE CONSTRAINT tier10_technology_wave_id IF NOT EXISTS FOR (n:TechnologyWave) REQUIRE n.wave_id IS UNIQUE;
CREATE CONSTRAINT tier10_alignment_policy_id IF NOT EXISTS FOR (n:AlignmentPolicy) REQUIRE n.policy_id IS UNIQUE;

CREATE INDEX tier10_institution_state IF NOT EXISTS FOR (n:Institution) ON (n.current_state);
CREATE INDEX tier10_claim_truth_state IF NOT EXISTS FOR (n:KnowledgeClaim) ON (n.truth_state);
CREATE INDEX tier10_wave_domain IF NOT EXISTS FOR (n:TechnologyWave) ON (n.technology_domain);

MATCH (c:Constitution)<-[:AMENDS]-(a:Amendment)
WHERE a.proof_status = 'passed' AND a.simulation_status = 'passed' AND a.rollback_available = true
RETURN c.constitution_version AS version, collect(a.amendment_id) AS activatable_amendments;

MATCH (claim:KnowledgeClaim)<-[r:SUPPORTS|CONTRADICTS]-(e:EvidenceNode)
RETURN claim.claim_id AS claim_id,
       claim.truth_state AS truth_state,
       sum(CASE type(r) WHEN 'SUPPORTS' THEN r.weight ELSE 0 END) AS support_weight,
       sum(CASE type(r) WHEN 'CONTRADICTS' THEN r.weight ELSE 0 END) AS contradiction_weight;

MATCH (i:Institution)-[:PART_OF]->(cycle:CivilizationalCycle)
RETURN cycle.cycle_id AS cycle_id,
       avg(i.legitimacy_score) AS legitimacy,
       avg(i.entropy_score) AS entropy,
       collect(i.current_state) AS institutional_states;
