create extension if not exists "pgcrypto";

create table if not exists public.institutional_entities (
  institution_id text primary key default ('inst_' || encode(gen_random_bytes(16), 'hex')),
  institution_type text not null,
  creation_epoch bigint not null check (creation_epoch >= 0),
  parent_institution_id text references public.institutional_entities(institution_id) on delete set null,
  current_state text not null check (current_state in ('birth','growth','stagnation','fragmentation','collapse','replacement')),
  fitness_score numeric not null check (fitness_score >= 0 and fitness_score <= 1),
  entropy_score numeric not null check (entropy_score >= 0 and entropy_score <= 1),
  legitimacy_score numeric not null check (legitimacy_score >= 0 and legitimacy_score <= 1),
  adaptability_score numeric not null check (adaptability_score >= 0 and adaptability_score <= 1),
  survival_probability numeric not null check (survival_probability >= 0 and survival_probability <= 1),
  source_document text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.institutional_mutations (
  mutation_id text primary key default ('imut_' || encode(gen_random_bytes(16), 'hex')),
  institution_id text not null references public.institutional_entities(institution_id) on delete cascade,
  mutation_type text not null,
  trigger_event text not null,
  expected_effect jsonb not null,
  actual_effect jsonb not null default '{}'::jsonb,
  verification_status text not null check (verification_status in ('draft','pending_verification','passed','failed','activated','rolled_back')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.institutional_lifecycle_events (
  event_id text primary key default ('ile_' || encode(gen_random_bytes(16), 'hex')),
  institution_id text not null references public.institutional_entities(institution_id) on delete cascade,
  event_type text not null check (event_type in ('birth','growth','stagnation','fragmentation','collapse','replacement')),
  timestamp timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.constitutions (
  constitution_id text primary key default ('const_' || encode(gen_random_bytes(16), 'hex')),
  constitution_version text not null unique,
  status text not null check (status in ('draft','active','superseded','rolled_back')),
  source_hash text not null,
  artifact_uri text not null,
  merkle_root text not null,
  activated_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.constitutional_articles (
  article_id text primary key default ('carticle_' || encode(gen_random_bytes(16), 'hex')),
  constitution_id text not null references public.constitutions(constitution_id) on delete cascade,
  article_key text not null,
  title text not null,
  body text not null,
  invariant_refs text[] not null default array[]::text[],
  policy_refs text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  unique (constitution_id, article_key)
);

create table if not exists public.constitutional_amendments (
  amendment_id text primary key default ('amend_' || encode(gen_random_bytes(16), 'hex')),
  constitution_id text not null references public.constitutions(constitution_id) on delete cascade,
  target_version text not null,
  proposer_did text not null,
  amendment_state text not null check (amendment_state in ('draft','submitted','evidence_review','formal_validation','simulation_validation','deliberation','voting','approved','scheduled','activating','active','rejected','rollback_pending','rolled_back','superseded')),
  evidence_refs text[] not null default array[]::text[],
  proof_status text not null default 'not_started' check (proof_status in ('not_started','running','passed','failed')),
  simulation_status text not null default 'not_started' check (simulation_status in ('not_started','running','passed','failed')),
  rollback_manifest jsonb not null,
  activation_checkpoint_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.governance_constraints (
  constraint_id text primary key default ('gcon_' || encode(gen_random_bytes(16), 'hex')),
  constraint_key text not null unique,
  scope text not null,
  expression text not null,
  severity text not null check (severity in ('advisory','blocking','civilizational')),
  compiler_target text not null check (compiler_target in ('tla','alloy','smt','policy')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.governance_invariants (
  invariant_id text primary key default ('ginv_' || encode(gen_random_bytes(16), 'hex')),
  invariant_key text not null unique,
  statement text not null,
  scope text not null,
  verification_method text not null,
  proof_required boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.governance_conflicts (
  conflict_id text primary key default ('gconf_' || encode(gen_random_bytes(16), 'hex')),
  conflict_type text not null,
  subject_id text not null,
  constraint_refs text[] not null default array[]::text[],
  invariant_refs text[] not null default array[]::text[],
  detected_at timestamptz not null default now(),
  status text not null check (status in ('open','under_review','resolved','rejected')),
  replay_key text not null unique
);

create table if not exists public.governance_resolutions (
  resolution_id text primary key default ('gres_' || encode(gen_random_bytes(16), 'hex')),
  conflict_id text not null references public.governance_conflicts(conflict_id) on delete cascade,
  resolution_type text not null,
  decision_payload jsonb not null,
  decided_by text not null,
  replay_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.governance_decision_events (
  event_id text primary key default ('gde_' || encode(gen_random_bytes(16), 'hex')),
  aggregate_type text not null,
  aggregate_id text not null,
  event_type text not null,
  sequence bigint not null,
  causation_id text,
  correlation_id text,
  payload jsonb not null,
  replay_key text not null unique,
  occurred_at timestamptz not null default now(),
  unique (aggregate_type, aggregate_id, sequence)
);

create table if not exists public.formal_invariant_registry (
  invariant_id text primary key references public.governance_invariants(invariant_id) on delete cascade,
  tla_definition text not null,
  alloy_definition text not null,
  smt_definition text not null,
  severity text not null check (severity in ('safety','liveness','civilizational')),
  created_at timestamptz not null default now()
);

create table if not exists public.governance_rule_compilations (
  compilation_id text primary key default ('grc_' || encode(gen_random_bytes(16), 'hex')),
  rule_id text not null,
  target text not null check (target in ('tla','alloy','smt','open_policy')),
  compiled_artifact text not null,
  artifact_hash text not null,
  compiled_at timestamptz not null default now(),
  unique (rule_id, target, artifact_hash)
);

create table if not exists public.amendment_validation_runs (
  validation_run_id text primary key default ('avr_' || encode(gen_random_bytes(16), 'hex')),
  amendment_id text not null references public.constitutional_amendments(amendment_id) on delete cascade,
  tla_status text not null check (tla_status in ('pending','passed','failed')),
  alloy_status text not null check (alloy_status in ('pending','passed','failed')),
  smt_status text not null check (smt_status in ('pending','passed','failed')),
  simulation_status text not null check (simulation_status in ('pending','passed','failed')),
  counterexample_uri text,
  proof_artifact_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_claims (
  claim_id text primary key default ('kclaim_' || encode(gen_random_bytes(16), 'hex')),
  claim_text text not null,
  claim_type text not null,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  truth_state text not null check (truth_state in ('unverified','supported','contested','contradicted','deprecated')),
  source_document text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evidence_sources (
  evidence_id text primary key default ('evid_' || encode(gen_random_bytes(16), 'hex')),
  source_type text not null,
  source_uri text not null,
  source_hash text not null,
  trust_score numeric not null check (trust_score >= 0 and trust_score <= 1),
  provenance_chain jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.evidence_graph (
  edge_id text primary key default ('eedge_' || encode(gen_random_bytes(16), 'hex')),
  claim_id text not null references public.knowledge_claims(claim_id) on delete cascade,
  evidence_id text not null references public.evidence_sources(evidence_id) on delete cascade,
  relation_type text not null check (relation_type in ('supports','contradicts','qualifies','derives_from')),
  weight numeric not null check (weight >= 0 and weight <= 1),
  created_at timestamptz not null default now(),
  unique (claim_id, evidence_id, relation_type)
);

create table if not exists public.truth_state_registry (
  truth_state_id text primary key default ('truth_' || encode(gen_random_bytes(16), 'hex')),
  claim_id text not null references public.knowledge_claims(claim_id) on delete cascade,
  previous_state text,
  current_state text not null,
  revision_reason text not null,
  evidence_digest text not null,
  replay_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.contradiction_registry (
  contradiction_id text primary key default ('contra_' || encode(gen_random_bytes(16), 'hex')),
  claim_ids text[] not null,
  evidence_ids text[] not null,
  severity text not null check (severity in ('low','medium','high','critical')),
  status text not null check (status in ('open','quarantined','reconciled','accepted_paraconsistent')),
  created_at timestamptz not null default now()
);

create table if not exists public.uncertainty_registry (
  uncertainty_id text primary key default ('unc_' || encode(gen_random_bytes(16), 'hex')),
  claim_id text not null references public.knowledge_claims(claim_id) on delete cascade,
  uncertainty_type text not null,
  lower_bound numeric not null,
  upper_bound numeric not null,
  measurement_method text not null,
  created_at timestamptz not null default now(),
  check (lower_bound <= upper_bound)
);

create table if not exists public.archival_tiers (
  tier_id text primary key,
  durability_target numeric not null check (durability_target >= 0 and durability_target <= 1),
  min_replica_count integer not null check (min_replica_count > 0),
  retrieval_sla_seconds integer not null check (retrieval_sla_seconds > 0),
  media_strategy text not null
);

create table if not exists public.knowledge_artifacts (
  artifact_id text primary key default ('kart_' || encode(gen_random_bytes(16), 'hex')),
  artifact_type text not null,
  title text not null,
  content_hash text not null,
  tier_id text not null references public.archival_tiers(tier_id),
  fixity_algorithm text not null default 'sha256',
  source_document text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.preservation_strategies (
  strategy_id text primary key default ('pstrat_' || encode(gen_random_bytes(16), 'hex')),
  artifact_id text not null references public.knowledge_artifacts(artifact_id) on delete cascade,
  migration_policy text not null,
  verification_cadence interval not null,
  media_refresh_cadence interval not null,
  created_at timestamptz not null default now()
);

create table if not exists public.replication_policies (
  policy_id text primary key default ('rpol_' || encode(gen_random_bytes(16), 'hex')),
  artifact_id text not null references public.knowledge_artifacts(artifact_id) on delete cascade,
  replica_count integer not null check (replica_count > 0),
  region_count integer not null check (region_count > 0),
  independence_score numeric not null check (independence_score >= 0 and independence_score <= 1),
  object_lock_required boolean not null default true
);

create table if not exists public.decay_models (
  decay_model_id text primary key default ('decay_' || encode(gen_random_bytes(16), 'hex')),
  artifact_id text not null references public.knowledge_artifacts(artifact_id) on delete cascade,
  half_life_years numeric not null check (half_life_years > 0),
  format_obsolescence_risk numeric not null check (format_obsolescence_risk >= 0 and format_obsolescence_risk <= 1),
  bitrot_risk numeric not null check (bitrot_risk >= 0 and bitrot_risk <= 1)
);

create table if not exists public.retrieval_tests (
  retrieval_test_id text primary key default ('rtest_' || encode(gen_random_bytes(16), 'hex')),
  artifact_id text not null references public.knowledge_artifacts(artifact_id) on delete cascade,
  tested_at timestamptz not null default now(),
  retrieval_latency_seconds numeric not null check (retrieval_latency_seconds >= 0),
  fixity_passed boolean not null,
  semantic_readability_passed boolean not null,
  survivability_score numeric not null check (survivability_score >= 0 and survivability_score <= 1)
);

create table if not exists public.alignment_principles (
  principle_id text primary key default ('alignp_' || encode(gen_random_bytes(16), 'hex')),
  principle_key text not null unique,
  statement text not null,
  priority_weight numeric not null check (priority_weight >= 0 and priority_weight <= 1),
  source_document text not null
);

create table if not exists public.constitutional_policies (
  policy_id text primary key default ('cpol_' || encode(gen_random_bytes(16), 'hex')),
  principle_id text not null references public.alignment_principles(principle_id),
  policy_key text not null unique,
  expression text not null,
  enforcement_mode text not null check (enforcement_mode in ('advisory','blocking','rollback')),
  active boolean not null default true
);

create table if not exists public.alignment_measurements (
  measurement_id text primary key default ('ameas_' || encode(gen_random_bytes(16), 'hex')),
  principle_id text not null references public.alignment_principles(principle_id),
  subject_type text not null,
  subject_id text not null,
  objective_distance numeric not null check (objective_distance >= 0),
  measurement_vector jsonb not null,
  measured_at timestamptz not null default now()
);

create table if not exists public.alignment_drift_events (
  drift_event_id text primary key default ('adrift_' || encode(gen_random_bytes(16), 'hex')),
  principle_id text not null references public.alignment_principles(principle_id),
  subject_type text not null,
  subject_id text not null,
  previous_distance numeric not null check (previous_distance >= 0),
  current_distance numeric not null check (current_distance >= 0),
  severity text not null check (severity in ('info','watch','critical')),
  detected_at timestamptz not null default now()
);

create table if not exists public.remediation_actions (
  remediation_id text primary key default ('rem_' || encode(gen_random_bytes(16), 'hex')),
  drift_event_id text not null references public.alignment_drift_events(drift_event_id) on delete cascade,
  action_type text not null,
  action_payload jsonb not null,
  status text not null check (status in ('planned','running','completed','failed','rolled_back')),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_history (
  audit_id text primary key default ('audit_' || encode(gen_random_bytes(16), 'hex')),
  audit_scope text not null,
  subject_id text not null,
  auditor text not null,
  audit_result text not null,
  evidence_refs text[] not null default array[]::text[],
  replay_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.civilizational_agents (
  agent_id text primary key default ('cagent_' || encode(gen_random_bytes(16), 'hex')),
  agent_type text not null,
  capability_vector jsonb not null,
  preference_vector jsonb not null,
  trust_score numeric not null check (trust_score >= 0 and trust_score <= 1)
);

create table if not exists public.civilizational_institutions (
  civilization_institution_id text primary key default ('cinst_' || encode(gen_random_bytes(16), 'hex')),
  institution_id text references public.institutional_entities(institution_id) on delete set null,
  governance_capacity numeric not null check (governance_capacity >= 0 and governance_capacity <= 1),
  service_capacity numeric not null check (service_capacity >= 0 and service_capacity <= 1)
);

create table if not exists public.governance_nodes (
  node_id text primary key default ('gnode_' || encode(gen_random_bytes(16), 'hex')),
  node_type text not null,
  authority_scope text not null,
  legitimacy_score numeric not null check (legitimacy_score >= 0 and legitimacy_score <= 1)
);

create table if not exists public.resource_systems (
  resource_system_id text primary key default ('rsys_' || encode(gen_random_bytes(16), 'hex')),
  resource_type text not null,
  carrying_capacity numeric not null check (carrying_capacity >= 0),
  current_stock numeric not null check (current_stock >= 0),
  regeneration_rate numeric not null check (regeneration_rate >= 0)
);

create table if not exists public.environmental_constraints (
  constraint_id text primary key default ('envc_' || encode(gen_random_bytes(16), 'hex')),
  constraint_type text not null,
  severity numeric not null check (severity >= 0 and severity <= 1),
  affected_resources text[] not null default array[]::text[]
);

create table if not exists public.trust_networks (
  edge_id text primary key default ('trust_' || encode(gen_random_bytes(16), 'hex')),
  source_agent_id text not null references public.civilizational_agents(agent_id) on delete cascade,
  target_agent_id text not null references public.civilizational_agents(agent_id) on delete cascade,
  trust_weight numeric not null check (trust_weight >= 0 and trust_weight <= 1),
  updated_at timestamptz not null default now()
);

create table if not exists public.technology_networks (
  edge_id text primary key default ('tnet_' || encode(gen_random_bytes(16), 'hex')),
  source_technology_id text not null,
  target_technology_id text not null,
  relation_type text not null check (relation_type in ('enables','competes_with','displaces','depends_on')),
  strength numeric not null check (strength >= 0 and strength <= 1)
);

create table if not exists public.conflict_networks (
  edge_id text primary key default ('cnet_' || encode(gen_random_bytes(16), 'hex')),
  source_agent_id text not null references public.civilizational_agents(agent_id) on delete cascade,
  target_agent_id text not null references public.civilizational_agents(agent_id) on delete cascade,
  conflict_intensity numeric not null check (conflict_intensity >= 0 and conflict_intensity <= 1),
  cause text not null
);

create table if not exists public.simulation_runs (
  simulation_run_id text primary key default ('simrun_' || encode(gen_random_bytes(16), 'hex')),
  simulation_type text not null,
  horizon_years integer not null check (horizon_years in (10,25,50,100,250,500)),
  seed bigint not null,
  input_digest text not null,
  result_digest text,
  status text not null check (status in ('planned','running','completed','failed','invalidated')),
  created_at timestamptz not null default now()
);

create table if not exists public.population_metrics (
  metric_id text primary key default ('popm_' || encode(gen_random_bytes(16), 'hex')),
  scope_id text not null,
  measured_at timestamptz not null default now(),
  population_total numeric not null check (population_total >= 0),
  median_wage numeric not null check (median_wage >= 0),
  subsistence_wage numeric not null check (subsistence_wage > 0),
  youth_bulge numeric not null check (youth_bulge >= 0),
  mmp numeric generated always as ((subsistence_wage / nullif(median_wage, 0)) + youth_bulge) stored
);

create table if not exists public.elite_metrics (
  metric_id text primary key default ('elitem_' || encode(gen_random_bytes(16), 'hex')),
  scope_id text not null,
  measured_at timestamptz not null default now(),
  elite_count numeric not null check (elite_count >= 0),
  elite_positions numeric not null check (elite_positions > 0),
  wealth_concentration numeric not null check (wealth_concentration >= 0),
  emp numeric generated always as ((elite_count / elite_positions) + wealth_concentration) stored
);

create table if not exists public.state_metrics (
  metric_id text primary key default ('statem_' || encode(gen_random_bytes(16), 'hex')),
  scope_id text not null,
  measured_at timestamptz not null default now(),
  fiscal_distress numeric not null check (fiscal_distress >= 0),
  legitimacy_loss numeric not null check (legitimacy_loss >= 0),
  coercion_fragmentation numeric not null check (coercion_fragmentation >= 0),
  sfd numeric generated always as (fiscal_distress + legitimacy_loss + coercion_fragmentation) stored
);

create table if not exists public.political_stress_metrics (
  metric_id text primary key default ('psim_' || encode(gen_random_bytes(16), 'hex')),
  scope_id text not null,
  measured_at timestamptz not null default now(),
  mmp numeric not null check (mmp >= 0),
  emp numeric not null check (emp >= 0),
  sfd numeric not null check (sfd >= 0),
  psi numeric generated always as (mmp * emp * sfd) stored
);

create table if not exists public.historical_civilizations (
  civilization_id text primary key,
  name text not null unique,
  region text not null,
  start_year integer not null,
  end_year integer,
  calibration_adapter text not null check (calibration_adapter in ('roman_empire','han_dynasty','mughal_empire','british_empire','modern_states')),
  source_document text not null
);

create table if not exists public.calibration_runs (
  calibration_run_id text primary key default ('cal_' || encode(gen_random_bytes(16), 'hex')),
  civilization_id text not null references public.historical_civilizations(civilization_id),
  model_version text not null,
  input_digest text not null,
  fit_score numeric not null check (fit_score >= 0 and fit_score <= 1),
  created_at timestamptz not null default now()
);

create table if not exists public.validation_runs (
  validation_run_id text primary key default ('val_' || encode(gen_random_bytes(16), 'hex')),
  calibration_run_id text not null references public.calibration_runs(calibration_run_id) on delete cascade,
  holdout_period text not null,
  validation_score numeric not null check (validation_score >= 0 and validation_score <= 1),
  created_at timestamptz not null default now()
);

create table if not exists public.benchmark_results (
  benchmark_result_id text primary key default ('bench_' || encode(gen_random_bytes(16), 'hex')),
  validation_run_id text not null references public.validation_runs(validation_run_id) on delete cascade,
  benchmark_name text not null,
  score numeric not null check (score >= 0 and score <= 1),
  result_payload jsonb not null
);

create table if not exists public.prediction_results (
  prediction_result_id text primary key default ('pred_' || encode(gen_random_bytes(16), 'hex')),
  simulation_run_id text references public.simulation_runs(simulation_run_id) on delete set null,
  civilization_id text references public.historical_civilizations(civilization_id) on delete set null,
  horizon_years integer not null check (horizon_years in (10,25,50,100,250,500)),
  prediction_payload jsonb not null,
  confidence numeric not null check (confidence >= 0 and confidence <= 1)
);

create table if not exists public.technologies (
  technology_id text primary key default ('tech_' || encode(gen_random_bytes(16), 'hex')),
  name text not null unique,
  technology_domain text not null,
  maturity numeric not null check (maturity >= 0 and maturity <= 1),
  carrying_capacity numeric not null check (carrying_capacity > 0)
);

create table if not exists public.adoption_events (
  adoption_event_id text primary key default ('adopt_' || encode(gen_random_bytes(16), 'hex')),
  technology_id text not null references public.technologies(technology_id) on delete cascade,
  adopter_scope text not null,
  adoption_fraction numeric not null check (adoption_fraction >= 0 and adoption_fraction <= 1),
  occurred_at timestamptz not null default now()
);

create table if not exists public.diffusion_curves (
  diffusion_curve_id text primary key default ('diff_' || encode(gen_random_bytes(16), 'hex')),
  technology_id text not null references public.technologies(technology_id) on delete cascade,
  model_type text not null check (model_type in ('bass_diffusion','polya_urn','competition')),
  parameters jsonb not null,
  curve_points jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.lockin_events (
  lockin_event_id text primary key default ('lock_' || encode(gen_random_bytes(16), 'hex')),
  technology_id text not null references public.technologies(technology_id) on delete cascade,
  lockin_strength numeric not null check (lockin_strength >= 0 and lockin_strength <= 1),
  mechanism text not null,
  occurred_at timestamptz not null default now()
);

create table if not exists public.displacement_events (
  displacement_event_id text primary key default ('disp_' || encode(gen_random_bytes(16), 'hex')),
  incumbent_technology_id text not null references public.technologies(technology_id),
  challenger_technology_id text not null references public.technologies(technology_id),
  displacement_rate numeric not null check (displacement_rate >= 0 and displacement_rate <= 1),
  occurred_at timestamptz not null default now()
);

create table if not exists public.innovation_cycles (
  innovation_cycle_id text primary key default ('innov_' || encode(gen_random_bytes(16), 'hex')),
  technology_id text not null references public.technologies(technology_id) on delete cascade,
  cycle_phase text not null check (cycle_phase in ('invention','diffusion','lock_in','displacement','renewal')),
  phase_started_at timestamptz not null default now(),
  phase_payload jsonb not null default '{}'::jsonb
);

create table if not exists public.coalitions (
  coalition_id text primary key default ('coal_' || encode(gen_random_bytes(16), 'hex')),
  name text not null,
  coalition_type text not null,
  cohesion_score numeric not null check (cohesion_score >= 0 and cohesion_score <= 1),
  deception_risk numeric not null check (deception_risk >= 0 and deception_risk <= 1)
);

create table if not exists public.coalition_members (
  coalition_id text not null references public.coalitions(coalition_id) on delete cascade,
  agent_id text not null references public.civilizational_agents(agent_id) on delete cascade,
  influence_weight numeric not null check (influence_weight >= 0 and influence_weight <= 1),
  primary key (coalition_id, agent_id)
);

create table if not exists public.coalition_resources (
  coalition_resource_id text primary key default ('cores_' || encode(gen_random_bytes(16), 'hex')),
  coalition_id text not null references public.coalitions(coalition_id) on delete cascade,
  resource_type text not null,
  resource_amount numeric not null check (resource_amount >= 0)
);

create table if not exists public.attrition_models (
  attrition_model_id text primary key default ('attr_' || encode(gen_random_bytes(16), 'hex')),
  model_type text not null check (model_type in ('ccag','lanchester_linear','lanchester_square')),
  parameters jsonb not null,
  invariant_refs text[] not null default array[]::text[]
);

create table if not exists public.conflict_scenarios (
  conflict_scenario_id text primary key default ('cscen_' || encode(gen_random_bytes(16), 'hex')),
  coalition_a_id text not null references public.coalitions(coalition_id),
  coalition_b_id text not null references public.coalitions(coalition_id),
  attrition_model_id text not null references public.attrition_models(attrition_model_id),
  scenario_payload jsonb not null,
  status text not null check (status in ('draft','validated','simulated','archived'))
);

create table if not exists public.strategic_deception_events (
  deception_event_id text primary key default ('sdec_' || encode(gen_random_bytes(16), 'hex')),
  coalition_id text not null references public.coalitions(coalition_id) on delete cascade,
  signal_type text not null,
  signal_payload jsonb not null,
  estimated_deception_probability numeric not null check (estimated_deception_probability >= 0 and estimated_deception_probability <= 1),
  detected_at timestamptz not null default now()
);

create table if not exists public.tier10_event_topics (
  topic_name text primary key,
  partitions integer not null check (partitions > 0),
  retention_policy text not null,
  replay_key_field text not null,
  schema_ref text not null
);

create table if not exists public.tier10_operational_dashboards (
  dashboard_id text primary key,
  dashboard_name text not null,
  metric_refs text[] not null,
  event_topics text[] not null,
  verification_refs text[] not null
);

create or replace function public.tier10_transition_institution_state(
  current_state text,
  fitness numeric,
  entropy numeric,
  legitimacy numeric,
  adaptability numeric
) returns text
language sql
immutable
as $$
  select case
    when current_state = 'birth' and legitimacy >= 0.45 and fitness >= 0.45 then 'growth'
    when current_state = 'growth' and (adaptability < 0.35 or entropy > 0.72) then 'stagnation'
    when current_state = 'stagnation' and entropy >= 0.82 and legitimacy < 0.45 then 'fragmentation'
    when current_state = 'fragmentation' and fitness < 0.25 and legitimacy < 0.25 then 'collapse'
    when current_state = 'collapse' and adaptability >= 0.55 and legitimacy >= 0.50 then 'replacement'
    when current_state = 'replacement' and fitness >= 0.50 then 'growth'
    else current_state
  end
$$;

create or replace function public.tier10_knowledge_durability_score(
  replica_count integer,
  independence_score numeric,
  half_life_years numeric,
  format_obsolescence_risk numeric,
  bitrot_risk numeric
) returns numeric
language sql
immutable
as $$
  select greatest(0, least(1,
    (1 - exp(-greatest(replica_count, 0)::numeric / 3.0)) * 0.35 +
    independence_score * 0.25 +
    least(1, half_life_years / 500.0) * 0.20 +
    (1 - format_obsolescence_risk) * 0.10 +
    (1 - bitrot_risk) * 0.10
  ))
$$;

create or replace function public.tier10_validate_amendment(amendment text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.amendment_validation_runs avr
    join public.constitutional_amendments ca on ca.amendment_id = avr.amendment_id
    where avr.amendment_id = amendment
      and avr.tla_status = 'passed'
      and avr.alloy_status = 'passed'
      and avr.smt_status = 'passed'
      and avr.simulation_status = 'passed'
      and ca.rollback_manifest <> '{}'::jsonb
  )
$$;

create index if not exists institutional_entities_state_idx on public.institutional_entities(current_state);
create index if not exists institutional_mutations_institution_idx on public.institutional_mutations(institution_id);
create index if not exists institutional_lifecycle_events_institution_ts_idx on public.institutional_lifecycle_events(institution_id, timestamp desc);
create index if not exists constitutional_amendments_state_idx on public.constitutional_amendments(amendment_state);
create index if not exists governance_decision_events_aggregate_idx on public.governance_decision_events(aggregate_type, aggregate_id, sequence);
create index if not exists evidence_graph_claim_idx on public.evidence_graph(claim_id);
create index if not exists evidence_graph_evidence_idx on public.evidence_graph(evidence_id);
create index if not exists knowledge_claims_truth_state_idx on public.knowledge_claims(truth_state);
create index if not exists alignment_measurements_subject_idx on public.alignment_measurements(subject_type, subject_id, measured_at desc);
create index if not exists simulation_runs_horizon_idx on public.simulation_runs(horizon_years, status);
create index if not exists political_stress_scope_ts_idx on public.political_stress_metrics(scope_id, measured_at desc);
create index if not exists adoption_events_technology_ts_idx on public.adoption_events(technology_id, occurred_at desc);
create index if not exists strategic_deception_coalition_idx on public.strategic_deception_events(coalition_id, detected_at desc);

insert into public.archival_tiers (tier_id, durability_target, min_replica_count, retrieval_sla_seconds, media_strategy)
values
  ('civilizational_permanent', 0.9999, 7, 86400, 'multi-region object lock plus offline bootstrap media'),
  ('constitutional_permanent', 0.99999, 9, 3600, 'object lock, proof archive, graph snapshot, printed canonical digest'),
  ('simulation_evidence', 0.999, 5, 172800, 'lakehouse artifact plus deterministic replay bundle')
on conflict (tier_id) do update
set durability_target = excluded.durability_target,
    min_replica_count = excluded.min_replica_count,
    retrieval_sla_seconds = excluded.retrieval_sla_seconds,
    media_strategy = excluded.media_strategy;

insert into public.historical_civilizations (civilization_id, name, region, start_year, end_year, calibration_adapter, source_document)
values
  ('hist-roman-empire', 'Roman Empire', 'Mediterranean', -27, 476, 'roman_empire', 'tier_10_research_corpus'),
  ('hist-han-dynasty', 'Han Dynasty', 'East Asia', -202, 220, 'han_dynasty', 'tier_10_research_corpus'),
  ('hist-mughal-empire', 'Mughal Empire', 'South Asia', 1526, 1857, 'mughal_empire', 'tier_10_research_corpus'),
  ('hist-british-empire', 'British Empire', 'Global', 1583, 1997, 'british_empire', 'tier_10_research_corpus'),
  ('hist-modern-states', 'Modern States', 'Global', 1945, null, 'modern_states', 'tier_10_research_corpus')
on conflict (civilization_id) do update
set name = excluded.name,
    region = excluded.region,
    start_year = excluded.start_year,
    end_year = excluded.end_year,
    calibration_adapter = excluded.calibration_adapter,
    source_document = excluded.source_document;

insert into public.tier10_event_topics (topic_name, partitions, retention_policy, replay_key_field, schema_ref)
values
  ('institution.events', 24, 'compact+permanent', 'institution_id', 'tier10.institution.EventEnvelope.v1'),
  ('governance.events', 24, 'compact+permanent', 'aggregate_id', 'tier10.governance.EventEnvelope.v1'),
  ('constitution.events', 24, 'compact+permanent', 'constitution_version', 'tier10.constitution.EventEnvelope.v1'),
  ('knowledge.events', 36, 'permanent', 'claim_id', 'tier10.knowledge.EventEnvelope.v1'),
  ('epistemic.events', 36, 'permanent', 'claim_id', 'tier10.epistemic.EventEnvelope.v1'),
  ('alignment.events', 24, 'permanent', 'principle_id', 'tier10.alignment.EventEnvelope.v1'),
  ('civilization.events', 36, 'permanent', 'simulation_run_id', 'tier10.civilization.EventEnvelope.v1'),
  ('simulation.events', 36, 'permanent', 'simulation_run_id', 'tier10.simulation.EventEnvelope.v1')
on conflict (topic_name) do update
set partitions = excluded.partitions,
    retention_policy = excluded.retention_policy,
    replay_key_field = excluded.replay_key_field,
    schema_ref = excluded.schema_ref;

insert into public.tier10_operational_dashboards (dashboard_id, dashboard_name, metric_refs, event_topics, verification_refs)
values
  ('tier10-institution-health', 'Institution Health Dashboard', array['fitness_score','entropy_score','legitimacy_score','adaptability_score','survival_probability'], array['institution.events'], array['institution_lifecycle_fsm']),
  ('tier10-governance', 'Governance Dashboard', array['open_conflicts','resolution_latency','invariant_failures'], array['governance.events','constitution.events'], array['tla','alloy','smt']),
  ('tier10-alignment', 'Alignment Dashboard', array['objective_distance','drift_events','remediation_latency'], array['alignment.events'], array['alignment_non_regression']),
  ('tier10-epistemic', 'Epistemic Dashboard', array['truth_state','contradictions','uncertainty_width'], array['knowledge.events','epistemic.events'], array['provenance_required']),
  ('tier10-simulation', 'Simulation Dashboard', array['psi','calibration_fit','prediction_confidence'], array['civilization.events','simulation.events'], array['historical_calibration'])
on conflict (dashboard_id) do update
set dashboard_name = excluded.dashboard_name,
    metric_refs = excluded.metric_refs,
    event_topics = excluded.event_topics,
    verification_refs = excluded.verification_refs;
