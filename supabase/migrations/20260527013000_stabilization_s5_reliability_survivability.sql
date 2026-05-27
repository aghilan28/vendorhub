create table if not exists public.reliability_chaos_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  state text not null default 'RUNNING',
  scenario text not null,
  seed text not null,
  intensity integer not null check (intensity between 0 and 10),
  survivable boolean not null default false,
  burn_rate integer not null default 0,
  breaches text[] not null default '{}',
  recovery_action text not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.reliability_slo_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null,
  alert_level text not null default 'healthy',
  burn_rate integer not null default 0,
  breaches text[] not null default '{}',
  queue_latency_seconds integer not null default 0,
  queue_depth integer not null default 0,
  retry_count integer not null default 0,
  dead_letters integer not null default 0,
  realtime_reconnects integer not null default 0,
  reconciliation_backlog integer not null default 0,
  rollback_minutes integer not null default 0,
  failed_writes integer not null default 0,
  ai_fallback_rate numeric(5, 4) not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.rollback_rehearsal_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  deployment_version text,
  state text not null default 'RECORDED',
  rollback_required boolean not null default false,
  safe_to_promote boolean not null default false,
  blockers text[] not null default '{}',
  estimated_minutes integer not null default 0,
  evidence jsonb not null default '{}'::jsonb
);

create index if not exists reliability_chaos_runs_created_idx on public.reliability_chaos_runs(created_at desc, scenario);
create index if not exists reliability_slo_snapshots_level_idx on public.reliability_slo_snapshots(alert_level, created_at desc);
create index if not exists rollback_rehearsal_runs_created_idx on public.rollback_rehearsal_runs(created_at desc, safe_to_promote);

alter table public.reliability_chaos_runs enable row level security;
alter table public.reliability_slo_snapshots enable row level security;
alter table public.rollback_rehearsal_runs enable row level security;

create policy "reliability_chaos_admin_select" on public.reliability_chaos_runs for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "reliability_slo_admin_select" on public.reliability_slo_snapshots for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "rollback_rehearsal_admin_select" on public.rollback_rehearsal_runs for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create or replace view public.reliability_operational_health as
select
  (select count(*) from public.reliability_chaos_runs where created_at > now() - interval '24 hours' and survivable = false) as unsurvivable_chaos_24h,
  (select count(*) from public.reliability_slo_snapshots where created_at > now() - interval '24 hours' and alert_level = 'critical') as critical_slo_24h,
  (select count(*) from public.rollback_rehearsal_runs where created_at > now() - interval '7 days' and safe_to_promote = false) as rollback_blockers_7d,
  (select coalesce(max(burn_rate), 0) from public.reliability_slo_snapshots where created_at > now() - interval '24 hours') as max_burn_rate_24h,
  (select count(*) from public.async_jobs where state in ('QUEUED', 'FAILED') and scheduled_at < now() - interval '15 minutes') as stale_async_jobs,
  (select count(*) from public.async_jobs where state = 'DEAD_LETTER') as async_dead_letters,
  now() as generated_at;

create or replace function public.record_reliability_slo_snapshot(
  snapshot_source text,
  snapshot_alert_level text,
  snapshot_burn_rate integer,
  snapshot_breaches text[],
  queue_latency integer default 0,
  queue_depth_value integer default 0,
  retry_count_value integer default 0,
  dead_letter_value integer default 0,
  realtime_reconnect_value integer default 0,
  reconciliation_backlog_value integer default 0,
  rollback_minutes_value integer default 0,
  failed_writes_value integer default 0,
  ai_fallback_rate_value numeric default 0,
  snapshot_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.reliability_slo_snapshots(
    source,
    alert_level,
    burn_rate,
    breaches,
    queue_latency_seconds,
    queue_depth,
    retry_count,
    dead_letters,
    realtime_reconnects,
    reconciliation_backlog,
    rollback_minutes,
    failed_writes,
    ai_fallback_rate,
    metadata
  )
  values (
    snapshot_source,
    snapshot_alert_level,
    snapshot_burn_rate,
    coalesce(snapshot_breaches, '{}'),
    queue_latency,
    queue_depth_value,
    retry_count_value,
    dead_letter_value,
    realtime_reconnect_value,
    reconciliation_backlog_value,
    rollback_minutes_value,
    failed_writes_value,
    ai_fallback_rate_value,
    coalesce(snapshot_metadata, '{}'::jsonb)
  )
  returning id into v_id;
  return v_id;
end;
$$;

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('stabilization_s5_reliability_survivability', 'Enables reliability SLO snapshots, deterministic chaos evidence, rollback rehearsal tracking, and survivability observability.', true, 100, '{"roles":["ADMIN"]}'),
  ('stabilization_s5_chaos_validation', 'Enables deterministic chaos validation for queues, realtime, reconciliation, deployment, AI, payments, governance, and logistics.', true, 100, '{"roles":["ADMIN"]}')
on conflict (key) do update
set description = excluded.description,
    is_enabled = excluded.is_enabled,
    rollout_percentage = excluded.rollout_percentage,
    audience = excluded.audience,
    updated_at = now();
