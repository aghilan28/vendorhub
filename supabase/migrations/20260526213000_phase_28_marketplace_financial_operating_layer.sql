create type public.ledger_party_type as enum ('BUYER', 'SELLER', 'PLATFORM', 'PAYMENT_PROVIDER', 'BANK', 'SYSTEM');
create type public.ledger_entry_direction as enum ('DEBIT', 'CREDIT');
create type public.financial_journal_state as enum ('POSTED', 'REVERSED');
create type public.commission_scope_type as enum ('DEFAULT', 'CATEGORY', 'SELLER_TIER', 'SELLER_OVERRIDE', 'PROMOTIONAL_OVERRIDE');
create type public.settlement_lifecycle_state as enum (
  'PENDING_SETTLEMENT',
  'PROCESSING_SETTLEMENT',
  'SETTLED',
  'PAYOUT_PENDING',
  'PAYOUT_PROCESSING',
  'PAYOUT_COMPLETED',
  'PAYOUT_FAILED',
  'REFUND_ADJUSTED',
  'DISPUTED'
);
create type public.payout_batch_state as enum ('DRAFT', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING', 'CANCELLED');
create type public.reconciliation_case_state as enum ('OPEN', 'INVESTIGATING', 'RECOVERED', 'WAIVED', 'ESCALATED');
create type public.reconciliation_case_type as enum (
  'ORPHAN_PAYMENT',
  'PAYOUT_MISMATCH',
  'REFUND_MISMATCH',
  'SETTLEMENT_DRIFT',
  'DUPLICATE_FINANCIAL_EVENT',
  'LEDGER_IMBALANCE',
  'MISSING_LEDGER_POSTING'
);

create table public.financial_ledger_journals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  posted_at timestamptz not null default now(),
  source_type text not null,
  source_id uuid not null,
  source_event_id text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_type text not null default 'system',
  state public.financial_journal_state not null default 'POSTED',
  currency char(3) not null default 'INR',
  total_debit numeric(14, 2) not null check (total_debit >= 0),
  total_credit numeric(14, 2) not null check (total_credit >= 0),
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  reversal_of_journal_id uuid references public.financial_ledger_journals(id) on delete restrict,
  constraint financial_journal_balanced check (total_debit = total_credit),
  unique (source_type, source_event_id)
);

create table public.financial_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  journal_id uuid not null references public.financial_ledger_journals(id) on delete restrict,
  source_type text not null,
  source_id uuid not null,
  account_code text not null,
  party_type public.ledger_party_type not null,
  party_id uuid,
  direction public.ledger_entry_direction not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency char(3) not null default 'INR',
  order_id uuid references public.orders(id) on delete restrict,
  transaction_id uuid references public.checkout_transactions(id) on delete restrict,
  vendor_id uuid references public.vendors(id) on delete restrict,
  payment_attempt_id uuid references public.payment_attempts(id) on delete restrict,
  refund_request_id uuid references public.refund_requests(id) on delete restrict,
  payout_batch_id uuid,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  reversal_of_entry_id uuid references public.financial_ledger_entries(id) on delete restrict,
  constraint financial_ledger_party_consistency check (
    (party_type in ('SELLER') and party_id is not null)
    or party_type <> 'SELLER'
  )
);

create table public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  scope_type public.commission_scope_type not null default 'DEFAULT',
  category_id uuid references public.categories(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  seller_tier text,
  rate_bps integer not null default 800 check (rate_bps >= 0 and rate_bps <= 5000),
  fixed_fee_amount numeric(12, 2) not null default 0 check (fixed_fee_amount >= 0),
  platform_fee_label text not null default 'Platform marketplace commission',
  explanation text not null,
  priority integer not null default 100,
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create table public.order_commission_calculations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  order_id uuid not null references public.orders(id) on delete restrict,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  commission_rule_id uuid not null references public.commission_rules(id) on delete restrict,
  basis_amount numeric(12, 2) not null check (basis_amount >= 0),
  rate_bps integer not null check (rate_bps >= 0),
  fixed_fee_amount numeric(12, 2) not null default 0 check (fixed_fee_amount >= 0),
  commission_amount numeric(12, 2) not null check (commission_amount >= 0),
  currency char(3) not null default 'INR',
  explanation text not null,
  metadata jsonb not null default '{}'::jsonb,
  unique (order_id)
);

create table public.settlement_records (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  order_id uuid not null unique references public.orders(id) on delete restrict,
  transaction_id uuid references public.checkout_transactions(id) on delete set null,
  payment_attempt_id uuid references public.payment_attempts(id) on delete set null,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  commission_calculation_id uuid references public.order_commission_calculations(id) on delete restrict,
  gross_amount numeric(12, 2) not null check (gross_amount >= 0),
  commission_amount numeric(12, 2) not null default 0 check (commission_amount >= 0),
  refund_adjustment_amount numeric(12, 2) not null default 0 check (refund_adjustment_amount >= 0),
  payout_deduction_amount numeric(12, 2) not null default 0 check (payout_deduction_amount >= 0),
  net_amount numeric(12, 2) not null check (net_amount >= 0),
  available_amount numeric(12, 2) not null check (available_amount >= 0),
  currency char(3) not null default 'INR',
  lifecycle_state public.settlement_lifecycle_state not null default 'PENDING_SETTLEMENT',
  expected_payout_at timestamptz not null default (now() + interval '2 days'),
  settled_at timestamptz,
  payout_released_at timestamptz,
  hold_reason text,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb
);

create table public.seller_payout_methods (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  label text not null,
  holder_name text,
  bank_name text,
  masked_account text,
  ifsc_last4 text,
  readiness_state text not null default 'PENDING_REVIEW',
  is_default boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  unique (vendor_id, label)
);

create table public.seller_payout_batches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  payout_method_id uuid references public.seller_payout_methods(id) on delete set null,
  state public.payout_batch_state not null default 'DRAFT',
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  currency char(3) not null default 'INR',
  idempotency_key text not null unique,
  retry_count integer not null default 0 check (retry_count >= 0),
  provider_payout_id text,
  bank_reference text,
  failure_code text,
  failure_reason text,
  scheduled_for timestamptz not null default now(),
  initiated_at timestamptz,
  completed_at timestamptz,
  reconciled_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create table public.seller_payout_batch_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  payout_batch_id uuid not null references public.seller_payout_batches(id) on delete cascade,
  settlement_record_id uuid not null references public.settlement_records(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  currency char(3) not null default 'INR',
  unique (settlement_record_id)
);

alter table public.financial_ledger_entries
  add constraint financial_ledger_entries_payout_batch_fk
  foreign key (payout_batch_id) references public.seller_payout_batches(id) on delete restrict;

