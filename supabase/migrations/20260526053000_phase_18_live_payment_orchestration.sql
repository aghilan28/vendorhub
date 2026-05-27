create type public.payment_financial_state as enum (
  'PAYMENT_CREATED',
  'PAYMENT_PENDING',
  'PAYMENT_AUTHORIZED',
  'PAYMENT_CAPTURED',
  'PAYMENT_FAILED',
  'PAYMENT_CANCELLED',
  'PAYMENT_EXPIRED',
  'PAYMENT_REFUNDED',
  'PAYMENT_RECONCILING',
  'PAYMENT_DISPUTED'
);

create type public.refund_state as enum (
  'REFUND_REQUESTED',
  'REFUND_APPROVED',
  'REFUND_INITIATED',
  'REFUND_PROCESSING',
  'REFUND_SUCCEEDED',
  'REFUND_FAILED',
  'REFUND_REJECTED',
  'REFUND_RECONCILING'
);

create type public.payout_sync_state as enum ('PAYOUT_PENDING', 'PAYOUT_ELIGIBLE', 'PAYOUT_ON_HOLD', 'PAYOUT_SYNCED', 'PAYOUT_FAILED');

alter table public.payment_attempts
  add column if not exists financial_state public.payment_financial_state not null default 'PAYMENT_CREATED',
  add column if not exists receipt text,
  add column if not exists provider_order_status text,
  add column if not exists provider_amount_due numeric(12, 2),
  add column if not exists provider_amount_paid numeric(12, 2),
  add column if not exists provider_created_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists verification_attempts integer not null default 0 check (verification_attempts >= 0),
  add column if not exists last_verified_at timestamptz,
  add column if not exists reconciliation_state text not null default 'NOT_STARTED',
  add column if not exists reconciliation_error text;

create table public.payment_order_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  payment_attempt_id uuid not null references public.payment_attempts(id) on delete cascade,
  transaction_id uuid not null references public.checkout_transactions(id) on delete cascade,
  provider text not null default 'razorpay',
  event_type text not null,
  financial_state public.payment_financial_state not null,
  provider_order_id text,
  provider_payment_id text,
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  currency char(3) not null default 'INR',
  metadata jsonb not null default '{}'::jsonb
);

create table public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  order_id uuid not null references public.orders(id) on delete restrict,
  transaction_id uuid references public.checkout_transactions(id) on delete set null,
  payment_attempt_id uuid references public.payment_attempts(id) on delete set null,
  requested_by uuid references public.profiles(id) on delete set null,
  state public.refund_state not null default 'REFUND_REQUESTED',
  amount numeric(12, 2) not null check (amount > 0),
  currency char(3) not null default 'INR',
  reason text not null,
  provider_refund_id text,
  idempotency_key text not null unique,
  raw_payload jsonb not null default '{}'::jsonb,
  failure_reason text,
  completed_at timestamptz
);

create table public.seller_payout_attributions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  order_id uuid not null references public.orders(id) on delete cascade,
  transaction_id uuid references public.checkout_transactions(id) on delete set null,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  payment_attempt_id uuid references public.payment_attempts(id) on delete set null,
  gross_amount numeric(12, 2) not null check (gross_amount >= 0),
  commission_amount numeric(12, 2) not null default 0 check (commission_amount >= 0),
  tax_withheld_amount numeric(12, 2) not null default 0 check (tax_withheld_amount >= 0),
  net_amount numeric(12, 2) not null check (net_amount >= 0),
  currency char(3) not null default 'INR',
  state public.payout_sync_state not null default 'PAYOUT_PENDING',
  metadata jsonb not null default '{}'::jsonb,
  unique (order_id, vendor_id)
);

create table public.financial_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  run_type text not null,
  state public.recovery_job_state not null default 'PENDING',
  started_at timestamptz,
  completed_at timestamptz,
  checked_count integer not null default 0 check (checked_count >= 0),
  repaired_count integer not null default 0 check (repaired_count >= 0),
  alert_count integer not null default 0 check (alert_count >= 0),
  metadata jsonb not null default '{}'::jsonb
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['refund_requests', 'seller_payout_attributions', 'financial_reconciliation_runs']
  loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

create index payment_attempts_financial_state_idx on public.payment_attempts(financial_state, created_at desc);
create index payment_order_events_attempt_idx on public.payment_order_events(payment_attempt_id, created_at desc);
create index refund_requests_order_state_idx on public.refund_requests(order_id, state);
create index seller_payout_attributions_vendor_state_idx on public.seller_payout_attributions(vendor_id, state);
create index financial_reconciliation_runs_state_idx on public.financial_reconciliation_runs(state, created_at desc);

