create table if not exists public.localization_quality_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  locale text not null,
  total_keys integer not null default 0,
  translated_keys integer not null default 0,
  missing_keys text[] not null default '{}',
  suspicious_keys text[] not null default '{}',
  completeness integer not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.india_commerce_recovery_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null,
  state text not null default 'OPEN',
  transaction_id uuid references public.checkout_transactions(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  buyer_id uuid references public.profiles(id) on delete set null,
  locale text,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  unique (idempotency_key)
);

create table if not exists public.cod_risk_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  buyer_id uuid references public.profiles(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  pincode text,
  score integer not null check (score between 0 and 100),
  eligible boolean not null default true,
  cooldown_required boolean not null default false,
  verification_required boolean not null default false,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists localization_quality_reports_locale_idx on public.localization_quality_reports(locale, created_at desc);
create index if not exists india_commerce_recovery_events_state_idx on public.india_commerce_recovery_events(state, event_type, created_at desc);
create index if not exists cod_risk_events_buyer_idx on public.cod_risk_events(buyer_id, created_at desc);
create index if not exists cod_risk_events_vendor_idx on public.cod_risk_events(vendor_id, created_at desc);

alter table public.localization_quality_reports enable row level security;
alter table public.india_commerce_recovery_events enable row level security;
alter table public.cod_risk_events enable row level security;

create policy "localization_quality_admin_select" on public.localization_quality_reports for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "india_recovery_admin_select" on public.india_commerce_recovery_events for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "cod_risk_admin_select" on public.cod_risk_events for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create or replace function public.record_india_commerce_recovery_event(
  target_event_type text,
  target_state text default 'OPEN',
  target_transaction_id uuid default null,
  target_order_id uuid default null,
  target_vendor_id uuid default null,
  target_buyer_id uuid default null,
  target_locale text default null,
  target_severity text default 'medium',
  target_idempotency_key text default null,
  target_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.india_commerce_recovery_events(event_type, state, transaction_id, order_id, vendor_id, buyer_id, locale, severity, idempotency_key, metadata)
  values (
    target_event_type,
    coalesce(target_state, 'OPEN'),
    target_transaction_id,
    target_order_id,
    target_vendor_id,
    target_buyer_id,
    target_locale,
    coalesce(target_severity, 'medium'),
    coalesce(target_idempotency_key, md5(target_event_type || ':' || coalesce(target_transaction_id::text, target_order_id::text, target_vendor_id::text, target_buyer_id::text, 'platform'))),
    coalesce(target_metadata, '{}'::jsonb)
  )
  on conflict (idempotency_key) do update
  set state = excluded.state,
      severity = excluded.severity,
      metadata = public.india_commerce_recovery_events.metadata || excluded.metadata
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.run_india_commerce_recovery(batch_size integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_upi_delayed integer := 0;
  v_cod_risk integer := 0;
begin
  insert into public.india_commerce_recovery_events(event_type, transaction_id, buyer_id, locale, severity, idempotency_key, metadata)
  select 'UPI_DELAYED_CONFIRMATION', ct.id, ct.buyer_id, coalesce(ct.metadata ->> 'locale', 'en'), 'high',
         md5('upi-delayed:' || ct.id::text),
         jsonb_build_object('paymentMethod', ct.payment_method, 'state', ct.state, 'updatedAt', ct.updated_at)
  from public.checkout_transactions ct
  where ct.payment_method = 'upi'
    and ct.state in ('PAYMENT_PENDING', 'PROCESSING')
    and ct.updated_at < now() - interval '10 minutes'
  on conflict (idempotency_key) do update
  set metadata = public.india_commerce_recovery_events.metadata || excluded.metadata,
      severity = excluded.severity;
  get diagnostics v_upi_delayed = row_count;

  insert into public.cod_risk_events(buyer_id, vendor_id, order_id, pincode, score, eligible, cooldown_required, verification_required, reason, metadata)
  select o.buyer_id,
         o.vendor_id,
         o.id,
         coalesce(o.delivery_address ->> 'pincode', ''),
         least(100, 20 + count(*) over (partition by o.buyer_id)::integer * 8),
         count(*) over (partition by o.buyer_id) < 5,
         count(*) over (partition by o.buyer_id) >= 7,
         count(*) over (partition by o.buyer_id) >= 3,
         'COD cancellation or failed delivery pattern requires operational review.',
         jsonb_build_object('source', 'run_india_commerce_recovery')
  from public.orders o
  where o.payment_method = 'cod'
    and o.status in ('CANCELLED', 'REFUNDED')
    and o.updated_at > now() - interval '30 days'
  limit greatest(1, coalesce(batch_size, 100));
  get diagnostics v_cod_risk = row_count;

  return jsonb_build_object('upiDelayed', v_upi_delayed, 'codRiskEvents', v_cod_risk);
end;
$$;

create or replace view public.india_commerce_operational_health as
select
  (select count(*) from public.india_commerce_recovery_events where state = 'OPEN') as open_recovery_events,
  (select count(*) from public.india_commerce_recovery_events where event_type = 'UPI_DELAYED_CONFIRMATION' and created_at > now() - interval '24 hours') as delayed_upi_24h,
  (select count(*) from public.cod_risk_events where created_at > now() - interval '24 hours' and eligible = false) as cod_blocked_24h,
  (select count(*) from public.cod_risk_events where created_at > now() - interval '24 hours' and verification_required = true) as cod_verification_24h,
  (select count(*) from public.localization_quality_reports where created_at > now() - interval '24 hours' and completeness < 95) as localization_gaps_24h,
  now() as generated_at;

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('stabilization_s4_india_commerce_hardening', 'Enables India-commerce recovery events, UPI delay tracking, COD risk observability, and localization quality reporting.', true, 100, '{"roles":["BUYER","SELLER","ADMIN"]}'),
  ('stabilization_s4_vernacular_discovery', 'Enables centralized vernacular query normalization and multilingual fallback governance.', true, 100, '{"roles":["BUYER"]}')
on conflict (key) do update
set description = excluded.description,
    is_enabled = excluded.is_enabled,
    rollout_percentage = excluded.rollout_percentage,
    audience = excluded.audience,
    updated_at = now();