create table public.financial_reconciliation_cases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  run_id uuid references public.financial_reconciliation_runs(id) on delete set null,
  case_type public.reconciliation_case_type not null,
  state public.reconciliation_case_state not null default 'OPEN',
  severity text not null check (severity in ('info', 'warning', 'critical')),
  vendor_id uuid references public.vendors(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  transaction_id uuid references public.checkout_transactions(id) on delete set null,
  payment_attempt_id uuid references public.payment_attempts(id) on delete set null,
  refund_request_id uuid references public.refund_requests(id) on delete set null,
  payout_batch_id uuid references public.seller_payout_batches(id) on delete set null,
  expected_amount numeric(12, 2),
  observed_amount numeric(12, 2),
  currency char(3) not null default 'INR',
  fingerprint text not null,
  title text not null,
  detail text not null,
  recovery_action text not null,
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  unique (fingerprint)
);

create table public.financial_observability_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  metric text not null,
  value numeric(14, 4) not null default 1,
  vendor_id uuid references public.vendors(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  transaction_id uuid references public.checkout_transactions(id) on delete set null,
  payout_batch_id uuid references public.seller_payout_batches(id) on delete set null,
  tags jsonb not null default '{}'::jsonb
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'commission_rules',
    'settlement_records',
    'seller_payout_methods',
    'seller_payout_batches',
    'financial_reconciliation_cases'
  ]
  loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

create index financial_ledger_entries_source_idx on public.financial_ledger_entries(source_type, source_id, created_at desc);
create index financial_ledger_entries_party_idx on public.financial_ledger_entries(party_type, party_id, account_code, created_at desc);
create index financial_ledger_entries_vendor_idx on public.financial_ledger_entries(vendor_id, created_at desc);
create index commission_rules_resolution_idx on public.commission_rules(is_active, scope_type, vendor_id, category_id, priority, effective_at desc);
create index settlement_records_vendor_state_idx on public.settlement_records(vendor_id, lifecycle_state, expected_payout_at);
create index settlement_records_order_idx on public.settlement_records(order_id);
create index seller_payout_batches_vendor_state_idx on public.seller_payout_batches(vendor_id, state, created_at desc);
create index financial_reconciliation_cases_state_idx on public.financial_reconciliation_cases(state, severity, created_at desc);
create index financial_observability_metric_idx on public.financial_observability_events(metric, created_at desc);

alter table public.financial_ledger_journals enable row level security;
alter table public.financial_ledger_entries enable row level security;
alter table public.commission_rules enable row level security;
alter table public.order_commission_calculations enable row level security;
alter table public.settlement_records enable row level security;
alter table public.seller_payout_methods enable row level security;
alter table public.seller_payout_batches enable row level security;
alter table public.seller_payout_batch_items enable row level security;
alter table public.financial_reconciliation_cases enable row level security;
alter table public.financial_observability_events enable row level security;

create policy "financial_ledger_journals_admin_select" on public.financial_ledger_journals for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "financial_ledger_entries_party_select" on public.financial_ledger_entries for select using (
  public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
  or (vendor_id is not null and public.current_user_is_vendor_member(vendor_id))
  or exists (select 1 from public.orders o where o.id = financial_ledger_entries.order_id and o.buyer_id = auth.uid())
);
create policy "commission_rules_admin_select" on public.commission_rules for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "order_commission_vendor_admin_select" on public.order_commission_calculations for select using (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);
create policy "settlement_records_vendor_admin_select" on public.settlement_records for select using (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);
create policy "seller_payout_methods_vendor_admin_select" on public.seller_payout_methods for select using (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);
create policy "seller_payout_batches_vendor_admin_select" on public.seller_payout_batches for select using (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);
create policy "seller_payout_batch_items_vendor_admin_select" on public.seller_payout_batch_items for select using (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);
create policy "financial_reconciliation_cases_admin_select" on public.financial_reconciliation_cases for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "financial_observability_admin_select" on public.financial_observability_events for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create or replace function public.prevent_financial_append_only_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'FINANCIAL_APPEND_ONLY_TABLE:%', tg_table_name;
end;
$$;

create trigger prevent_financial_journal_update before update or delete on public.financial_ledger_journals for each row execute function public.prevent_financial_append_only_mutation();
create trigger prevent_financial_entry_update before update or delete on public.financial_ledger_entries for each row execute function public.prevent_financial_append_only_mutation();
create trigger prevent_order_commission_update before update or delete on public.order_commission_calculations for each row execute function public.prevent_financial_append_only_mutation();

