create type public.governance_case_type as enum (
  'SELLER_VERIFICATION',
  'SELLER_MODERATION',
  'PRODUCT_MODERATION',
  'REVIEW_MODERATION',
  'PAYOUT_REVIEW',
  'REFUND_REVIEW',
  'DELIVERY_DISPUTE',
  'ORDER_DISPUTE',
  'TRUST_ESCALATION',
  'FRAUD_REVIEW'
);

create type public.governance_case_state as enum (
  'OPEN',
  'UNDER_REVIEW',
  'ESCALATED',
  'ACTION_REQUIRED',
  'RESOLVED',
  'DISMISSED',
  'APPEALED'
);

create type public.governance_risk_signal_type as enum (
  'REFUND_ABUSE',
  'PAYOUT_ABUSE',
  'FAKE_INVENTORY',
  'ORDER_BURST',
  'SELLER_MANIPULATION',
  'ACCOUNT_FARMING',
  'CANCELLATION_SPIKE',
  'DELIVERY_FAILURE_SPIKE',
  'MODERATION_HISTORY',
  'KYC_INCOMPLETE'
);

create type public.governance_enforcement_type as enum (
  'SELLER_THROTTLE',
  'PAYOUT_HOLD',
  'LISTING_HIDE',
  'VERIFICATION_REQUIRED',
  'MANUAL_REVIEW',
  'SELLER_SUSPENSION',
  'WARNING'
);

create type public.governance_enforcement_state as enum ('ACTIVE', 'REVERSED', 'EXPIRED', 'SUPERSEDED');
create type public.dispute_state as enum ('OPEN', 'EVIDENCE_REQUESTED', 'UNDER_REVIEW', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'RESOLVED_PLATFORM', 'DISMISSED', 'APPEALED');
create type public.dispute_type as enum ('ORDER', 'DELIVERY', 'REFUND', 'PAYOUT', 'MODERATION_APPEAL', 'SELLER_APPEAL');

