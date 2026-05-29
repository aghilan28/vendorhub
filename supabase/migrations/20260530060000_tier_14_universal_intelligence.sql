create table if not exists tier14_traceability_matrix (
  research_concept text primary key,
  domain_entity text not null,
  aggregate_name text not null,
  service_name text not null,
  workflow_name text not null,
  event_name text not null,
  api_path text not null,
  storage_schema text not null,
  graph_schema text not null,
  vector_representation text not null,
  metrics jsonb not null default '[]'::jsonb,
  dashboards jsonb not null default '[]'::jsonb,
  tests jsonb not null default '[]'::jsonb,
  verification_rules jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists tier14_entity_envelopes (
  uuid text primary key,
  version integer not null check (version > 0),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  lineage jsonb not null default '[]'::jsonb,
  provenance jsonb not null default '[]'::jsonb,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  verification_state text not null check (verification_state in ('draft', 'verified', 'contested', 'failed', 'retired')),
  trust_score numeric not null check (trust_score >= 0 and trust_score <= 1),
  source_reference text not null
);

create table if not exists tier14_metric_observations (
  id uuid primary key default gen_random_uuid(),
  research_concept text not null references tier14_traceability_matrix(research_concept),
  metric_key text not null,
  metric_value numeric not null,
  replay_key text not null,
  observed_at timestamptz not null default now()
);

create index if not exists tier14_metric_observations_concept_idx on tier14_metric_observations(research_concept);
