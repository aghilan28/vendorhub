-- KARTEX Phase G — Advanced Intelligence & Knowledge Systems operationalization.
-- Turns Tier 10-15 ARCHITECTURES (pure compute + contracts) into OPERATED systems:
-- storage + auditable decision ledger + governed workflows. Idempotent; RLS on;
-- service-role (admin client) writes. Governance/constitution/knowledge are
-- admin/governance-scoped reads.

-- ===========================================================================
-- Unified advanced-systems decision ledger (auditable/traceable/explainable)
-- ===========================================================================
create table if not exists public.advanced_intelligence_decisions (
  id uuid primary key default gen_random_uuid(),
  domain text not null,                 -- knowledge|ontology|research|simulation|governance|constitution|meta|civilizational
  decision_type text not null,
  subject_type text,
  subject_id text,
  inputs jsonb not null default '{}'::jsonb,
  decision jsonb not null default '{}'::jsonb,
  action text not null default 'advisory',
  reversible boolean not null default true,
  confidence numeric,
  actor_id uuid,
  trace_id text,
  created_at timestamptz not null default now()
);
create index if not exists idx_adv_decisions_domain_created on public.advanced_intelligence_decisions (domain, created_at desc);
create index if not exists idx_adv_decisions_created on public.advanced_intelligence_decisions (created_at desc);
alter table public.advanced_intelligence_decisions enable row level security;

-- ===========================================================================
-- Knowledge runtime: knowledge units + lineage + validation
-- ===========================================================================
create table if not exists public.knowledge_units (
  id uuid primary key default gen_random_uuid(),
  kind text not null,                   -- claim|evidence|asset|artifact
  title text not null,
  content jsonb not null default '{}'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  derived_from uuid[] not null default '{}',     -- lineage edges (meta-knowledge)
  validation_state text not null default 'unverified',  -- unverified|verifying|verified|quarantined|retired
  quality_score numeric,
  version integer not null default 1,
  owner text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_knowledge_units_kind_state on public.knowledge_units (kind, validation_state);
create index if not exists idx_knowledge_units_created on public.knowledge_units (created_at desc);
alter table public.knowledge_units enable row level security;

-- ===========================================================================
-- Ontology & semantic runtime: registry + versioning + governance
-- ===========================================================================
create table if not exists public.ontology_registry (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version integer not null default 1,
  schema jsonb not null default '{}'::jsonb,
  relationships jsonb not null default '[]'::jsonb,
  status text not null default 'draft',          -- draft|active|deprecated|retired
  supersedes uuid,
  validation_state text not null default 'unvalidated',
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (name, version)
);
create index if not exists idx_ontology_status on public.ontology_registry (status);
alter table public.ontology_registry enable row level security;

-- ===========================================================================
-- Governance runtime: policies + decisions (approval/decision workflows)
-- ===========================================================================
create table if not exists public.governance_policies (
  id uuid primary key default gen_random_uuid(),
  policy_key text not null,
  version integer not null default 1,
  title text not null,
  rule jsonb not null default '{}'::jsonb,        -- machine-evaluable rule
  severity text not null default 'medium',        -- low|medium|high|critical
  status text not null default 'active',          -- active|disabled|draft
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (policy_key, version)
);
create index if not exists idx_gov_policies_status on public.governance_policies (status);
alter table public.governance_policies enable row level security;

create table if not exists public.governance_decisions (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id text,
  proposal jsonb not null default '{}'::jsonb,
  evaluation jsonb not null default '{}'::jsonb,   -- which policies passed/failed
  outcome text not null default 'pending',         -- approved|rejected|pending|escalated
  decided_by uuid,
  decided_at timestamptz,
  decision_id uuid references public.advanced_intelligence_decisions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_gov_decisions_outcome on public.governance_decisions (outcome, created_at desc);
alter table public.governance_decisions enable row level security;

-- ===========================================================================
-- Constitution runtime: versioned, ratifiable, auditable
-- ===========================================================================
create table if not exists public.constitution_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  title text not null,
  document_hash text not null,
  summary text,
  status text not null default 'draft',            -- draft|ratified|superseded
  ratified_by uuid,
  ratified_at timestamptz,
  supersedes uuid,
  created_at timestamptz not null default now(),
  unique (version)
);
create index if not exists idx_constitution_status on public.constitution_versions (status);
alter table public.constitution_versions enable row level security;

-- ===========================================================================
-- Simulation runtime: stateful + auditable runs (wraps Tier 10 compute)
-- ===========================================================================
create table if not exists public.simulation_runs (
  id uuid primary key default gen_random_uuid(),
  model text not null,                             -- bass_diffusion|civilizational_projection|...
  inputs jsonb not null default '{}'::jsonb,
  outputs jsonb,
  status text not null default 'completed',        -- queued|running|completed|failed
  duration_ms integer,
  requested_by uuid,
  decision_id uuid references public.advanced_intelligence_decisions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_sim_runs_model_created on public.simulation_runs (model, created_at desc);
alter table public.simulation_runs enable row level security;

-- ===========================================================================
-- Research runtime: registry + workflow state
-- ===========================================================================
create table if not exists public.research_registry (
  id uuid primary key default gen_random_uuid(),
  research_key text not null,
  title text not null,
  workflow_state text not null default 'proposed', -- proposed|reviewing|validated|published|archived
  knowledge_unit_ids uuid[] not null default '{}',
  owner text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (research_key)
);
create index if not exists idx_research_state on public.research_registry (workflow_state);
alter table public.research_registry enable row level security;

-- ===========================================================================
-- RLS: governance-scoped read (ADMIN/SUPER_ADMIN); service role writes.
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'advanced_intelligence_decisions','knowledge_units','ontology_registry',
    'governance_policies','governance_decisions','constitution_versions',
    'simulation_runs','research_registry'
  ]
  loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=t and policyname=(t||'_admin_read')) then
      execute format(
        'create policy %I on public.%I for select using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in (''ADMIN'',''SUPER_ADMIN'') and ur.deleted_at is null))',
        t||'_admin_read', t
      );
    end if;
  end loop;
end $$;

comment on table public.advanced_intelligence_decisions is 'Phase G: auditable decision ledger for Tier 10-15 advanced-intelligence operations.';
comment on table public.governance_policies is 'Phase G: machine-evaluable governance policy/rule registry (policy engine).';
comment on table public.constitution_versions is 'Phase G: versioned, ratifiable constitution registry with audit trail.';
