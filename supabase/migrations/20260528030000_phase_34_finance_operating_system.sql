-- Phase 34: enterprise commerce finance operating system hardening.
-- Extends the existing Phase 18/28 payment, ledger, settlement, payout, and reconciliation infrastructure.

alter type public.reconciliation_case_type add value if not exists 'SETTLEMENT_MISMATCH';
alter type public.reconciliation_case_type add value if not exists 'PAYOUT_DUPLICATION_ATTEMPT';
alter type public.reconciliation_case_type add value if not exists 'REFUND_REPLAY_ANOMALY';
alter type public.reconciliation_case_type add value if not exists 'LEDGER_REPAIR_REQUIRED';

create table if not exists public.finance_operating_audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  replay_key text not null,
  source_type text not null,
  source_id uuid,
  vendor_id uuid references public.vendors(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  transaction_id uuid references public.checkout_transactions(id) on delete set null,
  payment_attempt_id uuid references public.payment_attempts(id) on delete set null,
  refund_request_id uuid references public.refund_requests(id) on delete set null,
  payout_batch_id uuid references public.seller_payout_batches(id) on delete set null,
  ledger_journal_id uuid references public.financial_ledger_journals(id) on delete set null,
  amount numeric(14, 2),
  currency char(3) not null default 'INR',
  event_state text not null default 'RECORDED',
  metadata jsonb not null default '{}'::jsonb,
  unique (replay_key)
);

