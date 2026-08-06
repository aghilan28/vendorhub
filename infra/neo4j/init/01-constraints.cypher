// KARTEX Phase B — Neo4j relationship runtime: constraints + indexes.
// Idempotent (IF NOT EXISTS). Run once after first boot:
//   cat infra/neo4j/init/01-constraints.cypher | docker compose -f infra/docker-compose.runtime.yml exec -T neo4j cypher-shell -u neo4j -p "$NEO4J_PASSWORD"
//
// Graph domains (ownership in infra/neo4j/ownership): Product, Seller, Supply,
// Inventory, Knowledge, Governance, Entity. Neo4j is a PROJECTION of Postgres +
// Kafka (kartex.knowledge.graph.mutations) — it is never the source of truth.

// ---- Node key / uniqueness constraints ---------------------------------
CREATE CONSTRAINT product_id IF NOT EXISTS FOR (p:Product) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT seller_id IF NOT EXISTS FOR (s:Seller) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT category_id IF NOT EXISTS FOR (c:Category) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT brand_id IF NOT EXISTS FOR (b:Brand) REQUIRE b.id IS UNIQUE;
CREATE CONSTRAINT supplier_id IF NOT EXISTS FOR (s:Supplier) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT warehouse_id IF NOT EXISTS FOR (w:Warehouse) REQUIRE w.id IS UNIQUE;
CREATE CONSTRAINT zone_id IF NOT EXISTS FOR (z:Zone) REQUIRE z.id IS UNIQUE;
CREATE CONSTRAINT buyer_id IF NOT EXISTS FOR (b:Buyer) REQUIRE b.id IS UNIQUE;
CREATE CONSTRAINT concept_id IF NOT EXISTS FOR (k:Concept) REQUIRE k.id IS UNIQUE;
CREATE CONSTRAINT risksubject_id IF NOT EXISTS FOR (r:RiskSubject) REQUIRE r.id IS UNIQUE;

// ---- Property existence (Enterprise; harmless to attempt on Community) ---
// CREATE CONSTRAINT product_name IF NOT EXISTS FOR (p:Product) REQUIRE p.name IS NOT NULL;

// ---- Lookup indexes for traversal entry points --------------------------
CREATE INDEX product_status IF NOT EXISTS FOR (p:Product) ON (p.status);
CREATE INDEX seller_trust IF NOT EXISTS FOR (s:Seller) ON (s.trustTier);
CREATE INDEX zone_pincode IF NOT EXISTS FOR (z:Zone) ON (z.pincode);
CREATE INDEX concept_kind IF NOT EXISTS FOR (k:Concept) ON (k.kind);
CREATE INDEX risk_state IF NOT EXISTS FOR (r:RiskSubject) ON (r.state);

// ---- Relationship semantics (documentation; created by the projector) ----
// (:Seller)-[:SELLS]->(:Product)
// (:Product)-[:IN_CATEGORY]->(:Category)
// (:Product)-[:OF_BRAND]->(:Brand)
// (:Product)-[:SUBSTITUTE_FOR {score}]->(:Product)      // recommendation graph
// (:Product)-[:FREQUENTLY_BOUGHT_WITH {support}]->(:Product)
// (:Supplier)-[:SUPPLIES {leadTimeDays}]->(:Product)     // supply graph
// (:Warehouse)-[:STOCKS {qty}]->(:Product)               // inventory graph
// (:Warehouse)-[:SERVES]->(:Zone)                        // hyperlocal coverage
// (:Buyer)-[:PURCHASED {at}]->(:Product)                 // entity graph
// (:Concept)-[:RELATED_TO {weight}]->(:Concept)          // knowledge graph
// (:RiskSubject)-[:LINKED_TO {signal}]->(:RiskSubject)   // governance/fraud rings
