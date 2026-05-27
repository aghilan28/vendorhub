-- Phase 27: advanced seller intelligence, merchant operating system, and demand forecasting.

create table if not exists public.seller_intelligence_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  generated_for_date date not null default current_date,
  health_score integer not null default 0 check (health_score between 0 and 100),
  demand_score integer not null default 0 check (demand_score between 0 and 100),
  inventory_score integer not null default 0 check (inventory_score between 0 and 100),
  fulfillment_score integer not null default 0 check (fulfillment_score between 0 and 100),
  discoverability_score integer not null default 0 check (discoverability_score between 0 and 100),
  fairness_score integer not null default 0 check (fairness_score between 0 and 100),
  snapshot jsonb not null default '{}'::jsonb,
  stale_at timestamptz not null default (now() + interval '2 hours'),
  unique (vendor_id, generated_for_date)
);

create table if not exists public.seller_intelligence_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  domain text not null check (domain in ('inventory','demand','fulfillment','discoverability','pricing','trust','hyperlocal','fairness')),
  severity text not null check (severity in ('info','opportunity','warning','critical')),
  title text not null,
  explanation text not null,
  action text not null,
  evidence jsonb not null default '[]'::jsonb,
  state text not null default 'OPEN' check (state in ('OPEN','ACKNOWLEDGED','RESOLVED','DISMISSED')),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.seller_forecast_observability_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  vendor_id uuid references public.vendors(id) on delete cascade,
  metric text not null,
  latency_ms integer not null default 0,
  forecast_count integer not null default 0,
  alert_count integer not null default 0,
  stale boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
);

drop trigger if exists set_seller_intelligence_snapshots_updated_at on public.seller_intelligence_snapshots;
create trigger set_seller_intelligence_snapshots_updated_at
before update on public.seller_intelligence_snapshots
for each row execute function public.set_updated_at();

drop trigger if exists set_seller_intelligence_alerts_updated_at on public.seller_intelligence_alerts;
create trigger set_seller_intelligence_alerts_updated_at
before update on public.seller_intelligence_alerts
for each row execute function public.set_updated_at();

create index if not exists seller_intelligence_snapshots_vendor_created_idx
  on public.seller_intelligence_snapshots(vendor_id, created_at desc);

create index if not exists seller_intelligence_snapshots_stale_idx
  on public.seller_intelligence_snapshots(stale_at);

create index if not exists seller_intelligence_alerts_vendor_state_idx
  on public.seller_intelligence_alerts(vendor_id, state, severity, created_at desc);

create unique index if not exists seller_intelligence_alerts_active_fingerprint_idx
  on public.seller_intelligence_alerts(vendor_id, domain, title, state);

create index if not exists seller_intelligence_alerts_product_idx
  on public.seller_intelligence_alerts(product_id, created_at desc)
  where product_id is not null;

create index if not exists seller_forecast_observability_vendor_created_idx
  on public.seller_forecast_observability_events(vendor_id, created_at desc);

alter table public.seller_intelligence_snapshots enable row level security;
alter table public.seller_intelligence_alerts enable row level security;
alter table public.seller_forecast_observability_events enable row level security;

drop policy if exists "seller_intelligence_snapshots_vendor_admin_select" on public.seller_intelligence_snapshots;
create policy "seller_intelligence_snapshots_vendor_admin_select" on public.seller_intelligence_snapshots
  for select using (
    public.current_user_is_vendor_member(vendor_id)
    or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
  );

drop policy if exists "seller_intelligence_snapshots_vendor_admin_write" on public.seller_intelligence_snapshots;
create policy "seller_intelligence_snapshots_vendor_admin_write" on public.seller_intelligence_snapshots
  for all using (
    public.current_user_is_vendor_member(vendor_id)
    or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
  ) with check (
    public.current_user_is_vendor_member(vendor_id)
    or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
  );

