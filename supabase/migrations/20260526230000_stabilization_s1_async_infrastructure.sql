create type public.async_job_state as enum ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD_LETTER', 'CANCELLED');
create type public.durable_event_state as enum ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER');
create type public.webhook_ingestion_state as enum ('RECEIVED', 'QUEUED', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER');
create type public.idempotency_record_state as enum ('STARTED', 'COMPLETED', 'FAILED', 'EXPIRED');

create table public.async_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  queue_name text not null,
  category text not null,
  job_name text not null,
  priority integer not null default 50 check (priority between 0 and 100),
  state public.async_job_state not null default 'QUEUED',
  payload jsonb not null default '{}'::jsonb,
  trace jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  dedupe_key text not null,
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts > 0),
  scheduled_at timestamptz not null default now(),
  next_retry_at timestamptz,
  locked_at timestamptz,
  locked_until timestamptz,
  worker_id text,
  last_error text,
  last_error_at timestamptz,
  dead_lettered_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (dedupe_key)
);

create table public.async_dead_letter_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source_job_id uuid not null unique references public.async_jobs(id) on delete restrict,
  queue_name text not null,
  category text not null,
  job_name text not null,
  payload jsonb not null default '{}'::jsonb,
  trace jsonb not null default '{}'::jsonb,
  attempts integer not null,
  last_error text,
  replay_after timestamptz,
  replayed_at timestamptz,
  replay_job_id uuid references public.async_jobs(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create table public.durable_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text not null,
  event_key text not null,
  event_type text not null,
  subject_type text,
  subject_id text,
  sequence_id bigint generated always as identity,
  state public.durable_event_state not null default 'PENDING',
  payload jsonb not null default '{}'::jsonb,
  trace jsonb not null default '{}'::jsonb,
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  unique (source, event_key)
);

create table public.idempotency_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  scope text not null,
  idempotency_key text not null,
  request_hash text,
  state public.idempotency_record_state not null default 'STARTED',
  locked_until timestamptz,
  response_payload jsonb,
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  unique (scope, idempotency_key)
);

create table public.webhook_ingestions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  provider text not null,
  event_id text not null,
  event_hash text not null,
  event_type text,
  signature_valid boolean,
  headers jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  raw_body_hash text not null,
  state public.webhook_ingestion_state not null default 'RECEIVED',
  attempts integer not null default 0 check (attempts >= 0),
  async_job_id uuid references public.async_jobs(id) on delete set null,
  last_error text,
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (provider, event_id),
  unique (provider, event_hash)
);

create table public.async_queue_metrics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  queue_name text not null,
  category text not null,
  metric text not null,
  value numeric not null default 1,
  tags jsonb not null default '{}'::jsonb
);

create index async_jobs_ready_idx on public.async_jobs(state, queue_name, scheduled_at, priority desc, created_at) where state in ('QUEUED', 'FAILED');
create index async_jobs_locked_idx on public.async_jobs(state, locked_until) where state = 'RUNNING';
create index async_jobs_category_state_idx on public.async_jobs(category, state, updated_at desc);
create index durable_events_state_idx on public.durable_events(state, available_at, sequence_id);
create index durable_events_subject_idx on public.durable_events(subject_type, subject_id, sequence_id);
create index idempotency_records_state_idx on public.idempotency_records(state, locked_until);
create index webhook_ingestions_state_idx on public.webhook_ingestions(provider, state, created_at desc);
create index async_queue_metrics_lookup_idx on public.async_queue_metrics(queue_name, category, metric, created_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'async_jobs',
    'durable_events',
    'idempotency_records',
    'webhook_ingestions'
  ]
  loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

alter table public.async_jobs enable row level security;
alter table public.async_dead_letter_jobs enable row level security;
alter table public.durable_events enable row level security;
alter table public.idempotency_records enable row level security;
alter table public.webhook_ingestions enable row level security;
alter table public.async_queue_metrics enable row level security;

