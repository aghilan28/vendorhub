create table if not exists public.logistics_zones (
  id text primary key,
  city text not null,
  label text not null,
  active_capacity integer not null default 25,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_dispatch_plans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  zone_id text not null references public.logistics_zones(id) on delete restrict,
  provider public.delivery_mode not null,
  failover_provider public.delivery_mode,
  score integer not null default 0 check (score between 0 and 100),
  priority text not null default 'normal' check (priority in ('critical', 'high', 'normal', 'deferred')),
  state text not null default 'PLANNED' check (state in ('PLANNED', 'ASSIGNED', 'DEFERRED', 'FAILED', 'SUPERSEDED')),
  eta_minutes integer not null default 30,
  density_pressure numeric(6, 3) not null default 0,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.logistics_provider_failover_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  provider public.delivery_mode not null,
  failover_provider public.delivery_mode not null,
  reason text not null,
  cooldown_until timestamptz,
  affected_deliveries integer not null default 0,
  deterministic boolean not null default true,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.delivery_routing_clusters (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  zone_id text not null references public.logistics_zones(id) on delete restrict,
  cluster_key text not null,
  active_deliveries integer not null default 0,
  pending_dispatches integer not null default 0,
  overlap_score numeric(6, 3) not null default 0,
  recommended_action text not null default 'normal_dispatch',
  metadata jsonb not null default '{}'::jsonb,
  unique(zone_id, cluster_key)
);

create table if not exists public.delivery_network_pressure_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  zone_id text references public.logistics_zones(id) on delete set null,
  metric text not null,
  value numeric not null default 0,
  severity text not null default 'HEALTHY' check (severity in ('HEALTHY', 'WATCH', 'CRITICAL')),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists delivery_dispatch_plans_delivery_idx on public.delivery_dispatch_plans(delivery_id, state, created_at desc);
create index if not exists delivery_dispatch_plans_zone_idx on public.delivery_dispatch_plans(zone_id, priority, score desc, created_at desc);
create index if not exists logistics_provider_failover_events_provider_idx on public.logistics_provider_failover_events(provider, created_at desc);
create index if not exists delivery_network_pressure_zone_idx on public.delivery_network_pressure_events(zone_id, severity, created_at desc);

alter table public.logistics_zones enable row level security;
alter table public.delivery_dispatch_plans enable row level security;
alter table public.logistics_provider_failover_events enable row level security;
alter table public.delivery_routing_clusters enable row level security;
alter table public.delivery_network_pressure_events enable row level security;

create policy "logistics_zones_admin_select" on public.logistics_zones for select using (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[]));
create policy "delivery_dispatch_plans_admin_select" on public.delivery_dispatch_plans for select using (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[]));
create policy "logistics_provider_failover_events_admin_select" on public.logistics_provider_failover_events for select using (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[]));
create policy "delivery_routing_clusters_admin_select" on public.delivery_routing_clusters for select using (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[]));
create policy "delivery_network_pressure_events_admin_select" on public.delivery_network_pressure_events for select using (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[]));

insert into public.logistics_zones(id, city, label, active_capacity, metadata)
values
  ('chennai-central', 'Chennai', 'Chennai Central', 45, '{"default":true}'),
  ('chennai-north', 'Chennai', 'Chennai North', 30, '{}'),
  ('chennai-south', 'Chennai', 'Chennai South', 35, '{}'),
  ('bangalore-central', 'Bangalore', 'Bangalore Central', 45, '{}')
on conflict (id) do update
set city = excluded.city,
    label = excluded.label,
    active_capacity = excluded.active_capacity,
    metadata = public.logistics_zones.metadata || excluded.metadata,
    updated_at = now();

