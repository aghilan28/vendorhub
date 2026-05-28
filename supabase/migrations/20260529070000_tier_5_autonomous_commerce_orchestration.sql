create extension if not exists vector with schema extensions;

create table if not exists public.orchestration_decisions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  decision_type text not null default 'inventory_rebalancing',
  action_type text not null,
  title text not null,
  locality text not null,
  city text,
  locality_scope text,
  affected_entities jsonb not null default '[]'::jsonb,
  confidence numeric(6, 5) not null default 0,
  risk_level text not null default 'low',
  reversible boolean not null default true,
  requires_approval boolean not null default true,
  replay_safe boolean not null default true,
  replay_key text not null unique,
  rollback_token text not null,
  evidence jsonb not null default '[]'::jsonb,
  explainability_report jsonb not null default '{}'::jsonb,
  generated_by text not null default 'agent_consensus',
  expires_at timestamptz,
  state text not null default 'proposed',
  decision_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.locality_imbalance_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  locality text not null,
  city text not null,
  locality_imbalance_score numeric(6, 5) not null default 0,
  redistribution_recommendations jsonb not null default '[]'::jsonb,
  inventory_pressure_alerts jsonb not null default '[]'::jsonb,
  stabilization_plan jsonb not null default '[]'::jsonb,
  locality_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.seller_optimization_recommendations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  seller_id uuid references public.vendors(id) on delete cascade,
  recommendations jsonb not null default '[]'::jsonb,
  operational_risk_alerts jsonb not null default '[]'::jsonb,
  inventory_advisories jsonb not null default '[]'::jsonb,
  pricing_advisories jsonb not null default '[]'::jsonb,
  coaching_tone text not null default 'simple',
  confidence numeric(6, 5) not null default 0,
  state text not null default 'open',
  seller_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.marketplace_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  locality text,
  city text,
  marketplace_health_score numeric(6, 2) not null default 0,
  locality_stability_score numeric(6, 2) not null default 0,
  inventory_health numeric(6, 2) not null default 0,
  seller_reliability numeric(6, 2) not null default 0,
  delivery_reliability numeric(6, 2) not null default 0,
  freshness_stability numeric(6, 2) not null default 0,
  pricing_stability numeric(6, 2) not null default 0,
  search_quality numeric(6, 2) not null default 0,
  operational_load numeric(6, 2) not null default 0,
  saturation_detected boolean not null default false,
  health_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.delivery_adaptation_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  locality text,
  city text,
  product_id uuid references public.products(id) on delete set null,
  adaptation_type text not null,
  eta_adjustment_minutes integer not null default 0,
  risk_level text not null default 'low',
  confidence numeric(6, 5) not null default 0,
  reversible boolean not null default true,
  replay_key text not null unique,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.trust_integrity_scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  seller_id uuid references public.vendors(id) on delete cascade,
  trust_score numeric(6, 2) not null default 0,
  fake_inventory_risk numeric(6, 5) not null default 0,
  seller_manipulation_risk numeric(6, 5) not null default 0,
  price_exploitation_risk numeric(6, 5) not null default 0,
  fraud_cluster_risk numeric(6, 5) not null default 0,
  freshness_deception_risk numeric(6, 5) not null default 0,
  fake_scarcity_risk numeric(6, 5) not null default 0,
  review_required boolean not null default false,
  integrity_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.stabilization_actions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  locality text,
  city text,
  action text not null,
  pressure_type text not null,
  reversible boolean not null default true,
  requires_approval boolean not null default true,
  rollback_token text not null,
  state text not null default 'proposed',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.adaptive_learning_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  signal text not null,
  adjustment text not null,
  explainability text not null,
  reversible boolean not null default true,
  replay_key text not null unique,
  learning_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.commerce_forecast_models (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  locality text,
  city text,
  model_key text not null,
  model_version text not null default 'tier5-v1',
  forecast_payload jsonb not null default '{}'::jsonb,
  confidence numeric(6, 5) not null default 0,
  explainability jsonb not null default '[]'::jsonb,
  reversible boolean not null default true,
  model_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.operational_agent_states (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agent_name text not null,
  health text not null default 'low',
  proposed_actions text[] not null default '{}',
  conflicts jsonb not null default '[]'::jsonb,
  bounded boolean not null default true,
  replay_safe boolean not null default true,
  agent_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.orchestration_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  locality text,
  city text,
  alert_type text not null,
  risk_level text not null default 'low',
  title text not null,
  evidence jsonb not null default '[]'::jsonb,
  state text not null default 'open',
  replay_key text not null unique,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.replay_validation_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  replay_key text not null,
  subject_type text not null,
  subject_id text not null,
  deterministic boolean not null default true,
  idempotent boolean not null default true,
  validation_state text not null default 'passed',
  validation_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  unique (replay_key, subject_type, subject_id)
);

create table if not exists public.locality_pressure_maps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  locality text not null,
  city text not null,
  pressure_metric text not null,
  intensity numeric(6, 5) not null default 0,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  pressure_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.commerce_decision_audits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  decision_id uuid references public.orchestration_decisions(id) on delete cascade,
  replay_key text not null,
  actor_type text not null default 'system',
  audit_action text not null,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  rollback_token text,
  operator_override boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.orchestration_replay_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  replay_key text not null,
  decision_id text,
  replay_safe boolean not null default true,
  deterministic boolean not null default true,
  idempotency_key text not null,
  validation_state text not null default 'passed',
  conflict_detected boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  unique (replay_key, idempotency_key)
);