create or replace function public.record_financial_metric(
  metric_name text,
  metric_value numeric default 1,
  target_vendor_id uuid default null,
  target_order_id uuid default null,
  target_transaction_id uuid default null,
  target_payout_batch_id uuid default null,
  event_tags jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.financial_observability_events(metric, value, vendor_id, order_id, transaction_id, payout_batch_id, tags)
  values (metric_name, coalesce(metric_value, 1), target_vendor_id, target_order_id, target_transaction_id, target_payout_batch_id, coalesce(event_tags, '{}'::jsonb))
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.post_financial_journal(
  source_type text,
  source_id uuid,
  source_event_id text,
  actor_id uuid,
  actor_type text,
  journal_currency char(3),
  description text,
  entries jsonb,
  metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing uuid;
  v_journal_id uuid;
  v_debit numeric(14, 2) := 0;
  v_credit numeric(14, 2) := 0;
  entry_rec record;
begin
  if jsonb_typeof(entries) <> 'array' or jsonb_array_length(entries) < 2 then
    raise exception 'LEDGER_ENTRIES_REQUIRED';
  end if;

  select id into v_existing
  from public.financial_ledger_journals j
  where j.source_type = post_financial_journal.source_type
    and j.source_event_id = post_financial_journal.source_event_id;

  if v_existing is not null then
    return v_existing;
  end if;

  select
    coalesce(sum(case when x.direction = 'DEBIT' then x.amount else 0 end), 0),
    coalesce(sum(case when x.direction = 'CREDIT' then x.amount else 0 end), 0)
  into v_debit, v_credit
  from jsonb_to_recordset(entries) as x(direction text, amount numeric)
  where x.amount > 0;

  if round(v_debit, 2) <> round(v_credit, 2) or v_debit <= 0 then
    raise exception 'LEDGER_JOURNAL_NOT_BALANCED debit=% credit=%', v_debit, v_credit;
  end if;

  insert into public.financial_ledger_journals (
    source_type,
    source_id,
    source_event_id,
    actor_id,
    actor_type,
    currency,
    total_debit,
    total_credit,
    description,
    metadata
  )
  values (
    source_type,
    source_id,
    source_event_id,
    actor_id,
    coalesce(actor_type, 'system'),
    coalesce(journal_currency, 'INR'),
    round(v_debit, 2),
    round(v_credit, 2),
    description,
    coalesce(metadata, '{}'::jsonb)
  )
  returning id into v_journal_id;

  for entry_rec in
    select *
    from jsonb_to_recordset(entries) as x(
      account_code text,
      party_type text,
      party_id uuid,
      direction text,
      amount numeric,
      order_id uuid,
      transaction_id uuid,
      vendor_id uuid,
      payment_attempt_id uuid,
      refund_request_id uuid,
      payout_batch_id uuid,
      description text,
      metadata jsonb
    )
  loop
    if coalesce(entry_rec.amount, 0) <= 0 then
      continue;
    end if;

    insert into public.financial_ledger_entries (
      journal_id,
      source_type,
      source_id,
      account_code,
      party_type,
      party_id,
      direction,
      amount,
      currency,
      order_id,
      transaction_id,
      vendor_id,
      payment_attempt_id,
      refund_request_id,
      payout_batch_id,
      description,
      metadata
    )
    values (
      v_journal_id,
      post_financial_journal.source_type,
      post_financial_journal.source_id,
      entry_rec.account_code,
      entry_rec.party_type::public.ledger_party_type,
      entry_rec.party_id,
      entry_rec.direction::public.ledger_entry_direction,
      round(entry_rec.amount, 2),
      coalesce(journal_currency, 'INR'),
      entry_rec.order_id,
      entry_rec.transaction_id,
      entry_rec.vendor_id,
      entry_rec.payment_attempt_id,
      entry_rec.refund_request_id,
      entry_rec.payout_batch_id,
      entry_rec.description,
      coalesce(entry_rec.metadata, '{}'::jsonb)
    );
  end loop;

  return v_journal_id;
end;
$$;

insert into public.commission_rules (name, scope_type, rate_bps, fixed_fee_amount, platform_fee_label, explanation, priority, metadata)
values (
  'Default marketplace commission',
  'DEFAULT',
  800,
  0,
  'Platform commission',
  'Default 8% platform commission applied when no seller, category, or promotional override is active.',
  1000,
  '{"phase":"28","systemDefault":true}'::jsonb
)
on conflict do nothing;

create or replace function public.resolve_order_commission(target_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_category_id uuid;
  v_rule public.commission_rules%rowtype;
  v_commission numeric(12, 2);
begin
  select * into v_order from public.orders where id = target_order_id;
  if v_order.id is null then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  select p.category_id into v_category_id
  from public.order_items oi
  join public.products p on p.id = oi.product_id
  where oi.order_id = target_order_id
  group by p.category_id
  order by count(*) desc
  limit 1;

  select * into v_rule
  from public.commission_rules cr
  where cr.is_active = true
    and cr.effective_at <= now()
    and (cr.expires_at is null or cr.expires_at > now())
    and (
      cr.scope_type = 'DEFAULT'
      or (cr.scope_type in ('SELLER_OVERRIDE', 'SELLER_TIER') and cr.vendor_id = v_order.vendor_id)
      or (cr.scope_type = 'CATEGORY' and cr.category_id = v_category_id)
    )
  order by
    case
      when cr.scope_type in ('SELLER_OVERRIDE', 'SELLER_TIER') and cr.vendor_id = v_order.vendor_id then 1
      when cr.scope_type = 'CATEGORY' and cr.category_id = v_category_id then 2
      when cr.scope_type = 'PROMOTIONAL_OVERRIDE' then 3
      else 9
    end,
    cr.priority,
    cr.effective_at desc
  limit 1;

  if v_rule.id is null then
    raise exception 'COMMISSION_RULE_NOT_FOUND';
  end if;

  v_commission := least(v_order.total_amount, round((v_order.total_amount * v_rule.rate_bps / 10000.0) + v_rule.fixed_fee_amount, 2));

  return jsonb_build_object(
    'ruleId', v_rule.id,
    'scopeType', v_rule.scope_type,
    'basisAmount', v_order.total_amount,
    'rateBps', v_rule.rate_bps,
    'fixedFeeAmount', v_rule.fixed_fee_amount,
    'commissionAmount', v_commission,
    'currency', v_order.currency,
    'label', v_rule.platform_fee_label,
    'explanation', v_rule.explanation
  );
end;
$$;

create or replace function public.post_order_financial_settlement(
  target_order_id uuid,
  source_event_id text,
  actor_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_attempt public.payment_attempts%rowtype;
  v_commission jsonb;
  v_commission_id uuid;
  v_settlement_id uuid;
  v_journal_id uuid;
  v_gross numeric(12, 2);
  v_commission_amount numeric(12, 2);
  v_net numeric(12, 2);
  v_existing public.settlement_records%rowtype;
begin
  select * into v_order from public.orders where id = target_order_id for update;
  if v_order.id is null then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  select pa.* into v_attempt
  from public.payment_attempts pa
  where pa.transaction_id::text = v_order.metadata ->> 'checkout_transaction_id'
  order by pa.created_at desc
  limit 1;

  select * into v_existing from public.settlement_records where order_id = target_order_id;
  if v_existing.id is not null then
    return jsonb_build_object('settlementId', v_existing.id, 'duplicate', true, 'state', v_existing.lifecycle_state);
  end if;

  v_commission := public.resolve_order_commission(target_order_id);
  v_gross := (v_commission ->> 'basisAmount')::numeric;
  v_commission_amount := (v_commission ->> 'commissionAmount')::numeric;
  v_net := greatest(0, v_gross - v_commission_amount);

  insert into public.order_commission_calculations (
    order_id,
    vendor_id,
    commission_rule_id,
    basis_amount,
    rate_bps,
    fixed_fee_amount,
    commission_amount,
    currency,
    explanation,
    metadata
  )
  values (
    v_order.id,
    v_order.vendor_id,
    (v_commission ->> 'ruleId')::uuid,
    v_gross,
    (v_commission ->> 'rateBps')::integer,
    (v_commission ->> 'fixedFeeAmount')::numeric,
    v_commission_amount,
    v_order.currency,
    v_commission ->> 'explanation',
    v_commission
  )
  returning id into v_commission_id;

  insert into public.settlement_records (
    order_id,
    transaction_id,
    payment_attempt_id,
    vendor_id,
    commission_calculation_id,
    gross_amount,
    commission_amount,
    net_amount,
    available_amount,
    currency,
    lifecycle_state,
    expected_payout_at,
    idempotency_key,
    metadata
  )
  values (
    v_order.id,
    v_attempt.transaction_id,
    v_attempt.id,
    v_order.vendor_id,
    v_commission_id,
    v_gross,
    v_commission_amount,
    v_net,
    v_net,
    v_order.currency,
    case when v_order.status = 'DELIVERED' then 'PAYOUT_PENDING'::public.settlement_lifecycle_state else 'PENDING_SETTLEMENT'::public.settlement_lifecycle_state end,
    now() + interval '2 days',
    'settlement:' || v_order.id::text,
    jsonb_build_object('commission', v_commission, 'paymentReference', v_order.payment_reference)
  )
  returning id into v_settlement_id;

  v_journal_id := public.post_financial_journal(
    'order_settlement',
    v_settlement_id,
    source_event_id,
    actor_id,
    'system',
    v_order.currency,
    'Order settlement and commission allocation',
    jsonb_build_array(
      jsonb_build_object('account_code','cash_gateway_clearing','party_type','PAYMENT_PROVIDER','direction','DEBIT','amount',v_gross,'order_id',v_order.id,'transaction_id',v_attempt.transaction_id,'vendor_id',v_order.vendor_id,'payment_attempt_id',v_attempt.id,'description','Captured buyer payment in gateway clearing'),
      jsonb_build_object('account_code','platform_escrow_liability','party_type','PLATFORM','direction','CREDIT','amount',v_gross,'order_id',v_order.id,'transaction_id',v_attempt.transaction_id,'vendor_id',v_order.vendor_id,'payment_attempt_id',v_attempt.id,'description','Marketplace escrow liability for captured payment'),
      jsonb_build_object('account_code','platform_escrow_liability','party_type','PLATFORM','direction','DEBIT','amount',v_gross,'order_id',v_order.id,'transaction_id',v_attempt.transaction_id,'vendor_id',v_order.vendor_id,'payment_attempt_id',v_attempt.id,'description','Release escrow into seller payable and platform revenue'),
      jsonb_build_object('account_code','seller_payable','party_type','SELLER','party_id',v_order.vendor_id,'direction','CREDIT','amount',v_net,'order_id',v_order.id,'transaction_id',v_attempt.transaction_id,'vendor_id',v_order.vendor_id,'payment_attempt_id',v_attempt.id,'description','Seller earning after commission'),
      jsonb_build_object('account_code','platform_commission_revenue','party_type','PLATFORM','direction','CREDIT','amount',v_commission_amount,'order_id',v_order.id,'transaction_id',v_attempt.transaction_id,'vendor_id',v_order.vendor_id,'payment_attempt_id',v_attempt.id,'description','Platform commission revenue')
    ),
    jsonb_build_object('settlementId', v_settlement_id, 'commissionCalculationId', v_commission_id)
  );

  insert into public.seller_payout_attributions (order_id, transaction_id, vendor_id, payment_attempt_id, gross_amount, commission_amount, tax_withheld_amount, net_amount, currency, state, metadata)
  values (v_order.id, v_attempt.transaction_id, v_order.vendor_id, v_attempt.id, v_gross, v_commission_amount, 0, v_net, v_order.currency, 'PAYOUT_ELIGIBLE', jsonb_build_object('settlementRecordId', v_settlement_id, 'ledgerJournalId', v_journal_id, 'commission', v_commission))
  on conflict (order_id, vendor_id) do update
  set gross_amount = excluded.gross_amount,
      commission_amount = excluded.commission_amount,
      net_amount = excluded.net_amount,
      state = excluded.state,
      metadata = seller_payout_attributions.metadata || excluded.metadata,
      updated_at = now();

  perform public.record_financial_metric('finance.settlement.posted', 1, v_order.vendor_id, v_order.id, v_attempt.transaction_id, null, jsonb_build_object('netAmount', v_net, 'commissionAmount', v_commission_amount));

  return jsonb_build_object('settlementId', v_settlement_id, 'journalId', v_journal_id, 'duplicate', false, 'state', 'PENDING_SETTLEMENT');
end;
$$;

create or replace function public.advance_settlement_lifecycle(batch_size integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  settlement_rec record;
  v_count integer := 0;
begin
  for settlement_rec in
    select sr.*, o.status as order_status
    from public.settlement_records sr
    join public.orders o on o.id = sr.order_id
    where sr.lifecycle_state in ('PENDING_SETTLEMENT', 'PROCESSING_SETTLEMENT')
      and o.status in ('DELIVERED', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY')
    order by sr.expected_payout_at
    limit batch_size
    for update of sr skip locked
  loop
    update public.settlement_records
    set lifecycle_state = case when settlement_rec.order_status = 'DELIVERED' then 'PAYOUT_PENDING'::public.settlement_lifecycle_state else 'PROCESSING_SETTLEMENT'::public.settlement_lifecycle_state end,
        settled_at = case when settlement_rec.order_status = 'DELIVERED' then coalesce(settled_at, now()) else settled_at end
    where id = settlement_rec.id;

    v_count := v_count + 1;
  end loop;

  perform public.record_financial_metric('finance.settlement.lifecycle_advanced', v_count);
  return jsonb_build_object('advanced', v_count);
end;
$$;

create or replace function public.post_refund_financial_adjustment(target_refund_id uuid, source_event_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_refund public.refund_requests%rowtype;
  v_order public.orders%rowtype;
  v_settlement public.settlement_records%rowtype;
  v_ratio numeric(14, 8);
  v_commission_reversal numeric(12, 2);
  v_seller_reversal numeric(12, 2);
  v_journal_id uuid;
begin
  select * into v_refund from public.refund_requests where id = target_refund_id for update;
  if v_refund.id is null then
    raise exception 'REFUND_NOT_FOUND';
  end if;

  select * into v_order from public.orders where id = v_refund.order_id for update;
  select * into v_settlement from public.settlement_records where order_id = v_refund.order_id for update;

  if v_order.id is null or v_settlement.id is null then
    raise exception 'REFUND_SETTLEMENT_CONTEXT_MISSING';
  end if;

  if exists (
    select 1 from public.financial_ledger_journals
    where source_type = 'refund_adjustment'
      and source_event_id = coalesce(source_event_id, 'refund:' || v_refund.id::text)
  ) then
    return jsonb_build_object('duplicate', true, 'refundId', v_refund.id);
  end if;

  v_ratio := least(1, v_refund.amount / nullif(v_settlement.gross_amount, 0));
  v_commission_reversal := round(v_settlement.commission_amount * v_ratio, 2);
  v_seller_reversal := greatest(0, round(v_refund.amount - v_commission_reversal, 2));

  v_journal_id := public.post_financial_journal(
    'refund_adjustment',
    v_refund.id,
    coalesce(source_event_id, 'refund:' || v_refund.id::text),
    v_refund.requested_by,
    'refund',
    v_refund.currency,
    'Refund accounting adjustment',
    jsonb_build_array(
      jsonb_build_object('account_code','refund_liability','party_type','PLATFORM','direction','DEBIT','amount',v_refund.amount,'order_id',v_order.id,'transaction_id',v_refund.transaction_id,'vendor_id',v_order.vendor_id,'payment_attempt_id',v_refund.payment_attempt_id,'refund_request_id',v_refund.id,'description','Buyer refund liability recognized'),
      jsonb_build_object('account_code','cash_gateway_clearing','party_type','PAYMENT_PROVIDER','direction','CREDIT','amount',v_refund.amount,'order_id',v_order.id,'transaction_id',v_refund.transaction_id,'vendor_id',v_order.vendor_id,'payment_attempt_id',v_refund.payment_attempt_id,'refund_request_id',v_refund.id,'description','Gateway refund cash movement'),
      jsonb_build_object('account_code','seller_payable','party_type','SELLER','party_id',v_order.vendor_id,'direction','DEBIT','amount',v_seller_reversal,'order_id',v_order.id,'transaction_id',v_refund.transaction_id,'vendor_id',v_order.vendor_id,'payment_attempt_id',v_refund.payment_attempt_id,'refund_request_id',v_refund.id,'description','Seller payable reversed for refund'),
      jsonb_build_object('account_code','platform_commission_revenue','party_type','PLATFORM','direction','DEBIT','amount',v_commission_reversal,'order_id',v_order.id,'transaction_id',v_refund.transaction_id,'vendor_id',v_order.vendor_id,'payment_attempt_id',v_refund.payment_attempt_id,'refund_request_id',v_refund.id,'description','Commission revenue reversed for refund'),
      jsonb_build_object('account_code','refund_liability','party_type','PLATFORM','direction','CREDIT','amount',v_seller_reversal + v_commission_reversal,'order_id',v_order.id,'transaction_id',v_refund.transaction_id,'vendor_id',v_order.vendor_id,'payment_attempt_id',v_refund.payment_attempt_id,'refund_request_id',v_refund.id,'description','Refund liability cleared against marketplace reversals')
    ),
    jsonb_build_object('refundAmount', v_refund.amount, 'sellerReversal', v_seller_reversal, 'commissionReversal', v_commission_reversal)
  );

  update public.settlement_records
  set refund_adjustment_amount = refund_adjustment_amount + v_refund.amount,
      payout_deduction_amount = payout_deduction_amount + v_seller_reversal,
      available_amount = greatest(0, available_amount - v_seller_reversal),
      lifecycle_state = 'REFUND_ADJUSTED',
      metadata = metadata || jsonb_build_object('lastRefundId', v_refund.id, 'lastRefundJournalId', v_journal_id)
  where id = v_settlement.id;

  update public.seller_payout_attributions
  set net_amount = greatest(0, net_amount - v_seller_reversal),
      state = case when net_amount - v_seller_reversal <= 0 then 'PAYOUT_ON_HOLD'::public.payout_sync_state else state end,
      metadata = metadata || jsonb_build_object('lastRefundId', v_refund.id, 'refundDeduction', v_seller_reversal),
      updated_at = now()
  where order_id = v_order.id;

  perform public.record_financial_metric('finance.refund.adjusted', 1, v_order.vendor_id, v_order.id, v_refund.transaction_id, null, jsonb_build_object('refundAmount', v_refund.amount, 'sellerReversal', v_seller_reversal));

  return jsonb_build_object('refundId', v_refund.id, 'journalId', v_journal_id, 'sellerReversal', v_seller_reversal, 'commissionReversal', v_commission_reversal);
end;
$$;

create or replace function public.create_seller_payout_batch(
  target_vendor_id uuid,
  batch_idempotency_key text,
  batch_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_batch_id uuid;
  v_amount numeric(12, 2) := 0;
  settlement_rec record;
  v_count integer := 0;
begin
  if target_vendor_id is null then
    raise exception 'VENDOR_REQUIRED';
  end if;

  if not public.current_user_is_vendor_member(target_vendor_id) and not public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]) then
    raise exception 'FORBIDDEN';
  end if;

  insert into public.seller_payout_batches (vendor_id, idempotency_key, created_by, metadata)
  values (target_vendor_id, batch_idempotency_key, v_user_id, jsonb_build_object('source', 'phase_28_payout_orchestration'))
  on conflict (idempotency_key) do nothing
  returning id into v_batch_id;

  if v_batch_id is null then
    select id into v_batch_id from public.seller_payout_batches where idempotency_key = batch_idempotency_key;
    return jsonb_build_object('batchId', v_batch_id, 'duplicate', true);
  end if;

  for settlement_rec in
    select *
    from public.settlement_records
    where vendor_id = target_vendor_id
      and lifecycle_state in ('PAYOUT_PENDING', 'SETTLED')
      and available_amount > 0
      and expected_payout_at <= now()
    order by expected_payout_at, created_at
    limit batch_limit
    for update skip locked
  loop
    insert into public.seller_payout_batch_items (payout_batch_id, settlement_record_id, order_id, vendor_id, amount, currency)
    values (v_batch_id, settlement_rec.id, settlement_rec.order_id, settlement_rec.vendor_id, settlement_rec.available_amount, settlement_rec.currency);

    update public.settlement_records
    set lifecycle_state = 'PAYOUT_PROCESSING',
        payout_released_at = now()
    where id = settlement_rec.id;

    v_amount := v_amount + settlement_rec.available_amount;
    v_count := v_count + 1;
  end loop;

  update public.seller_payout_batches
  set amount = v_amount,
      state = case when v_count = 0 then 'CANCELLED'::public.payout_batch_state else 'PROCESSING'::public.payout_batch_state end,
      initiated_at = case when v_count = 0 then null else now() end,
      failure_code = case when v_count = 0 then 'NO_ELIGIBLE_SETTLEMENTS' else null end,
      failure_reason = case when v_count = 0 then 'No settlement records were eligible for payout.' else null end
  where id = v_batch_id;

  perform public.record_financial_metric('finance.payout.batch_created', v_count, target_vendor_id, null, null, v_batch_id, jsonb_build_object('amount', v_amount));
  return jsonb_build_object('batchId', v_batch_id, 'items', v_count, 'amount', v_amount, 'duplicate', false);
end;
$$;

create or replace function public.complete_seller_payout_batch(
  target_batch_id uuid,
  provider_payout_id text default null,
  bank_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.seller_payout_batches%rowtype;
  v_journal_id uuid;
begin
  if not public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_batch from public.seller_payout_batches where id = target_batch_id for update;
  if v_batch.id is null then
    raise exception 'PAYOUT_BATCH_NOT_FOUND';
  end if;

  if v_batch.state = 'COMPLETED' then
    return jsonb_build_object('batchId', v_batch.id, 'duplicate', true);
  end if;

  if v_batch.amount <= 0 then
    raise exception 'EMPTY_PAYOUT_BATCH';
  end if;

  v_journal_id := public.post_financial_journal(
    'seller_payout',
    v_batch.id,
    'payout:' || v_batch.id::text || ':completed',
    auth.uid(),
    'admin',
    v_batch.currency,
    'Seller payout completed',
    jsonb_build_array(
      jsonb_build_object('account_code','seller_payable','party_type','SELLER','party_id',v_batch.vendor_id,'direction','DEBIT','amount',v_batch.amount,'vendor_id',v_batch.vendor_id,'payout_batch_id',v_batch.id,'description','Seller payable reduced by payout'),
      jsonb_build_object('account_code','cash_bank','party_type','BANK','direction','CREDIT','amount',v_batch.amount,'vendor_id',v_batch.vendor_id,'payout_batch_id',v_batch.id,'description','Bank cash released to seller payout')
    ),
    jsonb_build_object('providerPayoutId', provider_payout_id, 'bankReference', bank_reference)
  );

  update public.seller_payout_batches
  set state = 'COMPLETED',
      provider_payout_id = complete_seller_payout_batch.provider_payout_id,
      bank_reference = complete_seller_payout_batch.bank_reference,
      completed_at = now(),
      reconciled_at = now(),
      metadata = metadata || jsonb_build_object('ledgerJournalId', v_journal_id)
  where id = v_batch.id;

  update public.settlement_records sr
  set lifecycle_state = 'PAYOUT_COMPLETED',
      available_amount = 0
  from public.seller_payout_batch_items item
  where item.payout_batch_id = v_batch.id
    and item.settlement_record_id = sr.id;

  update public.seller_payout_attributions spa
  set state = 'PAYOUT_SYNCED',
      updated_at = now()
  from public.seller_payout_batch_items item
  where item.payout_batch_id = v_batch.id
    and item.order_id = spa.order_id;

  perform public.record_financial_metric('finance.payout.completed', 1, v_batch.vendor_id, null, null, v_batch.id, jsonb_build_object('amount', v_batch.amount));
  return jsonb_build_object('batchId', v_batch.id, 'journalId', v_journal_id, 'duplicate', false);
end;
$$;

create or replace function public.fail_seller_payout_batch(target_batch_id uuid, failure_code text, failure_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.seller_payout_batches%rowtype;
begin
  if not public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_batch from public.seller_payout_batches where id = target_batch_id for update;
  if v_batch.id is null then
    raise exception 'PAYOUT_BATCH_NOT_FOUND';
  end if;

  update public.seller_payout_batches
  set state = 'FAILED',
      retry_count = retry_count + 1,
      failure_code = fail_seller_payout_batch.failure_code,
      failure_reason = fail_seller_payout_batch.failure_reason
  where id = v_batch.id;

  update public.settlement_records sr
  set lifecycle_state = 'PAYOUT_FAILED',
      hold_reason = fail_seller_payout_batch.failure_reason
  from public.seller_payout_batch_items item
  where item.payout_batch_id = v_batch.id
    and item.settlement_record_id = sr.id;

  insert into public.financial_reconciliation_cases (
    case_type,
    severity,
    vendor_id,
    payout_batch_id,
    expected_amount,
    observed_amount,
    fingerprint,
    title,
    detail,
    recovery_action,
    metadata
  )
  values (
    'PAYOUT_MISMATCH',
    'critical',
    v_batch.vendor_id,
    v_batch.id,
    v_batch.amount,
    0,
    'payout_failed:' || v_batch.id::text,
    'Payout processing failed',
    coalesce(failure_reason, 'Seller payout failed before completion.'),
    'Retry payout batch after validating payout method and provider state.',
    jsonb_build_object('failureCode', failure_code)
  )
  on conflict (fingerprint) do update
  set state = 'OPEN',
      updated_at = now(),
      detail = excluded.detail,
      recovery_action = excluded.recovery_action;

  perform public.record_financial_metric('finance.payout.failed', 1, v_batch.vendor_id, null, null, v_batch.id, jsonb_build_object('failureCode', failure_code));
  return jsonb_build_object('batchId', v_batch.id, 'state', 'FAILED');
end;
$$;

create or replace function public.retry_failed_payout_batch(target_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.seller_payout_batches%rowtype;
begin
  if not public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_batch from public.seller_payout_batches where id = target_batch_id for update;
  if v_batch.id is null then
    raise exception 'PAYOUT_BATCH_NOT_FOUND';
  end if;

  update public.seller_payout_batches
  set state = 'RETRYING',
      failure_code = null,
      failure_reason = null,
      initiated_at = now()
  where id = v_batch.id;

  update public.settlement_records sr
  set lifecycle_state = 'PAYOUT_PROCESSING',
      hold_reason = null
  from public.seller_payout_batch_items item
  where item.payout_batch_id = v_batch.id
    and item.settlement_record_id = sr.id;

  return jsonb_build_object('batchId', v_batch.id, 'state', 'RETRYING', 'retryCount', v_batch.retry_count);
end;
$$;

create or replace function public.run_financial_reconciliation(batch_size integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
  payment_rec record;
  settlement_rec record;
  payout_rec record;
  refund_rec record;
  v_checked integer := 0;
  v_alerts integer := 0;
begin
  insert into public.financial_reconciliation_runs (run_type, state, started_at, metadata)
  values ('marketplace_financial_operating_layer', 'RUNNING', now(), jsonb_build_object('phase', 28))
  returning id into v_run_id;

  for payment_rec in
    select pa.*, ct.state as transaction_state
    from public.payment_attempts pa
    join public.checkout_transactions ct on ct.id = pa.transaction_id
    where pa.financial_state in ('PAYMENT_PENDING', 'PAYMENT_AUTHORIZED', 'PAYMENT_RECONCILING')
      and pa.created_at < now() - interval '10 minutes'
    order by pa.created_at
    limit batch_size
    for update of pa skip locked
  loop
    v_checked := v_checked + 1;
    update public.payment_attempts
    set financial_state = 'PAYMENT_RECONCILING',
        reconciliation_state = 'RECONCILIATION_REQUIRED'
    where id = payment_rec.id
      and financial_state <> 'PAYMENT_RECONCILING';

    insert into public.financial_reconciliation_cases (run_id, case_type, severity, transaction_id, payment_attempt_id, expected_amount, observed_amount, fingerprint, title, detail, recovery_action, metadata)
    values (v_run_id, 'ORPHAN_PAYMENT', 'warning', payment_rec.transaction_id, payment_rec.id, payment_rec.amount, null, 'payment_delayed:' || payment_rec.id::text, 'Delayed payment confirmation', 'Payment confirmation is delayed and requires provider reconciliation.', 'Poll provider and replay webhook if captured externally.', jsonb_build_object('providerOrderId', payment_rec.provider_order_id, 'financialState', payment_rec.financial_state))
    on conflict (fingerprint) do update set run_id = excluded.run_id, state = 'OPEN', updated_at = now();
    v_alerts := v_alerts + 1;
  end loop;

  for settlement_rec in
    select sr.*
    from public.settlement_records sr
    left join public.financial_ledger_entries le on le.source_type = 'order_settlement' and le.source_id = sr.id
    where le.id is null
    limit batch_size
  loop
    v_checked := v_checked + 1;
    insert into public.financial_reconciliation_cases (run_id, case_type, severity, vendor_id, order_id, transaction_id, payment_attempt_id, expected_amount, observed_amount, fingerprint, title, detail, recovery_action)
    values (v_run_id, 'MISSING_LEDGER_POSTING', 'critical', settlement_rec.vendor_id, settlement_rec.order_id, settlement_rec.transaction_id, settlement_rec.payment_attempt_id, settlement_rec.net_amount, 0, 'missing_ledger:' || settlement_rec.id::text, 'Settlement missing ledger posting', 'A settlement record exists without authoritative ledger entries.', 'Repost settlement journal using the original payment event id.')
    on conflict (fingerprint) do update set run_id = excluded.run_id, state = 'OPEN', updated_at = now();
    v_alerts := v_alerts + 1;
  end loop;

  for settlement_rec in
    select *
    from public.settlement_records
    where lifecycle_state in ('PAYOUT_PENDING', 'PAYOUT_PROCESSING')
      and expected_payout_at < now() - interval '2 days'
    limit batch_size
  loop
    v_checked := v_checked + 1;
    insert into public.financial_reconciliation_cases (run_id, case_type, severity, vendor_id, order_id, transaction_id, payment_attempt_id, expected_amount, observed_amount, fingerprint, title, detail, recovery_action)
    values (v_run_id, 'SETTLEMENT_DRIFT', 'warning', settlement_rec.vendor_id, settlement_rec.order_id, settlement_rec.transaction_id, settlement_rec.payment_attempt_id, settlement_rec.available_amount, null, 'settlement_backlog:' || settlement_rec.id::text, 'Settlement payout backlog', 'Settlement remains eligible or processing beyond the payout SLA.', 'Review payout holds and create or retry seller payout batch.')
    on conflict (fingerprint) do update set run_id = excluded.run_id, state = 'OPEN', updated_at = now();
    v_alerts := v_alerts + 1;
  end loop;

  for payout_rec in
    select *
    from public.seller_payout_batches
    where state in ('PROCESSING', 'RETRYING')
      and initiated_at < now() - interval '1 day'
    limit batch_size
  loop
    v_checked := v_checked + 1;
    insert into public.financial_reconciliation_cases (run_id, case_type, severity, vendor_id, payout_batch_id, expected_amount, observed_amount, fingerprint, title, detail, recovery_action)
    values (v_run_id, 'PAYOUT_MISMATCH', 'critical', payout_rec.vendor_id, payout_rec.id, payout_rec.amount, null, 'payout_stalled:' || payout_rec.id::text, 'Payout processing stalled', 'Payout batch has not completed within the expected processing window.', 'Verify provider state, then complete, fail, or retry the payout batch.')
    on conflict (fingerprint) do update set run_id = excluded.run_id, state = 'OPEN', updated_at = now();
    v_alerts := v_alerts + 1;
  end loop;

  for refund_rec in
    select rr.*
    from public.refund_requests rr
    left join public.financial_ledger_entries le on le.refund_request_id = rr.id
    where rr.state = 'REFUND_SUCCEEDED'
      and le.id is null
    limit batch_size
  loop
    v_checked := v_checked + 1;
    insert into public.financial_reconciliation_cases (run_id, case_type, severity, order_id, transaction_id, payment_attempt_id, refund_request_id, expected_amount, observed_amount, fingerprint, title, detail, recovery_action)
    values (v_run_id, 'REFUND_MISMATCH', 'critical', refund_rec.order_id, refund_rec.transaction_id, refund_rec.payment_attempt_id, refund_rec.id, refund_rec.amount, 0, 'refund_missing_ledger:' || refund_rec.id::text, 'Refund missing ledger adjustment', 'Provider refund succeeded but refund accounting has not been posted.', 'Run refund adjustment posting for this refund request.')
    on conflict (fingerprint) do update set run_id = excluded.run_id, state = 'OPEN', updated_at = now();
    v_alerts := v_alerts + 1;
  end loop;

  update public.financial_reconciliation_runs
  set state = 'SUCCEEDED',
      completed_at = now(),
      checked_count = v_checked,
      alert_count = v_alerts
  where id = v_run_id;

  perform public.record_financial_metric('finance.reconciliation.completed', 1, null, null, null, null, jsonb_build_object('runId', v_run_id, 'checked', v_checked, 'alerts', v_alerts));
  return jsonb_build_object('runId', v_run_id, 'checked', v_checked, 'alerts', v_alerts);
exception
  when others then
    update public.financial_reconciliation_runs
    set state = 'FAILED',
        completed_at = now(),
        metadata = metadata || jsonb_build_object('sqlstate', sqlstate, 'message', sqlerrm)
    where id = v_run_id;
    raise;
end;
$$;

create or replace function public.reconcile_payment_webhook(
  provider_name text,
  event_id text,
  event_type text,
  provider_order_id text,
  provider_payment_id text,
  signature_valid boolean,
  raw_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.payment_attempts%rowtype;
  v_transaction public.checkout_transactions%rowtype;
  v_state public.payment_attempt_state;
  v_financial_state public.payment_financial_state;
  v_event_row public.payment_webhook_events%rowtype;
  order_rec record;
  settlement_results jsonb := '[]'::jsonb;
begin
  insert into public.payment_webhook_events (provider, event_id, event_type, provider_order_id, provider_payment_id, signature_valid, raw_payload)
  values (provider_name, event_id, event_type, provider_order_id, provider_payment_id, signature_valid, raw_payload)
  on conflict (provider, event_id) do update
  set raw_payload = excluded.raw_payload
  returning * into v_event_row;

  if v_event_row.processed_at is not null then
    return jsonb_build_object('processed', true, 'duplicate', true);
  end if;

  if not signature_valid then
    update public.payment_webhook_events set processing_error = 'INVALID_SIGNATURE' where id = v_event_row.id;
    insert into public.transaction_integrity_alerts (severity, code, message, metadata)
    values ('critical', 'WEBHOOK_SIGNATURE_INVALID', 'Razorpay webhook signature verification failed.', jsonb_build_object('event_id', event_id, 'provider_order_id', provider_order_id));
    return jsonb_build_object('processed', false, 'error', 'INVALID_SIGNATURE');
  end if;

  select * into v_attempt
  from public.payment_attempts
  where provider = provider_name and provider_order_id = reconcile_payment_webhook.provider_order_id
  for update;

  if v_attempt.id is null then
    insert into public.transaction_integrity_alerts (severity, code, message, metadata)
    values ('critical', 'ORPHAN_PAYMENT_WEBHOOK', 'Payment webhook did not match any payment attempt.', jsonb_build_object('provider_order_id', provider_order_id, 'event_id', event_id));
    insert into public.financial_reconciliation_cases (case_type, severity, expected_amount, observed_amount, fingerprint, title, detail, recovery_action, metadata)
    values ('ORPHAN_PAYMENT', 'critical', null, null, 'orphan_webhook:' || event_id, 'Orphan payment webhook', 'Payment webhook did not match any internal payment attempt.', 'Verify provider order id and attach or quarantine the event.', jsonb_build_object('providerOrderId', provider_order_id, 'eventId', event_id))
    on conflict (fingerprint) do update set state = 'OPEN', updated_at = now();
    update public.payment_webhook_events set processing_error = 'ORPHAN_PAYMENT_WEBHOOK' where id = v_event_row.id;
    return jsonb_build_object('processed', false, 'error', 'ORPHAN_PAYMENT_WEBHOOK');
  end if;

  v_state := case
    when event_type in ('payment.captured', 'order.paid') then 'SUCCEEDED'::public.payment_attempt_state
    when event_type in ('payment.authorized') then 'PROCESSING'::public.payment_attempt_state
    when event_type in ('payment.failed') then 'FAILED'::public.payment_attempt_state
    when event_type in ('refund.processed') then 'REFUNDED'::public.payment_attempt_state
    else 'PROCESSING'::public.payment_attempt_state
  end;

  v_financial_state := case
    when event_type in ('payment.captured', 'order.paid') then 'PAYMENT_CAPTURED'::public.payment_financial_state
    when event_type in ('payment.authorized') then 'PAYMENT_AUTHORIZED'::public.payment_financial_state
    when event_type in ('payment.failed') then 'PAYMENT_FAILED'::public.payment_financial_state
    when event_type in ('payment.cancelled') then 'PAYMENT_CANCELLED'::public.payment_financial_state
    when event_type in ('refund.processed') then 'PAYMENT_REFUNDED'::public.payment_financial_state
    when event_type like 'dispute.%' then 'PAYMENT_DISPUTED'::public.payment_financial_state
    else 'PAYMENT_RECONCILING'::public.payment_financial_state
  end;

  update public.payment_attempts
  set state = v_state,
      financial_state = case
        when payment_attempts.financial_state = v_financial_state then payment_attempts.financial_state
        when public.is_valid_payment_financial_transition(payment_attempts.financial_state, v_financial_state) then v_financial_state
        else 'PAYMENT_RECONCILING'::public.payment_financial_state
      end,
      provider_payment_id = coalesce(reconcile_payment_webhook.provider_payment_id, payment_attempts.provider_payment_id),
      raw_payload = raw_payload || reconcile_payment_webhook.raw_payload,
      verified_at = case when v_state in ('SUCCEEDED', 'REFUNDED') then now() else verified_at end,
      failure_reason = case when v_state = 'FAILED' then coalesce(raw_payload #>> '{payload,payment,entity,error_description}', 'Payment failed at provider') else failure_reason end,
      reconciliation_state = 'WEBHOOK_PROCESSED',
      reconciliation_error = null
  where id = v_attempt.id;

  select * into v_transaction from public.checkout_transactions where id = v_attempt.transaction_id for update;

  insert into public.payment_order_events (payment_attempt_id, transaction_id, event_type, financial_state, provider_order_id, provider_payment_id, amount, currency, metadata)
  values (v_attempt.id, v_attempt.transaction_id, event_type, v_financial_state, provider_order_id, provider_payment_id, v_attempt.amount, v_attempt.currency, raw_payload);

  if v_financial_state = 'PAYMENT_CAPTURED' then
    update public.checkout_transactions set state = 'PAYMENT_CONFIRMED' where id = v_transaction.id;
    update public.orders set payment_status = 'SUCCEEDED', status = 'CONFIRMED' where metadata ->> 'checkout_transaction_id' = v_transaction.id::text and payment_status <> 'SUCCEEDED';
    update public.inventory_reservations set state = 'CONSUMED' where transaction_id = v_transaction.id and state = 'ACTIVE';

    for order_rec in
      select id
      from public.orders
      where metadata ->> 'checkout_transaction_id' = v_transaction.id::text
      order by created_at
    loop
      settlement_results := settlement_results || jsonb_build_array(public.post_order_financial_settlement(order_rec.id, 'payment_capture:' || event_id || ':' || order_rec.id::text));
    end loop;

    insert into public.transaction_audit_events (transaction_id, actor_type, action, state, metadata)
    values (v_transaction.id, 'payment_gateway', 'payment_captured_authoritatively', 'PAYMENT_CONFIRMED', jsonb_build_object('event_id', event_id, 'provider_payment_id', provider_payment_id, 'settlements', settlement_results));
  elsif v_financial_state = 'PAYMENT_FAILED' then
    update public.checkout_transactions set state = 'FAILED', failure_code = 'PAYMENT_FAILED', failure_message = 'Payment provider reported failure.' where id = v_transaction.id;
    update public.orders set payment_status = 'FAILED', status = 'CANCELLED' where metadata ->> 'checkout_transaction_id' = v_transaction.id::text;
    perform public.release_failed_transaction_reservations(v_transaction.id, 'payment_failed');
  elsif v_financial_state in ('PAYMENT_REFUNDED', 'PAYMENT_DISPUTED') then
    update public.orders
    set payment_status = case when v_financial_state = 'PAYMENT_REFUNDED' then 'REFUNDED' else payment_status end,
        status = case when v_financial_state = 'PAYMENT_REFUNDED' then 'REFUNDED'::public.order_status else status end
    where metadata ->> 'checkout_transaction_id' = v_transaction.id::text;
  end if;

  update public.payment_webhook_events set processed_at = now(), processing_error = null where id = v_event_row.id;
  return jsonb_build_object('processed', true, 'duplicate', false, 'state', v_state, 'financialState', v_financial_state, 'settlements', settlement_results);
end;
$$;

alter publication supabase_realtime add table public.settlement_records;
alter publication supabase_realtime add table public.seller_payout_batches;
alter publication supabase_realtime add table public.financial_reconciliation_cases;

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('phase_28_financial_ledger_engine', 'Enables immutable balanced marketplace ledger journals for payments, commissions, refunds, and payouts.', true, 100, '{"roles":["ADMIN","SELLER"]}'),
  ('phase_28_commission_orchestration', 'Enables versioned explainable commission rule resolution for seller settlements.', true, 100, '{"roles":["ADMIN","SELLER"]}'),
  ('phase_28_payout_orchestration', 'Enables deterministic seller payout batches, retry recovery, and payout lifecycle visibility.', true, 100, '{"roles":["ADMIN","SELLER"]}'),
  ('phase_28_reconciliation_cases', 'Enables finance reconciliation cases for payment, refund, settlement, and payout drift.', true, 100, '{"roles":["ADMIN"]}')
on conflict (key) do update
set description = excluded.description,
    is_enabled = excluded.is_enabled,
    rollout_percentage = excluded.rollout_percentage,
    audience = excluded.audience,
    updated_at = now();
