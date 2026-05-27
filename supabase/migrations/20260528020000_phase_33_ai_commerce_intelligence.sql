-- Phase 33: adaptive AI commerce intelligence, personalization, semantic discovery, feedback learning, and observability.

create table if not exists public.ai_behavior_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  anonymous_fingerprint text,
  event_type text not null,
  product_id uuid references public.products(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  query text,
  locality text,
  weight numeric(8, 4) not null default 1,
  replay_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  unique (replay_key)
);

create index if not exists ai_behavior_events_user_idx on public.ai_behavior_events(user_id, created_at desc);
create index if not exists ai_behavior_events_fingerprint_idx on public.ai_behavior_events(anonymous_fingerprint, created_at desc);
create index if not exists ai_behavior_events_product_idx on public.ai_behavior_events(product_id, created_at desc);
create index if not exists ai_behavior_events_type_idx on public.ai_behavior_events(event_type, created_at desc);

alter table public.ai_behavior_events enable row level security;

drop policy if exists "ai_behavior_events_own_insert" on public.ai_behavior_events;
create policy "ai_behavior_events_own_insert" on public.ai_behavior_events
  for insert with check (auth.role() in ('anon', 'authenticated'));

drop policy if exists "ai_behavior_events_own_select" on public.ai_behavior_events;
create policy "ai_behavior_events_own_select" on public.ai_behavior_events
  for select using (auth.uid() = user_id or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create table if not exists public.ai_personalization_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete cascade,
  anonymous_fingerprint text,
  profile_fingerprint text not null,
  locality text,
  category_affinity jsonb not null default '{}'::jsonb,
  seller_affinity jsonb not null default '{}'::jsonb,
  query_affinity jsonb not null default '{}'::jsonb,
  recalibration_needed boolean not null default false,
  expires_at timestamptz not null default now() + interval '45 days',
  metadata jsonb not null default '{}'::jsonb,
  constraint ai_personalization_identity_check check (user_id is not null or anonymous_fingerprint is not null),
  unique (profile_fingerprint)
);

create index if not exists ai_personalization_profiles_user_idx on public.ai_personalization_profiles(user_id, updated_at desc);
create index if not exists ai_personalization_profiles_expiry_idx on public.ai_personalization_profiles(expires_at);

alter table public.ai_personalization_profiles enable row level security;

