create extension if not exists "pgcrypto";

create table if not exists public.knowledge_domains (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text not null,
  parent_domain text,
  criticality text not null,
  knowledge_tier text not null,
  source_document text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_documents (
  id text primary key,
  title text not null,
  document_type text not null,
  source_document text not null,
  permanence_class text not null,
  governance_status text not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_entities (
  entity_id text primary key,
  entity_type text not null,
  canonical_name text not null,
  aliases text[] not null default array[]::text[],
  definition text not null,
  source_document text not null,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  knowledge_tier text not null,
  domain_id text references public.knowledge_domains(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_relationships (
  id text primary key,
  source_entity_id text not null references public.knowledge_entities(entity_id) on delete cascade,
  target_entity_id text not null references public.knowledge_entities(entity_id) on delete cascade,
  relationship text not null,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  source_document text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_entity_id, target_entity_id, relationship)
);

create table if not exists public.knowledge_equations (
  id text primary key,
  category text not null,
  source_section text not null,
  notation text not null,
  dependencies text[] not null default array[]::text[],
  proof_requirements text[] not null default array[]::text[],
  source_document text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_simulations (
  id text primary key,
  name text not null,
  model_type text not null,
  inputs jsonb not null,
  outputs jsonb not null,
  assumptions jsonb not null,
  parameters jsonb not null,
  state_variables jsonb not null,
  transition_functions jsonb not null,
  constraints jsonb not null,
  validation_methods jsonb not null,
  source_document text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_threats (
  id text primary key,
  name text not null,
  category text not null,
  detection jsonb not null,
  impact text not null,
  severity text not null,
  mitigation jsonb not null,
  rollback jsonb not null,
  monitoring jsonb not null,
  source_document text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_governance_rules (
  id text primary key,
  rule_type text not null,
  name text not null,
  description text not null,
  dependencies text[] not null default array[]::text[],
  enforcement jsonb not null,
  invariants text[] not null default array[]::text[],
  source_document text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_invariants (
  id text primary key,
  name text not null,
  statement text not null,
  scope text not null,
  verification_method text not null,
  dependencies text[] not null default array[]::text[],
  source_document text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_rfc_library (
  id text primary key,
  title text not null,
  purpose text not null,
  motivation text not null,
  architecture jsonb not null,
  components jsonb not null,
  dependencies jsonb not null,
  risks jsonb not null,
  invariants jsonb not null,
  failure_modes jsonb not null,
  verification_strategy jsonb not null,
  source_document text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_embeddings (
  chunk_id text primary key,
  document_id text not null references public.knowledge_documents(id) on delete cascade,
  title text not null,
  summary text not null,
  embedding_text text not null,
  keywords text[] not null default array[]::text[],
  ontology_refs text[] not null default array[]::text[],
  graph_refs text[] not null default array[]::text[],
  vector_status text not null default 'pending_embedding',
  provider_targets text[] not null default array['pgvector','qdrant','weaviate','pinecone']::text[],
  created_at timestamptz not null default now()
);

create index if not exists knowledge_entities_type_idx on public.knowledge_entities(entity_type);
create index if not exists knowledge_entities_domain_idx on public.knowledge_entities(domain_id);
create index if not exists knowledge_relationships_source_idx on public.knowledge_relationships(source_entity_id);
create index if not exists knowledge_relationships_target_idx on public.knowledge_relationships(target_entity_id);
create index if not exists knowledge_embeddings_refs_idx on public.knowledge_embeddings using gin(ontology_refs);
create index if not exists knowledge_embeddings_keywords_idx on public.knowledge_embeddings using gin(keywords);

insert into public.knowledge_documents (id, title, document_type, source_document, permanence_class, governance_status, content)
values (
  'doc-tier8-constitutional-knowledge-system',
  'Tier 8 Constitutional Knowledge System Ingestion',
  'constitutional_governance_systems_engineering_specification',
  'TIER 8 EXECUTION PROMPT (KNOWLEDGE SYSTEM INGESTION)',
  'permanent_knowledge_asset',
  'governance_hold_not_marketplace_catalog',
  jsonb_build_object(
    'prohibited_outputs', jsonb_build_array('products','skus','inventory','sellers','brands','pricing','marketplace_records'),
    'required_outputs', jsonb_build_array('ontology','knowledge_graph','rfcs','simulations','formal_assets','governance','threat_model','vector_chunks'),
    'knowledge_operating_system_layer', 'KARTEX Knowledge Operating System'
  )
)
on conflict (id) do update
set title = excluded.title,
    document_type = excluded.document_type,
    permanence_class = excluded.permanence_class,
    governance_status = excluded.governance_status,
    content = public.knowledge_documents.content || excluded.content,
    updated_at = now();

insert into public.knowledge_domains (id, name, slug, description, parent_domain, criticality, knowledge_tier, source_document, metadata)
select id, name, slug, description, parent_domain, criticality, knowledge_tier, 'doc-tier8-constitutional-knowledge-system', metadata
from jsonb_to_recordset($json$
[
  {"id":"dom-thermodynamics","name":"Thermodynamics","slug":"thermodynamics","description":"Physical limits, entropy costs, energy accounting, Landauer constraints, growth ceilings, and resource irreversibility for consensus and civilizational computation.","parent_domain":null,"criticality":"civilizational","knowledge_tier":"tier_8","metadata":{"canonical":true}},
  {"id":"dom-consensus-systems","name":"Consensus Systems","slug":"consensus-systems","description":"Distributed agreement, thermodynamic consensus, validator governance, fault tolerance, and convergence protocols for shared institutional state.","parent_domain":null,"criticality":"critical","knowledge_tier":"tier_8","metadata":{"canonical":true}},
  {"id":"dom-governance","name":"Governance","slug":"governance","description":"Rule formation, enforcement, legitimacy, rollback, mutation, audit, capture resistance, and institutional state transitions.","parent_domain":null,"criticality":"civilizational","knowledge_tier":"tier_8","metadata":{"canonical":true}},
  {"id":"dom-recursive-self-improvement","name":"Recursive Self Improvement","slug":"recursive-self-improvement","description":"Self-modifying institutional and AI systems constrained by proof gates, alignment checks, and non-regression invariants.","parent_domain":null,"criticality":"critical","knowledge_tier":"tier_8","metadata":{"canonical":true}},
  {"id":"dom-alignment","name":"Alignment","slug":"alignment","description":"Goal preservation, value drift detection, constitutional compatibility, safety objectives, and recursive self-alignment mechanisms.","parent_domain":null,"criticality":"civilizational","knowledge_tier":"tier_8","metadata":{"canonical":true}},
  {"id":"dom-knowledge-preservation","name":"Knowledge Preservation","slug":"knowledge-preservation","description":"Long-horizon memory, provenance, fixity, format migration, redundancy, and civilization bootstrap continuity.","parent_domain":null,"criticality":"critical","knowledge_tier":"tier_8","metadata":{"canonical":true}},
  {"id":"dom-simulation-theory","name":"Simulation Theory","slug":"simulation-theory","description":"Executable models for governance stability, collapse, alignment drift, capture dynamics, thermodynamic growth, and long-horizon futures.","parent_domain":null,"criticality":"critical","knowledge_tier":"tier_8","metadata":{"canonical":true}},
  {"id":"dom-game-theory","name":"Game Theory","slug":"game-theory","description":"Strategic behavior, coalition risk, incentive compatibility, replicator-mutator dynamics, elite capture, and mechanism constraints.","parent_domain":null,"criticality":"high","knowledge_tier":"tier_8","metadata":{"canonical":true}},
  {"id":"dom-constitutional-systems","name":"Constitutional Systems","slug":"constitutional-systems","description":"Foundational rules, amendment protocols, constitutional mutation engines, legitimacy thresholds, and intergenerational constraints.","parent_domain":null,"criticality":"civilizational","knowledge_tier":"tier_8","metadata":{"canonical":true}},
  {"id":"dom-formal-verification","name":"Formal Verification","slug":"formal-verification","description":"TLA+, TLAPS, state machines, invariants, proof obligations, model checking, safety properties, and transition verification.","parent_domain":null,"criticality":"critical","knowledge_tier":"tier_8","metadata":{"canonical":true}},
  {"id":"dom-cybernetics","name":"Cybernetics","slug":"cybernetics","description":"Feedback control, adaptation, monitoring, homeostasis, stability, governance sensing, and corrective action loops.","parent_domain":null,"criticality":"high","knowledge_tier":"tier_8","metadata":{"canonical":true}},
  {"id":"dom-economic-systems","name":"Economic Systems","slug":"economic-systems","description":"Resource allocation, scarcity, compute monopoly, thermodynamic economy, common-pool management, and civilizational stability economics.","parent_domain":null,"criticality":"high","knowledge_tier":"tier_8","metadata":{"canonical":true}},
  {"id":"dom-epistemic-security","name":"Epistemic Security","slug":"epistemic-security","description":"Ontology poisoning resistance, evidence provenance, knowledge integrity, adversarial information defense, and corruption monitoring.","parent_domain":null,"criticality":"critical","knowledge_tier":"tier_8","metadata":{"canonical":true}},
  {"id":"dom-multi-agent-systems","name":"Multi-Agent Systems","slug":"multi-agent-systems","description":"Agent interaction, coalition dynamics, distributed decision making, social choice, simulation, and adversarial coordination controls.","parent_domain":null,"criticality":"high","knowledge_tier":"tier_8","metadata":{"canonical":true}}
]
$json$::jsonb) as d(id text, name text, slug text, description text, parent_domain text, criticality text, knowledge_tier text, metadata jsonb)
on conflict (id) do update
set name = excluded.name,
    slug = excluded.slug,
    description = excluded.description,
    parent_domain = excluded.parent_domain,
    criticality = excluded.criticality,
    knowledge_tier = excluded.knowledge_tier,
    metadata = public.knowledge_domains.metadata || excluded.metadata,
    updated_at = now();

insert into public.knowledge_entities (entity_id, entity_type, canonical_name, aliases, definition, source_document, confidence, knowledge_tier, domain_id, metadata)
select entity_id, entity_type, canonical_name, aliases, definition, 'doc-tier8-constitutional-knowledge-system', confidence, knowledge_tier, domain_id, metadata
from jsonb_to_recordset($json$
[
  {"entity_id":"ent-landauer-principle","entity_type":"ScientificConcept","canonical_name":"Landauer Principle","aliases":["Landauer bound","Minimum erasure energy"],"definition":"Thermodynamic principle setting a lower bound on the energy cost of irreversible information erasure.","confidence":0.97,"knowledge_tier":"tier_8","domain_id":"dom-thermodynamics","metadata":{"formal_asset":"fa-landauer-equation"}},
  {"entity_id":"ent-thermodynamic-consensus","entity_type":"Theory","canonical_name":"Thermodynamic Consensus","aliases":["Entropy-aware consensus","Physical consensus layer"],"definition":"Consensus model constrained by entropy, energy availability, computation irreversibility, and resource accounting.","confidence":0.94,"knowledge_tier":"tier_8","domain_id":"dom-consensus-systems","metadata":{"rfc":"RFC-001"}},
  {"entity_id":"ent-nsrsa","entity_type":"VerificationProtocol","canonical_name":"NSRSA","aliases":["Non-Stationary Recursive Self-Alignment","Recursive self-alignment verifier"],"definition":"Verification protocol for validating recursive self-improvement against alignment, non-regression, and constitutional constraints.","confidence":0.91,"knowledge_tier":"tier_8","domain_id":"dom-alignment","metadata":{"rfc":"RFC-002"}},
  {"entity_id":"ent-mcmea","entity_type":"GovernanceFramework","canonical_name":"MCMEA","aliases":["Multi-Criteria Mutation Evaluation Architecture","Constitutional evaluation framework"],"definition":"Governance framework for evaluating constitutional and institutional mutations across legitimacy, safety, stability, reversibility, and evidence criteria.","confidence":0.91,"knowledge_tier":"tier_8","domain_id":"dom-governance","metadata":{"rfc":"RFC-003"}},
  {"entity_id":"ent-constitutional-mutation-engine","entity_type":"GovernanceEngine","canonical_name":"ConstitutionalMutationEngine","aliases":["Constitutional Mutation Engine","CME"],"definition":"Engine that proposes, verifies, simulates, approves, applies, and rolls back constitutional state transitions.","confidence":0.93,"knowledge_tier":"tier_8","domain_id":"dom-constitutional-systems","metadata":{"rfc":"RFC-004"}},
  {"entity_id":"ent-tla-plus","entity_type":"VerificationRule","canonical_name":"TLA+","aliases":["Temporal Logic of Actions","TLA Plus"],"definition":"Formal specification language used for state machines, transition systems, and invariant verification.","confidence":0.98,"knowledge_tier":"tier_8","domain_id":"dom-formal-verification","metadata":{"tooling":["model_checking","state_transition_specification"]}},
  {"entity_id":"ent-tlaps","entity_type":"VerificationRule","canonical_name":"TLAPS","aliases":["TLA+ Proof System"],"definition":"Proof system for machine-checking TLA+ proof obligations and invariant preservation.","confidence":0.96,"knowledge_tier":"tier_8","domain_id":"dom-formal-verification","metadata":{"tooling":["proof_obligations"]}},
  {"entity_id":"ent-markov-governance-matrix","entity_type":"Model","canonical_name":"Markov Governance Matrix","aliases":["Governance transition matrix"],"definition":"State transition model representing probabilistic governance movement among stable, contested, captured, rollback, and reconstitution states.","confidence":0.9,"knowledge_tier":"tier_8","domain_id":"dom-governance","metadata":{"formal_asset":"fa-markov-governance-matrix"}},
  {"entity_id":"ent-replicator-mutator-equation","entity_type":"Equation","canonical_name":"Replicator-Mutator Equation","aliases":["Strategy mutation dynamics"],"definition":"Equation modeling strategic population change under fitness pressure, imitation, and mutation.","confidence":0.93,"knowledge_tier":"tier_8","domain_id":"dom-game-theory","metadata":{"formal_asset":"fa-replicator-mutator-equation"}},
  {"entity_id":"ent-lyapunov-stability-equation","entity_type":"Equation","canonical_name":"Lyapunov Stability Equation","aliases":["Stability certificate"],"definition":"Formal criterion for proving that governance or alignment dynamics converge to or remain within a safe stability region.","confidence":0.94,"knowledge_tier":"tier_8","domain_id":"dom-formal-verification","metadata":{"formal_asset":"fa-lyapunov-stability"}},
  {"entity_id":"ent-epistemic-defense-layer","entity_type":"Framework","canonical_name":"Epistemic Defense Layer","aliases":["Knowledge integrity layer","EDL"],"definition":"Controls that detect, quarantine, audit, and roll back ontology poisoning, evidence manipulation, and epistemic corruption.","confidence":0.94,"knowledge_tier":"tier_8","domain_id":"dom-epistemic-security","metadata":{"rfc":"RFC-005"}},
  {"entity_id":"ent-long-horizon-simulation-framework","entity_type":"Simulation","canonical_name":"Long Horizon Simulation Framework","aliases":["LHSF","Civilization futures simulator"],"definition":"Simulation framework for evaluating institutional, alignment, resource, and collapse dynamics across extended time horizons.","confidence":0.92,"knowledge_tier":"tier_8","domain_id":"dom-simulation-theory","metadata":{"rfc":"RFC-006"}},
  {"entity_id":"ent-preservation-layer","entity_type":"Framework","canonical_name":"Preservation Layer","aliases":["Civilizational memory layer","Knowledge preservation layer"],"definition":"Long-term knowledge preservation system using redundancy, provenance, fixity, migration, and bootstrap media.","confidence":0.94,"knowledge_tier":"tier_8","domain_id":"dom-knowledge-preservation","metadata":{"rfc":"RFC-007"}},
  {"entity_id":"ent-civilization-stability-framework","entity_type":"Framework","canonical_name":"Civilization Stability Framework","aliases":["CSF","Civilizational stability layer"],"definition":"Integrated framework combining governance, thermodynamic limits, simulations, formal verification, epistemic security, and preservation.","confidence":0.93,"knowledge_tier":"tier_8","domain_id":"dom-constitutional-systems","metadata":{"rfc":"RFC-008"}},
  {"entity_id":"ent-governance-stability-simulator","entity_type":"Simulation","canonical_name":"Governance Stability Simulator","aliases":["GSS"],"definition":"Simulation asset for stress-testing governance transitions, legitimacy changes, and rollback outcomes.","confidence":0.92,"knowledge_tier":"tier_8","domain_id":"dom-simulation-theory","metadata":{"simulation":"sim-governance-stability"}},
  {"entity_id":"ent-elite-capture-simulator","entity_type":"Simulation","canonical_name":"Elite Capture Simulator","aliases":["Capture simulator"],"definition":"Simulation asset for modeling concentration of control, influence networks, and capture-resistant countermeasures.","confidence":0.91,"knowledge_tier":"tier_8","domain_id":"dom-game-theory","metadata":{"simulation":"sim-elite-capture"}},
  {"entity_id":"ent-civilizational-collapse-simulator","entity_type":"Simulation","canonical_name":"Civilizational Collapse Simulator","aliases":["Collapse simulator"],"definition":"Simulation asset for modeling interacting collapse drivers, resource shocks, legitimacy failures, and recovery paths.","confidence":0.9,"knowledge_tier":"tier_8","domain_id":"dom-simulation-theory","metadata":{"simulation":"sim-civilizational-collapse"}},
  {"entity_id":"ent-alignment-drift-simulator","entity_type":"Simulation","canonical_name":"Alignment Drift Simulator","aliases":["Drift simulator"],"definition":"Simulation asset for modeling objective drift, feedback errors, recursive update risk, and re-alignment interventions.","confidence":0.92,"knowledge_tier":"tier_8","domain_id":"dom-alignment","metadata":{"simulation":"sim-alignment-drift"}},
  {"entity_id":"ent-thermodynamic-growth-simulator","entity_type":"Simulation","canonical_name":"Thermodynamic Growth Simulator","aliases":["Growth limit simulator"],"definition":"Simulation asset for modeling growth under energy, entropy, compute, and material constraints.","confidence":0.91,"knowledge_tier":"tier_8","domain_id":"dom-thermodynamics","metadata":{"simulation":"sim-thermodynamic-growth"}},
  {"entity_id":"ent-elite-capture","entity_type":"Threat","canonical_name":"Elite Capture","aliases":["Institutional capture"],"definition":"Threat in which a concentrated coalition obtains disproportionate control over governance or resource allocation.","confidence":0.95,"knowledge_tier":"tier_8","domain_id":"dom-governance","metadata":{"threat":"thr-elite-capture"}},
  {"entity_id":"ent-ontology-poisoning","entity_type":"Threat","canonical_name":"Ontology Poisoning","aliases":["Knowledge graph poisoning"],"definition":"Threat that corrupts categories, relations, embeddings, provenance, or semantic meaning inside the knowledge system.","confidence":0.96,"knowledge_tier":"tier_8","domain_id":"dom-epistemic-security","metadata":{"threat":"thr-ontology-poisoning"}},
  {"entity_id":"ent-alignment-drift","entity_type":"Threat","canonical_name":"Alignment Drift","aliases":["Goal drift","Value drift"],"definition":"Threat that system objectives progressively diverge from constitutional values or authorized governance intent.","confidence":0.95,"knowledge_tier":"tier_8","domain_id":"dom-alignment","metadata":{"threat":"thr-alignment-drift"}},
  {"entity_id":"ent-compute-monopoly","entity_type":"Threat","canonical_name":"Compute Monopoly","aliases":["Compute concentration"],"definition":"Threat in which compute access concentrates enough to distort governance, consensus, simulation, or epistemic power.","confidence":0.92,"knowledge_tier":"tier_8","domain_id":"dom-economic-systems","metadata":{"threat":"thr-compute-monopoly"}},
  {"entity_id":"ent-coalition-attack","entity_type":"Threat","canonical_name":"Coalition Attack","aliases":["Coordinated adversarial coalition"],"definition":"Threat from coordinated agents exploiting governance, consensus, or knowledge-system thresholds.","confidence":0.93,"knowledge_tier":"tier_8","domain_id":"dom-multi-agent-systems","metadata":{"threat":"thr-coalition-attack"}},
  {"entity_id":"ent-epistemic-corruption","entity_type":"Threat","canonical_name":"Epistemic Corruption","aliases":["Evidence corruption"],"definition":"Threat that evidence quality, provenance, or institutional truth-seeking degrades under incentives or attack.","confidence":0.95,"knowledge_tier":"tier_8","domain_id":"dom-epistemic-security","metadata":{"threat":"thr-epistemic-corruption"}},
  {"entity_id":"ent-recursive-misalignment","entity_type":"Threat","canonical_name":"Recursive Misalignment","aliases":["Self-improvement misalignment"],"definition":"Threat that recursive updates amplify small misalignment into unsafe capability or governance changes.","confidence":0.95,"knowledge_tier":"tier_8","domain_id":"dom-recursive-self-improvement","metadata":{"threat":"thr-recursive-misalignment"}},
  {"entity_id":"ent-governance-state-transition","entity_type":"Model","canonical_name":"Governance State Transition","aliases":["Constitutional state transition"],"definition":"Formal transition from one governance state to another under rules, evidence, approval thresholds, and rollback provisions.","confidence":0.94,"knowledge_tier":"tier_8","domain_id":"dom-governance","metadata":{"formal_asset":"fa-tla-constitutional-engine"}},
  {"entity_id":"ent-constitutional-invariant","entity_type":"Invariant","canonical_name":"Constitutional Invariant","aliases":["Governance invariant"],"definition":"Safety, legitimacy, or preservation property that must remain true across governance mutations.","confidence":0.95,"knowledge_tier":"tier_8","domain_id":"dom-constitutional-systems","metadata":{"registry":"knowledge_invariants"}},
  {"entity_id":"ent-rollback-protocol","entity_type":"Protocol","canonical_name":"Rollback Protocol","aliases":["Constitutional rollback"],"definition":"Protocol for reverting unsafe, illegitimate, unverified, or captured governance state transitions.","confidence":0.94,"knowledge_tier":"tier_8","domain_id":"dom-governance","metadata":{"rule":"gr-rollback-rule"}},
  {"entity_id":"ent-capture-resistance-rule","entity_type":"GovernanceRule","canonical_name":"CaptureResistanceRule","aliases":["Capture resistance"],"definition":"Governance rule requiring detection and mitigation of concentrated control before mutation or enforcement proceeds.","confidence":0.94,"knowledge_tier":"tier_8","domain_id":"dom-governance","metadata":{"rule":"gr-capture-resistance"}},
  {"entity_id":"ent-legitimacy-rule","entity_type":"GovernanceRule","canonical_name":"LegitimacyRule","aliases":["Legitimacy threshold rule"],"definition":"Governance rule requiring authorized participation, evidence, deliberation, and approval thresholds for state changes.","confidence":0.94,"knowledge_tier":"tier_8","domain_id":"dom-constitutional-systems","metadata":{"rule":"gr-legitimacy"}},
  {"entity_id":"ent-mutation-rule","entity_type":"GovernanceRule","canonical_name":"MutationRule","aliases":["Constitutional mutation rule"],"definition":"Governance rule defining allowed mutation proposals, proof gates, simulation gates, and activation boundaries.","confidence":0.94,"knowledge_tier":"tier_8","domain_id":"dom-constitutional-systems","metadata":{"rule":"gr-mutation"}},
  {"entity_id":"ent-safety-rule","entity_type":"GovernanceRule","canonical_name":"SafetyRule","aliases":["Safety gate"],"definition":"Governance rule requiring critical actions to satisfy invariants, threat checks, and verification gates before execution.","confidence":0.95,"knowledge_tier":"tier_8","domain_id":"dom-alignment","metadata":{"rule":"gr-safety"}},
  {"entity_id":"ent-preservation-rule","entity_type":"GovernanceRule","canonical_name":"PreservationRule","aliases":["Knowledge preservation rule"],"definition":"Governance rule requiring permanent knowledge assets to preserve provenance, fixity, replay safety, and migration paths.","confidence":0.94,"knowledge_tier":"tier_8","domain_id":"dom-knowledge-preservation","metadata":{"rule":"gr-preservation"}}
]
$json$::jsonb) as e(entity_id text, entity_type text, canonical_name text, aliases text[], definition text, confidence numeric, knowledge_tier text, domain_id text, metadata jsonb)
on conflict (entity_id) do update
set entity_type = excluded.entity_type,
    canonical_name = excluded.canonical_name,
    aliases = excluded.aliases,
    definition = excluded.definition,
    confidence = excluded.confidence,
    knowledge_tier = excluded.knowledge_tier,
    domain_id = excluded.domain_id,
    metadata = public.knowledge_entities.metadata || excluded.metadata,
    updated_at = now();

insert into public.knowledge_relationships (id, source_entity_id, target_entity_id, relationship, confidence, source_document, metadata)
select id, source_entity_id, target_entity_id, relationship, confidence, 'doc-tier8-constitutional-knowledge-system', metadata
from jsonb_to_recordset($json$
[
  {"id":"rel-landauer-constrains-thermodynamic-consensus","source_entity_id":"ent-landauer-principle","target_entity_id":"ent-thermodynamic-consensus","relationship":"constrains","confidence":0.96,"metadata":{"neo4j_type":"CONSTRAINS"}},
  {"id":"rel-thermodynamic-consensus-depends-landauer","source_entity_id":"ent-thermodynamic-consensus","target_entity_id":"ent-landauer-principle","relationship":"depends_on","confidence":0.94,"metadata":{"neo4j_type":"DEPENDS_ON"}},
  {"id":"rel-nsrsa-validates-rsi","source_entity_id":"ent-nsrsa","target_entity_id":"ent-recursive-misalignment","relationship":"mitigates","confidence":0.92,"metadata":{"neo4j_type":"MITIGATES"}},
  {"id":"rel-nsrsa-validates-recursive-self-improvement","source_entity_id":"ent-nsrsa","target_entity_id":"ent-constitutional-invariant","relationship":"validates","confidence":0.91,"metadata":{"neo4j_type":"VALIDATES"}},
  {"id":"rel-cme-uses-tla","source_entity_id":"ent-constitutional-mutation-engine","target_entity_id":"ent-tla-plus","relationship":"uses","confidence":0.96,"metadata":{"neo4j_type":"USES"}},
  {"id":"rel-cme-uses-tlaps","source_entity_id":"ent-constitutional-mutation-engine","target_entity_id":"ent-tlaps","relationship":"uses","confidence":0.94,"metadata":{"neo4j_type":"USES"}},
  {"id":"rel-mcmea-governs-transition","source_entity_id":"ent-mcmea","target_entity_id":"ent-governance-state-transition","relationship":"governs","confidence":0.94,"metadata":{"neo4j_type":"GOVERNS"}},
  {"id":"rel-cme-applies-transition","source_entity_id":"ent-constitutional-mutation-engine","target_entity_id":"ent-governance-state-transition","relationship":"applies","confidence":0.94,"metadata":{"neo4j_type":"APPLIES"}},
  {"id":"rel-rollback-reverts-transition","source_entity_id":"ent-rollback-protocol","target_entity_id":"ent-governance-state-transition","relationship":"reverts","confidence":0.93,"metadata":{"neo4j_type":"REVERTS"}},
  {"id":"rel-markov-models-transition","source_entity_id":"ent-markov-governance-matrix","target_entity_id":"ent-governance-state-transition","relationship":"models","confidence":0.91,"metadata":{"neo4j_type":"MODELS"}},
  {"id":"rel-lyapunov-verifies-stability","source_entity_id":"ent-lyapunov-stability-equation","target_entity_id":"ent-governance-stability-simulator","relationship":"verifies","confidence":0.91,"metadata":{"neo4j_type":"VERIFIES"}},
  {"id":"rel-replicator-models-coalition","source_entity_id":"ent-replicator-mutator-equation","target_entity_id":"ent-coalition-attack","relationship":"models","confidence":0.9,"metadata":{"neo4j_type":"MODELS"}},
  {"id":"rel-edl-mitigates-ontology-poisoning","source_entity_id":"ent-epistemic-defense-layer","target_entity_id":"ent-ontology-poisoning","relationship":"mitigates","confidence":0.95,"metadata":{"neo4j_type":"MITIGATES"}},
  {"id":"rel-edl-mitigates-epistemic-corruption","source_entity_id":"ent-epistemic-defense-layer","target_entity_id":"ent-epistemic-corruption","relationship":"mitigates","confidence":0.95,"metadata":{"neo4j_type":"MITIGATES"}},
  {"id":"rel-lhsf-runs-governance-stability","source_entity_id":"ent-long-horizon-simulation-framework","target_entity_id":"ent-governance-stability-simulator","relationship":"runs","confidence":0.93,"metadata":{"neo4j_type":"RUNS"}},
  {"id":"rel-lhsf-runs-elite-capture","source_entity_id":"ent-long-horizon-simulation-framework","target_entity_id":"ent-elite-capture-simulator","relationship":"runs","confidence":0.93,"metadata":{"neo4j_type":"RUNS"}},
  {"id":"rel-lhsf-runs-collapse","source_entity_id":"ent-long-horizon-simulation-framework","target_entity_id":"ent-civilizational-collapse-simulator","relationship":"runs","confidence":0.93,"metadata":{"neo4j_type":"RUNS"}},
  {"id":"rel-lhsf-runs-alignment-drift","source_entity_id":"ent-long-horizon-simulation-framework","target_entity_id":"ent-alignment-drift-simulator","relationship":"runs","confidence":0.93,"metadata":{"neo4j_type":"RUNS"}},
  {"id":"rel-lhsf-runs-growth","source_entity_id":"ent-long-horizon-simulation-framework","target_entity_id":"ent-thermodynamic-growth-simulator","relationship":"runs","confidence":0.93,"metadata":{"neo4j_type":"RUNS"}},
  {"id":"rel-preservation-protects-document","source_entity_id":"ent-preservation-layer","target_entity_id":"ent-civilization-stability-framework","relationship":"preserves","confidence":0.92,"metadata":{"neo4j_type":"PRESERVES"}},
  {"id":"rel-csf-integrates-consensus","source_entity_id":"ent-civilization-stability-framework","target_entity_id":"ent-thermodynamic-consensus","relationship":"integrates","confidence":0.93,"metadata":{"neo4j_type":"INTEGRATES"}},
  {"id":"rel-csf-integrates-governance","source_entity_id":"ent-civilization-stability-framework","target_entity_id":"ent-mcmea","relationship":"integrates","confidence":0.93,"metadata":{"neo4j_type":"INTEGRATES"}},
  {"id":"rel-csf-integrates-epistemic-defense","source_entity_id":"ent-civilization-stability-framework","target_entity_id":"ent-epistemic-defense-layer","relationship":"integrates","confidence":0.93,"metadata":{"neo4j_type":"INTEGRATES"}},
  {"id":"rel-csf-integrates-preservation","source_entity_id":"ent-civilization-stability-framework","target_entity_id":"ent-preservation-layer","relationship":"integrates","confidence":0.93,"metadata":{"neo4j_type":"INTEGRATES"}},
  {"id":"rel-capture-rule-mitigates-elite-capture","source_entity_id":"ent-capture-resistance-rule","target_entity_id":"ent-elite-capture","relationship":"mitigates","confidence":0.94,"metadata":{"neo4j_type":"MITIGATES"}},
  {"id":"rel-legitimacy-rule-governs-cme","source_entity_id":"ent-legitimacy-rule","target_entity_id":"ent-constitutional-mutation-engine","relationship":"governs","confidence":0.93,"metadata":{"neo4j_type":"GOVERNS"}},
  {"id":"rel-mutation-rule-governs-cme","source_entity_id":"ent-mutation-rule","target_entity_id":"ent-constitutional-mutation-engine","relationship":"governs","confidence":0.94,"metadata":{"neo4j_type":"GOVERNS"}},
  {"id":"rel-safety-rule-blocks-recursive-misalignment","source_entity_id":"ent-safety-rule","target_entity_id":"ent-recursive-misalignment","relationship":"blocks","confidence":0.94,"metadata":{"neo4j_type":"BLOCKS"}},
  {"id":"rel-preservation-rule-governs-preservation-layer","source_entity_id":"ent-preservation-rule","target_entity_id":"ent-preservation-layer","relationship":"governs","confidence":0.94,"metadata":{"neo4j_type":"GOVERNS"}},
  {"id":"rel-compute-monopoly-enables-coalition","source_entity_id":"ent-compute-monopoly","target_entity_id":"ent-coalition-attack","relationship":"amplifies","confidence":0.9,"metadata":{"neo4j_type":"AMPLIFIES"}},
  {"id":"rel-alignment-drift-enables-recursive-misalignment","source_entity_id":"ent-alignment-drift","target_entity_id":"ent-recursive-misalignment","relationship":"amplifies","confidence":0.94,"metadata":{"neo4j_type":"AMPLIFIES"}},
  {"id":"rel-ontology-poisoning-enables-epistemic-corruption","source_entity_id":"ent-ontology-poisoning","target_entity_id":"ent-epistemic-corruption","relationship":"causes","confidence":0.92,"metadata":{"neo4j_type":"CAUSES"}}
]
$json$::jsonb) as r(id text, source_entity_id text, target_entity_id text, relationship text, confidence numeric, metadata jsonb)
on conflict (source_entity_id, target_entity_id, relationship) do update
set confidence = excluded.confidence,
    metadata = public.knowledge_relationships.metadata || excluded.metadata;

insert into public.knowledge_rfc_library (id, title, purpose, motivation, architecture, components, dependencies, risks, invariants, failure_modes, verification_strategy, source_document)
select id, title, purpose, motivation, architecture, components, dependencies, risks, invariants, failure_modes, verification_strategy, 'doc-tier8-constitutional-knowledge-system'
from jsonb_to_recordset($json$
[
  {"id":"RFC-001","title":"Thermodynamic Consensus Layer","purpose":"Define entropy-aware consensus constraints for KARTEX governance and knowledge state.","motivation":"Consensus cannot be treated as costless; irreversible computation, energy scarcity, and resource externalities must be first-class controls.","architecture":{"layers":["energy accounting","entropy budget","validator work bounds","failure-closed consensus admission"]},"components":["Landauer Principle registry","Thermodynamic Consensus protocol","resource telemetry adapter","consensus invariant checker"],"dependencies":["ent-landauer-principle","ent-thermodynamic-consensus"],"risks":["energy oracle manipulation","resource under-accounting","consensus centralization"],"invariants":["inv-energy-budget-nonnegative","inv-consensus-resource-provenance"],"failure_modes":["stale resource signal","unbounded compute burn","entropy budget violation"],"verification_strategy":["model-check consensus state transitions","audit resource telemetry provenance","simulate thermodynamic growth ceilings"]},
  {"id":"RFC-002","title":"Recursive Self Alignment Layer","purpose":"Gate recursive self-improvement through alignment and non-regression checks.","motivation":"Self-modifying systems require proof, simulation, and rollback before they can safely improve themselves.","architecture":{"layers":["proposal","NSRSA verification","simulation","proof gate","activation","rollback"]},"components":["NSRSA","Alignment Drift Simulator","Recursive Misalignment threat monitor"],"dependencies":["ent-nsrsa","ent-alignment-drift-simulator","ent-safety-rule"],"risks":["objective drift","proof bypass","recursive amplification"],"invariants":["inv-alignment-non-regression","inv-proof-before-recursive-update"],"failure_modes":["mis-specified objective","synthetic-only validation","rollback failure"],"verification_strategy":["prove invariants in TLA+","run drift simulations","require human escalation for criticality changes"]},
  {"id":"RFC-003","title":"Governance Engine","purpose":"Define core governance state transition, legitimacy, enforcement, and audit architecture.","motivation":"KARTEX needs permanent, replay-safe governance infrastructure separate from commerce catalog surfaces.","architecture":{"layers":["rule registry","state machine","legitimacy gate","enforcement graph","audit ledger"]},"components":["MCMEA","Markov Governance Matrix","Governance State Transition","LegitimacyRule"],"dependencies":["ent-mcmea","ent-markov-governance-matrix","ent-legitimacy-rule"],"risks":["elite capture","threshold manipulation","audit loss"],"invariants":["inv-legitimacy-threshold","inv-audit-completeness"],"failure_modes":["captured approval quorum","unauthorized transition","partial enforcement"],"verification_strategy":["state transition replay","quorum provenance check","capture simulation"]},
  {"id":"RFC-004","title":"Constitutional Mutation System","purpose":"Specify constitutional amendment, mutation, rollback, and formal proof gates.","motivation":"Constitutional change must be possible without allowing unsafe institutional mutation.","architecture":{"layers":["mutation proposal","MCMEA scoring","TLA+ specification","TLAPS proof","long-horizon simulation","activation","rollback"]},"components":["ConstitutionalMutationEngine","MutationRule","Rollback Protocol","TLA+","TLAPS"],"dependencies":["ent-constitutional-mutation-engine","ent-mutation-rule","ent-rollback-protocol","ent-tla-plus","ent-tlaps"],"risks":["unsafe amendment","irreversible mutation","legitimacy collapse"],"invariants":["inv-rollback-available","inv-constitutional-invariants-preserved"],"failure_modes":["proof missing","simulation rejected","rollback state unavailable"],"verification_strategy":["TLAPS proof obligations","transition model checking","rollback drill"]},
  {"id":"RFC-005","title":"Epistemic Defense Layer","purpose":"Protect ontology, graph, vector, RFC, and evidence stores from epistemic corruption.","motivation":"Knowledge systems fail when meaning, provenance, embeddings, or relations are poisoned.","architecture":{"layers":["provenance check","ontology diff","embedding anomaly scan","quarantine","rollback"]},"components":["Epistemic Defense Layer","Ontology Poisoning threat model","Epistemic Corruption monitor"],"dependencies":["ent-epistemic-defense-layer","ent-ontology-poisoning","ent-epistemic-corruption"],"risks":["ontology poisoning","embedding drift","citation laundering"],"invariants":["inv-provenance-required","inv-quarantine-before-activation"],"failure_modes":["poisoned relation accepted","untrusted vector chunk promoted","evidence chain broken"],"verification_strategy":["semantic diff review","graph anomaly detection","source provenance audit"]},
  {"id":"RFC-006","title":"Long Horizon Simulation Framework","purpose":"Provide reusable simulation assets for governance, capture, collapse, drift, and thermodynamic growth.","motivation":"High-impact governance changes require future-state stress testing rather than point-in-time approval.","architecture":{"layers":["scenario registry","model runner","parameter sweeps","validation","risk report"]},"components":["Governance Stability Simulator","Elite Capture Simulator","Civilizational Collapse Simulator","Alignment Drift Simulator","Thermodynamic Growth Simulator"],"dependencies":["ent-long-horizon-simulation-framework"],"risks":["bad assumptions","model monoculture","false stability"],"invariants":["inv-simulation-assumptions-declared","inv-critical-change-simulated"],"failure_modes":["unvalidated model","parameter suppression","scenario omission"],"verification_strategy":["sensitivity analysis","backtesting","cross-model comparison"]},
  {"id":"RFC-007","title":"Preservation Layer","purpose":"Preserve permanent knowledge assets with fixity, redundancy, provenance, and migration paths.","motivation":"Civilizational knowledge infrastructure must survive software churn, data corruption, and institutional shocks.","architecture":{"layers":["canonical document","content-addressed fixity","redundant storage","format migration","bootstrap export"]},"components":["Preservation Layer","PreservationRule","knowledge_documents","knowledge_embeddings"],"dependencies":["ent-preservation-layer","ent-preservation-rule"],"risks":["format decay","provenance loss","single-region failure"],"invariants":["inv-fixity-check","inv-migration-path"],"failure_modes":["hash mismatch","orphaned chunk","unreadable archival format"],"verification_strategy":["fixity audits","restore drill","format migration test"]},
  {"id":"RFC-008","title":"Civilization Stability Framework","purpose":"Integrate governance, consensus, simulation, formal verification, epistemic defense, and preservation into a KARTEX Knowledge Operating System.","motivation":"Tier 8 assets need one operating layer that can ingest, verify, simulate, preserve, and defend permanent institutional knowledge.","architecture":{"layers":["ontology","knowledge graph","RFC library","formal assets","simulation registry","governance registry","threat registry","preservation layer"]},"components":["Civilization Stability Framework","Thermodynamic Consensus","MCMEA","Epistemic Defense Layer","Long Horizon Simulation Framework","Preservation Layer"],"dependencies":["RFC-001","RFC-002","RFC-003","RFC-004","RFC-005","RFC-006","RFC-007"],"risks":["cross-layer inconsistency","unverified mutation","knowledge decay"],"invariants":["inv-layer-reference-integrity","inv-no-marketplace-materialization"],"failure_modes":["relationship orphaning","governance bypass","catalog leakage"],"verification_strategy":["foreign-key constraints","graph traversal audits","migration replay tests","catalog leakage tests"]}
]
$json$::jsonb) as r(id text, title text, purpose text, motivation text, architecture jsonb, components jsonb, dependencies jsonb, risks jsonb, invariants jsonb, failure_modes jsonb, verification_strategy jsonb)
on conflict (id) do update
set title = excluded.title,
    purpose = excluded.purpose,
    motivation = excluded.motivation,
    architecture = excluded.architecture,
    components = excluded.components,
    dependencies = excluded.dependencies,
    risks = excluded.risks,
    invariants = excluded.invariants,
    failure_modes = excluded.failure_modes,
    verification_strategy = excluded.verification_strategy;

insert into public.knowledge_equations (id, category, source_section, notation, dependencies, proof_requirements, source_document, metadata)
select id, category, source_section, notation, dependencies, proof_requirements, 'doc-tier8-constitutional-knowledge-system', metadata
from jsonb_to_recordset($json$
[
  {"id":"fa-landauer-equation","category":"Equation","source_section":"Phase 5 Formal Specification Extraction","notation":"E_min = k_B * T * ln(2) per erased bit","dependencies":["ent-landauer-principle"],"proof_requirements":["resource_accounting_units_defined","temperature_source_provenance"],"metadata":{"reusable":true}},
  {"id":"fa-tla-constitutional-engine","category":"StateMachine","source_section":"Phase 5 Formal Specification Extraction","notation":"Spec == Init /\\ [][Next]_vars; THEOREM Spec => []Inv","dependencies":["ent-tla-plus","ent-constitutional-mutation-engine","ent-governance-state-transition"],"proof_requirements":["TypeOK","Inv","Next_preserves_Inv","Rollback_available"],"metadata":{"language":"TLA+"}},
  {"id":"fa-markov-governance-matrix","category":"TransitionSystem","source_section":"Phase 5 Formal Specification Extraction","notation":"p_{t+1} = P_g * p_t, states={stable,contested,captured,rollback,reconstituted}","dependencies":["ent-markov-governance-matrix"],"proof_requirements":["rows_sum_to_one","absorbing_capture_absent_or_recoverable"],"metadata":{"model":"Markov chain"}},
  {"id":"fa-replicator-mutator-equation","category":"Equation","source_section":"Phase 5 Formal Specification Extraction","notation":"x_i' = sum_j x_j * f_j(x) * Q_{ji} / phi(x)","dependencies":["ent-replicator-mutator-equation"],"proof_requirements":["simplex_invariant","mutation_matrix_stochastic"],"metadata":{"model":"evolutionary_game_dynamics"}},
  {"id":"fa-lyapunov-stability","category":"Equation","source_section":"Phase 5 Formal Specification Extraction","notation":"V(x) > 0 and Delta V(x) <= 0 inside safe governance region S","dependencies":["ent-lyapunov-stability-equation"],"proof_requirements":["positive_definite_candidate","nonincreasing_transition"],"metadata":{"model":"stability_certificate"}},
  {"id":"fa-alignment-drift-constraint","category":"Constraint","source_section":"Phase 5 Formal Specification Extraction","notation":"D(objective_t, constitutional_objective) <= epsilon_align","dependencies":["ent-alignment-drift","ent-nsrsa"],"proof_requirements":["metric_defined","epsilon_authorized","drift_monitor_live"],"metadata":{"metric":"objective_distance"}},
  {"id":"fa-capture-threshold","category":"Invariant","source_section":"Phase 5 Formal Specification Extraction","notation":"max_control_share(actor_or_coalition) < theta_capture","dependencies":["ent-elite-capture","ent-capture-resistance-rule"],"proof_requirements":["identity_resolution","coalition_detection","threshold_governed"],"metadata":{"metric":"control_concentration"}},
  {"id":"fa-epistemic-provenance-constraint","category":"Invariant","source_section":"Phase 5 Formal Specification Extraction","notation":"forall active_asset: provenance_chain(asset) != null and trust_score(asset) >= tau","dependencies":["ent-epistemic-defense-layer"],"proof_requirements":["source_traceability","trust_threshold","quarantine_path"],"metadata":{"scope":"knowledge_assets"}}
]
$json$::jsonb) as f(id text, category text, source_section text, notation text, dependencies text[], proof_requirements text[], metadata jsonb)
on conflict (id) do update
set category = excluded.category,
    source_section = excluded.source_section,
    notation = excluded.notation,
    dependencies = excluded.dependencies,
    proof_requirements = excluded.proof_requirements,
    metadata = public.knowledge_equations.metadata || excluded.metadata;

insert into public.knowledge_simulations (id, name, model_type, inputs, outputs, assumptions, parameters, state_variables, transition_functions, constraints, validation_methods, source_document)
select id, name, model_type, inputs, outputs, assumptions, parameters, state_variables, transition_functions, constraints, validation_methods, 'doc-tier8-constitutional-knowledge-system'
from jsonb_to_recordset($json$
[
  {"id":"sim-governance-stability","name":"Governance Stability Simulator","model_type":"markov_state_transition_and_lyapunov_stability","inputs":{"required":["current_state","legitimacy_score","capture_index","rule_change"]},"outputs":{"required":["stability_probability","rollback_need","risk_report"]},"assumptions":{"declared":["transition probabilities are calibrated from governance evidence"]},"parameters":{"theta_capture":0.33,"epsilon_legitimacy":0.75},"state_variables":{"governance_state":"stable|contested|captured|rollback|reconstituted","legitimacy_score":"0..1","capture_index":"0..1"},"transition_functions":{"next_state":"P_g(rule_change,evidence,threats) * state_vector"},"constraints":{"must_satisfy":["inv-legitimacy-threshold","inv-rollback-available"]},"validation_methods":{"methods":["replay historical governance transitions","sensitivity analysis","TLA+ state check"]}},
  {"id":"sim-elite-capture","name":"Elite Capture Simulator","model_type":"multi_agent_network_control","inputs":{"required":["actor_graph","resource_control","voting_power","influence_edges"]},"outputs":{"required":["capture_probability","dominant_coalitions","mitigation_plan"]},"assumptions":{"declared":["coalition behavior follows incentive and influence graph"]},"parameters":{"theta_capture":0.33,"coalition_detection_window":30},"state_variables":{"control_share":"map(actor,share)","coalitions":"sets(actor)","influence_weight":"edge_weight"},"transition_functions":{"coalition_growth":"replicator_mutator_step plus resource_transfer"},"constraints":{"must_satisfy":["max_control_share < theta_capture"]},"validation_methods":{"methods":["synthetic coalition attack tests","counterfactual mitigation sweeps"]}},
  {"id":"sim-civilizational-collapse","name":"Civilizational Collapse Simulator","model_type":"system_dynamics_scenario_model","inputs":{"required":["resource_capacity","institutional_legitimacy","epistemic_integrity","external_shocks"]},"outputs":{"required":["collapse_risk","recovery_path","critical_driver_rank"]},"assumptions":{"declared":["collapse emerges from coupled resource, governance, and epistemic failures"]},"parameters":{"shock_frequency":"scenario_defined","recovery_threshold":0.65},"state_variables":{"resource_margin":"numeric","legitimacy":"0..1","epistemic_integrity":"0..1","coordination_capacity":"0..1"},"transition_functions":{"system_step":"coupled nonlinear update with shock and mitigation terms"},"constraints":{"must_satisfy":["no_unmitigated_critical_driver","preservation_layer_available"]},"validation_methods":{"methods":["scenario ensemble","stress testing","expert review"]}},
  {"id":"sim-alignment-drift","name":"Alignment Drift Simulator","model_type":"objective_distance_and_feedback_control","inputs":{"required":["objective_vector","constitutional_vector","recursive_update_plan","feedback_quality"]},"outputs":{"required":["drift_score","blocked_updates","realignment_actions"]},"assumptions":{"declared":["alignment can be represented by governed distance metrics and invariant checks"]},"parameters":{"epsilon_align":0.05,"criticality_multiplier":2},"state_variables":{"objective_distance":"numeric","update_depth":"integer","feedback_noise":"numeric"},"transition_functions":{"drift_update":"objective_t+1 = update(objective_t, proposal, feedback_noise)"},"constraints":{"must_satisfy":["D(objective,constitution)<=epsilon_align","proof_before_recursive_update"]},"validation_methods":{"methods":["adversarial proposal tests","NSRSA verification","rollback drills"]}},
  {"id":"sim-thermodynamic-growth","name":"Thermodynamic Growth Simulator","model_type":"resource_entropy_growth_model","inputs":{"required":["energy_budget","compute_demand","temperature_profile","material_capacity"]},"outputs":{"required":["growth_ceiling","entropy_cost","delegation_or_block_decision"]},"assumptions":{"declared":["computation and consensus consume bounded physical resources"]},"parameters":{"boltzmann_constant":"1.380649e-23","entropy_budget":"governed"},"state_variables":{"available_energy":"joules","erased_bits":"bits","thermal_margin":"numeric"},"transition_functions":{"energy_step":"E_next = E_available - irreversible_compute_cost - externality_cost"},"constraints":{"must_satisfy":["E_min >= k_B*T*ln(2)*erased_bits","resource_budget_nonnegative"]},"validation_methods":{"methods":["unit checks","resource telemetry audit","growth ceiling sensitivity"]}}
]
$json$::jsonb) as s(id text, name text, model_type text, inputs jsonb, outputs jsonb, assumptions jsonb, parameters jsonb, state_variables jsonb, transition_functions jsonb, constraints jsonb, validation_methods jsonb)
on conflict (id) do update
set name = excluded.name,
    model_type = excluded.model_type,
    inputs = excluded.inputs,
    outputs = excluded.outputs,
    assumptions = excluded.assumptions,
    parameters = excluded.parameters,
    state_variables = excluded.state_variables,
    transition_functions = excluded.transition_functions,
    constraints = excluded.constraints,
    validation_methods = excluded.validation_methods;

insert into public.knowledge_governance_rules (id, rule_type, name, description, dependencies, enforcement, invariants, source_document)
select id, rule_type, name, description, dependencies, enforcement, invariants, 'doc-tier8-constitutional-knowledge-system'
from jsonb_to_recordset($json$
[
  {"id":"gr-governance-rule","rule_type":"GovernanceRule","name":"GovernanceRule","description":"All knowledge-system changes must carry source document, authorizing rule, replay-safe identifier, and audit metadata.","dependencies":["knowledge_documents","knowledge_entities"],"enforcement":{"mode":"database_constraints_and_review_gate","blocks":["missing_source_document","duplicate_unstable_id"]},"invariants":["inv-audit-completeness"]},
  {"id":"gr-mutation","rule_type":"MutationRule","name":"MutationRule","description":"Constitutional mutations require MCMEA evaluation, TLA+ specification, simulation pass, and rollback plan before activation.","dependencies":["ent-mcmea","ent-tla-plus","ent-long-horizon-simulation-framework"],"enforcement":{"mode":"proof_and_simulation_gate","blocks":["missing_proof","missing_simulation","missing_rollback"]},"invariants":["inv-constitutional-invariants-preserved","inv-rollback-available"]},
  {"id":"gr-legitimacy","rule_type":"LegitimacyRule","name":"LegitimacyRule","description":"Governance state transitions require authorized participation, transparent evidence, threshold approval, and capture checks.","dependencies":["ent-governance-state-transition","ent-capture-resistance-rule"],"enforcement":{"mode":"threshold_and_capture_gate","minimum_legitimacy_score":0.75},"invariants":["inv-legitimacy-threshold"]},
  {"id":"gr-rollback-rule","rule_type":"RollbackRule","name":"RollbackRule","description":"Every activated mutation must preserve a tested rollback transition and reconstitution state.","dependencies":["ent-rollback-protocol","ent-governance-state-transition"],"enforcement":{"mode":"activation_blocker","blocks":["rollback_state_absent","rollback_test_failed"]},"invariants":["inv-rollback-available"]},
  {"id":"gr-safety","rule_type":"SafetyRule","name":"SafetyRule","description":"High-criticality actions must satisfy invariants, threat checks, and verification gates before execution.","dependencies":["ent-safety-rule","ent-nsrsa","ent-tlaps"],"enforcement":{"mode":"fail_closed","blocks":["invariant_failure","threat_unmitigated","proof_missing"]},"invariants":["inv-proof-before-recursive-update","inv-alignment-non-regression"]},
  {"id":"gr-capture-resistance","rule_type":"CaptureResistanceRule","name":"CaptureResistanceRule","description":"Governance, consensus, and knowledge promotion must block concentrated control exceeding governed thresholds.","dependencies":["ent-elite-capture","fa-capture-threshold"],"enforcement":{"mode":"concentration_monitor","theta_capture":0.33},"invariants":["inv-capture-threshold"]},
  {"id":"gr-preservation","rule_type":"PreservationRule","name":"PreservationRule","description":"Permanent knowledge assets require provenance, semantic chunking, fixity metadata, and migration readiness.","dependencies":["ent-preservation-layer"],"enforcement":{"mode":"preservation_gate","targets":["knowledge_documents","knowledge_embeddings","knowledge_rfc_library"]},"invariants":["inv-fixity-check","inv-migration-path"]}
]
$json$::jsonb) as g(id text, rule_type text, name text, description text, dependencies text[], enforcement jsonb, invariants text[])
on conflict (id) do update
set rule_type = excluded.rule_type,
    name = excluded.name,
    description = excluded.description,
    dependencies = excluded.dependencies,
    enforcement = excluded.enforcement,
    invariants = excluded.invariants;

insert into public.knowledge_invariants (id, name, statement, scope, verification_method, dependencies, source_document)
select id, name, statement, scope, verification_method, dependencies, 'doc-tier8-constitutional-knowledge-system'
from jsonb_to_recordset($json$
[
  {"id":"inv-no-marketplace-materialization","name":"No Marketplace Materialization","statement":"Tier 8 knowledge assets must not create products, SKUs, sellers, inventory, brands, pricing, or marketplace records.","scope":"knowledge_ingestion","verification_method":"migration audit against commerce tables","dependencies":["doc-tier8-constitutional-knowledge-system"]},
  {"id":"inv-legitimacy-threshold","name":"Legitimacy Threshold","statement":"Governance transitions require legitimacy_score >= governed threshold and capture_index below theta_capture.","scope":"governance_state_transition","verification_method":"rule evaluation and simulation","dependencies":["gr-legitimacy","gr-capture-resistance"]},
  {"id":"inv-rollback-available","name":"Rollback Available","statement":"Every activated constitutional mutation has a tested rollback path and reconstitution state.","scope":"constitutional_mutation","verification_method":"TLA+ transition check and rollback drill","dependencies":["gr-rollback-rule"]},
  {"id":"inv-proof-before-recursive-update","name":"Proof Before Recursive Update","statement":"Recursive self-improvement cannot activate without proof obligations and alignment checks passing.","scope":"recursive_self_improvement","verification_method":"NSRSA plus TLAPS proof gate","dependencies":["ent-nsrsa","ent-tlaps"]},
  {"id":"inv-alignment-non-regression","name":"Alignment Non-Regression","statement":"No update may increase objective distance beyond epsilon_align relative to constitutional objectives.","scope":"alignment","verification_method":"alignment drift simulation and metric check","dependencies":["fa-alignment-drift-constraint"]},
  {"id":"inv-provenance-required","name":"Provenance Required","statement":"Every active knowledge asset must have a source document and traceable provenance chain.","scope":"epistemic_security","verification_method":"database not-null constraints and provenance audit","dependencies":["ent-epistemic-defense-layer"]},
  {"id":"inv-capture-threshold","name":"Capture Threshold","statement":"No actor or detected coalition may exceed governed control concentration thresholds for critical transitions.","scope":"governance_and_consensus","verification_method":"coalition graph analysis","dependencies":["fa-capture-threshold"]},
  {"id":"inv-layer-reference-integrity","name":"Layer Reference Integrity","statement":"Ontology, graph, RFC, formal, simulation, governance, threat, and vector layers must reference existing assets.","scope":"knowledge_operating_system","verification_method":"foreign keys and graph traversal audit","dependencies":["RFC-008"]},
  {"id":"inv-fixity-check","name":"Fixity Check","statement":"Permanent knowledge records must be restorable and auditable against fixity metadata where archived.","scope":"preservation","verification_method":"restore drill and hash audit","dependencies":["gr-preservation"]},
  {"id":"inv-consensus-resource-provenance","name":"Consensus Resource Provenance","statement":"Consensus resource and energy claims must include provenance before influencing governance decisions.","scope":"thermodynamic_consensus","verification_method":"telemetry source audit","dependencies":["RFC-001"]}
]
$json$::jsonb) as i(id text, name text, statement text, scope text, verification_method text, dependencies text[])
on conflict (id) do update
set name = excluded.name,
    statement = excluded.statement,
    scope = excluded.scope,
    verification_method = excluded.verification_method,
    dependencies = excluded.dependencies;

insert into public.knowledge_threats (id, name, category, detection, impact, severity, mitigation, rollback, monitoring, source_document)
select id, name, category, detection, impact, severity, mitigation, rollback, monitoring, 'doc-tier8-constitutional-knowledge-system'
from jsonb_to_recordset($json$
[
  {"id":"thr-elite-capture","name":"Elite Capture","category":"Governance","detection":{"signals":["control_concentration","quorum_reuse","coalition_graph_density"]},"impact":"Delegitimizes governance and redirects institutional control.","severity":"critical","mitigation":{"controls":["capture threshold","rotating quorum","public audit"]},"rollback":{"actions":["freeze mutation","revert captured transition","reconstitute quorum"]},"monitoring":{"cadence":"continuous","metrics":["capture_index","actor_control_share"]}},
  {"id":"thr-ontology-poisoning","name":"Ontology Poisoning","category":"Epistemic Security","detection":{"signals":["unexpected relation drift","embedding anomaly","untrusted provenance"]},"impact":"Corrupts semantic infrastructure and downstream retrieval or reasoning.","severity":"critical","mitigation":{"controls":["quarantine","semantic diff","trusted source gate"]},"rollback":{"actions":["restore previous graph snapshot","remove poisoned embeddings"]},"monitoring":{"cadence":"per_ingestion","metrics":["relation_anomaly_score","source_trust"]}},
  {"id":"thr-alignment-drift","name":"Alignment Drift","category":"Alignment","detection":{"signals":["objective_distance_increase","feedback_quality_drop","recursive_update_depth"]},"impact":"System behavior diverges from constitutional intent.","severity":"critical","mitigation":{"controls":["NSRSA","alignment simulation","human escalation"]},"rollback":{"actions":["revert update","restore prior objective vector"]},"monitoring":{"cadence":"per_update","metrics":["objective_distance","epsilon_breach_count"]}},
  {"id":"thr-compute-monopoly","name":"Compute Monopoly","category":"Economic Systems","detection":{"signals":["compute_share_concentration","scheduler_dependency","pricing_power"]},"impact":"Distorts consensus, simulation, and epistemic power through resource concentration.","severity":"high","mitigation":{"controls":["resource caps","delegated compute diversity","anti-monopoly policy"]},"rollback":{"actions":["pause dependent proposals","rebalance compute providers"]},"monitoring":{"cadence":"daily","metrics":["compute_hhi","provider_share"]}},
  {"id":"thr-coalition-attack","name":"Coalition Attack","category":"Multi-Agent Systems","detection":{"signals":["correlated votes","synchronized proposals","influence graph clusters"]},"impact":"Allows coordinated actors to bypass isolated-agent controls.","severity":"critical","mitigation":{"controls":["coalition detection","threshold hardening","delayed activation"]},"rollback":{"actions":["invalidate affected vote","trigger governance review"]},"monitoring":{"cadence":"continuous","metrics":["coalition_probability","vote_correlation"]}},
  {"id":"thr-epistemic-corruption","name":"Epistemic Corruption","category":"Epistemic Security","detection":{"signals":["provenance gaps","citation laundering","contradictory promoted assets"]},"impact":"Weakens truth-seeking, verification, and knowledge preservation.","severity":"critical","mitigation":{"controls":["evidence chain enforcement","source trust scoring","review escalation"]},"rollback":{"actions":["depromote corrupted assets","restore verified source state"]},"monitoring":{"cadence":"per_promotion","metrics":["provenance_completeness","trust_score"]}},
  {"id":"thr-recursive-misalignment","name":"Recursive Misalignment","category":"Recursive Self Improvement","detection":{"signals":["proof bypass attempt","drift amplification","unsafe self-modification"]},"impact":"Amplifies unsafe behavior through repeated self-updates.","severity":"critical","mitigation":{"controls":["proof gate","update depth limit","rollback test"]},"rollback":{"actions":["halt recursive loop","restore last verified build"]},"monitoring":{"cadence":"per_recursive_step","metrics":["update_depth","proof_status","drift_delta"]}}
]
$json$::jsonb) as t(id text, name text, category text, detection jsonb, impact text, severity text, mitigation jsonb, rollback jsonb, monitoring jsonb)
on conflict (id) do update
set name = excluded.name,
    category = excluded.category,
    detection = excluded.detection,
    impact = excluded.impact,
    severity = excluded.severity,
    mitigation = excluded.mitigation,
    rollback = excluded.rollback,
    monitoring = excluded.monitoring;

insert into public.knowledge_embeddings (chunk_id, document_id, title, summary, embedding_text, keywords, ontology_refs, graph_refs)
select chunk_id, 'doc-tier8-constitutional-knowledge-system', title, summary, embedding_text, keywords, ontology_refs, graph_refs
from jsonb_to_recordset($json$
[
  {"chunk_id":"vec-tier8-001-domain-ontology","title":"Tier 8 Domain and Ontology Architecture","summary":"Canonical domains and ontology entities for KARTEX permanent knowledge infrastructure.","embedding_text":"KARTEX Tier 8 defines a permanent knowledge asset layer rather than a commerce catalog. The domain architecture covers thermodynamics, consensus systems, governance, recursive self improvement, alignment, knowledge preservation, simulation theory, game theory, constitutional systems, formal verification, cybernetics, economic systems, epistemic security, and multi-agent systems. Ontology records include entities, concepts, theories, models, equations, protocols, frameworks, algorithms, invariants, metrics, simulations, threats, mitigations, governance rules, and verification rules. Every entity carries a stable entity_id, entity_type, canonical_name, aliases, definition, source document, confidence, and knowledge tier. These records are suitable for Postgres, graph promotion, and vector search without creating product, SKU, seller, inventory, brand, pricing, or marketplace records.","keywords":["ontology","domains","tier_8","knowledge_entities"],"ontology_refs":["ent-landauer-principle","ent-mcmea","ent-constitutional-mutation-engine"],"graph_refs":["rel-csf-integrates-governance"]},
  {"chunk_id":"vec-tier8-002-thermodynamic-consensus","title":"Thermodynamic Consensus Layer","summary":"Entropy-aware consensus constrained by Landauer energy limits and resource provenance.","embedding_text":"The Thermodynamic Consensus Layer introduces physical resource constraints into consensus and governance decisions. Landauer Principle provides the minimum erasure energy bound and constrains irreversible computation. Thermodynamic Consensus depends on resource telemetry, entropy budgets, validator work bounds, and provenance of energy and compute claims. The layer must fail closed when energy accounting is stale, unbounded computation is requested, or consensus resource provenance is missing. Formal assets include the Landauer Equation and resource provenance invariants. Simulation support comes from the Thermodynamic Growth Simulator, which models energy budgets, erased bits, thermal margins, externality costs, and growth ceilings.","keywords":["thermodynamics","consensus","landauer","entropy"],"ontology_refs":["ent-landauer-principle","ent-thermodynamic-consensus","ent-thermodynamic-growth-simulator"],"graph_refs":["rel-landauer-constrains-thermodynamic-consensus"]},
  {"chunk_id":"vec-tier8-003-recursive-alignment","title":"Recursive Self Alignment Layer","summary":"NSRSA, alignment drift simulation, and proof gates for recursive self-improvement.","embedding_text":"The Recursive Self Alignment Layer governs self-modifying systems. NSRSA validates recursive updates against constitutional invariants, alignment non-regression, proof obligations, and rollback requirements. Alignment Drift is treated as a critical threat where objectives progressively diverge from authorized constitutional intent. Recursive Misalignment is the amplification threat produced when drift compounds through repeated self-improvement. The layer uses objective distance constraints, epsilon alignment thresholds, TLAPS proof obligations, and the Alignment Drift Simulator. Recursive updates must not activate without proof-before-update, simulation results, and a tested rollback path.","keywords":["alignment","recursive_self_improvement","NSRSA","drift"],"ontology_refs":["ent-nsrsa","ent-alignment-drift","ent-recursive-misalignment"],"graph_refs":["rel-alignment-drift-enables-recursive-misalignment"]},
  {"chunk_id":"vec-tier8-004-governance-constitution","title":"Governance and Constitutional Mutation","summary":"MCMEA, ConstitutionalMutationEngine, legitimacy, mutation, rollback, and capture resistance rules.","embedding_text":"The Governance and Constitutional Mutation architecture defines permanent state transition infrastructure for KARTEX. MCMEA governs governance state transitions by evaluating legitimacy, safety, stability, reversibility, and evidence quality. The ConstitutionalMutationEngine proposes, verifies, simulates, activates, and rolls back constitutional mutations. TLA+ specifies transition systems while TLAPS proves invariants. Governance rules include MutationRule, LegitimacyRule, RollbackRule, SafetyRule, CaptureResistanceRule, and PreservationRule. Each critical transition requires threshold approval, capture checks, simulation, formal proof, audit metadata, and rollback availability.","keywords":["governance","constitution","mutation","rollback"],"ontology_refs":["ent-mcmea","ent-constitutional-mutation-engine","ent-rollback-protocol"],"graph_refs":["rel-mcmea-governs-transition","rel-cme-uses-tla"]},
  {"chunk_id":"vec-tier8-005-formal-verification","title":"Formal Verification Assets","summary":"Reusable equations, state machines, constraints, transition systems, invariants, and proof requirements.","embedding_text":"Formal verification assets encode the mathematical and machine-checkable substrate of the Tier 8 knowledge system. Assets include the Landauer Equation, TLA+ Constitutional Engine, Markov Governance Matrix, Replicator-Mutator Equation, Lyapunov Stability Equation, alignment drift constraint, capture threshold invariant, and epistemic provenance constraint. Each formal asset declares category, source section, notation, dependencies, and proof requirements. These assets support model checking, state transition replay, proof-before-update, governance stability certification, and threat threshold enforcement.","keywords":["formal_verification","TLA+","TLAPS","invariants"],"ontology_refs":["ent-tla-plus","ent-tlaps","ent-lyapunov-stability-equation"],"graph_refs":["rel-cme-uses-tlaps","rel-lyapunov-verifies-stability"]},
  {"chunk_id":"vec-tier8-006-simulation-registry","title":"Simulation Model Registry","summary":"Governance, capture, collapse, alignment drift, and thermodynamic growth simulations.","embedding_text":"The simulation registry provides reusable models for long horizon governance and civilizational analysis. Governance Stability Simulator uses Markov transitions and Lyapunov criteria to estimate stability and rollback needs. Elite Capture Simulator models actor graphs, coalition formation, and control concentration. Civilizational Collapse Simulator models coupled resource, legitimacy, epistemic, and coordination failures. Alignment Drift Simulator models objective divergence under recursive updates. Thermodynamic Growth Simulator models energy budgets, entropy costs, and growth ceilings. Each simulation records inputs, outputs, assumptions, parameters, state variables, transition functions, constraints, and validation methods.","keywords":["simulation","governance_stability","collapse","capture"],"ontology_refs":["ent-long-horizon-simulation-framework","ent-governance-stability-simulator","ent-civilizational-collapse-simulator"],"graph_refs":["rel-lhsf-runs-collapse","rel-lhsf-runs-governance-stability"]},
  {"chunk_id":"vec-tier8-007-threat-model","title":"Threat Model Registry","summary":"Elite capture, ontology poisoning, alignment drift, compute monopoly, coalition attack, epistemic corruption, and recursive misalignment.","embedding_text":"The threat model registry treats governance, epistemic, alignment, economic, and multi-agent risks as first-class knowledge entities. Elite Capture tracks control concentration and captured quorums. Ontology Poisoning detects corrupted categories, relations, embeddings, and provenance. Alignment Drift monitors objective distance from constitutional intent. Compute Monopoly tracks compute concentration that can distort consensus or simulation power. Coalition Attack detects coordinated adversarial groups. Epistemic Corruption tracks provenance gaps and citation laundering. Recursive Misalignment blocks proof bypass and unsafe self-modification. Each threat includes detection, impact, severity, mitigation, rollback, and monitoring records.","keywords":["threat_model","epistemic_security","capture","misalignment"],"ontology_refs":["ent-elite-capture","ent-ontology-poisoning","ent-recursive-misalignment"],"graph_refs":["rel-edl-mitigates-ontology-poisoning","rel-capture-rule-mitigates-elite-capture"]},
  {"chunk_id":"vec-tier8-008-kos","title":"KARTEX Knowledge Operating System Layer","summary":"Integrated operating layer for ontology, graph, RFC, governance, simulation, formal verification, threat, and preservation architecture.","embedding_text":"The KARTEX Knowledge Operating System Layer integrates the Tier 8 ingestion into production knowledge infrastructure. Ontology architecture stores domains and entities. Graph architecture stores Neo4j-ready nodes and relationships. RFC architecture stores eight canonical RFCs. Governance architecture stores mutation, legitimacy, rollback, safety, capture resistance, and preservation rules. Simulation architecture stores executable model specifications. Formal verification architecture stores equations, state machines, constraints, transition systems, invariants, and proof requirements. Threat architecture stores detection, mitigation, rollback, and monitoring. Preservation architecture stores permanent documents and vector-search-ready semantic chunks. The operating invariant is that no commerce catalog, SKU, inventory, seller, brand, price, or marketplace record is generated from this research.","keywords":["knowledge_operating_system","KARTEX","RFC","preservation"],"ontology_refs":["ent-civilization-stability-framework","ent-preservation-layer","ent-epistemic-defense-layer"],"graph_refs":["rel-csf-integrates-preservation","rel-csf-integrates-epistemic-defense"]} 
]
$json$::jsonb) as v(chunk_id text, title text, summary text, embedding_text text, keywords text[], ontology_refs text[], graph_refs text[])
on conflict (chunk_id) do update
set title = excluded.title,
    summary = excluded.summary,
    embedding_text = excluded.embedding_text,
    keywords = excluded.keywords,
    ontology_refs = excluded.ontology_refs,
    graph_refs = excluded.graph_refs,
    vector_status = 'pending_embedding';
