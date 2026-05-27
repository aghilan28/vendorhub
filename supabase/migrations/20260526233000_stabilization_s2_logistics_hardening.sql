create table if not exists public.logistics_provider_health (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  provider public.delivery_mode not null unique,
  state text not null default 'HEALTHY',
  priority integer not null default 50,
  average_latency_ms integer not null default 0,
  failure_count integer not null default 0,
  last_failure_at timestamptz,
  cooldown_until timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.delivery_sla_policies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  mode public.delivery_mode not null unique,
  dispatch_sla_minutes integer not null default 15,
  pickup_sla_minutes integer not null default 30,
  delivery_sla_minutes integer not null default 75,
  provider_response_sla_seconds integer not null default 45,
  seller_prep_sla_minutes integer not null default 20,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.delivery_sla_breaches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  breach_type text not null,
  severity text not null default 'WARNING',
  threshold_minutes integer not null,
  observed_minutes integer not null,
  state text not null default 'OPEN',
  escalated_at timestamptz,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (delivery_id, breach_type, state)
);

create table if not exists public.delivery_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  state text not null default 'RUNNING',
  inspected_count integer not null default 0,
  repaired_count integer not null default 0,
  breach_count integer not null default 0,
  recovery_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.delivery_tracking_events add column if not exists provider text;
alter table public.delivery_tracking_events add column if not exists provider_event_id text;
alter table public.delivery_tracking_events add column if not exists event_hash text;
alter table public.delivery_recovery_jobs add column if not exists priority integer not null default 50;

create unique index if not exists delivery_tracking_events_provider_event_uidx
  on public.delivery_tracking_events(delivery_id, provider, provider_event_id)
  where provider is not null and provider_event_id is not null;

create unique index if not exists delivery_tracking_events_event_hash_uidx
  on public.delivery_tracking_events(delivery_id, event_hash)
  where event_hash is not null;

create index if not exists deliveries_s2_status_updated_idx on public.deliveries(status, updated_at, promised_at);
create index if not exists delivery_sla_breaches_state_idx on public.delivery_sla_breaches(state, severity, created_at desc);
create index if not exists logistics_provider_health_state_idx on public.logistics_provider_health(state, cooldown_until);
create index if not exists delivery_recovery_jobs_priority_idx on public.delivery_recovery_jobs(state, priority desc, run_after);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['logistics_provider_health', 'delivery_sla_policies']
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

alter table public.logistics_provider_health enable row level security;
alter table public.delivery_sla_policies enable row level security;
alter table public.delivery_sla_breaches enable row level security;
alter table public.delivery_reconciliation_runs enable row level security;

create policy "logistics_provider_health_admin_select" on public.logistics_provider_health for select using (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[]));
create policy "delivery_sla_policies_admin_select" on public.delivery_sla_policies for select using (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[]));
create policy "delivery_sla_breaches_vendor_admin_select" on public.delivery_sla_breaches for select using (
  public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[]) or public.current_user_is_vendor_member(vendor_id)
);
create policy "delivery_reconciliation_runs_admin_select" on public.delivery_reconciliation_runs for select using (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[]));

insert into public.logistics_provider_health(provider, state, priority, metadata)
values
  ('SELLER_SELF', 'HEALTHY', 90, '{"kind":"manual_hyperlocal"}'),
  ('SHIPROCKET', 'HEALTHY', 70, '{"kind":"external_carrier"}'),
  ('PORTER', 'COOLDOWN', 50, '{"kind":"future_provider"}'),
  ('DUNZO', 'COOLDOWN', 45, '{"kind":"future_provider"}')
on conflict (provider) do update
set priority = excluded.priority,
    metadata = public.logistics_provider_health.metadata || excluded.metadata,
    updated_at = now();

insert into public.delivery_sla_policies(mode, dispatch_sla_minutes, pickup_sla_minutes, delivery_sla_minutes, provider_response_sla_seconds, seller_prep_sla_minutes)
values
  ('SELLER_SELF', 15, 25, 60, 20, 18),
  ('SHIPROCKET', 25, 45, 120, 45, 22),
  ('PORTER', 18, 30, 75, 35, 20),
  ('DUNZO', 16, 28, 70, 35, 20)
