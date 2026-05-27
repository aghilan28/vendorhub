create table if not exists public.async_worker_heartbeats (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  worker_id text not null unique,
  worker_pool text not null,
  queues text[] not null default '{}',
  state text not null default 'RUNNING' check (state in ('STARTING', 'RUNNING', 'DRAINING', 'STOPPED', 'CRASHED')),
  heartbeat_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.async_queue_registry (
  queue_name text primary key,
  domain text not null,
  worker_pool text not null,
  compute_class text not null,
  dead_letter_queue text not null,
  replay_queue text not null,
  min_reserved_concurrency integer not null default 1,
  max_elastic_concurrency integer not null default 1,
  rate_limit_per_minute integer not null default 60,
  saturation_backoff_seconds integer not null default 60,
  priority_floor integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists async_worker_heartbeats_pool_idx on public.async_worker_heartbeats(worker_pool, heartbeat_at desc);
create index if not exists async_jobs_queue_pressure_idx on public.async_jobs(queue_name, state, scheduled_at, next_retry_at, priority desc);
create index if not exists durable_events_processing_idx on public.durable_events(state, available_at, sequence_id) where state in ('PENDING', 'FAILED', 'PROCESSING');

alter table public.async_worker_heartbeats enable row level security;
alter table public.async_queue_registry enable row level security;

drop policy if exists "async_worker_heartbeats_admin_select" on public.async_worker_heartbeats;
drop policy if exists "async_queue_registry_admin_select" on public.async_queue_registry;
create policy "async_worker_heartbeats_admin_select" on public.async_worker_heartbeats for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "async_queue_registry_admin_select" on public.async_queue_registry for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create or replace function public.heartbeat_async_worker(
  target_worker_id text,
  target_worker_pool text,
  target_queues text[],
  worker_state text default 'RUNNING',
  heartbeat_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker public.async_worker_heartbeats%rowtype;
begin
  insert into public.async_worker_heartbeats(worker_id, worker_pool, queues, state, heartbeat_at, metadata)
  values (
    target_worker_id,
    target_worker_pool,
    coalesce(target_queues, '{}'),
    coalesce(worker_state, 'RUNNING'),
    now(),
    coalesce(heartbeat_metadata, '{}'::jsonb)
  )
  on conflict (worker_id) do update
  set worker_pool = excluded.worker_pool,
      queues = excluded.queues,
      state = excluded.state,
      heartbeat_at = now(),
      metadata = public.async_worker_heartbeats.metadata || excluded.metadata,
      updated_at = now()
  returning * into v_worker;

  perform public.record_async_queue_metric('system', 'system', 'worker.heartbeat', 1, jsonb_build_object('workerPool', v_worker.worker_pool, 'state', v_worker.state));
  return jsonb_build_object('workerId', v_worker.worker_id, 'workerPool', v_worker.worker_pool, 'state', v_worker.state, 'heartbeatAt', v_worker.heartbeat_at);
end;
$$;

create or replace function public.claim_durable_events(
  claimant_worker_id text,
  event_limit integer default 20,
  lock_seconds integer default 120
)
returns setof public.durable_events
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select e.id
    from public.durable_events e
    where (
      e.state = 'PENDING'
      or (e.state = 'FAILED' and e.available_at <= now())
      or (e.state = 'PROCESSING' and e.available_at < now())
    )
      and e.available_at <= now()
    order by e.sequence_id asc
    limit greatest(1, least(coalesce(event_limit, 20), 100))
    for update skip locked
  )
  update public.durable_events e
  set state = 'PROCESSING',
      attempts = e.attempts + 1,
      available_at = now() + make_interval(secs => greatest(30, coalesce(lock_seconds, 120))),
      metadata = e.metadata || jsonb_build_object('workerId', claimant_worker_id, 'claimedAt', now()),
      updated_at = now()
  from candidates
  where e.id = candidates.id
  returning e.*;
end;
$$;

create or replace function public.complete_durable_event(target_event_id uuid, result_metadata jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.durable_events%rowtype;
begin
  update public.durable_events
  set state = 'PROCESSED',
      processed_at = now(),
      last_error = null,
      metadata = metadata || coalesce(result_metadata, '{}'::jsonb),
      updated_at = now()
  where id = target_event_id
  returning * into v_event;

  perform public.record_async_queue_metric('durable-events', coalesce(v_event.subject_type, 'event'), 'event.processed', 1, jsonb_build_object('eventType', v_event.event_type, 'attempts', v_event.attempts));
  return jsonb_build_object('eventId', v_event.id, 'state', v_event.state);
end;
$$;

create or replace function public.fail_durable_event(
  target_event_id uuid,
  failure_message text,
  retry_delay_seconds integer default 60,
  poison_dead_letter boolean default false,
  failure_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.durable_events%rowtype;
  v_dead_letter boolean;
begin
  select * into v_event from public.durable_events where id = target_event_id for update;
  if v_event.id is null then
    raise exception 'DURABLE_EVENT_NOT_FOUND';
  end if;

  v_dead_letter := poison_dead_letter or v_event.attempts >= 8;

  update public.durable_events
  set state = case when v_dead_letter then 'DEAD_LETTER'::public.durable_event_state else 'FAILED'::public.durable_event_state end,
      available_at = case when v_dead_letter then available_at else now() + make_interval(secs => greatest(10, coalesce(retry_delay_seconds, 60))) end,
      last_error = left(coalesce(failure_message, 'Durable event failed'), 2000),
      metadata = metadata || coalesce(failure_metadata, '{}'::jsonb) || jsonb_build_object('failedAt', now()),
      updated_at = now()
  where id = v_event.id
  returning * into v_event;

  perform public.record_async_queue_metric('durable-events', coalesce(v_event.subject_type, 'event'), case when v_dead_letter then 'event.dead_lettered' else 'event.failed' end, 1, jsonb_build_object('eventType', v_event.event_type, 'attempts', v_event.attempts));
  return jsonb_build_object('eventId', v_event.id, 'state', v_event.state, 'deadLetter', v_dead_letter, 'availableAt', v_event.available_at);
end;
$$;

create or replace view public.async_worker_pool_health as
select
  coalesce(reg.worker_pool, hb.worker_pool, 'unregistered') as worker_pool,
  coalesce(reg.domain, 'system') as domain,
  count(distinct hb.worker_id) filter (where hb.state in ('STARTING', 'RUNNING') and hb.heartbeat_at > now() - interval '2 minutes') as active_workers,
  count(distinct hb.worker_id) filter (where hb.state = 'DRAINING') as draining_workers,
  count(distinct hb.worker_id) filter (where hb.heartbeat_at <= now() - interval '2 minutes' and hb.state in ('STARTING', 'RUNNING')) as stale_workers,
  count(j.id) filter (where j.state = 'QUEUED') as queued_count,
  count(j.id) filter (where j.state = 'RUNNING') as running_count,
  count(j.id) filter (where j.state = 'FAILED') as retry_waiting_count,
  count(j.id) filter (where j.state = 'DEAD_LETTER') as dead_letter_count,
  coalesce(round(max(extract(epoch from (now() - j.created_at))) filter (where j.state in ('QUEUED', 'FAILED'))), 0) as oldest_backlog_seconds,
  coalesce(max(reg.max_elastic_concurrency), 1) as max_elastic_concurrency,
  coalesce(sum(reg.min_reserved_concurrency), 1) as reserved_concurrency,
  now() as generated_at
from public.async_queue_registry reg
full join public.async_worker_heartbeats hb on hb.worker_pool = reg.worker_pool
left join public.async_jobs j on j.queue_name = reg.queue_name
group by coalesce(reg.worker_pool, hb.worker_pool, 'unregistered'), coalesce(reg.domain, 'system');

drop view if exists public.async_queue_health;
create or replace view public.async_queue_health as
select
  j.queue_name,
  j.category,
  coalesce(reg.domain, j.category) as domain,
  coalesce(reg.worker_pool, 'unregistered') as worker_pool,
  coalesce(reg.compute_class, 'standard') as compute_class,
  count(*) filter (where j.state = 'QUEUED') as queued_count,
  count(*) filter (where j.state = 'RUNNING') as running_count,
  count(*) filter (where j.state = 'FAILED') as retry_waiting_count,
  count(*) filter (where j.state = 'DEAD_LETTER') as dead_letter_count,
  count(*) filter (where j.state = 'RUNNING' and j.locked_until < now()) as stuck_count,
  count(*) filter (where j.state = 'FAILED' and j.attempts >= j.max_attempts) as retry_exhausted_count,
  coalesce(round(avg(extract(epoch from (now() - j.created_at))) filter (where j.state in ('QUEUED', 'FAILED'))), 0) as backlog_age_seconds,
  coalesce(round(avg(extract(epoch from (now() - j.scheduled_at))) filter (where j.state in ('QUEUED', 'FAILED') and j.scheduled_at <= now())), 0) as ready_latency_seconds,
  coalesce(max(j.attempts) filter (where j.state in ('FAILED', 'DEAD_LETTER')), 0) as max_attempts_seen,
  max(j.updated_at) as last_activity_at
from public.async_jobs j
left join public.async_queue_registry reg on reg.queue_name = j.queue_name
group by j.queue_name, j.category, coalesce(reg.domain, j.category), coalesce(reg.worker_pool, 'unregistered'), coalesce(reg.compute_class, 'standard');

create or replace view public.durable_event_health as
select
  event_type,
  subject_type,
  count(*) filter (where state = 'PENDING') as pending_count,
  count(*) filter (where state = 'PROCESSING') as processing_count,
  count(*) filter (where state = 'FAILED') as failed_count,
  count(*) filter (where state = 'DEAD_LETTER') as dead_letter_count,
  coalesce(round(max(extract(epoch from (now() - created_at))) filter (where state in ('PENDING', 'FAILED'))), 0) as oldest_pending_seconds,
  coalesce(max(attempts), 0) as max_attempts_seen,
  now() as generated_at
from public.durable_events
group by event_type, subject_type;

insert into public.async_queue_registry(queue_name, domain, worker_pool, compute_class, dead_letter_queue, replay_queue, min_reserved_concurrency, max_elastic_concurrency, rate_limit_per_minute, saturation_backoff_seconds, priority_floor)
values
  ('commerce.checkout', 'commerce', 'commerce-critical', 'critical', 'commerce-critical.dlq', 'commerce-critical.replay', 6, 16, 600, 15, 80),
  ('commerce.reconciliation', 'commerce', 'reconciliation-control', 'critical', 'commerce-critical.dlq', 'commerce-critical.replay', 6, 16, 600, 15, 80),
  ('commerce.refunds', 'commerce', 'commerce-critical', 'critical', 'commerce-critical.dlq', 'commerce-critical.replay', 6, 16, 600, 15, 80),
  ('commerce.payouts', 'commerce', 'commerce-critical', 'critical', 'commerce-critical.dlq', 'commerce-critical.replay', 6, 16, 600, 15, 80),
  ('logistics.eta', 'logistics', 'logistics-coordination', 'interactive', 'logistics.dlq', 'logistics.replay', 3, 10, 420, 45, 50),
  ('logistics.reconciliation', 'logistics', 'reconciliation-control', 'standard', 'logistics.dlq', 'logistics.replay', 2, 6, 120, 90, 65),
  ('logistics.tracking-replay', 'logistics', 'logistics-coordination', 'standard', 'logistics.dlq', 'logistics.replay', 1, 5, 90, 120, 65),
  ('ai.embeddings', 'ai', 'ai-heavy-compute', 'heavy', 'ai.dlq', 'ai.replay', 1, 4, 90, 180, 20),
  ('ai.embeddings-scheduled', 'ai', 'ai-heavy-compute', 'bulk', 'ai.dlq', 'ai.replay', 1, 3, 30, 300, 20),
  ('ai.semantic-index', 'ai', 'ai-heavy-compute', 'heavy', 'ai.dlq', 'ai.replay', 1, 3, 45, 240, 20),
  ('ai.recommendations', 'ai', 'ai-heavy-compute', 'bulk', 'ai.dlq', 'ai.replay', 1, 2, 20, 420, 10),
  ('ai.ranking', 'ai', 'ai-heavy-compute', 'bulk', 'ai.dlq', 'ai.replay', 1, 2, 20, 420, 10),
  ('ai.diagnostics', 'ai', 'ai-heavy-compute', 'standard', 'ai.dlq', 'ai.replay', 1, 2, 30, 240, 20),
  ('governance.fraud', 'governance', 'governance-risk', 'standard', 'governance.dlq', 'governance.replay', 2, 6, 120, 120, 50),
  ('governance.moderation', 'governance', 'governance-risk', 'standard', 'governance.dlq', 'governance.replay', 1, 5, 90, 180, 40),
  ('governance.trust', 'governance', 'governance-risk', 'standard', 'governance.dlq', 'governance.replay', 1, 4, 80, 180, 45),
  ('governance.disputes', 'governance', 'governance-risk', 'standard', 'governance.dlq', 'governance.replay', 1, 4, 60, 180, 45),
  ('analytics.seller-aggregation', 'analytics', 'analytics-bulk', 'bulk', 'analytics.dlq', 'analytics.replay', 1, 4, 60, 420, 10),
  ('analytics.forecasting', 'analytics', 'analytics-bulk', 'bulk', 'analytics.dlq', 'analytics.replay', 1, 2, 20, 600, 10),
  ('analytics.operational', 'analytics', 'analytics-bulk', 'standard', 'analytics.dlq', 'analytics.replay', 1, 4, 120, 180, 20),
  ('analytics.admin', 'analytics', 'analytics-bulk', 'bulk', 'analytics.dlq', 'analytics.replay', 1, 3, 60, 420, 10),
  ('notifications.dispatch', 'notification', 'notification-delivery', 'interactive', 'notifications.dlq', 'notifications.replay', 2, 18, 900, 60, 30),
  ('notifications.email', 'notification', 'notification-delivery', 'interactive', 'notifications.dlq', 'notifications.replay', 2, 14, 600, 60, 30),
  ('notifications.push', 'notification', 'notification-delivery', 'interactive', 'notifications.dlq', 'notifications.replay', 2, 18, 1200, 45, 30),
  ('notifications.sms', 'notification', 'notification-delivery', 'interactive', 'notifications.dlq', 'notifications.replay', 1, 8, 240, 90, 30),
  ('notifications.digest', 'notification', 'notification-delivery', 'bulk', 'notifications.dlq', 'notifications.replay', 1, 4, 60, 420, 10),
  ('realtime.invalidation', 'realtime', 'realtime-sync', 'interactive', 'realtime.dlq', 'realtime.replay', 3, 14, 900, 20, 50)
on conflict (queue_name) do update
set domain = excluded.domain,
    worker_pool = excluded.worker_pool,
    compute_class = excluded.compute_class,
    dead_letter_queue = excluded.dead_letter_queue,
    replay_queue = excluded.replay_queue,
    min_reserved_concurrency = excluded.min_reserved_concurrency,
    max_elastic_concurrency = excluded.max_elastic_concurrency,
    rate_limit_per_minute = excluded.rate_limit_per_minute,
    saturation_backoff_seconds = excluded.saturation_backoff_seconds,
    priority_floor = excluded.priority_floor,
    updated_at = now();

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('phase31_distributed_async_compute', 'Enables distributed queue domains, worker pool heartbeats, durable event dispatch, and compute isolation.', true, 100, '{"roles":["ADMIN","SUPER_ADMIN"]}'),
  ('phase31_event_processor', 'Enables durable event claiming, routing, retry, and replay-safe async job fanout.', true, 100, '{"roles":["ADMIN","SUPER_ADMIN"]}'),
  ('phase31_worker_pool_orchestration', 'Enables workload-specific async worker pools with deterministic scaling metadata.', true, 100, '{"roles":["ADMIN","SUPER_ADMIN"]}')
on conflict (key) do update
set description = excluded.description,
    is_enabled = excluded.is_enabled,
    rollout_percentage = excluded.rollout_percentage,
    audience = excluded.audience,
    updated_at = now();