create or replace function public.delivery_zone_for_delivery(target_delivery public.deliveries)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_city text := lower(coalesce(target_delivery.metadata ->> 'city', target_delivery.metadata #>> '{deliveryAddress,city}', 'chennai'));
begin
  if v_city like '%bangalore%' or v_city like '%bengaluru%' then
    return 'bangalore-central';
  end if;
  if target_delivery.metadata ? 'zoneId' then
    return target_delivery.metadata ->> 'zoneId';
  end if;
  return 'chennai-central';
end;
$$;

create or replace view public.logistics_zone_pressure as
select
  z.id as zone_id,
  z.city,
  z.label,
  z.active_capacity,
  count(d.id) filter (where d.status not in ('DELIVERED', 'RETURNED', 'CANCELLED')) as active_deliveries,
  count(d.id) filter (where d.status in ('DELIVERY_PENDING', 'READY_FOR_DISPATCH')) as pending_dispatches,
  count(distinct d.vendor_id) filter (where d.status not in ('DELIVERED', 'RETURNED', 'CANCELLED')) as seller_count,
  coalesce(round(avg(d.eta_minutes) filter (where d.status not in ('DELIVERED', 'RETURNED', 'CANCELLED'))), 0) as average_eta_minutes,
  (select count(*) from public.logistics_provider_health where state in ('OUTAGE', 'DEGRADED')) as provider_failure_count,
  count(b.id) filter (where b.state = 'OPEN') as sla_breach_count,
  greatest(
    count(d.id) filter (where d.status not in ('DELIVERED', 'RETURNED', 'CANCELLED'))::numeric / greatest(1, z.active_capacity),
    count(d.id) filter (where d.status in ('DELIVERY_PENDING', 'READY_FOR_DISPATCH'))::numeric / greatest(1, z.active_capacity),
    coalesce(avg(d.eta_minutes) filter (where d.status not in ('DELIVERED', 'RETURNED', 'CANCELLED')), 0)::numeric / 75
  ) as density_pressure,
  now() as generated_at
from public.logistics_zones z
left join public.deliveries d on public.delivery_zone_for_delivery(d) = z.id
left join public.delivery_sla_breaches b on b.delivery_id = d.id and b.state = 'OPEN'
group by z.id, z.city, z.label, z.active_capacity;

create or replace function public.run_live_dispatch_intelligence(batch_size integer default 100, target_zone_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_planned integer := 0;
  v_assigned integer := 0;
begin
  update public.delivery_dispatch_plans
  set state = 'SUPERSEDED',
      updated_at = now()
  where state in ('PLANNED', 'DEFERRED')
    and created_at < now() - interval '10 minutes';

  insert into public.delivery_dispatch_plans(delivery_id, zone_id, provider, failover_provider, score, priority, state, eta_minutes, density_pressure, reason, metadata)
  select
    d.id,
    zp.zone_id,
    coalesce((
      select h.provider
      from public.logistics_provider_health h
      where h.state in ('HEALTHY', 'DEGRADED')
        and (h.cooldown_until is null or h.cooldown_until <= now())
      order by case when h.provider = d.mode then 0 else 1 end, h.priority desc, h.average_latency_ms asc
      limit 1
    ), 'SELLER_SELF')::public.delivery_mode,
    (
      select h.provider
      from public.logistics_provider_health h
      where h.state in ('HEALTHY', 'DEGRADED')
        and h.provider is distinct from d.mode
        and (h.cooldown_until is null or h.cooldown_until <= now())
      order by h.priority desc, h.average_latency_ms asc
      limit 1
    )::public.delivery_mode,
    least(100, greatest(0,
      55
      + least(30, round(extract(epoch from (now() - d.created_at)) / 240)::integer)
      + case when d.updated_at < now() - interval '20 minutes' then 12 else 0 end
      - least(30, round(zp.density_pressure * 24)::integer)
      - case when zp.provider_failure_count > 0 then 8 else 0 end
    )),
    case
      when d.updated_at < now() - interval '30 minutes' then 'critical'
      when zp.density_pressure > 0.75 then 'high'
      else 'normal'
    end,
    case when zp.density_pressure >= 0.95 then 'DEFERRED' else 'PLANNED' end,
    greatest(10, coalesce(d.eta_minutes, 30) + round(zp.density_pressure * 15)::integer + zp.provider_failure_count * 4),
    zp.density_pressure,
    case when zp.density_pressure >= 0.95 then 'Dispatch paced by critical zone pressure.' else 'Dispatch planned by live logistics intelligence.' end,
    jsonb_build_object('activeDeliveries', zp.active_deliveries, 'pendingDispatches', zp.pending_dispatches, 'sellerCount', zp.seller_count)
  from public.deliveries d
  join public.logistics_zone_pressure zp on zp.zone_id = public.delivery_zone_for_delivery(d)
  where d.status in ('DELIVERY_PENDING', 'READY_FOR_DISPATCH')
    and (target_zone_id is null or zp.zone_id = target_zone_id)
    and not exists (
      select 1 from public.delivery_dispatch_plans p
      where p.delivery_id = d.id and p.state in ('PLANNED', 'ASSIGNED', 'DEFERRED')
    )
  order by d.updated_at asc, d.created_at asc
  limit greatest(1, coalesce(batch_size, 100));
  get diagnostics v_planned = row_count;

  update public.deliveries d
  set mode = p.provider,
      eta_minutes = p.eta_minutes,
      eta_confidence = case when p.density_pressure > 0.75 then 'LOW' else 'MEDIUM' end,
      metadata = d.metadata || jsonb_build_object('dispatchPlanId', p.id, 'zoneId', p.zone_id, 'dispatchScore', p.score, 'dispatchPriority', p.priority),
      updated_at = now()
  from public.delivery_dispatch_plans p
  where p.delivery_id = d.id
    and p.state = 'PLANNED'
    and p.score >= 45
    and d.status = 'DELIVERY_PENDING';
  get diagnostics v_assigned = row_count;

  insert into public.delivery_network_pressure_events(zone_id, metric, value, severity, metadata)
  select zone_id, 'dispatch_pressure', density_pressure,
         case when density_pressure > 0.9 then 'CRITICAL' when density_pressure > 0.7 then 'WATCH' else 'HEALTHY' end,
         jsonb_build_object('planned', v_planned, 'assigned', v_assigned)
  from public.logistics_zone_pressure
  where target_zone_id is null or zone_id = target_zone_id;

  return jsonb_build_object('planned', v_planned, 'assigned', v_assigned, 'zoneId', target_zone_id);
end;
$$;

create or replace function public.run_logistics_provider_failover(target_provider text default null, failover_reason text default 'provider_health_recheck')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider public.delivery_mode;
  v_failover public.delivery_mode := 'SELLER_SELF';
  v_affected integer := 0;
  v_cooldown_until timestamptz;
begin
  select provider into v_provider
  from public.logistics_provider_health
  where (target_provider is null or provider::text = upper(target_provider))
    and state in ('OUTAGE', 'DEGRADED', 'COOLDOWN')
  order by case state when 'OUTAGE' then 0 when 'DEGRADED' then 1 else 2 end, failure_count desc
  limit 1;

  if v_provider is null then
    return jsonb_build_object('failovers', 0, 'reason', 'no_unhealthy_provider');
  end if;

  select provider into v_failover
  from public.logistics_provider_health
  where provider <> v_provider
    and state in ('HEALTHY', 'DEGRADED')
    and (cooldown_until is null or cooldown_until <= now())
  order by priority desc, average_latency_ms asc
  limit 1;
  v_failover := coalesce(v_failover, 'SELLER_SELF');
  v_cooldown_until := now() + interval '20 minutes';

  update public.logistics_provider_health
  set state = case when state = 'OUTAGE' then 'OUTAGE' else 'COOLDOWN' end,
      cooldown_until = v_cooldown_until,
      metadata = metadata || jsonb_build_object('failoverReason', failover_reason, 'failoverAt', now(), 'failoverProvider', v_failover),
      updated_at = now()
  where provider = v_provider;

  update public.deliveries
  set mode = v_failover,
      eta_minutes = greatest(15, coalesce(eta_minutes, 30) + 8),
      eta_confidence = 'LOW',
      metadata = metadata || jsonb_build_object('providerFailoverFrom', v_provider, 'providerFailoverTo', v_failover, 'providerFailoverAt', now()),
      updated_at = now()
  where mode = v_provider
    and status not in ('DELIVERED', 'RETURNED', 'CANCELLED');
  get diagnostics v_affected = row_count;

  insert into public.logistics_provider_failover_events(provider, failover_provider, reason, cooldown_until, affected_deliveries, metadata)
  values (v_provider, v_failover, failover_reason, v_cooldown_until, v_affected, jsonb_build_object('targetProvider', target_provider));

  insert into public.delivery_network_pressure_events(metric, value, severity, metadata)
  values ('provider_failover', v_affected, case when v_affected > 25 then 'CRITICAL' else 'WATCH' end, jsonb_build_object('provider', v_provider, 'failoverProvider', v_failover));

  return jsonb_build_object('provider', v_provider, 'failoverProvider', v_failover, 'affectedDeliveries', v_affected, 'cooldownUntil', v_cooldown_until);
end;
$$;

create or replace function public.refresh_logistics_routing_intelligence(target_zone_id text default null, batch_size integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clusters integer := 0;
begin
  insert into public.delivery_routing_clusters(zone_id, cluster_key, active_deliveries, pending_dispatches, overlap_score, recommended_action, metadata)
  select
    zp.zone_id,
    zp.zone_id || ':default',
    zp.active_deliveries,
    zp.pending_dispatches,
    least(1, zp.density_pressure),
    case when zp.density_pressure > 0.85 then 'rebalance_capacity' when zp.density_pressure > 0.65 then 'pace_dispatch' else 'normal_dispatch' end,
    jsonb_build_object('city', zp.city, 'averageEtaMinutes', zp.average_eta_minutes)
  from public.logistics_zone_pressure zp
  where target_zone_id is null or zp.zone_id = target_zone_id
  on conflict (zone_id, cluster_key) do update
  set active_deliveries = excluded.active_deliveries,
      pending_dispatches = excluded.pending_dispatches,
      overlap_score = excluded.overlap_score,
      recommended_action = excluded.recommended_action,
      metadata = public.delivery_routing_clusters.metadata || excluded.metadata;
  get diagnostics v_clusters = row_count;

  return jsonb_build_object('clustersRefreshed', v_clusters, 'batchSize', batch_size, 'zoneId', target_zone_id);
end;
$$;

create or replace function public.run_dynamic_delivery_sla_enforcement(batch_size integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sla jsonb;
  v_escalated integer := 0;
begin
  v_sla := public.run_delivery_sla_detection();

  update public.delivery_sla_breaches
  set escalated_at = coalesce(escalated_at, now()),
      metadata = metadata || jsonb_build_object('dynamicEscalationAt', now())
  where state = 'OPEN'
    and severity = 'CRITICAL'
    and escalated_at is null;
  get diagnostics v_escalated = row_count;

  insert into public.delivery_recovery_jobs(delivery_id, reason, action, run_after, priority, metadata)
  select b.delivery_id,
         case when b.breach_type = 'DISPATCH_DELAY' then 'seller_abandonment' else 'stale_tracking' end,
         case when b.breach_type = 'DISPATCH_DELAY' then 'retry_dispatch' else 'eta_refresh' end,
         now(),
         95,
         jsonb_build_object('breachId', b.id, 'source', 'dynamic_sla_enforcement')
  from public.delivery_sla_breaches b
  where b.state = 'OPEN'
    and b.severity = 'CRITICAL'
    and not exists (
      select 1 from public.delivery_recovery_jobs r
      where r.delivery_id = b.delivery_id and r.state in ('PENDING', 'RUNNING')
    )
  limit greatest(1, coalesce(batch_size, 100));

  return jsonb_build_object('sla', v_sla, 'escalated', v_escalated);
end;
$$;

create or replace function public.analyze_delivery_congestion(target_zone_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_events integer := 0;
begin
  insert into public.delivery_network_pressure_events(zone_id, metric, value, severity, metadata)
  select zone_id,
         'zone_congestion',
         density_pressure,
         case when density_pressure > 0.9 then 'CRITICAL' when density_pressure > 0.7 then 'WATCH' else 'HEALTHY' end,
         jsonb_build_object('activeDeliveries', active_deliveries, 'pendingDispatches', pending_dispatches, 'averageEtaMinutes', average_eta_minutes)
  from public.logistics_zone_pressure
  where target_zone_id is null or zone_id = target_zone_id;
  get diagnostics v_events = row_count;

  perform public.refresh_logistics_routing_intelligence(target_zone_id, 100);
  return jsonb_build_object('pressureEvents', v_events, 'zoneId', target_zone_id);
end;
$$;

create or replace view public.live_logistics_network_health as
select
  (select count(*) from public.deliveries where status in ('DELIVERY_PENDING', 'READY_FOR_DISPATCH')) as dispatch_backlog,
  (select count(*) from public.delivery_dispatch_plans where state = 'DEFERRED' and created_at > now() - interval '30 minutes') as deferred_dispatches,
  (select count(*) from public.logistics_provider_health where state in ('OUTAGE', 'DEGRADED')) as unhealthy_providers,
  (select count(*) from public.logistics_provider_failover_events where created_at > now() - interval '60 minutes') as provider_failovers_last_hour,
  (select coalesce(max(density_pressure), 0) from public.logistics_zone_pressure) as max_zone_pressure,
  (select count(*) from public.delivery_network_pressure_events where severity = 'CRITICAL' and created_at > now() - interval '30 minutes') as critical_pressure_events,
  (select count(*) from public.delivery_sla_breaches where state = 'OPEN' and severity = 'CRITICAL') as critical_sla_breaches,
  (select count(*) from public.delivery_routing_clusters where recommended_action in ('rebalance_capacity', 'ops_intervention')) as routing_imbalances,
  now() as generated_at;

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('phase32_live_logistics_operations', 'Enables dispatch intelligence, density-aware routing, provider failover, and dynamic logistics operations.', true, 100, '{"roles":["ADMIN","SUPER_ADMIN"]}'),
  ('phase32_provider_failover', 'Enables deterministic provider failover with cooldown windows and affected-delivery recovery.', true, 100, '{"roles":["ADMIN","SUPER_ADMIN"]}'),
  ('phase32_delivery_density_intelligence', 'Enables zone pressure analytics, routing clusters, and congestion-aware dispatch pacing.', true, 100, '{"roles":["ADMIN","SUPER_ADMIN"]}')
on conflict (key) do update
set description = excluded.description,
    is_enabled = excluded.is_enabled,
    rollout_percentage = excluded.rollout_percentage,
    audience = excluded.audience,
    updated_at = now();