alter table public.payment_order_events enable row level security;
alter table public.refund_requests enable row level security;
alter table public.seller_payout_attributions enable row level security;
alter table public.financial_reconciliation_runs enable row level security;

create policy "payment_order_events_party_select" on public.payment_order_events for select using (
  exists (select 1 from public.checkout_transactions t where t.id = transaction_id and t.buyer_id = auth.uid())
  or exists (select 1 from public.orders o where o.metadata ->> 'checkout_transaction_id' = transaction_id::text and public.current_user_is_vendor_member(o.vendor_id))
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);

create policy "refund_requests_party_select" on public.refund_requests for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or public.current_user_is_vendor_member(o.vendor_id)))
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);

create policy "seller_payout_attributions_vendor_admin_select" on public.seller_payout_attributions for select using (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);

create policy "financial_reconciliation_runs_admin_select" on public.financial_reconciliation_runs for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create or replace function public.is_valid_payment_financial_transition(from_state public.payment_financial_state, to_state public.payment_financial_state)
returns boolean
language sql
immutable
as $$
  select case from_state
    when 'PAYMENT_CREATED' then to_state in ('PAYMENT_PENDING', 'PAYMENT_CANCELLED', 'PAYMENT_EXPIRED')
    when 'PAYMENT_PENDING' then to_state in ('PAYMENT_AUTHORIZED', 'PAYMENT_CAPTURED', 'PAYMENT_FAILED', 'PAYMENT_CANCELLED', 'PAYMENT_EXPIRED', 'PAYMENT_RECONCILING')
    when 'PAYMENT_AUTHORIZED' then to_state in ('PAYMENT_CAPTURED', 'PAYMENT_FAILED', 'PAYMENT_RECONCILING')
    when 'PAYMENT_CAPTURED' then to_state in ('PAYMENT_REFUNDED', 'PAYMENT_DISPUTED', 'PAYMENT_RECONCILING')
    when 'PAYMENT_RECONCILING' then to_state in ('PAYMENT_PENDING', 'PAYMENT_AUTHORIZED', 'PAYMENT_CAPTURED', 'PAYMENT_FAILED', 'PAYMENT_REFUNDED', 'PAYMENT_DISPUTED')
    when 'PAYMENT_FAILED' then to_state in ('PAYMENT_RECONCILING')
    when 'PAYMENT_CANCELLED' then false
    when 'PAYMENT_EXPIRED' then false
    when 'PAYMENT_REFUNDED' then false
    when 'PAYMENT_DISPUTED' then to_state in ('PAYMENT_CAPTURED', 'PAYMENT_REFUNDED')
    else false
  end;
$$;

create or replace function public.enforce_payment_financial_transition()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.financial_state is distinct from new.financial_state then
    if not public.is_valid_payment_financial_transition(old.financial_state, new.financial_state) then
      raise exception 'Invalid payment transition from % to %', old.financial_state, new.financial_state;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_payment_financial_transition_before_update on public.payment_attempts;
create trigger enforce_payment_financial_transition_before_update
before update of financial_state on public.payment_attempts
for each row execute function public.enforce_payment_financial_transition();

