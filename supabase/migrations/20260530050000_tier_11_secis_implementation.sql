create extension if not exists "pgcrypto";
create extension if not exists "vector";

create table if not exists public.scientific_claim (
  claim_id text primary key default ('sclaim_' || encode(gen_random_bytes(16), 'hex')),
  submitter_did text not null,
  claim_text text not null,
  field text not null,
  hypothesis_hash text not null,
  preregistration_uri text not null,
  evidence_refs text[] not null default array[]::text[],
  lifecycle_state text not null check (lifecycle_state in ('CLAIM_SUBMITTED','MARKET_CREATED','FORECASTING','REPLICATION_RUNNING','EVIDENCE_COLLECTION','SETTLEMENT','REPUTATION_UPDATE','ARCHIVED')),
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  governance_scope text not null default 'secis.validation',
  replay_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.replication_contract (
  contract_id text primary key default ('rcon_' || encode(gen_random_bytes(16), 'hex')),
  claim_id text not null references public.scientific_claim(claim_id) on delete cascade,
  protocol_hash text not null,
  minimum_replications integer not null check (minimum_replications > 0),
  required_power numeric not null check (required_power > 0 and required_power <= 1),
  alpha_threshold numeric not null check (alpha_threshold > 0 and alpha_threshold < 1),
  effect_size_threshold numeric not null check (effect_size_threshold >= 0),
  budget_amount numeric not null check (budget_amount >= 0),
  settlement_rule text not null check (settlement_rule in ('majority_replication','meta_analysis','bayesian_posterior')),
  status text not null check (status in ('draft','funded','running','evidence_locked','settled','cancelled')),
  created_at timestamptz not null default now(),
  unique (claim_id, protocol_hash)
);

create table if not exists public.validation_market (
  market_id text primary key default ('vmarket_' || encode(gen_random_bytes(16), 'hex')),
  claim_id text not null references public.scientific_claim(claim_id) on delete cascade,
  contract_id text not null references public.replication_contract(contract_id) on delete restrict,
  market_state text not null check (market_state in ('MARKET_CREATED','FORECASTING','REPLICATION_RUNNING','EVIDENCE_COLLECTION','SETTLEMENT','REPUTATION_UPDATE','ARCHIVED')),
  scoring_rule text not null check (scoring_rule in ('brier','log','quadratic')),
  liquidity_pool numeric not null check (liquidity_pool >= 0),
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  settlement_at timestamptz,
  replay_key text not null unique,
  created_at timestamptz not null default now(),
  check (closes_at > opens_at)
);

create table if not exists public.market_participant (
  participant_id text primary key default ('mpart_' || encode(gen_random_bytes(16), 'hex')),
  did text not null unique,
  participant_type text not null check (participant_type in ('researcher','replicator','funder','auditor','institution','agent')),
  reputation_score numeric not null default 0.5 check (reputation_score >= 0 and reputation_score <= 1),
  stake_limit numeric not null default 0 check (stake_limit >= 0),
  governance_status text not null check (governance_status in ('active','watch','restricted','slashed','suspended')),
  created_at timestamptz not null default now()
);

create table if not exists public.forecast_position (
  position_id text primary key default ('fpos_' || encode(gen_random_bytes(16), 'hex')),
  market_id text not null references public.validation_market(market_id) on delete cascade,
  participant_id text not null references public.market_participant(participant_id) on delete restrict,
  probability numeric not null check (probability > 0 and probability < 1),
  stake numeric not null check (stake >= 0),
  scoring_rule text not null check (scoring_rule in ('brier','log','quadratic')),
  rationale_hash text not null,
  submitted_at timestamptz not null default now(),
  supersedes_position_id text references public.forecast_position(position_id),
  unique (market_id, participant_id, submitted_at)
);

create table if not exists public.verification_evidence (
  evidence_id text primary key default ('vevid_' || encode(gen_random_bytes(16), 'hex')),
  claim_id text not null references public.scientific_claim(claim_id) on delete cascade,
  contract_id text references public.replication_contract(contract_id) on delete set null,
  evidence_type text not null check (evidence_type in ('dataset','code','lab_report','audit','proof','observation','external_registry')),
  source_uri text not null,
  content_hash text not null,
  integrity_score numeric not null check (integrity_score >= 0 and integrity_score <= 1),
  provenance_chain jsonb not null,
  verified_by text not null,
  verification_status text not null check (verification_status in ('submitted','verified','rejected','quarantined')),
  created_at timestamptz not null default now(),
  unique (claim_id, content_hash)
);

create table if not exists public.claim_settlement (
  settlement_id text primary key default ('cset_' || encode(gen_random_bytes(16), 'hex')),
  market_id text not null references public.validation_market(market_id) on delete cascade,
  claim_id text not null references public.scientific_claim(claim_id) on delete cascade,
  outcome text not null check (outcome in ('replicated','not_replicated','inconclusive','invalid')),
  posterior_probability numeric not null check (posterior_probability >= 0 and posterior_probability <= 1),
  brier_total numeric not null default 0,
  log_total numeric not null default 0,
  quadratic_total numeric not null default 0,
  payout_manifest jsonb not null,
  evidence_digest text not null,
  settled_by text not null,
  replay_key text not null unique,
  settled_at timestamptz not null default now(),
  unique (market_id)
);

create table if not exists public.reputation_adjustment (
  adjustment_id text primary key default ('radj_' || encode(gen_random_bytes(16), 'hex')),
  participant_id text not null references public.market_participant(participant_id) on delete cascade,
  settlement_id text references public.claim_settlement(settlement_id) on delete set null,
  adjustment_type text not null check (adjustment_type in ('accuracy_reward','replication_reward','lineage_reward','slashing','decay','governance_override')),
  delta numeric not null,
  previous_score numeric not null check (previous_score >= 0 and previous_score <= 1),
  next_score numeric not null check (next_score >= 0 and next_score <= 1),
  reason_code text not null,
  audit_hash text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.consensus_session (
  session_id text primary key default ('csess_' || encode(gen_random_bytes(16), 'hex')),
  subject_type text not null,
  subject_id text not null,
  protocol text not null check (protocol in ('delphi','fortytwo_swarm','peer_prediction','bradley_terry','reputation_market')),
  state text not null check (state in ('created','round_open','round_closed','converged','escalated','archived')),
  convergence_epsilon numeric not null check (convergence_epsilon >= 0),
  quorum integer not null check (quorum > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.consensus_round (
  round_id text primary key default ('cround_' || encode(gen_random_bytes(16), 'hex')),
  session_id text not null references public.consensus_session(session_id) on delete cascade,
  round_number integer not null check (round_number > 0),
  round_state text not null check (round_state in ('open','closed','scored','discarded')),
  aggregate_estimate numeric,
  max_deviation numeric,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (session_id, round_number)
);

create table if not exists public.swarm_node (
  node_id text primary key default ('snode_' || encode(gen_random_bytes(16), 'hex')),
  participant_id text not null references public.market_participant(participant_id) on delete cascade,
  session_id text not null references public.consensus_session(session_id) on delete cascade,
  node_weight numeric not null check (node_weight >= 0),
  expertise_vector vector(8),
  status text not null check (status in ('active','muted','removed')),
  unique (participant_id, session_id)
);

create table if not exists public.swarm_vote (
  vote_id text primary key default ('svote_' || encode(gen_random_bytes(16), 'hex')),
  round_id text not null references public.consensus_round(round_id) on delete cascade,
  node_id text not null references public.swarm_node(node_id) on delete cascade,
  vote_vector numeric[] not null,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  submitted_at timestamptz not null default now(),
  unique (round_id, node_id)
);

create table if not exists public.peer_prediction (
  prediction_id text primary key default ('ppred_' || encode(gen_random_bytes(16), 'hex')),
  round_id text not null references public.consensus_round(round_id) on delete cascade,
  participant_id text not null references public.market_participant(participant_id) on delete cascade,
  private_signal boolean not null,
  predicted_peer_true_rate numeric not null check (predicted_peer_true_rate >= 0 and predicted_peer_true_rate <= 1),
  score numeric,
  audit_hash text not null unique,
  submitted_at timestamptz not null default now()
);

create table if not exists public.consensus_outcome (
  outcome_id text primary key default ('cout_' || encode(gen_random_bytes(16), 'hex')),
  session_id text not null references public.consensus_session(session_id) on delete cascade,
  outcome_payload jsonb not null,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  verification_status text not null check (verification_status in ('pending','verified','rejected')),
  replay_key text not null unique,
  created_at timestamptz not null default now(),
  unique (session_id)
);

create table if not exists public.reputation_node (
  reputation_node_id text primary key default ('rnode_' || encode(gen_random_bytes(16), 'hex')),
  subject_id text not null,
  subject_type text not null check (subject_type in ('participant','claim','asset','institution','agent','policy')),
  reputation_score numeric not null check (reputation_score >= 0 and reputation_score <= 1),
  accuracy_score numeric not null check (accuracy_score >= 0 and accuracy_score <= 1),
  lineage_score numeric not null check (lineage_score >= 0 and lineage_score <= 1),
  decay_rate numeric not null check (decay_rate >= 0),
  updated_at timestamptz not null default now(),
  unique (subject_id, subject_type)
);

create table if not exists public.reputation_edge (
  reputation_edge_id text primary key default ('redge_' || encode(gen_random_bytes(16), 'hex')),
  source_node_id text not null references public.reputation_node(reputation_node_id) on delete cascade,
  target_node_id text not null references public.reputation_node(reputation_node_id) on delete cascade,
  edge_type text not null check (edge_type in ('contributed_to','verified','cited','contradicted','delegated_trust','slashed_by')),
  weight numeric not null,
  evidence_ref text not null,
  created_at timestamptz not null default now(),
  unique (source_node_id, target_node_id, edge_type, evidence_ref)
);

create table if not exists public.accuracy_metric (
  metric_id text primary key default ('ametric_' || encode(gen_random_bytes(16), 'hex')),
  reputation_node_id text not null references public.reputation_node(reputation_node_id) on delete cascade,
  metric_type text not null check (metric_type in ('forecast_accuracy','replication_accuracy','audit_accuracy','citation_quality','policy_outcome')),
  value numeric not null check (value >= 0 and value <= 1),
  sample_size integer not null check (sample_size >= 0),
  window_start timestamptz not null,
  window_end timestamptz not null,
  unique (reputation_node_id, metric_type, window_start, window_end),
  check (window_end > window_start)
);

create table if not exists public.slashing_event (
  slashing_id text primary key default ('slash_' || encode(gen_random_bytes(16), 'hex')),
  reputation_node_id text not null references public.reputation_node(reputation_node_id) on delete cascade,
  severity text not null check (severity in ('minor','major','critical')),
  penalty numeric not null check (penalty >= 0 and penalty <= 1),
  reason_code text not null,
  evidence_ref text not null,
  appeal_state text not null check (appeal_state in ('not_appealed','appealed','upheld','reversed')),
  created_at timestamptz not null default now()
);

create table if not exists public.trust_snapshot (
  snapshot_id text primary key default ('tsnap_' || encode(gen_random_bytes(16), 'hex')),
  scope text not null,
  subject_id text not null,
  trust_score numeric not null check (trust_score >= 0 and trust_score <= 1),
  feature_vector vector(16),
  contributing_nodes text[] not null,
  replay_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_asset (
  asset_id text primary key default ('kasset_' || encode(gen_random_bytes(16), 'hex')),
  asset_type text not null check (asset_type in ('claim','dataset','model','policy','simulation','proof','ontology')),
  title text not null,
  content_hash text not null unique,
  owner_policy text not null,
  royalty_policy text not null,
  lineage_root_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_owner (
  owner_id text primary key default ('kown_' || encode(gen_random_bytes(16), 'hex')),
  asset_id text not null references public.knowledge_asset(asset_id) on delete cascade,
  owner_did text not null,
  ownership_share numeric not null check (ownership_share > 0 and ownership_share <= 1),
  payout_account_ref text not null,
  unique (asset_id, owner_did)
);

create table if not exists public.fact_dependency (
  dependency_id text primary key default ('fdep_' || encode(gen_random_bytes(16), 'hex')),
  asset_id text not null references public.knowledge_asset(asset_id) on delete cascade,
  depends_on_asset_id text not null references public.knowledge_asset(asset_id) on delete restrict,
  dependency_type text not null check (dependency_type in ('derives_from','cites','uses_dataset','uses_model','validates','refutes')),
  weight numeric not null check (weight >= 0 and weight <= 1),
  created_at timestamptz not null default now(),
  unique (asset_id, depends_on_asset_id, dependency_type)
);

create table if not exists public.lineage_royalty (
  royalty_id text primary key default ('lroy_' || encode(gen_random_bytes(16), 'hex')),
  asset_id text not null references public.knowledge_asset(asset_id) on delete cascade,
  beneficiary_asset_id text references public.knowledge_asset(asset_id) on delete set null,
  beneficiary_owner_id text references public.knowledge_owner(owner_id) on delete set null,
  royalty_rate numeric not null check (royalty_rate >= 0 and royalty_rate <= 1),
  priority integer not null default 100,
  active boolean not null default true
);

create table if not exists public.citation_revenue (
  revenue_id text primary key default ('crev_' || encode(gen_random_bytes(16), 'hex')),
  asset_id text not null references public.knowledge_asset(asset_id) on delete cascade,
  citation_event_id text not null,
  gross_amount numeric not null check (gross_amount >= 0),
  protocol_fee numeric not null check (protocol_fee >= 0),
  route_manifest jsonb not null,
  ledger_txn_ref text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.simulation_world (
  world_id text primary key default ('sworld_' || encode(gen_random_bytes(16), 'hex')),
  world_name text not null,
  scenario_hash text not null,
  seed bigint not null,
  tick_interval text not null,
  status text not null check (status in ('created','running','paused','checkpointed','completed','failed','archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.simulation_tick (
  tick_id text primary key default ('stick_' || encode(gen_random_bytes(16), 'hex')),
  world_id text not null references public.simulation_world(world_id) on delete cascade,
  tick_number bigint not null check (tick_number >= 0),
  psi numeric not null,
  mmp numeric not null,
  emp numeric not null,
  sfd numeric not null,
  gini numeric not null,
  trust numeric not null,
  debt numeric not null,
  elite_density numeric not null,
  checkpoint_hash text not null,
  occurred_at timestamptz not null default now(),
  unique (world_id, tick_number)
);

create table if not exists public.population_state (
  state_id text primary key default ('pop_' || encode(gen_random_bytes(16), 'hex')),
  tick_id text not null references public.simulation_tick(tick_id) on delete cascade,
  cohort_key text not null,
  population_count numeric not null check (population_count >= 0),
  median_wage numeric not null,
  subsistence_wage numeric not null,
  mobilization_potential numeric not null check (mobilization_potential >= 0 and mobilization_potential <= 1)
);

create table if not exists public.elite_state (
  state_id text primary key default ('elite_' || encode(gen_random_bytes(16), 'hex')),
  tick_id text not null references public.simulation_tick(tick_id) on delete cascade,
  elite_count numeric not null check (elite_count >= 0),
  elite_positions numeric not null check (elite_positions > 0),
  wealth_share numeric not null check (wealth_share >= 0 and wealth_share <= 1),
  competition_index numeric not null
);

create table if not exists public.institution_state (
  state_id text primary key default ('istate_' || encode(gen_random_bytes(16), 'hex')),
  tick_id text not null references public.simulation_tick(tick_id) on delete cascade,
  institution_ref text not null,
  capacity numeric not null check (capacity >= 0 and capacity <= 1),
  legitimacy numeric not null check (legitimacy >= 0 and legitimacy <= 1),
  corruption numeric not null check (corruption >= 0 and corruption <= 1)
);

create table if not exists public.governance_state (
  state_id text primary key default ('gstate_' || encode(gen_random_bytes(16), 'hex')),
  tick_id text not null references public.simulation_tick(tick_id) on delete cascade,
  policy_ref text not null,
  enforcement_strength numeric not null check (enforcement_strength >= 0 and enforcement_strength <= 1),
  redistribution_rate numeric not null check (redistribution_rate >= 0 and redistribution_rate <= 1),
  legitimacy_delta numeric not null
);

create table if not exists public.economic_state (
  state_id text primary key default ('estate_' || encode(gen_random_bytes(16), 'hex')),
  tick_id text not null references public.simulation_tick(tick_id) on delete cascade,
  gdp numeric not null check (gdp >= 0),
  debt_to_gdp numeric not null check (debt_to_gdp >= 0),
  gini numeric not null check (gini >= 0 and gini <= 1),
  fiscal_distress numeric not null check (fiscal_distress >= 0)
);

create table if not exists public.hypothesis (
  hypothesis_id text primary key default ('hyp_' || encode(gen_random_bytes(16), 'hex')),
  generated_by text not null,
  claim_text text not null,
  symbolic_form text not null,
  prior_probability numeric not null check (prior_probability >= 0 and prior_probability <= 1),
  status text not null check (status in ('generated','planned','scheduled','running','validated','rejected','archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.experiment (
  experiment_id text primary key default ('exp_' || encode(gen_random_bytes(16), 'hex')),
  hypothesis_id text not null references public.hypothesis(hypothesis_id) on delete cascade,
  design_hash text not null,
  minimum_power numeric not null check (minimum_power > 0 and minimum_power <= 1),
  status text not null check (status in ('designed','approved','scheduled','running','completed','failed','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.experiment_plan (
  plan_id text primary key default ('eplan_' || encode(gen_random_bytes(16), 'hex')),
  experiment_id text not null references public.experiment(experiment_id) on delete cascade,
  schedule_window tstzrange not null,
  resource_manifest jsonb not null,
  executor_policy text not null,
  verification_requirements jsonb not null
);

create table if not exists public.execution_run (
  run_id text primary key default ('erun_' || encode(gen_random_bytes(16), 'hex')),
  experiment_id text not null references public.experiment(experiment_id) on delete cascade,
  run_state text not null check (run_state in ('queued','running','completed','failed','quarantined')),
  executor_ref text not null,
  input_hash text not null,
  output_hash text,
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.observation (
  observation_id text primary key default ('obs_' || encode(gen_random_bytes(16), 'hex')),
  run_id text not null references public.execution_run(run_id) on delete cascade,
  metric_key text not null,
  metric_value numeric not null,
  unit text not null,
  observation_hash text not null unique,
  captured_at timestamptz not null default now()
);

create table if not exists public.symbolic_model (
  model_id text primary key default ('sym_' || encode(gen_random_bytes(16), 'hex')),
  hypothesis_id text references public.hypothesis(hypothesis_id) on delete set null,
  expression text not null,
  variables text[] not null,
  fitness_score numeric not null check (fitness_score >= 0 and fitness_score <= 1),
  validation_status text not null check (validation_status in ('candidate','validated','rejected','superseded')),
  artifact_hash text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.policy_manifest (
  manifest_id text primary key default ('pman_' || encode(gen_random_bytes(16), 'hex')),
  policy_key text not null,
  source_hash text not null,
  dsl_version text not null,
  deployment_scope text not null,
  state text not null check (state in ('draft','parsed','validated','compiled','verified','deployed','revoked')),
  created_at timestamptz not null default now(),
  unique (policy_key, source_hash)
);

create table if not exists public.compiled_policy (
  compiled_policy_id text primary key default ('cpol_' || encode(gen_random_bytes(16), 'hex')),
  manifest_id text not null references public.policy_manifest(manifest_id) on delete cascade,
  target_runtime text not null check (target_runtime in ('open_policy','temporal','sql_rls','kafka_stream','agent_guardrail')),
  artifact_uri text not null,
  artifact_hash text not null,
  compiled_at timestamptz not null default now(),
  unique (manifest_id, target_runtime)
);

create table if not exists public.policy_version (
  policy_version_id text primary key default ('pver_' || encode(gen_random_bytes(16), 'hex')),
  manifest_id text not null references public.policy_manifest(manifest_id) on delete cascade,
  version text not null,
  parent_version_id text references public.policy_version(policy_version_id),
  activation_state text not null check (activation_state in ('candidate','active','superseded','rolled_back')),
  activated_at timestamptz,
  unique (manifest_id, version)
);

create table if not exists public.verification_proof (
  proof_id text primary key default ('vproof_' || encode(gen_random_bytes(16), 'hex')),
  subject_type text not null,
  subject_id text not null,
  method text not null check (method in ('tla','smt','alloy','simulation','property_test','audit')),
  status text not null check (status in ('pending','passed','failed')),
  proof_hash text not null,
  counterexample_uri text,
  created_at timestamptz not null default now()
);

create table if not exists public.claim (
  claim_id text primary key default ('claim_' || encode(gen_random_bytes(16), 'hex')),
  canonical_claim_id text references public.scientific_claim(claim_id) on delete set null,
  claim_text text not null,
  truth_state text not null check (truth_state in ('unverified','supported','contested','contradicted','quarantined','deprecated')),
  lineage_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.claim_edge (
  edge_id text primary key default ('cedge_' || encode(gen_random_bytes(16), 'hex')),
  source_claim_id text not null references public.claim(claim_id) on delete cascade,
  target_claim_id text not null references public.claim(claim_id) on delete cascade,
  edge_type text not null check (edge_type in ('supports','contradicts','depends_on','generalizes','specializes','supersedes')),
  weight numeric not null check (weight >= 0 and weight <= 1),
  evidence_ref text not null,
  unique (source_claim_id, target_claim_id, edge_type)
);

create table if not exists public.contradiction (
  contradiction_id text primary key default ('contra11_' || encode(gen_random_bytes(16), 'hex')),
  claim_ids text[] not null,
  severity text not null check (severity in ('low','medium','high','critical')),
  detection_method text not null,
  state text not null check (state in ('detected','quarantined','adjudicating','resolved','accepted_paraconsistent')),
  created_at timestamptz not null default now()
);

create table if not exists public.quarantine_record (
  quarantine_id text primary key default ('qrec_' || encode(gen_random_bytes(16), 'hex')),
  subject_type text not null,
  subject_id text not null,
  reason_code text not null,
  state text not null check (state in ('open','isolated','under_review','released','deprecated')),
  release_requirements jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.verification_record (
  verification_id text primary key default ('vrec_' || encode(gen_random_bytes(16), 'hex')),
  subject_type text not null,
  subject_id text not null,
  verifier_did text not null,
  result text not null check (result in ('passed','failed','inconclusive')),
  evidence_digest text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.legitimacy_policy (
  policy_id text primary key default ('lpol_' || encode(gen_random_bytes(16), 'hex')),
  scope text not null,
  trigger_type text not null check (trigger_type in ('stress_watch','adaptive_policy_review','redistribution_required')),
  threshold numeric not null check (threshold >= 0 and threshold <= 1),
  actuation_contract text not null,
  active boolean not null default true
);

create table if not exists public.legitimacy_signal (
  signal_id text primary key default ('lsig_' || encode(gen_random_bytes(16), 'hex')),
  scope text not null,
  psi numeric not null,
  trust numeric not null check (trust >= 0 and trust <= 1),
  gini numeric not null check (gini >= 0 and gini <= 1),
  debt numeric not null,
  elite_density numeric not null,
  stress_score numeric not null check (stress_score >= 0 and stress_score <= 1),
  trigger_type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.research_problem (
  problem_id text primary key default ('rprob_' || encode(gen_random_bytes(16), 'hex')),
  title text not null,
  problem_statement text not null,
  owner_did text not null,
  status text not null check (status in ('open','scoping','active','blocked','validated','closed','archived')),
  priority text not null check (priority in ('low','medium','high','critical')),
  created_at timestamptz not null default now()
);

create table if not exists public.research_dependency (
  dependency_id text primary key default ('rdep_' || encode(gen_random_bytes(16), 'hex')),
  problem_id text not null references public.research_problem(problem_id) on delete cascade,
  depends_on_problem_id text not null references public.research_problem(problem_id) on delete restrict,
  dependency_type text not null check (dependency_type in ('blocks','informs','requires_dataset','requires_proof','requires_replication')),
  unique (problem_id, depends_on_problem_id, dependency_type)
);

create table if not exists public.research_status (
  status_id text primary key default ('rstat_' || encode(gen_random_bytes(16), 'hex')),
  problem_id text not null references public.research_problem(problem_id) on delete cascade,
  previous_status text,
  next_status text not null,
  changed_by text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.research_priority (
  priority_id text primary key default ('rpri_' || encode(gen_random_bytes(16), 'hex')),
  problem_id text not null references public.research_problem(problem_id) on delete cascade,
  priority_score numeric not null,
  impact_score numeric not null,
  uncertainty_score numeric not null,
  feasibility_score numeric not null,
  computed_at timestamptz not null default now()
);

create table if not exists public.research_outcome (
  outcome_id text primary key default ('rout_' || encode(gen_random_bytes(16), 'hex')),
  problem_id text not null references public.research_problem(problem_id) on delete cascade,
  outcome_type text not null check (outcome_type in ('claim_validated','claim_refuted','model_created','policy_changed','dataset_created','null_result')),
  artifact_refs text[] not null,
  evidence_digest text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_scientific_claim_lifecycle on public.scientific_claim(lifecycle_state, field);
create index if not exists idx_validation_market_state on public.validation_market(market_state, closes_at);
create index if not exists idx_forecast_position_market on public.forecast_position(market_id, participant_id);
create index if not exists idx_verification_evidence_claim on public.verification_evidence(claim_id, verification_status);
create index if not exists idx_reputation_node_subject on public.reputation_node(subject_type, subject_id);
create index if not exists idx_simulation_tick_world on public.simulation_tick(world_id, tick_number);
create index if not exists idx_claim_truth_state on public.claim(truth_state);
create index if not exists idx_research_problem_status on public.research_problem(status, priority);

insert into public.legitimacy_policy (scope, trigger_type, threshold, actuation_contract)
values
  ('global', 'stress_watch', 0.45, 'legitimacy.monitoring.increase_cadence'),
  ('global', 'adaptive_policy_review', 0.62, 'legitimacy.policy.adaptive_resource_review'),
  ('global', 'redistribution_required', 0.78, 'legitimacy.policy.redistribution_trigger')
on conflict do nothing;

insert into public.research_problem (title, problem_statement, owner_did, status, priority)
values
  ('SECIS replication calibration', 'Calibrate validation market settlement thresholds against canonical replication evidence.', 'did:kartex:secis', 'active', 'critical'),
  ('Cliodynamic primitive baselines', 'Establish PSI MMP EMP SFD Gini Trust Debt Elite Density baseline fixtures for Tier 11 simulations.', 'did:kartex:simulation', 'active', 'high')
on conflict do nothing;