create table if not exists public.finance_recovery_actions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  action_type text not null,
  state text not null default 'OPEN' check (state in ('OPEN', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  vendor_id uuid references public.vendors(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  transaction_id uuid references public.checkout_transactions(id) on delete set null,
  refund_request_id uuid references public.refund_requests(id) on delete set null,
  payout_batch_id uuid references public.seller_payout_batches(id) on delete set null,
  reconciliation_case_id uuid references public.financial_reconciliation_cases(id) on delete set null,
  replay_key text not null,
  reason text not null,
  recovery_plan jsonb not null default '[]'::jsonb,
  completed_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  unique (replay_key)
);

alter table public.financial_reconciliation_runs
  add column if not exists replay_key text,
  add column if not exists drift_amount numeric(14, 2) not null default 0,
  add column if not exists replay_anomaly_count integer not null default 0 check (replay_anomaly_count >= 0),
  add column if not exists queue_pressure numeric(8, 4) not null default 0;

alter table public.settlement_records
  add column if not exists provider_settlement_id text,
  add column if not exists provider_settlement_state text,
  add column if not exists provider_settlement_amount numeric(12, 2),
  add column if not exists settlement_observed_at timestamptz,
  add column if not exists financial_risk_state text not null default 'HEALTHY';

alter table public.seller_payout_batches
  add column if not exists governance_hold boolean not null default false,
  add column if not exists risk_state text not null default 'LOW',
  add column if not exists payout_decision text,
  add column if not exists last_recovery_action text;

alter table public.refund_requests
  add column if not exists accounting_state text not null default 'PENDING',
  add column if not exists accounting_journal_id uuid references public.financial_ledger_journals(id) on delete set null,
  add column if not exists replay_anomaly_detected boolean not null default false;

create index if not exists finance_operating_audit_events_source_idx on public.finance_operating_audit_events(source_type, source_id, created_at desc);
create index if not exists finance_operating_audit_events_payout_idx on public.finance_operating_audit_events(payout_batch_id, created_at desc);
create index if not exists finance_operating_audit_events_severity_idx on public.finance_operating_audit_events(severity, created_at desc);
create index if not exists finance_recovery_actions_state_idx on public.finance_recovery_actions(state, severity, created_at desc);
create index if not exists settlement_records_provider_settlement_idx on public.settlement_records(provider_settlement_id, provider_settlement_state);
create index if not exists seller_payout_batches_risk_idx on public.seller_payout_batches(risk_state, governance_hold, state);
create index if not exists refund_requests_accounting_idx on public.refund_requests(accounting_state, replay_anomaly_detected, created_at desc);

alter table public.finance_operating_audit_events enable row level security;
alter table public.finance_recovery_actions enable row level security;

drop policy if exists "finance_operating_audit_admin_select" on public.finance_operating_audit_events;
create policy "finance_operating_audit_admin_select" on public.finance_operating_audit_events
  for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

drop policy if exists "finance_recovery_actions_admin_select" on public.finance_recovery_actions;
create policy "finance_recovery_actions_admin_select" on public.finance_recovery_actions
  for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create or replace function public.record_finance_operating_audit_event(
  event_type text,
  severity text,
  replay_key text,
  source_type text,
  source_id uuid default null,
  vendor_id uuid default null,
  order_id uuid default null,
  transaction_id uuid default null,
  payment_attempt_id uuid default null,
  refund_request_id uuid default null,
  payout_batch_id uuid default null,
  ledger_journal_id uuid default null,
  amount numeric default null,
  currency char(3) default 'INR',
  metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.finance_operating_audit_events (
    event_type,
    severity,
    replay_key,
    source_type,
    source_id,
    vendor_id,
    order_id,
    transaction_id,
    payment_attempt_id,
    refund_request_id,
    payout_batch_id,
    ledger_journal_id,
    amount,
    currency,
    metadata
  )
  values (
    left(coalesce(event_type, 'finance.event'), 120),
    case when severity in ('info', 'warning', 'critical') then severity else 'info' end,
    replay_key,
    left(coalesce(source_type, 'finance'), 80),
    source_id,
    vendor_id,
    order_id,
    transaction_id,
    payment_attempt_id,
    refund_request_id,
    payout_batch_id,
    ledger_journal_id,
    amount,
    coalesce(currency, 'INR'),
    coalesce(metadata, '{}'::jsonb)
  )
  on conflict (replay_key) do update
  set metadata = public.finance_operating_audit_events.metadata || excluded.metadata
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.record_finance_operating_audit_event(text, text, text, text, uuid, uuid, uuid, uuid, uuid, uuid, uuid, uuid, numeric, char, jsonb) to authenticated;

create or replace view public.finance_operating_health_admin as
select
  (select count(*) from public.financial_reconciliation_cases where state in ('OPEN', 'ESCALATED')) as open_reconciliation_cases,
  (select count(*) from public.financial_reconciliation_cases where severity = 'critical' and state in ('OPEN', 'ESCALATED')) as critical_reconciliation_cases,
  (select coalesce(sum(abs(coalesce(expected_amount, 0) - coalesce(observed_amount, expected_amount, 0))), 0)::numeric(14, 2) from public.financial_reconciliation_cases where state in ('OPEN', 'ESCALATED')) as open_drift_amount,
  (select count(*) from public.seller_payout_batches where state in ('FAILED', 'RETRYING')) as payout_recovery_backlog,
  (select count(*) from public.seller_payout_batches where governance_hold = true) as payout_governance_holds,
  (select count(*) from public.refund_requests where accounting_state <> 'POSTED' and state in ('REFUND_SUCCEEDED', 'REFUND_RECONCILING')) as refund_accounting_backlog,
  (select count(*) from public.finance_recovery_actions where state in ('OPEN', 'RUNNING')) as open_recovery_actions,
  (select count(*) from public.finance_operating_audit_events where severity = 'critical' and created_at >= now() - interval '24 hours') as critical_audit_events_24h;

grant select on public.finance_operating_health_admin to authenticated;

create or replace function public.open_finance_recovery_action(
  action_type text,
  severity text,
  replay_key text,
  reason text,
  recovery_plan jsonb default '[]'::jsonb,
  vendor_id uuid default null,
  order_id uuid default null,
  transaction_id uuid default null,
  refund_request_id uuid default null,
  payout_batch_id uuid default null,
  reconciliation_case_id uuid default null,
  metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.finance_recovery_actions (
    action_type,
    severity,
    replay_key,
    reason,
    recovery_plan,
    vendor_id,
    order_id,
    transaction_id,
    refund_request_id,
    payout_batch_id,
    reconciliation_case_id,
    metadata
  )
  values (
    left(coalesce(action_type, 'finance.recovery'), 120),
    case when severity in ('info', 'warning', 'critical') then severity else 'warning' end,
    replay_key,
    left(coalesce(reason, 'Finance recovery required.'), 1000),
    coalesce(recovery_plan, '[]'::jsonb),
    vendor_id,
    order_id,
    transaction_id,
    refund_request_id,
    payout_batch_id,
    reconciliation_case_id,
    coalesce(metadata, '{}'::jsonb)
  )
  on conflict (replay_key) do update
  set state = case when public.finance_recovery_actions.state = 'COMPLETED' then public.finance_recovery_actions.state else 'OPEN' end,
      updated_at = now(),
      recovery_plan = excluded.recovery_plan,
      metadata = public.finance_recovery_actions.metadata || excluded.metadata
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.open_finance_recovery_action(text, text, text, text, jsonb, uuid, uuid, uuid, uuid, uuid, uuid, jsonb) to authenticated;

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('phase_34_finance_operating_system', 'Enables enterprise finance operating controls for ledger, payout, reconciliation, refund, settlement, and recovery workflows.', true, 100, '{"roles":["ADMIN","SELLER"]}'),
  ('phase_34_finance_recovery_actions', 'Enables replay-safe finance recovery action tracking and operational correction visibility.', true, 100, '{"roles":["ADMIN"]}'),
  ('phase_34_settlement_intelligence', 'Enables settlement delay and mismatch tracking before payout release.', true, 100, '{"roles":["ADMIN"]}')
on conflict (key) do update
set description = excluded.description,
    is_enabled = excluded.is_enabled,
    rollout_percentage = excluded.rollout_percentage,
    audience = excluded.audience,
    updated_at = now();