create or replace function public.register_live_razorpay_order(
  target_transaction_id uuid,
  razorpay_order_id text,
  receipt text,
  provider_status text,
  amount_due numeric,
  amount_paid numeric,
  provider_created_at timestamptz,
  raw_provider_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.payment_attempts%rowtype;
begin
  select * into v_attempt
  from public.payment_attempts
  where transaction_id = target_transaction_id
  for update;

  if v_attempt.id is null then
    raise exception 'PAYMENT_ATTEMPT_NOT_FOUND';
  end if;

  if v_attempt.financial_state not in ('PAYMENT_CREATED', 'PAYMENT_PENDING', 'PAYMENT_RECONCILING') then
    raise exception 'PAYMENT_ORDER_ALREADY_ADVANCED:%', v_attempt.financial_state;
  end if;

  update public.payment_attempts
  set provider_order_id = razorpay_order_id,
      receipt = register_live_razorpay_order.receipt,
      provider_order_status = provider_status,
      provider_amount_due = amount_due,
      provider_amount_paid = amount_paid,
      provider_created_at = provider_created_at,
      raw_payload = raw_payload || raw_provider_payload,
      state = 'PENDING',
      financial_state = 'PAYMENT_PENDING',
      expires_at = coalesce(expires_at, now() + interval '20 minutes')
  where id = v_attempt.id;

  update public.checkout_transactions
  set state = 'PAYMENT_PENDING',
      metadata = metadata || jsonb_build_object('razorpay_order_id', razorpay_order_id, 'receipt', receipt)
  where id = target_transaction_id;

  insert into public.payment_order_events (payment_attempt_id, transaction_id, event_type, financial_state, provider_order_id, amount, currency, metadata)
  values (v_attempt.id, target_transaction_id, 'razorpay.order.created', 'PAYMENT_PENDING', razorpay_order_id, v_attempt.amount, v_attempt.currency, raw_provider_payload);

  insert into public.transaction_audit_events (transaction_id, actor_type, action, state, metadata)
  values (target_transaction_id, 'payment_gateway', 'live_payment_order_created', 'PAYMENT_PENDING', jsonb_build_object('provider_order_id', razorpay_order_id, 'receipt', receipt));

  return jsonb_build_object('paymentAttemptId', v_attempt.id, 'providerOrderId', razorpay_order_id, 'state', 'PAYMENT_PENDING');
end;
$$;

create or replace function public.record_payment_signature_verification(
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  signature_valid boolean,
  raw_verification_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.payment_attempts%rowtype;
  v_next_state public.payment_financial_state;
begin
  select * into v_attempt
  from public.payment_attempts
  where provider = 'razorpay' and provider_order_id = razorpay_order_id
  for update;

  if v_attempt.id is null then
    insert into public.transaction_integrity_alerts (severity, code, message, metadata)
    values ('critical', 'ORPHAN_PAYMENT_VERIFICATION', 'Payment verification did not match any payment attempt.', jsonb_build_object('razorpay_order_id', razorpay_order_id, 'razorpay_payment_id', razorpay_payment_id));
    return jsonb_build_object('verified', false, 'error', 'ORPHAN_PAYMENT_VERIFICATION');
  end if;

  if not signature_valid then
    update public.payment_attempts
    set verification_attempts = verification_attempts + 1,
        raw_payload = raw_payload || raw_verification_payload,
        reconciliation_state = 'SIGNATURE_FAILED',
        reconciliation_error = 'Invalid Razorpay payment signature'
    where id = v_attempt.id;

    insert into public.transaction_integrity_alerts (severity, code, transaction_id, message, metadata)
    values ('critical', 'PAYMENT_SIGNATURE_MISMATCH', v_attempt.transaction_id, 'Razorpay signature verification failed.', jsonb_build_object('razorpay_order_id', razorpay_order_id, 'razorpay_payment_id', razorpay_payment_id));

    return jsonb_build_object('verified', false, 'state', v_attempt.financial_state);
  end if;

  v_next_state := case
    when v_attempt.financial_state = 'PAYMENT_CAPTURED' then 'PAYMENT_CAPTURED'::public.payment_financial_state
    else 'PAYMENT_AUTHORIZED'::public.payment_financial_state
  end;

  update public.payment_attempts
  set provider_payment_id = razorpay_payment_id,
      provider_signature = razorpay_signature,
      verification_attempts = verification_attempts + 1,
      last_verified_at = now(),
      raw_payload = raw_payload || raw_verification_payload,
      financial_state = v_next_state,
      state = case when v_next_state = 'PAYMENT_CAPTURED' then 'SUCCEEDED'::public.payment_attempt_state else 'PROCESSING'::public.payment_attempt_state end,
      reconciliation_state = 'AWAITING_WEBHOOK'
  where id = v_attempt.id;

  insert into public.payment_order_events (payment_attempt_id, transaction_id, event_type, financial_state, provider_order_id, provider_payment_id, amount, currency, metadata)
  values (v_attempt.id, v_attempt.transaction_id, 'razorpay.payment.signature_verified', v_next_state, razorpay_order_id, razorpay_payment_id, v_attempt.amount, v_attempt.currency, raw_verification_payload);

  insert into public.transaction_audit_events (transaction_id, actor_type, action, state, metadata)
  values (v_attempt.transaction_id, 'payment_gateway', 'payment_signature_verified', 'PAYMENT_PENDING', jsonb_build_object('provider_order_id', razorpay_order_id, 'provider_payment_id', razorpay_payment_id, 'awaiting_webhook', true));

  return jsonb_build_object('verified', true, 'state', v_next_state, 'awaitingWebhook', true);
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

    insert into public.seller_payout_attributions (order_id, transaction_id, vendor_id, payment_attempt_id, gross_amount, commission_amount, tax_withheld_amount, net_amount, currency, state, metadata)
    select o.id,
           v_transaction.id,
           o.vendor_id,
           v_attempt.id,
           o.total_amount,
           round(o.total_amount * 0.08, 2),
           0,
           greatest(0, o.total_amount - round(o.total_amount * 0.08, 2)),
           o.currency,
           'PAYOUT_ELIGIBLE',
           jsonb_build_object('provider_order_id', provider_order_id, 'provider_payment_id', provider_payment_id)
    from public.orders o
    where o.metadata ->> 'checkout_transaction_id' = v_transaction.id::text
    on conflict (order_id, vendor_id) do update
    set gross_amount = excluded.gross_amount,
        commission_amount = excluded.commission_amount,
        net_amount = excluded.net_amount,
        state = excluded.state,
        metadata = seller_payout_attributions.metadata || excluded.metadata,
        updated_at = now();

    insert into public.transaction_audit_events (transaction_id, actor_type, action, state, metadata)
    values (v_transaction.id, 'payment_gateway', 'payment_captured_authoritatively', 'PAYMENT_CONFIRMED', jsonb_build_object('event_id', event_id, 'provider_payment_id', provider_payment_id));
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
  return jsonb_build_object('processed', true, 'duplicate', false, 'state', v_state, 'financialState', v_financial_state);
end;
$$;

create or replace function public.request_order_refund(
  target_order_id uuid,
  refund_amount numeric,
  refund_reason text,
  refund_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.orders%rowtype;
  v_attempt public.payment_attempts%rowtype;
  v_refund_id uuid;
begin
  select * into v_order from public.orders where id = target_order_id for update;

  if v_order.id is null then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order.buyer_id <> v_user_id and not public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]) then
    raise exception 'FORBIDDEN';
  end if;

  if v_order.payment_status not in ('SUCCEEDED', 'REFUNDED') then
    raise exception 'PAYMENT_NOT_REFUNDABLE:%', v_order.payment_status;
  end if;

  if refund_amount <= 0 or refund_amount > v_order.total_amount then
    raise exception 'INVALID_REFUND_AMOUNT';
  end if;

  select pa.* into v_attempt
  from public.payment_attempts pa
  join public.checkout_transactions ct on ct.id = pa.transaction_id
  where ct.id::text = v_order.metadata ->> 'checkout_transaction_id'
  for update;

  insert into public.refund_requests (order_id, transaction_id, payment_attempt_id, requested_by, amount, currency, reason, idempotency_key)
  values (v_order.id, v_attempt.transaction_id, v_attempt.id, v_user_id, refund_amount, v_order.currency, refund_reason, refund_idempotency_key)
  on conflict (idempotency_key) do update
  set updated_at = now()
  returning id into v_refund_id;

  insert into public.transaction_audit_events (transaction_id, order_id, actor_id, actor_type, action, state, metadata)
  values (v_attempt.transaction_id, v_order.id, v_user_id, 'buyer', 'refund_requested', 'PAYMENT_CONFIRMED', jsonb_build_object('refund_id', v_refund_id, 'amount', refund_amount, 'reason', refund_reason));

  return jsonb_build_object('refundId', v_refund_id, 'state', 'REFUND_REQUESTED');
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
  v_checked integer := 0;
  v_alerts integer := 0;
begin
  insert into public.financial_reconciliation_runs (run_type, state, started_at)
  values ('payment_consistency', 'RUNNING', now())
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

    insert into public.transaction_integrity_alerts (severity, code, transaction_id, message, metadata)
    values ('warning', 'DELAYED_PAYMENT_CONFIRMATION', payment_rec.transaction_id, 'Payment confirmation is delayed and requires provider reconciliation.', jsonb_build_object('provider_order_id', payment_rec.provider_order_id, 'financial_state', payment_rec.financial_state));

    v_alerts := v_alerts + 1;
  end loop;

  update public.financial_reconciliation_runs
  set state = 'SUCCEEDED',
      completed_at = now(),
      checked_count = v_checked,
      alert_count = v_alerts
  where id = v_run_id;

  return jsonb_build_object('runId', v_run_id, 'checked', v_checked, 'alerts', v_alerts);
end;
$$;

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('live_razorpay_order_creation', 'Enables server-side live Razorpay Order creation from atomic checkout attempts.', true, 100, '{"roles":["BUYER"]}'),
  ('server_authoritative_payment_verification', 'Records cryptographic payment verification while webhooks remain capture authority.', true, 100, '{"roles":["BUYER","ADMIN"]}'),
  ('refund_orchestration_engine', 'Enables auditable refund requests and provider refund synchronization.', true, 100, '{"roles":["BUYER","ADMIN"]}'),
  ('seller_payout_attribution', 'Creates deterministic seller-level payout attribution after authoritative capture.', true, 100, '{"roles":["SELLER","ADMIN"]}')
on conflict (key) do update
set description = excluded.description,
    is_enabled = excluded.is_enabled,
    rollout_percentage = excluded.rollout_percentage,
    audience = excluded.audience,
    updated_at = now();