create table if not exists public.governance_approval_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  decision_id text not null,
  approval_state text not null default 'queued',
  risk_level text not null default 'low',
  approval_required boolean not null default true,
  operator_id uuid references auth.users(id) on delete set null,
  rollback_token text,
  reason text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.locality_stabilization_actions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  locality text not null,
  city text not null,
  pressure_type text not null,
  action_plan jsonb not null default '[]'::jsonb,
  rollback_supported boolean not null default true,
  approval_required boolean not null default true,
  replay_key text not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.adaptive_learning_signals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  signal_type text not null,
  locality text,
  city text,
  source_signal jsonb not null default '{}'::jsonb,
  explainability text not null,
  reversible boolean not null default true,
  replay_key text not null unique,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.seller_optimization_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  seller_id uuid references public.vendors(id) on delete cascade,
  operational_health_score numeric(6, 2) not null default 0,
  recommendations jsonb not null default '[]'::jsonb,
  reliability_trends jsonb not null default '{}'::jsonb,
  risk_escalation_alerts jsonb not null default '[]'::jsonb,
  replay_key text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.trust_escalation_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  seller_id uuid references public.vendors(id) on delete cascade,
  escalation_type text not null,
  trust_score numeric(6, 2) not null default 0,
  fraud_signals jsonb not null default '[]'::jsonb,
  automatic_ban_blocked boolean not null default true,
  approval_required boolean not null default true,
  replay_key text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.delivery_recovery_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  locality text,
  city text,
  product_id uuid references public.products(id) on delete set null,
  recovery_type text not null,
  eta_recovery_plan jsonb not null default '[]'::jsonb,
  risk_level text not null default 'low',
  rollback_supported boolean not null default true,
  replay_key text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.orchestration_audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null,
  decision_id text,
  locality text,
  city text,
  actor_type text not null default 'system',
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  rollback_token text,
  replay_key text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.marketplace_pressure_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  locality text,
  city text,
  seller_monopolization_risk numeric(6, 5) not null default 0,
  inventory_fragmentation_risk numeric(6, 5) not null default 0,
  delivery_saturation_risk numeric(6, 5) not null default 0,
  fake_scarcity_risk numeric(6, 5) not null default 0,
  freshness_collapse_risk numeric(6, 5) not null default 0,
  price_volatility_risk numeric(6, 5) not null default 0,
  locality_imbalance_risk numeric(6, 5) not null default 0,
  pressure_alerts jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.replay_conflict_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  replay_key text not null,
  conflict_type text not null,
  decision_ids jsonb not null default '[]'::jsonb,
  resolution_plan jsonb not null default '[]'::jsonb,
  resolved boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists orchestration_decisions_state_idx on public.orchestration_decisions(state, risk_level, created_at desc);