create policy "async_jobs_admin_select" on public.async_jobs for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "async_dead_letter_admin_select" on public.async_dead_letter_jobs for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "durable_events_admin_select" on public.durable_events for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "idempotency_records_admin_select" on public.idempotency_records for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "webhook_ingestions_admin_select" on public.webhook_ingestions for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "async_queue_metrics_admin_select" on public.async_queue_metrics for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create or replace function public.record_async_queue_metric(
  target_queue text,
  target_category text,
  metric_name text,
  metric_value numeric default 1,
  metric_tags jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.async_queue_metrics(queue_name, category, metric, value, tags)
  values (target_queue, target_category, metric_name, coalesce(metric_value, 1), coalesce(metric_tags, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.enqueue_async_job(
  target_queue text,
  target_category text,
  target_job_name text,
  job_payload jsonb,
  job_priority integer default 50,
  job_idempotency_key text default null,
  run_after timestamptz default now(),
  job_max_attempts integer default 5,
  job_trace jsonb default '{}'::jsonb,
  job_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := coalesce(job_idempotency_key, encode(digest(target_queue || ':' || target_category || ':' || target_job_name || ':' || coalesce(job_payload::text, '{}'), 'sha256'), 'hex'));
  v_dedupe text := target_queue || ':' || target_category || ':' || target_job_name || ':' || v_key;
  v_job public.async_jobs%rowtype;
begin
  insert into public.async_jobs(queue_name, category, job_name, priority, payload, idempotency_key, dedupe_key, scheduled_at, max_attempts, trace, metadata)
  values (
    target_queue,
    target_category,
    target_job_name,
    least(100, greatest(0, coalesce(job_priority, 50))),
    coalesce(job_payload, '{}'::jsonb),
    v_key,
    v_dedupe,
    coalesce(run_after, now()),
    greatest(1, coalesce(job_max_attempts, 5)),
    coalesce(job_trace, '{}'::jsonb),
    coalesce(job_metadata, '{}'::jsonb)
  )
  on conflict (dedupe_key) do update
  set scheduled_at = least(public.async_jobs.scheduled_at, excluded.scheduled_at),
      priority = greatest(public.async_jobs.priority, excluded.priority),
      updated_at = now()
  returning * into v_job;

  perform public.record_async_queue_metric(v_job.queue_name, v_job.category, 'job.enqueued', 1, jsonb_build_object('jobName', v_job.job_name, 'state', v_job.state));

  return jsonb_build_object('jobId', v_job.id, 'state', v_job.state, 'dedupeKey', v_job.dedupe_key, 'scheduledAt', v_job.scheduled_at);
end;
$$;

create or replace function public.persist_durable_event(
  event_source text,
  durable_event_key text,
  durable_event_type text,
  event_payload jsonb,
  event_subject_type text default null,
  event_subject_id text default null,
  event_trace jsonb default '{}'::jsonb,
  event_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.durable_events%rowtype;
begin
  insert into public.durable_events(source, event_key, event_type, subject_type, subject_id, payload, trace, metadata)
  values (event_source, durable_event_key, durable_event_type, coalesce(event_subject_type, 'unknown'), event_subject_id, coalesce(event_payload, '{}'::jsonb), coalesce(event_trace, '{}'::jsonb), coalesce(event_metadata, '{}'::jsonb))
  on conflict (source, event_key) do update
  set metadata = public.durable_events.metadata || excluded.metadata,
      updated_at = now()
  returning * into v_event;

  return jsonb_build_object('eventId', v_event.id, 'state', v_event.state, 'sequenceId', v_event.sequence_id, 'duplicate', v_event.created_at <> v_event.updated_at);
end;
$$;

create or replace function public.acquire_idempotency_record(
  target_scope text,
  target_idempotency_key text,
  target_request_hash text default null,
  lock_seconds integer default 300,
  record_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.idempotency_records%rowtype;
  v_now timestamptz := now();
begin
  insert into public.idempotency_records(scope, idempotency_key, request_hash, locked_until, metadata)
  values (target_scope, target_idempotency_key, target_request_hash, v_now + make_interval(secs => greatest(30, coalesce(lock_seconds, 300))), coalesce(record_metadata, '{}'::jsonb))
  on conflict (scope, idempotency_key) do update
  set locked_until = case
        when public.idempotency_records.state in ('FAILED', 'EXPIRED') or public.idempotency_records.locked_until < v_now
        then excluded.locked_until
        else public.idempotency_records.locked_until
      end,
      state = case
        when public.idempotency_records.state in ('FAILED', 'EXPIRED') or public.idempotency_records.locked_until < v_now
        then 'STARTED'::public.idempotency_record_state
        else public.idempotency_records.state
      end,
      updated_at = now()
  returning * into v_record;

  return jsonb_build_object(
    'recordId', v_record.id,
    'state', v_record.state,
    'acquired', v_record.state = 'STARTED' and v_record.locked_until > v_now,
    'completed', v_record.state = 'COMPLETED',
    'response', v_record.response_payload
  );
end;
$$;

create or replace function public.complete_idempotency_record(
  target_scope text,
  target_idempotency_key text,
  response jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.idempotency_records%rowtype;
begin
  update public.idempotency_records
  set state = 'COMPLETED',
      response_payload = coalesce(response, '{}'::jsonb),
      completed_at = now(),
      updated_at = now()
  where scope = target_scope and idempotency_key = target_idempotency_key
  returning * into v_record;

  return jsonb_build_object('recordId', v_record.id, 'state', v_record.state, 'response', v_record.response_payload);
end;
$$;

create or replace function public.claim_async_jobs(
  queue_names text[],
  claimant_worker_id text,
  job_limit integer default 10,
  lock_seconds integer default 120,
  queue_concurrency jsonb default '{}'::jsonb
)
returns setof public.async_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select j.id
    from public.async_jobs j
    where queue_name = any(queue_names)
      and (
        j.state = 'QUEUED'
        or (j.state = 'FAILED' and coalesce(j.next_retry_at, j.scheduled_at) <= now() and j.attempts < j.max_attempts)
        or (j.state = 'RUNNING' and j.locked_until < now())
      )
      and j.scheduled_at <= now()
      and (
        select count(*)
        from public.async_jobs running
        where running.queue_name = j.queue_name
          and running.state = 'RUNNING'
          and running.locked_until >= now()
      ) < greatest(1, coalesce((queue_concurrency ->> j.queue_name)::integer, 1))
    order by j.priority desc, j.scheduled_at asc, j.created_at asc
    limit greatest(1, least(coalesce(job_limit, 10), 100))
    for update skip locked
  )
  update public.async_jobs j
  set state = 'RUNNING',
      attempts = j.attempts + 1,
      locked_at = now(),
      locked_until = now() + make_interval(secs => greatest(30, coalesce(lock_seconds, 120))),
      worker_id = claimant_worker_id,
      updated_at = now()
  from candidates
  where j.id = candidates.id
  returning j.*;
end;
$$;

create or replace function public.recover_async_infrastructure(
  stale_running_seconds integer default 300,
  stale_idempotency_seconds integer default 900,
  webhook_queue_grace_seconds integer default 300
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reclaimed_jobs integer := 0;
  v_dead_lettered_jobs integer := 0;
  v_expired_leases integer := 0;
  v_failed_webhooks integer := 0;
begin
  with reclaimed as (
    update public.async_jobs
    set state = 'FAILED',
        locked_until = null,
        worker_id = null,
        next_retry_at = now(),
        last_error = coalesce(last_error, 'Worker lock expired before completion.'),
        last_error_at = now(),
        metadata = metadata || jsonb_build_object('recoveredStuckJobAt', now()),
        updated_at = now()
    where state = 'RUNNING'
      and locked_until < now() - make_interval(secs => greatest(30, coalesce(stale_running_seconds, 300)))
      and attempts < max_attempts
    returning id, queue_name, category, job_name
  )
  select count(*) into v_reclaimed_jobs from reclaimed;

  with exhausted as (
    update public.async_jobs
    set state = 'DEAD_LETTER',
        locked_until = null,
        worker_id = null,
        dead_lettered_at = now(),
        last_error = coalesce(last_error, 'Worker lock expired after retry exhaustion.'),
        last_error_at = now(),
        metadata = metadata || jsonb_build_object('deadLetteredByRecoveryAt', now()),
        updated_at = now()
    where state = 'RUNNING'
      and locked_until < now() - make_interval(secs => greatest(30, coalesce(stale_running_seconds, 300)))
      and attempts >= max_attempts
    returning *
  ),
  inserted_dead_letters as (
    insert into public.async_dead_letter_jobs(source_job_id, queue_name, category, job_name, payload, trace, attempts, last_error, replay_after, metadata)
    select id, queue_name, category, job_name, payload, trace, attempts, last_error, now() + interval '15 minutes', metadata
    from exhausted
    on conflict (source_job_id) do update
    set attempts = excluded.attempts,
        last_error = excluded.last_error,
        replay_after = excluded.replay_after,
        metadata = excluded.metadata
    returning id
  )
  select count(*) into v_dead_lettered_jobs from inserted_dead_letters;

  update public.idempotency_records
  set state = 'EXPIRED',
      locked_until = null,
      metadata = metadata || jsonb_build_object('expiredByRecoveryAt', now()),
      updated_at = now()
  where state = 'STARTED'
    and locked_until < now() - make_interval(secs => greatest(30, coalesce(stale_idempotency_seconds, 900)));
  get diagnostics v_expired_leases = row_count;

  update public.webhook_ingestions wi
  set state = 'FAILED',
      last_error = 'Webhook was queued but no live async job remains attached.',
      metadata = wi.metadata || jsonb_build_object('markedFailedByRecoveryAt', now()),
      updated_at = now()
  where wi.state in ('QUEUED', 'PROCESSING')
    and wi.updated_at < now() - make_interval(secs => greatest(30, coalesce(webhook_queue_grace_seconds, 300)))
    and not exists (
      select 1
      from public.async_jobs aj
      where aj.id = wi.async_job_id
        and aj.state in ('QUEUED', 'FAILED', 'RUNNING')
    );
  get diagnostics v_failed_webhooks = row_count;

  perform public.record_async_queue_metric('system', 'system', 'recovery.reclaimed_jobs', v_reclaimed_jobs, '{}'::jsonb);
  perform public.record_async_queue_metric('system', 'system', 'recovery.dead_lettered_jobs', v_dead_lettered_jobs, '{}'::jsonb);
  perform public.record_async_queue_metric('system', 'system', 'recovery.expired_idempotency_leases', v_expired_leases, '{}'::jsonb);
  perform public.record_async_queue_metric('system', 'system', 'recovery.failed_orphaned_webhooks', v_failed_webhooks, '{}'::jsonb);

  return jsonb_build_object(
    'reclaimedJobs', v_reclaimed_jobs,
    'deadLetteredJobs', v_dead_lettered_jobs,
    'expiredIdempotencyLeases', v_expired_leases,
    'failedOrphanedWebhooks', v_failed_webhooks
  );
end;
$$;

create or replace function public.complete_async_job(target_job_id uuid, result_metadata jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.async_jobs%rowtype;
begin
  update public.async_jobs
  set state = 'SUCCEEDED',
      completed_at = now(),
      locked_until = null,
      last_error = null,
      metadata = metadata || coalesce(result_metadata, '{}'::jsonb),
      updated_at = now()
  where id = target_job_id
  returning * into v_job;

  perform public.record_async_queue_metric(v_job.queue_name, v_job.category, 'job.succeeded', 1, jsonb_build_object('jobName', v_job.job_name, 'attempts', v_job.attempts));
  return jsonb_build_object('jobId', v_job.id, 'state', v_job.state);
end;
$$;

create or replace function public.fail_async_job(
  target_job_id uuid,
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
  v_job public.async_jobs%rowtype;
  v_dead_letter boolean;
begin
  select * into v_job from public.async_jobs where id = target_job_id for update;
  if v_job.id is null then
    raise exception 'ASYNC_JOB_NOT_FOUND';
  end if;

  v_dead_letter := poison_dead_letter or v_job.attempts >= v_job.max_attempts;

  update public.async_jobs
  set state = case when v_dead_letter then 'DEAD_LETTER'::public.async_job_state else 'FAILED'::public.async_job_state end,
      locked_until = null,
      next_retry_at = case when v_dead_letter then null else now() + make_interval(secs => greatest(10, coalesce(retry_delay_seconds, 60))) end,
      last_error = left(coalesce(failure_message, 'Job failed'), 2000),
      last_error_at = now(),
      dead_lettered_at = case when v_dead_letter then now() else dead_lettered_at end,
      metadata = metadata || coalesce(failure_metadata, '{}'::jsonb),
      updated_at = now()
  where id = v_job.id
  returning * into v_job;

  if v_dead_letter then
    insert into public.async_dead_letter_jobs(source_job_id, queue_name, category, job_name, payload, trace, attempts, last_error, replay_after, metadata)
    values (v_job.id, v_job.queue_name, v_job.category, v_job.job_name, v_job.payload, v_job.trace, v_job.attempts, v_job.last_error, now() + interval '15 minutes', v_job.metadata)
    on conflict (source_job_id) do update
    set attempts = excluded.attempts,
        last_error = excluded.last_error,
        replay_after = excluded.replay_after,
        metadata = excluded.metadata;
  end if;

  perform public.record_async_queue_metric(v_job.queue_name, v_job.category, case when v_dead_letter then 'job.dead_lettered' else 'job.failed' end, 1, jsonb_build_object('jobName', v_job.job_name, 'attempts', v_job.attempts));
  return jsonb_build_object('jobId', v_job.id, 'state', v_job.state, 'deadLetter', v_dead_letter, 'nextRetryAt', v_job.next_retry_at);
end;
$$;

create or replace function public.replay_dead_letter_job(target_dead_letter_id uuid, run_after timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dead public.async_dead_letter_jobs%rowtype;
  v_result jsonb;
  v_job_id uuid;
begin
  if not public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_dead from public.async_dead_letter_jobs where id = target_dead_letter_id for update;
  if v_dead.id is null then
    raise exception 'DEAD_LETTER_NOT_FOUND';
  end if;

  v_result := public.enqueue_async_job(
    v_dead.queue_name,
    v_dead.category,
    v_dead.job_name,
    v_dead.payload,
    95,
    'replay:' || v_dead.source_job_id::text || ':' || extract(epoch from now())::text,
    coalesce(run_after, now()),
    greatest(3, v_dead.attempts),
    v_dead.trace,
    v_dead.metadata || jsonb_build_object('replayedFromDeadLetterId', v_dead.id)
  );
  v_job_id := (v_result ->> 'jobId')::uuid;

  update public.async_dead_letter_jobs
  set replayed_at = now(),
      replay_job_id = v_job_id
  where id = v_dead.id;

  return v_result;
end;
$$;

create or replace view public.async_queue_health as
select
  queue_name,
  category,
  count(*) filter (where state = 'QUEUED') as queued_count,
  count(*) filter (where state = 'RUNNING') as running_count,
  count(*) filter (where state = 'FAILED') as retry_waiting_count,
  count(*) filter (where state = 'DEAD_LETTER') as dead_letter_count,
  count(*) filter (where state = 'RUNNING' and locked_until < now()) as stuck_count,
  count(*) filter (where state = 'FAILED' and attempts >= max_attempts) as retry_exhausted_count,
  coalesce(round(avg(extract(epoch from (now() - created_at))) filter (where state in ('QUEUED', 'FAILED'))), 0) as backlog_age_seconds,
  coalesce(round(avg(extract(epoch from (now() - scheduled_at))) filter (where state in ('QUEUED', 'FAILED') and scheduled_at <= now())), 0) as ready_latency_seconds,
  coalesce(max(attempts) filter (where state in ('FAILED', 'DEAD_LETTER')), 0) as max_attempts_seen,
  max(updated_at) as last_activity_at
from public.async_jobs
group by queue_name, category;

create or replace view public.async_recovery_health as
select
  (select count(*) from public.async_jobs where state = 'RUNNING' and locked_until < now()) as stuck_jobs,
  (select count(*) from public.idempotency_records where state = 'STARTED' and locked_until < now()) as orphaned_idempotency_leases,
  (select count(*) from public.webhook_ingestions where state in ('RECEIVED', 'FAILED', 'DEAD_LETTER')) as webhook_recovery_backlog,
  (select count(*) from public.durable_events where state in ('FAILED', 'DEAD_LETTER')) as durable_event_recovery_backlog,
  (select count(*) from public.async_dead_letter_jobs where replayed_at is null) as unreplayed_dead_letters,
  now() as generated_at;

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('stabilization_s1_async_jobs', 'Enables durable Postgres-backed async job orchestration, retry policies, dead-letter replay, and worker isolation.', true, 100, '{"roles":["ADMIN"]}'),
  ('stabilization_s1_durable_events', 'Enables replay-safe durable commerce event persistence and sequencing.', true, 100, '{"roles":["ADMIN"]}'),
  ('stabilization_s1_webhook_durability', 'Enables durable webhook ingestion and async reconciliation recovery.', true, 100, '{"roles":["ADMIN"]}')
on conflict (key) do update
set description = excluded.description,
    is_enabled = excluded.is_enabled,
    rollout_percentage = excluded.rollout_percentage,
    audience = excluded.audience,
    updated_at = now();