drop policy if exists "ai_personalization_profiles_own_select" on public.ai_personalization_profiles;
create policy "ai_personalization_profiles_own_select" on public.ai_personalization_profiles
  for select using (auth.uid() = user_id or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create table if not exists public.ai_ranking_replay_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  replay_key text not null unique,
  query text,
  locale text not null default 'en',
  ranking_mode text not null default 'hybrid',
  candidate_count integer not null default 0,
  result_count integer not null default 0,
  weights jsonb not null default '{}'::jsonb,
  signal_breakdown jsonb not null default '{}'::jsonb,
  fallback_used boolean not null default false,
  experiment_key text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists ai_ranking_replay_snapshots_created_idx on public.ai_ranking_replay_snapshots(created_at desc);
create index if not exists ai_ranking_replay_snapshots_mode_idx on public.ai_ranking_replay_snapshots(ranking_mode, created_at desc);

alter table public.ai_ranking_replay_snapshots enable row level security;

drop policy if exists "ai_ranking_replay_admin_select" on public.ai_ranking_replay_snapshots;
create policy "ai_ranking_replay_admin_select" on public.ai_ranking_replay_snapshots
  for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create table if not exists public.ai_recommendation_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  profile_fingerprint text,
  surface text not null,
  product_ids uuid[] not null default '{}',
  scores jsonb not null default '{}'::jsonb,
  freshness_state text not null default 'fresh',
  diversity_sellers integer not null default 0,
  diversity_categories integer not null default 0,
  expires_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists ai_recommendation_snapshots_surface_idx on public.ai_recommendation_snapshots(surface, created_at desc);
create index if not exists ai_recommendation_snapshots_profile_idx on public.ai_recommendation_snapshots(profile_fingerprint, expires_at desc);

alter table public.ai_recommendation_snapshots enable row level security;

drop policy if exists "ai_recommendation_snapshots_admin_select" on public.ai_recommendation_snapshots;
create policy "ai_recommendation_snapshots_admin_select" on public.ai_recommendation_snapshots
  for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create table if not exists public.ai_feedback_learning_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  replay_key text not null unique,
  market_id text not null default 'default',
  event_count integer not null default 0,
  positive_rate numeric(8, 4) not null default 0,
  negative_rate numeric(8, 4) not null default 0,
  drift_detected boolean not null default false,
  stale_model_detected boolean not null default false,
  ranking_adjustment numeric(8, 4) not null default 0,
  recommendation_adjustment numeric(8, 4) not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists ai_feedback_learning_created_idx on public.ai_feedback_learning_snapshots(created_at desc);
create index if not exists ai_feedback_learning_drift_idx on public.ai_feedback_learning_snapshots(drift_detected, stale_model_detected, created_at desc);

alter table public.ai_feedback_learning_snapshots enable row level security;

drop policy if exists "ai_feedback_learning_admin_select" on public.ai_feedback_learning_snapshots;
create policy "ai_feedback_learning_admin_select" on public.ai_feedback_learning_snapshots
  for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

alter table public.ai_retrieval_events
  add column if not exists semantic_match_quality numeric(8, 4),
  add column if not exists ranking_drift numeric(8, 4),
  add column if not exists recommendation_ctr numeric(8, 4),
  add column if not exists queue_latency_ms integer not null default 0;

create or replace view public.ai_commerce_observability_admin as
select
  date_trunc('hour', created_at) as bucket,
  count(*) as retrieval_events,
  avg(latency_ms)::numeric(10, 2) as avg_latency_ms,
  percentile_cont(0.95) within group (order by latency_ms)::numeric(10, 2) as p95_latency_ms,
  avg(case when fallback_used then 1 else 0 end)::numeric(8, 4) as fallback_rate,
  avg(coalesce(semantic_match_quality, 0))::numeric(8, 4) as semantic_match_quality,
  avg(coalesce(ranking_drift, 0))::numeric(8, 4) as ranking_drift,
  avg(coalesce(queue_latency_ms, 0))::numeric(10, 2) as queue_latency_ms
from public.ai_retrieval_events
where created_at >= now() - interval '7 days'
group by 1
order by 1 desc;

grant select on public.ai_commerce_observability_admin to authenticated;

create or replace function public.record_ai_behavior_event(
  event_type text,
  product_id uuid default null,
  vendor_id uuid default null,
  category_id uuid default null,
  query_text text default null,
  locality_text text default null,
  anonymous_fingerprint text default null,
  event_weight numeric default 1,
  replay_key text default null,
  event_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  event_id uuid;
  durable_replay_key text;
begin
  durable_replay_key := coalesce(replay_key, encode(digest(coalesce(auth.uid()::text, anonymous_fingerprint, 'anon') || ':' || coalesce(event_type, 'event') || ':' || coalesce(product_id::text, '') || ':' || coalesce(query_text, '') || ':' || date_trunc('minute', now())::text, 'sha256'), 'hex'));

  insert into public.ai_behavior_events (
    user_id,
    anonymous_fingerprint,
    event_type,
    product_id,
    vendor_id,
    category_id,
    query,
    locality,
    weight,
    replay_key,
    metadata
  )
  values (
    auth.uid(),
    left(anonymous_fingerprint, 128),
    left(coalesce(event_type, 'unknown'), 80),
    product_id,
    vendor_id,
    category_id,
    left(query_text, 500),
    left(locality_text, 120),
    coalesce(event_weight, 1),
    durable_replay_key,
    coalesce(event_metadata, '{}'::jsonb)
  )
  on conflict (replay_key) do update
    set metadata = public.ai_behavior_events.metadata || excluded.metadata
  returning id into event_id;

  return event_id;
end;
$$;

grant execute on function public.record_ai_behavior_event(text, uuid, uuid, uuid, text, text, text, numeric, text, jsonb) to anon, authenticated;

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('adaptive_ai_commerce_intelligence', 'Phase 33 adaptive AI commerce intelligence layer with behavior-aware personalization, semantic discovery, ranking replay, feedback learning, and recovery.', true, 100, '{"roles":["BUYER","SELLER","ADMIN"]}'),
  ('ai_ranking_control_plane', 'Operationally controllable adaptive marketplace ranking with deterministic replay diagnostics.', true, 100, '{"roles":["ADMIN"]}'),
  ('ai_feedback_learning', 'Replay-safe feedback aggregation for recommendations and ranking recalibration.', true, 100, '{"roles":["ADMIN"]}')
on conflict (key) do update
set
  description = excluded.description,
  is_enabled = excluded.is_enabled,
  rollout_percentage = excluded.rollout_percentage,
  audience = excluded.audience,
  updated_at = now();