drop policy if exists "seller_intelligence_alerts_vendor_admin_all" on public.seller_intelligence_alerts;
create policy "seller_intelligence_alerts_vendor_admin_all" on public.seller_intelligence_alerts
  for all using (
    public.current_user_is_vendor_member(vendor_id)
    or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
  ) with check (
    public.current_user_is_vendor_member(vendor_id)
    or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
  );

drop policy if exists "seller_forecast_observability_vendor_admin_select" on public.seller_forecast_observability_events;
create policy "seller_forecast_observability_vendor_admin_select" on public.seller_forecast_observability_events
  for select using (
    public.current_user_is_vendor_member(vendor_id)
    or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
  );

drop policy if exists "seller_forecast_observability_vendor_admin_insert" on public.seller_forecast_observability_events;
create policy "seller_forecast_observability_vendor_admin_insert" on public.seller_forecast_observability_events
  for insert with check (
    vendor_id is null
    or public.current_user_is_vendor_member(vendor_id)
    or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
  );

create or replace function public.record_seller_forecast_observability(
  target_vendor_id uuid,
  event_metric text,
  latency_ms integer default 0,
  forecast_count integer default 0,
  alert_count integer default 0,
  stale boolean default false,
  event_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  event_id uuid;
begin
  if target_vendor_id is not null
     and not (
       public.current_user_is_vendor_member(target_vendor_id)
       or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
     ) then
    raise exception 'Forbidden seller intelligence event.' using errcode = '42501';
  end if;

  insert into public.seller_forecast_observability_events (
    vendor_id,
    metric,
    latency_ms,
    forecast_count,
    alert_count,
    stale,
    metadata
  )
  values (
    target_vendor_id,
    left(coalesce(event_metric, 'seller_intelligence.generated'), 120),
    greatest(coalesce(latency_ms, 0), 0),
    greatest(coalesce(forecast_count, 0), 0),
    greatest(coalesce(alert_count, 0), 0),
    coalesce(stale, false),
    coalesce(event_metadata, '{}'::jsonb)
  )
  returning id into event_id;

  return event_id;
end;
$$;

grant execute on function public.record_seller_forecast_observability(uuid, text, integer, integer, integer, boolean, jsonb) to authenticated;

create or replace view public.seller_intelligence_health_admin as
select
  v.id as vendor_id,
  v.name as vendor_name,
  s.generated_for_date,
  s.created_at,
  s.stale_at,
  s.health_score,
  s.demand_score,
  s.inventory_score,
  s.fulfillment_score,
  s.discoverability_score,
  s.fairness_score,
  count(a.id) filter (where a.state = 'OPEN') as open_alerts,
  count(a.id) filter (where a.state = 'OPEN' and a.severity = 'critical') as critical_alerts
from public.vendors v
left join public.seller_intelligence_snapshots s on s.vendor_id = v.id
left join public.seller_intelligence_alerts a on a.vendor_id = v.id
where v.deleted_at is null
group by v.id, v.name, s.generated_for_date, s.created_at, s.stale_at, s.health_score, s.demand_score, s.inventory_score, s.fulfillment_score, s.discoverability_score, s.fairness_score;

grant select on public.seller_intelligence_health_admin to authenticated;

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('phase_27_merchant_intelligence', 'Enables seller operating intelligence, demand forecasts, inventory guidance, discoverability insights, and fulfillment optimization.', true, 100, '{"roles":["SELLER","ADMIN"]}'),
  ('phase_27_seller_forecasting', 'Enables explainable seller demand forecasting and stockout-risk guidance without automatic pricing or inventory mutation.', true, 100, '{"roles":["SELLER"]}'),
  ('phase_27_marketplace_fairness_guardrails', 'Balances seller intelligence for cold-start merchants using listing quality, stock readiness, and fulfillment reliability.', true, 100, '{"roles":["SELLER","ADMIN"]}')
on conflict (key) do update
set description = excluded.description,
    is_enabled = excluded.is_enabled,
    rollout_percentage = excluded.rollout_percentage,
    audience = excluded.audience,
    updated_at = now();