on conflict (mode) do update
set dispatch_sla_minutes = excluded.dispatch_sla_minutes,
    pickup_sla_minutes = excluded.pickup_sla_minutes,
    delivery_sla_minutes = excluded.delivery_sla_minutes,
    provider_response_sla_seconds = excluded.provider_response_sla_seconds,
    seller_prep_sla_minutes = excluded.seller_prep_sla_minutes,
    updated_at = now();

create or replace function public.record_delivery_tracking_event_durable(
  target_delivery_id uuid,
  target_status public.delivery_status,
  target_event_type text,
  target_title text,
  target_body text,
  target_actor_type text default 'SYSTEM',
  target_provider text default null,
  target_provider_event_id text default null,
  target_eta_minutes integer default null,
  target_location_label text default null,
  target_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery public.deliveries%rowtype;
  v_event public.delivery_tracking_events%rowtype;
  v_hash text;
begin
  select * into v_delivery from public.deliveries where id = target_delivery_id for update;
  if not found then
    raise exception 'Delivery not found';
  end if;

  v_hash := encode(digest(
    target_delivery_id::text || ':' ||
    coalesce(target_provider, 'vendorhub') || ':' ||
    coalesce(target_provider_event_id, target_event_type || ':' || target_status::text || ':' || coalesce(target_body, '')),
    'sha256'
  ), 'hex');

  insert into public.delivery_tracking_events(
    delivery_id,
    status,
    event_type,
    title,
    body,
    actor_type,
    location_label,
    eta_minutes,
    provider,
    provider_event_id,
    event_hash,
    metadata
  )
  values (
    target_delivery_id,
    target_status,
    target_event_type,
    target_title,
    target_body,
    target_actor_type,
    target_location_label,
    target_eta_minutes,
    target_provider,
    target_provider_event_id,
    v_hash,
    coalesce(target_metadata, '{}'::jsonb)
  )
  on conflict (delivery_id, event_hash) where event_hash is not null do update
  set metadata = public.delivery_tracking_events.metadata || excluded.metadata
  returning * into v_event;

  if public.is_valid_delivery_transition(v_delivery.status, target_status) then
    update public.deliveries
    set status = target_status,
        eta_minutes = coalesce(target_eta_minutes, eta_minutes),
        delivered_at = case when target_status = 'DELIVERED' then now() else delivered_at end,
        failed_at = case when target_status = 'FAILED' then now() else failed_at end,
        metadata = metadata || jsonb_build_object('last_tracking_event_id', v_event.id, 'last_tracking_event_at', now()),
        updated_at = now()
    where id = v_delivery.id;
  elsif v_delivery.status is distinct from target_status then
    insert into public.delivery_operational_events(delivery_id, vendor_id, order_id, metric, value, alert_level, metadata)
    values (v_delivery.id, v_delivery.vendor_id, v_delivery.order_id, 'tracking_transition_rejected', 1, 'CRITICAL', jsonb_build_object('from', v_delivery.status, 'to', target_status, 'eventId', v_event.id));
  end if;

  return jsonb_build_object('eventId', v_event.id, 'dedupeHash', v_hash, 'status', target_status);
end;
$$;

create or replace function public.record_logistics_provider_attempt(
  target_provider public.delivery_mode,
  attempt_ok boolean,
  latency_ms integer default 0,
  error_code text default null,
  cooldown_minutes integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_health public.logistics_provider_health%rowtype;
  v_failure_count integer;
  v_average_latency integer;
  v_state text;
  v_cooldown_until timestamptz;
begin
  insert into public.logistics_provider_health(provider)
  values (target_provider)
  on conflict (provider) do nothing;

  select * into v_health
  from public.logistics_provider_health
  where provider = target_provider
  for update;

  v_failure_count := case when attempt_ok then greatest(0, v_health.failure_count - 1) else v_health.failure_count + 1 end;
  v_average_latency := round((coalesce(v_health.average_latency_ms, 0) * 0.7) + (greatest(0, coalesce(latency_ms, 0)) * 0.3))::integer;
  v_state := case
    when v_failure_count >= 6 then 'OUTAGE'
    when v_failure_count >= 3 or v_average_latency > 2500 then 'DEGRADED'
    when v_health.state = 'COOLDOWN' and v_health.cooldown_until > now() then 'COOLDOWN'
    else 'HEALTHY'
  end;
  v_cooldown_until := case when v_state = 'OUTAGE' then now() + make_interval(mins => greatest(1, coalesce(cooldown_minutes, 20))) else null end;

  update public.logistics_provider_health
  set state = v_state,
      average_latency_ms = v_average_latency,
      failure_count = v_failure_count,
      last_failure_at = case when attempt_ok then last_failure_at else now() end,
      cooldown_until = v_cooldown_until,
      metadata = metadata || jsonb_build_object('lastAttemptOk', attempt_ok, 'lastErrorCode', error_code, 'lastAttemptAt', now()),
      updated_at = now()
  where provider = target_provider
  returning * into v_health;

  insert into public.delivery_operational_events(metric, value, alert_level, metadata)
  values (
    'provider_attempt_recorded',
    case when attempt_ok then 0 else 1 end,
    case when v_health.state in ('OUTAGE', 'DEGRADED') then 'CRITICAL' else 'HEALTHY' end,
    jsonb_build_object('provider', target_provider, 'state', v_health.state, 'failureCount', v_health.failure_count, 'latencyMs', latency_ms)
  );

  return jsonb_build_object('provider', target_provider, 'state', v_health.state, 'failureCount', v_health.failure_count, 'cooldownUntil', v_health.cooldown_until);
end;
$$;

create or replace function public.recover_logistics_provider_cooldowns()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recovered integer := 0;
begin
  update public.logistics_provider_health
  set state = 'DEGRADED',
      failure_count = greatest(0, failure_count - 2),
      cooldown_until = null,
      metadata = metadata || jsonb_build_object('cooldownRecoveredAt', now()),
      updated_at = now()
  where state in ('OUTAGE', 'COOLDOWN')
    and cooldown_until is not null
    and cooldown_until <= now();
  get diagnostics v_recovered = row_count;

  return jsonb_build_object('recoveredProviders', v_recovered);
end;
$$;

create or replace function public.run_delivery_sla_detection()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_breach_count integer := 0;
begin
  update public.delivery_sla_breaches b
  set state = 'RESOLVED',
      resolved_at = now(),
      metadata = b.metadata || jsonb_build_object('resolvedBy', 'sla_detection')
  from public.deliveries d
  where b.delivery_id = d.id
    and b.state = 'OPEN'
    and d.status in ('DELIVERED', 'RETURNED', 'CANCELLED');

  insert into public.delivery_sla_breaches(delivery_id, vendor_id, order_id, breach_type, severity, threshold_minutes, observed_minutes, metadata)
  select
    d.id,
    d.vendor_id,
    d.order_id,
    case
      when d.status in ('DELIVERY_PENDING', 'READY_FOR_DISPATCH') then 'DISPATCH_DELAY'
      when d.status in ('DISPATCHED', 'IN_TRANSIT', 'ARRIVING') and d.promised_at < now() then 'DELIVERY_DELAY'
      when d.status not in ('DELIVERED', 'RETURNED', 'CANCELLED') and d.eta_minutes is not null and d.updated_at < now() - make_interval(mins => d.eta_minutes + 15) then 'ETA_DRIFT'
      else 'STALE_TRACKING'
    end,
    case when extract(epoch from (now() - d.updated_at)) / 60 > coalesce(p.delivery_sla_minutes, 75) then 'CRITICAL' else 'WARNING' end,
    case
      when d.status in ('DELIVERY_PENDING', 'READY_FOR_DISPATCH') then coalesce(p.dispatch_sla_minutes, 15)
      else coalesce(p.delivery_sla_minutes, 75)
    end,
    greatest(0, round(extract(epoch from (now() - d.updated_at)) / 60)::integer),
    jsonb_build_object('status', d.status, 'mode', d.mode, 'promisedAt', d.promised_at)
  from public.deliveries d
  left join public.delivery_sla_policies p on p.mode = d.mode
  where d.status not in ('DELIVERED', 'RETURNED', 'CANCELLED')
    and (
      (d.status in ('DELIVERY_PENDING', 'READY_FOR_DISPATCH') and d.updated_at < now() - make_interval(mins => coalesce(p.dispatch_sla_minutes, 15)))
      or (d.status in ('DISPATCHED', 'IN_TRANSIT', 'ARRIVING') and d.promised_at is not null and d.promised_at < now())
      or (d.eta_minutes is not null and d.updated_at < now() - make_interval(mins => d.eta_minutes + 15))
      or (d.updated_at < now() - interval '45 minutes')
    )
  on conflict (delivery_id, breach_type, state) do update
  set observed_minutes = greatest(public.delivery_sla_breaches.observed_minutes, excluded.observed_minutes),
      severity = case when excluded.severity = 'CRITICAL' then 'CRITICAL' else public.delivery_sla_breaches.severity end,
      metadata = public.delivery_sla_breaches.metadata || excluded.metadata;
  get diagnostics v_breach_count = row_count;

  insert into public.delivery_operational_events(delivery_id, vendor_id, order_id, metric, value, alert_level, metadata)
  select delivery_id, vendor_id, order_id, 'sla_breach_detected', 1, severity, jsonb_build_object('breachType', breach_type, 'observedMinutes', observed_minutes)
  from public.delivery_sla_breaches
  where state = 'OPEN' and created_at > now() - interval '2 minutes';

  return jsonb_build_object('breaches', v_breach_count);
end;
$$;

create or replace function public.repair_stuck_delivery_transitions(batch_size integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recovery integer := 0;
  v_eta integer := 0;
begin
  insert into public.delivery_recovery_jobs(delivery_id, reason, action, run_after, priority, metadata)
  select d.id,
         case
           when d.status in ('DELIVERY_PENDING', 'READY_FOR_DISPATCH') then 'seller_abandonment'
           when d.status = 'FAILED' then coalesce(d.failure_reason, 'failed_delivery')
           else 'stale_tracking'
         end,
         case
           when d.status in ('DELIVERY_PENDING', 'READY_FOR_DISPATCH') then 'retry_dispatch'
           when d.status = 'FAILED' then 'manual_review'
           else 'eta_refresh'
         end,
         now(),
         case when d.updated_at < now() - interval '90 minutes' then 90 else 70 end,
         jsonb_build_object('source', 'repair_stuck_delivery_transitions', 'status', d.status, 'staleSince', d.updated_at)
  from public.deliveries d
  where d.status not in ('DELIVERED', 'RETURNED', 'CANCELLED')
    and d.updated_at < now() - interval '30 minutes'
    and not exists (
      select 1 from public.delivery_recovery_jobs r
      where r.delivery_id = d.id and r.state in ('PENDING', 'RUNNING')
    )
  order by d.updated_at asc
  limit greatest(1, coalesce(batch_size, 100));
  get diagnostics v_recovery = row_count;

  insert into public.delivery_operational_events(delivery_id, vendor_id, order_id, metric, value, alert_level, metadata)
  select d.id, d.vendor_id, d.order_id, 'stuck_delivery_recovery_scheduled', 1, 'CRITICAL',
         jsonb_build_object('status', d.status, 'updatedAt', d.updated_at)
  from public.deliveries d
  where d.status not in ('DELIVERED', 'RETURNED', 'CANCELLED')
    and d.updated_at < now() - interval '30 minutes'
  order by d.updated_at asc
  limit greatest(1, coalesce(batch_size, 100));

  update public.deliveries
  set metadata = metadata || jsonb_build_object('repairObservedAt', now(), 'repairReason', 'stuck_delivery'),
      eta_minutes = greatest(10, coalesce(eta_minutes, 30) + 10),
      eta_confidence = 'LOW'
  where id in (
    select id from public.deliveries
    where status not in ('DELIVERED', 'RETURNED', 'CANCELLED')
      and updated_at < now() - interval '30 minutes'
    order by updated_at asc
    limit greatest(1, coalesce(batch_size, 100))
  );
  get diagnostics v_eta = row_count;

  return jsonb_build_object('recoveryScheduled', v_recovery, 'etaRepaired', v_eta);
end;
$$;

create or replace function public.run_delivery_reconciliation(batch_size integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
  v_inspected integer := 0;
  v_repaired integer := 0;
  v_recovery integer := 0;
  v_sla jsonb;
begin
  insert into public.delivery_reconciliation_runs(metadata)
  values (jsonb_build_object('batchSize', batch_size))
  returning id into v_run_id;

  select count(*) into v_inspected
  from public.deliveries
  where status not in ('DELIVERED', 'RETURNED', 'CANCELLED')
  limit greatest(1, coalesce(batch_size, 100));

  insert into public.delivery_recovery_jobs(delivery_id, reason, action, run_after, metadata)
  select d.id,
         case when d.status = 'FAILED' then coalesce(d.failure_reason, 'failed_delivery') else 'stale_tracking' end,
         case when d.status = 'FAILED' then 'manual_review' else 'eta_refresh' end,
         now(),
         jsonb_build_object('reconciliationRunId', v_run_id, 'status', d.status)
  from public.deliveries d
  where d.status not in ('DELIVERED', 'RETURNED', 'CANCELLED')
    and (
      d.status = 'FAILED'
      or d.updated_at < now() - interval '45 minutes'
      or (d.promised_at is not null and d.promised_at < now())
    )
    and not exists (
      select 1 from public.delivery_recovery_jobs r
      where r.delivery_id = d.id and r.state in ('PENDING', 'RUNNING')
    )
  limit greatest(1, coalesce(batch_size, 100));
  get diagnostics v_recovery = row_count;

  update public.shipment_metadata sm
  set sync_status = 'FAILED',
      metadata = sm.metadata || jsonb_build_object('markedFailedByReconciliationAt', now()),
      updated_at = now()
  where sm.sync_status = 'PENDING'
    and sm.updated_at < now() - interval '30 minutes';
  get diagnostics v_repaired = row_count;

  perform public.recover_logistics_provider_cooldowns();
  perform public.repair_stuck_delivery_transitions(batch_size);

  v_sla := public.run_delivery_sla_detection();

  update public.delivery_reconciliation_runs
  set state = 'SUCCEEDED',
      completed_at = now(),
      inspected_count = coalesce(v_inspected, 0),
      repaired_count = coalesce(v_repaired, 0),
      recovery_count = coalesce(v_recovery, 0),
      breach_count = coalesce((v_sla ->> 'breaches')::integer, 0),
      metadata = metadata || jsonb_build_object('sla', v_sla)
  where id = v_run_id;

  return jsonb_build_object('runId', v_run_id, 'inspected', coalesce(v_inspected, 0), 'repaired', coalesce(v_repaired, 0), 'recovery', coalesce(v_recovery, 0), 'sla', v_sla);
exception when others then
  update public.delivery_reconciliation_runs
  set state = 'FAILED',
      completed_at = now(),
      metadata = metadata || jsonb_build_object('sqlstate', sqlstate, 'message', sqlerrm)
  where id = v_run_id;
  raise;
end;
$$;

create or replace view public.logistics_operational_health as
select
  (select count(*) from public.deliveries where status not in ('DELIVERED', 'RETURNED', 'CANCELLED')) as active_deliveries,
  (select count(*) from public.deliveries where status not in ('DELIVERED', 'RETURNED', 'CANCELLED') and updated_at < now() - interval '45 minutes') as stuck_deliveries,
  (select count(*) from public.delivery_sla_breaches where state = 'OPEN') as open_sla_breaches,
  (select count(*) from public.delivery_recovery_jobs where state in ('PENDING', 'RUNNING')) as recovery_backlog,
  (select count(*) from public.shipment_metadata where sync_status = 'FAILED') as provider_sync_failures,
  (select count(*) from public.delivery_tracking_events where created_at > now() - interval '15 minutes') as recent_tracking_events,
  (select count(*) from public.delivery_tracking_events where metadata ? 'replay' and created_at > now() - interval '60 minutes') as tracking_replay_events,
  (select count(*) from public.delivery_operational_events where metric = 'tracking_transition_rejected' and created_at > now() - interval '60 minutes') as tracking_inconsistencies,
  (select count(*) from public.delivery_operational_events where metric = 'provider_attempt_recorded' and value > 0 and created_at > now() - interval '15 minutes') as provider_retry_pressure,
  (select count(*) from public.delivery_sla_breaches where state = 'OPEN' and severity = 'CRITICAL') as critical_sla_breaches,
  (select count(*) from public.logistics_provider_health where state in ('OUTAGE', 'DEGRADED')) as unhealthy_providers,
  now() as generated_at;

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('stabilization_s2_logistics_hardening', 'Enables provider health, SLA breach detection, deduped tracking, and delivery reconciliation hardening.', true, 100, '{"roles":["SELLER","ADMIN"]}'),
  ('stabilization_s2_delivery_sla_intelligence', 'Enables delivery SLA policies, breach detection, and logistics recovery queues.', true, 100, '{"roles":["ADMIN"]}')
on conflict (key) do update
set description = excluded.description,
    is_enabled = excluded.is_enabled,
    rollout_percentage = excluded.rollout_percentage,
    audience = excluded.audience,
    updated_at = now();