create table public.governance_cases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  case_type public.governance_case_type not null,
  state public.governance_case_state not null default 'OPEN',
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  vendor_id uuid references public.vendors(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  refund_request_id uuid references public.refund_requests(id) on delete set null,
  payout_batch_id uuid references public.seller_payout_batches(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  title text not null,
  summary text not null,
  explanation text not null,
  recommended_action text not null,
  locale text not null default 'en-IN',
  fingerprint text not null,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (fingerprint)
);

create table public.governance_risk_signals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  signal_type public.governance_risk_signal_type not null,
  vendor_id uuid references public.vendors(id) on delete cascade,
  buyer_id uuid references public.profiles(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  refund_request_id uuid references public.refund_requests(id) on delete set null,
  payout_batch_id uuid references public.seller_payout_batches(id) on delete set null,
  score integer not null check (score between 0 and 100),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  evidence jsonb not null default '{}'::jsonb,
  explanation text not null,
  source text not null default 'system',
  fingerprint text not null,
  unique (fingerprint)
);

create table public.governance_enforcement_actions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  case_id uuid references public.governance_cases(id) on delete set null,
  enforcement_type public.governance_enforcement_type not null,
  state public.governance_enforcement_state not null default 'ACTIVE',
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  reason text not null,
  reversible boolean not null default true,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  reversed_at timestamptz,
  reversed_by uuid references public.profiles(id) on delete set null,
  reversal_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create table public.marketplace_disputes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  dispute_type public.dispute_type not null,
  state public.dispute_state not null default 'OPEN',
  vendor_id uuid references public.vendors(id) on delete set null,
  buyer_id uuid references public.profiles(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  delivery_id uuid references public.deliveries(id) on delete set null,
  refund_request_id uuid references public.refund_requests(id) on delete set null,
  payout_batch_id uuid references public.seller_payout_batches(id) on delete set null,
  opened_by uuid references public.profiles(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  title text not null,
  description text not null,
  resolution text,
  locale text not null default 'en-IN',
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table public.dispute_evidence (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  dispute_id uuid not null references public.marketplace_disputes(id) on delete cascade,
  submitted_by uuid references public.profiles(id) on delete set null,
  actor_type text not null default 'seller',
  evidence_type text not null,
  storage_path text,
  redacted_summary text not null,
  private_notes text,
  metadata jsonb not null default '{}'::jsonb
);

create table public.governance_observability_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  metric text not null,
  value numeric(14, 4) not null default 1,
  vendor_id uuid references public.vendors(id) on delete set null,
  case_id uuid references public.governance_cases(id) on delete set null,
  dispute_id uuid references public.marketplace_disputes(id) on delete set null,
  tags jsonb not null default '{}'::jsonb
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'governance_cases',
    'governance_enforcement_actions',
    'marketplace_disputes'
  ]
  loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

create index governance_cases_state_idx on public.governance_cases(state, severity, created_at desc);
create index governance_cases_vendor_idx on public.governance_cases(vendor_id, state, created_at desc);
create index governance_risk_signals_vendor_idx on public.governance_risk_signals(vendor_id, signal_type, created_at desc);
create index governance_enforcement_vendor_idx on public.governance_enforcement_actions(vendor_id, state, enforcement_type);
create index marketplace_disputes_state_idx on public.marketplace_disputes(state, dispute_type, created_at desc);
create index dispute_evidence_dispute_idx on public.dispute_evidence(dispute_id, created_at desc);
create index governance_observability_metric_idx on public.governance_observability_events(metric, created_at desc);

alter table public.governance_cases enable row level security;
alter table public.governance_risk_signals enable row level security;
alter table public.governance_enforcement_actions enable row level security;
alter table public.marketplace_disputes enable row level security;
alter table public.dispute_evidence enable row level security;
alter table public.governance_observability_events enable row level security;

create policy "governance_cases_vendor_admin_select" on public.governance_cases for select using (
  public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
  or (vendor_id is not null and public.current_user_is_vendor_member(vendor_id))
);
create policy "governance_cases_admin_write" on public.governance_cases for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create policy "risk_signals_vendor_admin_select" on public.governance_risk_signals for select using (
  public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
  or (vendor_id is not null and public.current_user_is_vendor_member(vendor_id))
);
create policy "risk_signals_admin_write" on public.governance_risk_signals for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create policy "enforcement_vendor_admin_select" on public.governance_enforcement_actions for select using (
  public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
  or public.current_user_is_vendor_member(vendor_id)
);
create policy "enforcement_admin_write" on public.governance_enforcement_actions for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create policy "disputes_party_admin_select" on public.marketplace_disputes for select using (
  public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
  or (vendor_id is not null and public.current_user_is_vendor_member(vendor_id))
  or buyer_id = auth.uid()
);
create policy "disputes_party_insert" on public.marketplace_disputes for insert with check (
  public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
  or (vendor_id is not null and public.current_user_is_vendor_member(vendor_id))
  or buyer_id = auth.uid()
);
create policy "disputes_admin_update" on public.marketplace_disputes for update using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create policy "evidence_party_admin_select" on public.dispute_evidence for select using (
  exists (
    select 1 from public.marketplace_disputes d
    where d.id = dispute_id
      and (
        public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
        or (d.vendor_id is not null and public.current_user_is_vendor_member(d.vendor_id))
        or d.buyer_id = auth.uid()
      )
  )
);
create policy "evidence_party_insert" on public.dispute_evidence for insert with check (
  exists (
    select 1 from public.marketplace_disputes d
    where d.id = dispute_id
      and (
        public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
        or (d.vendor_id is not null and public.current_user_is_vendor_member(d.vendor_id))
        or d.buyer_id = auth.uid()
      )
  )
);

create policy "governance_observability_admin_select" on public.governance_observability_events for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create or replace function public.record_governance_metric(
  metric_name text,
  metric_value numeric default 1,
  target_vendor_id uuid default null,
  target_case_id uuid default null,
  target_dispute_id uuid default null,
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
  insert into public.governance_observability_events(metric, value, vendor_id, case_id, dispute_id, tags)
  values (metric_name, coalesce(metric_value, 1), target_vendor_id, target_case_id, target_dispute_id, coalesce(event_tags, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.trust_level_for_score(score integer)
returns text
language sql
immutable
as $$
  select case
    when score < 35 then 'restricted'
    when score < 55 then 'emerging'
    when score < 75 then 'standard'
    when score < 90 then 'trusted'
    else 'verified_plus'
  end;
$$;

create or replace function public.compute_vendor_trust_score(target_vendor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kyc public.seller_kyc_profiles%rowtype;
  v_orders integer := 0;
  v_cancelled integer := 0;
  v_refunds integer := 0;
  v_disputes integer := 0;
  v_failed_deliveries integer := 0;
  v_flags integer := 0;
  v_enforcements integer := 0;
  v_payout_failures integer := 0;
  v_fulfillment_score integer := 15;
  v_refund_score integer := 15;
  v_dispute_score integer := 15;
  v_delivery_score integer := 15;
  v_moderation_score integer := 15;
  v_kyc_score integer := 10;
  v_finance_score integer := 15;
  v_score integer;
  v_factors jsonb;
begin
  select * into v_kyc from public.seller_kyc_profiles where vendor_id = target_vendor_id;

  select count(*) into v_orders from public.orders where vendor_id = target_vendor_id;
  select count(*) into v_cancelled from public.orders where vendor_id = target_vendor_id and status = 'CANCELLED';
  select count(*) into v_refunds from public.refund_requests rr join public.orders o on o.id = rr.order_id where o.vendor_id = target_vendor_id and rr.state in ('REFUND_REQUESTED','REFUND_PROCESSING','REFUND_SUCCEEDED','REFUND_RECONCILING');
  select count(*) into v_disputes from public.marketplace_disputes where vendor_id = target_vendor_id and state not in ('RESOLVED_BUYER','RESOLVED_SELLER','RESOLVED_PLATFORM','DISMISSED');
  select count(*) into v_failed_deliveries from public.deliveries where vendor_id = target_vendor_id and status in ('FAILED','RETURNED','RETURN_INITIATED');
  select count(*) into v_flags from public.compliance_flags where vendor_id = target_vendor_id and status in ('OPEN','UNDER_REVIEW','ESCALATED');
  select count(*) into v_enforcements from public.governance_enforcement_actions where vendor_id = target_vendor_id and state = 'ACTIVE';
  select count(*) into v_payout_failures from public.seller_payout_batches where vendor_id = target_vendor_id and state = 'FAILED';

  if v_orders > 0 then
    v_fulfillment_score := greatest(0, 15 - round((v_cancelled::numeric / v_orders) * 40)::integer);
    v_refund_score := greatest(0, 15 - round((v_refunds::numeric / v_orders) * 45)::integer);
    v_delivery_score := greatest(0, 15 - round((v_failed_deliveries::numeric / v_orders) * 35)::integer);
  end if;

  v_dispute_score := greatest(0, 15 - least(15, v_disputes * 5));
  v_moderation_score := greatest(0, 15 - least(15, (v_flags * 4) + (v_enforcements * 6)));
  v_kyc_score := case
    when v_kyc.verification_state = 'VERIFIED' then 10
    when v_kyc.verification_state = 'PENDING_REVIEW' then 6
    when v_kyc.verification_state = 'RESUBMISSION_REQUIRED' then 3
    else 0
  end;
  v_finance_score := greatest(0, 15 - least(15, v_payout_failures * 8));
  v_score := greatest(0, least(100, v_fulfillment_score + v_refund_score + v_dispute_score + v_delivery_score + v_moderation_score + v_kyc_score + v_finance_score));

  v_factors := jsonb_build_array(
    jsonb_build_object('label','Fulfillment reliability','score',v_fulfillment_score,'detail',v_cancelled || ' cancellations across ' || v_orders || ' orders'),
    jsonb_build_object('label','Refund pattern','score',v_refund_score,'detail',v_refunds || ' refund workflows detected'),
    jsonb_build_object('label','Dispute history','score',v_dispute_score,'detail',v_disputes || ' open disputes'),
    jsonb_build_object('label','Delivery consistency','score',v_delivery_score,'detail',v_failed_deliveries || ' failed or returned deliveries'),
    jsonb_build_object('label','Moderation history','score',v_moderation_score,'detail',v_flags || ' open flags and ' || v_enforcements || ' active enforcement actions'),
    jsonb_build_object('label','KYC verification','score',v_kyc_score,'detail',coalesce(v_kyc.verification_state::text, 'NOT_SUBMITTED')),
    jsonb_build_object('label','Financial trust','score',v_finance_score,'detail',v_payout_failures || ' failed payout batches')
  );

  insert into public.trust_scores (vendor_id, score, trust_level, factors, metadata)
  values (target_vendor_id, v_score, public.trust_level_for_score(v_score), v_factors, jsonb_build_object('phase',29,'orders',v_orders,'refunds',v_refunds,'disputes',v_disputes))
  on conflict (vendor_id) do update
  set score = excluded.score,
      trust_level = excluded.trust_level,
      factors = excluded.factors,
      metadata = excluded.metadata,
      updated_at = now();

  perform public.record_governance_metric('governance.trust_score.recomputed', v_score, target_vendor_id, null, null, jsonb_build_object('trustLevel', public.trust_level_for_score(v_score)));
  return jsonb_build_object('vendorId', target_vendor_id, 'score', v_score, 'trustLevel', public.trust_level_for_score(v_score), 'factors', v_factors);
end;
$$;

create or replace function public.create_governance_case(
  target_case_type public.governance_case_type,
  target_vendor_id uuid,
  case_title text,
  case_summary text,
  case_explanation text,
  case_recommended_action text,
  case_severity text default 'medium',
  case_fingerprint text default null,
  case_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.governance_cases(case_type, vendor_id, severity, title, summary, explanation, recommended_action, fingerprint, metadata)
  values (
    target_case_type,
    target_vendor_id,
    case_severity,
    case_title,
    case_summary,
    case_explanation,
    case_recommended_action,
    coalesce(case_fingerprint, target_case_type::text || ':' || coalesce(target_vendor_id::text, 'platform') || ':' || md5(case_title || case_summary)),
    coalesce(case_metadata, '{}'::jsonb)
  )
  on conflict (fingerprint) do update
  set state = case when governance_cases.state in ('RESOLVED','DISMISSED') then governance_cases.state else 'OPEN'::public.governance_case_state end,
      severity = excluded.severity,
      summary = excluded.summary,
      explanation = excluded.explanation,
      recommended_action = excluded.recommended_action,
      updated_at = now()
  returning id into v_id;

  perform public.record_governance_metric('governance.case.upserted', 1, target_vendor_id, v_id, null, jsonb_build_object('caseType', target_case_type));
  return v_id;
end;
$$;

create or replace function public.detect_vendor_governance_risk(target_vendor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orders integer := 0;
  v_refunds integer := 0;
  v_cancelled integer := 0;
  v_failed_deliveries integer := 0;
  v_failed_payouts integer := 0;
  v_created integer := 0;
  v_signal_id uuid;
  v_case_id uuid;
begin
  select count(*) into v_orders from public.orders where vendor_id = target_vendor_id and created_at >= now() - interval '30 days';
  select count(*) into v_refunds from public.refund_requests rr join public.orders o on o.id = rr.order_id where o.vendor_id = target_vendor_id and rr.created_at >= now() - interval '30 days';
  select count(*) into v_cancelled from public.orders where vendor_id = target_vendor_id and status = 'CANCELLED' and created_at >= now() - interval '30 days';
  select count(*) into v_failed_deliveries from public.deliveries where vendor_id = target_vendor_id and status in ('FAILED','RETURNED','RETURN_INITIATED') and created_at >= now() - interval '30 days';
  select count(*) into v_failed_payouts from public.seller_payout_batches where vendor_id = target_vendor_id and state = 'FAILED' and created_at >= now() - interval '30 days';

  if v_orders >= 5 and v_refunds::numeric / greatest(1, v_orders) >= 0.30 then
    insert into public.governance_risk_signals(signal_type, vendor_id, score, severity, evidence, explanation, fingerprint)
    values ('REFUND_ABUSE', target_vendor_id, least(100, 40 + v_refunds * 5), 'high', jsonb_build_object('orders30d', v_orders, 'refunds30d', v_refunds), 'Refund volume is materially above the expected operating baseline.', 'refund_abuse:' || target_vendor_id::text || ':' || date_trunc('day', now())::date)
    on conflict (fingerprint) do update set score = excluded.score, evidence = excluded.evidence
    returning id into v_signal_id;
    v_case_id := public.create_governance_case('FRAUD_REVIEW', target_vendor_id, 'Refund abuse pattern detected', 'Refund ratio is above governance threshold.', 'The signal uses order and refund counts only; it should trigger review, not automatic punishment.', 'Review refund reasons, product quality issues, and seller response before enforcement.', 'high', 'case:refund_abuse:' || target_vendor_id::text || ':' || date_trunc('day', now())::date, jsonb_build_object('signalId', v_signal_id));
    v_created := v_created + 1;
  end if;

  if v_orders >= 5 and v_cancelled::numeric / greatest(1, v_orders) >= 0.25 then
    insert into public.governance_risk_signals(signal_type, vendor_id, score, severity, evidence, explanation, fingerprint)
    values ('CANCELLATION_SPIKE', target_vendor_id, least(100, 35 + v_cancelled * 5), 'medium', jsonb_build_object('orders30d', v_orders, 'cancelled30d', v_cancelled), 'Seller cancellations are above the operating threshold.', 'cancellation_spike:' || target_vendor_id::text || ':' || date_trunc('day', now())::date)
    on conflict (fingerprint) do update set score = excluded.score, evidence = excluded.evidence
    returning id into v_signal_id;
    v_case_id := public.create_governance_case('TRUST_ESCALATION', target_vendor_id, 'Cancellation spike detected', 'Cancellation rate is above governance threshold.', 'Temporary operational issues should be distinguished from abuse before restrictions.', 'Ask seller for stock and fulfillment correction plan; consider temporary throttling only if repeated.', 'medium', 'case:cancellation_spike:' || target_vendor_id::text || ':' || date_trunc('day', now())::date, jsonb_build_object('signalId', v_signal_id));
    v_created := v_created + 1;
  end if;

  if v_failed_deliveries >= 3 then
    insert into public.governance_risk_signals(signal_type, vendor_id, score, severity, evidence, explanation, fingerprint)
    values ('DELIVERY_FAILURE_SPIKE', target_vendor_id, least(100, 40 + v_failed_deliveries * 7), 'high', jsonb_build_object('failedDeliveries30d', v_failed_deliveries), 'Delivery failures are clustering for this seller.', 'delivery_failure:' || target_vendor_id::text || ':' || date_trunc('day', now())::date)
    on conflict (fingerprint) do update set score = excluded.score, evidence = excluded.evidence;
    perform public.create_governance_case('DELIVERY_DISPUTE', target_vendor_id, 'Delivery reliability review', 'Failed delivery count crossed the governance threshold.', 'Delivery failures may reflect geography, staffing, or logistics provider issues.', 'Review failed delivery evidence and update fulfillment constraints.', 'high', 'case:delivery_failure:' || target_vendor_id::text || ':' || date_trunc('day', now())::date, '{}'::jsonb);
    v_created := v_created + 1;
  end if;

  if v_failed_payouts > 0 then
    insert into public.governance_risk_signals(signal_type, vendor_id, score, severity, evidence, explanation, fingerprint)
    values ('PAYOUT_ABUSE', target_vendor_id, least(100, 50 + v_failed_payouts * 10), 'critical', jsonb_build_object('failedPayouts30d', v_failed_payouts), 'Payout failures or mismatches require trust review before repeated release attempts.', 'payout_abuse:' || target_vendor_id::text || ':' || date_trunc('day', now())::date)
    on conflict (fingerprint) do update set score = excluded.score, evidence = excluded.evidence;
    perform public.create_governance_case('PAYOUT_REVIEW', target_vendor_id, 'Payout trust review required', 'Failed payout batches were detected for this seller.', 'Financial trust review should verify payout method and settlement state before enforcement.', 'Review payout method readiness, reconciliation cases, and failed payout reason.', 'critical', 'case:payout_review:' || target_vendor_id::text || ':' || date_trunc('day', now())::date, '{}'::jsonb);
    v_created := v_created + 1;
  end if;

  perform public.compute_vendor_trust_score(target_vendor_id);
  return jsonb_build_object('vendorId', target_vendor_id, 'signalsCreated', v_created);
end;
$$;

create or replace function public.run_governance_detection(batch_size integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  vendor_rec record;
  v_checked integer := 0;
  v_cases integer := 0;
  v_result jsonb;
begin
  for vendor_rec in
    select id
    from public.vendors
    where deleted_at is null
    order by updated_at desc
    limit batch_size
  loop
    v_result := public.detect_vendor_governance_risk(vendor_rec.id);
    v_checked := v_checked + 1;
    v_cases := v_cases + coalesce((v_result ->> 'signalsCreated')::integer, 0);
  end loop;

  perform public.record_governance_metric('governance.detection.completed', 1, null, null, null, jsonb_build_object('checked', v_checked, 'signals', v_cases));
  return jsonb_build_object('checked', v_checked, 'signals', v_cases);
end;
$$;

create or replace function public.apply_governance_enforcement(
  target_vendor_id uuid,
  target_case_id uuid,
  target_enforcement_type public.governance_enforcement_type,
  enforcement_reason text,
  enforcement_severity text default 'medium',
  expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action_id uuid;
begin
  if not public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]) then
    raise exception 'FORBIDDEN';
  end if;

  insert into public.governance_enforcement_actions(vendor_id, case_id, enforcement_type, severity, reason, expires_at, created_by)
  values (target_vendor_id, target_case_id, target_enforcement_type, enforcement_severity, enforcement_reason, expires_at, auth.uid())
  returning id into v_action_id;

  if target_enforcement_type = 'SELLER_SUSPENSION' then
    update public.vendors set status = 'SUSPENDED', metadata = metadata || jsonb_build_object('lastGovernanceActionId', v_action_id, 'suspensionReason', enforcement_reason) where id = target_vendor_id;
  elsif target_enforcement_type = 'PAYOUT_HOLD' then
    update public.settlement_records set lifecycle_state = 'DISPUTED', hold_reason = enforcement_reason where vendor_id = target_vendor_id and lifecycle_state in ('PAYOUT_PENDING','PAYOUT_PROCESSING','SETTLED');
  elsif target_enforcement_type = 'SELLER_THROTTLE' then
    update public.vendor_settings set accepts_orders = false where vendor_id = target_vendor_id;
  end if;

  insert into public.trust_audit_events(vendor_id, actor_id, actor_type, action, metadata)
  values (target_vendor_id, auth.uid(), 'ADMIN', 'governance_enforcement_applied', jsonb_build_object('actionId', v_action_id, 'type', target_enforcement_type, 'reason', enforcement_reason));

  perform public.compute_vendor_trust_score(target_vendor_id);
  perform public.record_governance_metric('governance.enforcement.applied', 1, target_vendor_id, target_case_id, null, jsonb_build_object('type', target_enforcement_type));
  return jsonb_build_object('actionId', v_action_id, 'state', 'ACTIVE');
end;
$$;

create or replace function public.reverse_governance_enforcement(target_action_id uuid, reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action public.governance_enforcement_actions%rowtype;
begin
  if not public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_action from public.governance_enforcement_actions where id = target_action_id for update;
  if v_action.id is null then
    raise exception 'ENFORCEMENT_ACTION_NOT_FOUND';
  end if;
  if not v_action.reversible then
    raise exception 'ENFORCEMENT_NOT_REVERSIBLE';
  end if;

  update public.governance_enforcement_actions
  set state = 'REVERSED',
      reversed_at = now(),
      reversed_by = auth.uid(),
      reversal_reason = reason
  where id = v_action.id;

  if v_action.enforcement_type = 'SELLER_THROTTLE' then
    update public.vendor_settings set accepts_orders = true where vendor_id = v_action.vendor_id;
  elsif v_action.enforcement_type = 'SELLER_SUSPENSION' then
    update public.vendors set status = 'PENDING_VERIFICATION' where id = v_action.vendor_id and status = 'SUSPENDED';
  elsif v_action.enforcement_type = 'PAYOUT_HOLD' then
    update public.settlement_records set lifecycle_state = 'PAYOUT_PENDING', hold_reason = null where vendor_id = v_action.vendor_id and lifecycle_state = 'DISPUTED';
  end if;

  insert into public.trust_audit_events(vendor_id, actor_id, actor_type, action, metadata)
  values (v_action.vendor_id, auth.uid(), 'ADMIN', 'governance_enforcement_reversed', jsonb_build_object('actionId', v_action.id, 'reason', reason));

  perform public.compute_vendor_trust_score(v_action.vendor_id);
  return jsonb_build_object('actionId', v_action.id, 'state', 'REVERSED');
end;
$$;

create or replace function public.open_marketplace_dispute(
  target_dispute_type public.dispute_type,
  target_order_id uuid,
  dispute_title text,
  dispute_description text,
  dispute_locale text default 'en-IN'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_dispute_id uuid;
begin
  select * into v_order from public.orders where id = target_order_id;
  if v_order.id is null then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order.buyer_id <> auth.uid() and not public.current_user_is_vendor_member(v_order.vendor_id) and not public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]) then
    raise exception 'FORBIDDEN';
  end if;

  insert into public.marketplace_disputes(dispute_type, vendor_id, buyer_id, order_id, opened_by, title, description, locale)
  values (target_dispute_type, v_order.vendor_id, v_order.buyer_id, v_order.id, auth.uid(), dispute_title, dispute_description, dispute_locale)
  returning id into v_dispute_id;

  perform public.create_governance_case(
    case when target_dispute_type = 'DELIVERY' then 'DELIVERY_DISPUTE'::public.governance_case_type else 'ORDER_DISPUTE'::public.governance_case_type end,
    v_order.vendor_id,
    dispute_title,
    dispute_description,
    'Dispute was opened by a marketplace participant and requires evidence-based review.',
    'Request evidence, review order/refund/delivery state, and resolve with an auditable decision.',
    'medium',
    'dispute:' || v_dispute_id::text,
    jsonb_build_object('disputeId', v_dispute_id)
  );

  perform public.compute_vendor_trust_score(v_order.vendor_id);
  return jsonb_build_object('disputeId', v_dispute_id, 'state', 'OPEN');
end;
$$;

alter publication supabase_realtime add table public.governance_cases;
alter publication supabase_realtime add table public.governance_enforcement_actions;
alter publication supabase_realtime add table public.marketplace_disputes;
alter publication supabase_realtime add table public.governance_risk_signals;

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('phase_29_governance_operating_layer', 'Enables auditable governance cases, enforcement actions, and trust operations.', true, 100, '{"roles":["ADMIN","SELLER"]}'),
  ('phase_29_fraud_risk_detection', 'Enables deterministic fraud and abuse risk signals with review-first escalation.', true, 100, '{"roles":["ADMIN"]}'),
  ('phase_29_dispute_orchestration', 'Enables order, delivery, refund, payout, and moderation appeal disputes with evidence records.', true, 100, '{"roles":["BUYER","SELLER","ADMIN"]}'),
  ('phase_29_reversible_enforcement', 'Enables proportionate reversible seller enforcement and payout hold integration.', true, 100, '{"roles":["ADMIN"]}')
on conflict (key) do update
set description = excluded.description,
    is_enabled = excluded.is_enabled,
    rollout_percentage = excluded.rollout_percentage,
    audience = excluded.audience,
    updated_at = now();
