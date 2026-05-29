CREATE CONSTRAINT tier15_knowledge_unit_id IF NOT EXISTS FOR (n:KnowledgeUnit) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT tier15_umko_artifact_id IF NOT EXISTS FOR (n:UMKOArtifact) REQUIRE n.id IS UNIQUE;
CREATE VECTOR INDEX tier15_concept_signature_embedding IF NOT EXISTS
FOR (n:ConceptSignature) ON (n.embedding)
OPTIONS { indexConfig: { `vector.dimensions`: 1536, `vector.similarity_function`: 'cosine' } };

// Core UMKO graph relations:
// (:KnowledgeUnit)-[:VALIDATED_BY]->(:ValidationProtocol)
// (:KnowledgeUnit)-[:EVOLVED_BY]->(:EvolutionEvent)
// (:KnowledgeUnit)-[:GOVERNED_BY]->(:GovernancePolicy)
// (:KnowledgeUnit)-[:DISCOVERED_BY]->(:DiscoveryAgent)
// (:KnowledgeUnit)-[:PRESERVED_IN]->(:PreservationMedium)
// (:KnowledgeUnit)-[:GUARDED_BY]->(:EpistemicSecurityGuard)
// (:KnowledgeUnit)-[:SIGNED_BY]->(:ConceptSignature)
// (:KnowledgeLineage)-[:DESCENDS_FROM]->(:KnowledgeUnit)
// (:KnowledgeCommons)-[:COMMONS_MEMBER]->(:KnowledgeUnit)