create index if not exists locality_imbalance_events_scope_idx on public.locality_imbalance_events(city, locality, created_at desc);
create index if not exists seller_optimization_recommendations_seller_idx on public.seller_optimization_recommendations(seller_id, state, created_at desc);
create index if not exists marketplace_health_snapshots_scope_idx on public.marketplace_health_snapshots(city, locality, created_at desc);
create index if not exists trust_integrity_scores_seller_idx on public.trust_integrity_scores(seller_id, created_at desc);
create index if not exists operational_agent_states_agent_idx on public.operational_agent_states(agent_name, created_at desc);
create index if not exists locality_pressure_maps_scope_idx on public.locality_pressure_maps(city, locality, pressure_metric, created_at desc);
create index if not exists commerce_decision_audits_replay_idx on public.commerce_decision_audits(replay_key, created_at desc);
create index if not exists orchestration_replay_events_replay_idx on public.orchestration_replay_events(replay_key, created_at desc);
create index if not exists governance_approval_events_decision_idx on public.governance_approval_events(decision_id, approval_state, created_at desc);
create index if not exists locality_stabilization_actions_scope_idx on public.locality_stabilization_actions(city, locality, created_at desc);
create index if not exists adaptive_learning_signals_replay_idx on public.adaptive_learning_signals(replay_key, created_at desc);
create index if not exists seller_optimization_events_seller_idx on public.seller_optimization_events(seller_id, created_at desc);
create index if not exists trust_escalation_events_seller_idx on public.trust_escalation_events(seller_id, created_at desc);
create index if not exists delivery_recovery_events_scope_idx on public.delivery_recovery_events(city, locality, created_at desc);
create index if not exists orchestration_audit_logs_replay_idx on public.orchestration_audit_logs(replay_key, created_at desc);
create index if not exists marketplace_pressure_snapshots_scope_idx on public.marketplace_pressure_snapshots(city, locality, created_at desc);
create index if not exists replay_conflict_events_replay_idx on public.replay_conflict_events(replay_key, created_at desc);

alter table public.orchestration_decisions enable row level security;
alter table public.locality_imbalance_events enable row level security;
alter table public.seller_optimization_recommendations enable row level security;
alter table public.marketplace_health_snapshots enable row level security;
alter table public.delivery_adaptation_events enable row level security;
alter table public.trust_integrity_scores enable row level security;
alter table public.stabilization_actions enable row level security;
alter table public.adaptive_learning_events enable row level security;
alter table public.commerce_forecast_models enable row level security;
alter table public.operational_agent_states enable row level security;
alter table public.orchestration_alerts enable row level security;
alter table public.replay_validation_events enable row level security;
alter table public.locality_pressure_maps enable row level security;
alter table public.commerce_decision_audits enable row level security;
alter table public.orchestration_replay_events enable row level security;
alter table public.governance_approval_events enable row level security;
alter table public.locality_stabilization_actions enable row level security;
alter table public.adaptive_learning_signals enable row level security;
alter table public.seller_optimization_events enable row level security;
alter table public.trust_escalation_events enable row level security;
alter table public.delivery_recovery_events enable row level security;
alter table public.orchestration_audit_logs enable row level security;
alter table public.marketplace_pressure_snapshots enable row level security;
alter table public.replay_conflict_events enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'orchestration_decisions',
    'locality_imbalance_events',
    'seller_optimization_recommendations',
    'marketplace_health_snapshots',
    'delivery_adaptation_events',
    'trust_integrity_scores',
    'stabilization_actions',
    'adaptive_learning_events',
    'commerce_forecast_models',
    'operational_agent_states',
    'orchestration_alerts',
    'replay_validation_events',
    'locality_pressure_maps',
    'commerce_decision_audits',
    'orchestration_replay_events',
    'governance_approval_events',
    'locality_stabilization_actions',
    'adaptive_learning_signals',
    'seller_optimization_events',
    'trust_escalation_events',
    'delivery_recovery_events',
    'orchestration_audit_logs',
    'marketplace_pressure_snapshots',
    'replay_conflict_events'
  ]
  loop
    execute format('drop policy if exists "%s_admin_all" on public.%I', table_name, table_name);
    execute format('create policy "%s_admin_all" on public.%I for all using (public.current_user_has_role(array[''ADMIN'', ''SUPER_ADMIN'']::text[])) with check (public.current_user_has_role(array[''ADMIN'', ''SUPER_ADMIN'']::text[]))', table_name, table_name);
    execute format('drop policy if exists "%s_authenticated_read" on public.%I', table_name, table_name);
    execute format('create policy "%s_authenticated_read" on public.%I for select using (auth.role() = ''authenticated'')', table_name, table_name);
  end loop;
end $$;

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('tier5_autonomous_commerce_orchestration', 'Enables bounded autonomous orchestration, locality balancing, marketplace stabilization, trust integrity scoring, multi-agent coordination, and replay-safe commerce decisions.', true, 100, '{"roles":["ADMIN","SUPER_ADMIN"]}')
on conflict (key) do update
set
  description = excluded.description,
  is_enabled = excluded.is_enabled,
  rollout_percentage = excluded.rollout_percentage,
  audience = excluded.audience,
  updated_at = now();
