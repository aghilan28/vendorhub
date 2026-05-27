create table if not exists public.governance_recovery_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  vendor_id uuid references public.vendors(id) on delete cascade,
  case_id uuid references public.governance_cases(id) on delete cascade,
  dispute_id uuid references public.marketplace_disputes(id) on delete cascade,
  job_type text not null,
  state public.recovery_job_state not null default 'PENDING',
  priority integer not null default 50,
  run_after timestamptz not null default now(),
  attempts integer not null default 0,
  last_error text,
  resolved_at timestamptz,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  unique (idempotency_key)
);

create table if not exists public.governance_escalation_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  vendor_id uuid references public.vendors(id) on delete cascade,
  case_id uuid references public.governance_cases(id) on delete cascade,
  dispute_id uuid references public.marketplace_disputes(id) on delete cascade,
  escalation_type text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  state text not null default 'OPEN' check (state in ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED')),
  assigned_to uuid references public.profiles(id) on delete set null,
  explanation text not null,
  recommended_action text not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.trust_score_repair_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  state text not null default 'RUNNING',
  inspected_count integer not null default 0,
  repaired_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.seller_kyc_profiles add column if not exists expires_at timestamptz;
alter table public.seller_kyc_profiles add column if not exists escalation_reason text;
alter table public.verification_documents add column if not exists expires_at timestamptz;
alter table public.verification_documents add column if not exists evidence_hash text;
alter table public.dispute_evidence add column if not exists evidence_hash text;
alter table public.marketplace_disputes add column if not exists sla_due_at timestamptz;
alter table public.marketplace_disputes add column if not exists escalated_at timestamptz;
alter table public.governance_cases add column if not exists sla_due_at timestamptz;
alter table public.governance_cases add column if not exists appeal_count integer not null default 0;

drop trigger if exists set_governance_recovery_jobs_updated_at on public.governance_recovery_jobs;
create trigger set_governance_recovery_jobs_updated_at before update on public.governance_recovery_jobs for each row execute function public.set_updated_at();

create index if not exists governance_recovery_jobs_state_idx on public.governance_recovery_jobs(state, priority desc, run_after);
create index if not exists governance_recovery_jobs_vendor_idx on public.governance_recovery_jobs(vendor_id, state, created_at desc);
create index if not exists governance_escalation_events_state_idx on public.governance_escalation_events(state, severity, created_at desc);
create index if not exists seller_kyc_profiles_expiry_idx on public.seller_kyc_profiles(verification_state, expires_at);
create index if not exists marketplace_disputes_sla_idx on public.marketplace_disputes(state, sla_due_at);
create index if not exists governance_cases_sla_idx on public.governance_cases(state, sla_due_at);
create unique index if not exists dispute_evidence_hash_uidx on public.dispute_evidence(dispute_id, evidence_hash) where evidence_hash is not null;
create unique index if not exists verification_documents_hash_uidx on public.verification_documents(vendor_id, document_type, evidence_hash) where evidence_hash is not null;

alter table public.governance_recovery_jobs enable row level security;
alter table public.governance_escalation_events enable row level security;
alter table public.trust_score_repair_runs enable row level security;

create policy "governance_recovery_admin_select" on public.governance_recovery_jobs for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "governance_escalations_admin_select" on public.governance_escalation_events for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "trust_score_repair_runs_admin_select" on public.trust_score_repair_runs for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create or replace function public.record_governance_escalation(
  target_vendor_id uuid,
  target_case_id uuid,
  target_dispute_id uuid,
  target_type text,
  target_severity text,
  target_explanation text,
  target_recommended_action text,
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
  insert into public.governance_escalation_events(vendor_id, case_id, dispute_id, escalation_type, severity, explanation, recommended_action, metadata)
  values (target_vendor_id, target_case_id, target_dispute_id, target_type, target_severity, target_explanation, target_recommended_action, coalesce(target_metadata, '{}'::jsonb))
  returning id into v_id;

  perform public.record_governance_metric('governance.escalation.created', 1, target_vendor_id, target_case_id, target_dispute_id, jsonb_build_object('type', target_type, 'severity', target_severity));
  return v_id;
end;
$$;

create or replace function public.schedule_governance_recovery(
  target_vendor_id uuid,
  target_case_id uuid,
  target_dispute_id uuid,
  target_job_type text,
  target_priority integer default 50,
  target_run_after timestamptz default now(),
  target_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_key text;
begin
  v_key := md5(coalesce(target_vendor_id::text, 'platform') || ':' || coalesce(target_case_id::text, 'no-case') || ':' || coalesce(target_dispute_id::text, 'no-dispute') || ':' || target_job_type);

  insert into public.governance_recovery_jobs(vendor_id, case_id, dispute_id, job_type, priority, run_after, idempotency_key, metadata)
  values (target_vendor_id, target_case_id, target_dispute_id, target_job_type, target_priority, coalesce(target_run_after, now()), v_key, coalesce(target_metadata, '{}'::jsonb))
  on conflict (idempotency_key) do update
  set priority = greatest(public.governance_recovery_jobs.priority, excluded.priority),
      run_after = least(public.governance_recovery_jobs.run_after, excluded.run_after),
      metadata = public.governance_recovery_jobs.metadata || excluded.metadata,
      updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.harden_kyc_lifecycle(batch_size integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expired integer := 0;
  v_escalated integer := 0;
  v_resubmission integer := 0;
begin
  update public.seller_kyc_profiles
  set verification_state = 'EXPIRED',
      metadata = metadata || jsonb_build_object('expiredByS3At', now()),
      updated_at = now()
  where verification_state = 'VERIFIED'
    and expires_at is not null
    and expires_at <= now();
  get diagnostics v_expired = row_count;

  update public.seller_kyc_profiles p
  set verification_state = 'ESCALATION_REQUIRED',
      escalation_reason = 'KYC review exceeded operational SLA.',
      metadata = p.metadata || jsonb_build_object('escalatedByS3At', now()),
      updated_at = now()
  where p.verification_state in ('PENDING_REVIEW', 'UNDER_REVIEW')
    and coalesce(p.submitted_at, p.updated_at) < now() - interval '48 hours';
  get diagnostics v_escalated = row_count;

  update public.seller_kyc_profiles p
  set verification_state = 'RESUBMISSION_REQUIRED',
      metadata = p.metadata || jsonb_build_object('resubmissionRequiredByS3At', now()),
      updated_at = now()
  where p.verification_state in ('PENDING_REVIEW', 'UNDER_REVIEW')
    and exists (
      select 1 from public.verification_documents d
      where d.kyc_profile_id = p.id
        and d.is_required
        and d.status in ('REJECTED', 'RESUBMISSION_REQUIRED', 'EXPIRED')
    );
  get diagnostics v_resubmission = row_count;

  insert into public.trust_audit_events(vendor_id, actor_type, action, metadata)
  select vendor_id, 'SYSTEM', 'kyc_lifecycle_hardened', jsonb_build_object('state', verification_state, 'reason', escalation_reason)
  from public.seller_kyc_profiles
  where updated_at > now() - interval '2 minutes'
    and verification_state in ('EXPIRED', 'ESCALATION_REQUIRED', 'RESUBMISSION_REQUIRED')
  limit greatest(1, coalesce(batch_size, 100));

  perform public.record_governance_metric('governance.kyc.lifecycle_hardened', v_expired + v_escalated + v_resubmission, null, null, null, jsonb_build_object('expired', v_expired, 'escalated', v_escalated, 'resubmission', v_resubmission));
  return jsonb_build_object('expired', v_expired, 'escalated', v_escalated, 'resubmissionRequired', v_resubmission);
end;
$$;

create or replace function public.repair_governance_escalations(batch_size integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cases integer := 0;
  v_disputes integer := 0;
begin
  update public.governance_cases
  set sla_due_at = coalesce(sla_due_at, created_at + case severity when 'critical' then interval '4 hours' when 'high' then interval '12 hours' else interval '24 hours' end)
  where state not in ('RESOLVED', 'DISMISSED')
    and sla_due_at is null;

  update public.marketplace_disputes
  set sla_due_at = coalesce(sla_due_at, created_at + interval '48 hours')
  where state not in ('RESOLVED_BUYER', 'RESOLVED_SELLER', 'RESOLVED_PLATFORM', 'DISMISSED')
    and sla_due_at is null;

  insert into public.governance_escalation_events(vendor_id, case_id, escalation_type, severity, explanation, recommended_action, metadata)
  select c.vendor_id, c.id, 'CASE_SLA_BREACH', c.severity, 'Governance case exceeded its operational SLA.', 'Reassign or resolve with an auditable decision before applying irreversible marketplace impact.', jsonb_build_object('caseState', c.state, 'slaDueAt', c.sla_due_at)
  from public.governance_cases c
  where c.state not in ('RESOLVED', 'DISMISSED')
    and c.sla_due_at < now()
    and not exists (
      select 1 from public.governance_escalation_events e
      where e.case_id = c.id and e.escalation_type = 'CASE_SLA_BREACH' and e.state = 'OPEN'
    )
  order by c.sla_due_at asc
  limit greatest(1, coalesce(batch_size, 100));
  get diagnostics v_cases = row_count;

  insert into public.governance_escalation_events(vendor_id, dispute_id, escalation_type, severity, explanation, recommended_action, metadata)
  select d.vendor_id, d.id, 'DISPUTE_SLA_BREACH', 'high', 'Marketplace dispute exceeded its evidence or resolution SLA.', 'Request missing evidence, reassign ownership, or record a resolution path.', jsonb_build_object('disputeState', d.state, 'slaDueAt', d.sla_due_at)
  from public.marketplace_disputes d
  where d.state not in ('RESOLVED_BUYER', 'RESOLVED_SELLER', 'RESOLVED_PLATFORM', 'DISMISSED')
    and d.sla_due_at < now()
    and not exists (
      select 1 from public.governance_escalation_events e
      where e.dispute_id = d.id and e.escalation_type = 'DISPUTE_SLA_BREACH' and e.state = 'OPEN'
    )
  order by d.sla_due_at asc
  limit greatest(1, coalesce(batch_size, 100));
  get diagnostics v_disputes = row_count;

  insert into public.governance_recovery_jobs(vendor_id, case_id, dispute_id, job_type, priority, run_after, idempotency_key, metadata)
  select e.vendor_id, e.case_id, e.dispute_id, 'ESCALATION_REVIEW', case when e.severity = 'critical' then 95 else 75 end, now(),
         md5(coalesce(e.vendor_id::text, 'platform') || ':' || coalesce(e.case_id::text, 'no-case') || ':' || coalesce(e.dispute_id::text, 'no-dispute') || ':ESCALATION_REVIEW'),
         jsonb_build_object('escalationId', e.id, 'type', e.escalation_type)
  from public.governance_escalation_events e
  where e.state = 'OPEN'
    and e.created_at > now() - interval '5 minutes'
  on conflict (idempotency_key) do nothing;

  return jsonb_build_object('caseEscalations', v_cases, 'disputeEscalations', v_disputes);
end;
$$;

create or replace function public.run_trust_score_repair(batch_size integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
  v_vendor record;
  v_inspected integer := 0;
  v_repaired integer := 0;
  v_result jsonb;
begin
  insert into public.trust_score_repair_runs(metadata)
  values (jsonb_build_object('batchSize', batch_size))
  returning id into v_run_id;

  for v_vendor in
    select v.id
    from public.vendors v
    left join public.trust_scores ts on ts.vendor_id = v.id
    where v.deleted_at is null
      and (ts.vendor_id is null or ts.updated_at < now() - interval '24 hours')
    order by coalesce(ts.updated_at, v.created_at) asc
    limit greatest(1, coalesce(batch_size, 100))
  loop
    v_result := public.compute_vendor_trust_score(v_vendor.id);
    v_inspected := v_inspected + 1;
    v_repaired := v_repaired + case when v_result is not null then 1 else 0 end;
  end loop;

  update public.trust_score_repair_runs
  set state = 'SUCCEEDED',
      completed_at = now(),
      inspected_count = v_inspected,
      repaired_count = v_repaired
  where id = v_run_id;

  perform public.record_governance_metric('governance.trust_score.repair_completed', v_repaired, null, null, null, jsonb_build_object('runId', v_run_id, 'inspected', v_inspected));
  return jsonb_build_object('runId', v_run_id, 'inspected', v_inspected, 'repaired', v_repaired);
exception when others then
  update public.trust_score_repair_runs
  set state = 'FAILED',
      completed_at = now(),
      metadata = metadata || jsonb_build_object('sqlstate', sqlstate, 'message', sqlerrm)
  where id = v_run_id;
  raise;
end;
$$;

create or replace function public.run_governance_moderation_recovery(batch_size integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kyc jsonb;
  v_escalations jsonb;
  v_trust jsonb;
  v_replay integer := 0;
begin
  v_kyc := public.harden_kyc_lifecycle(batch_size);
  v_escalations := public.repair_governance_escalations(batch_size);
  v_trust := public.run_trust_score_repair(batch_size);

  insert into public.governance_observability_events(metric, value, vendor_id, case_id, dispute_id, tags)
  select 'governance.replay.visibility', 1, vendor_id, case_id, dispute_id, jsonb_build_object('fingerprint', fingerprint)
  from (
    select vendor_id, null::uuid as case_id, null::uuid as dispute_id, fingerprint
    from public.governance_risk_signals
    where created_at > now() - interval '24 hours'
    group by vendor_id, fingerprint
    having count(*) > 1
  ) replayed;
  get diagnostics v_replay = row_count;

  perform public.record_governance_metric('governance.moderation_recovery.completed', 1, null, null, null, jsonb_build_object('kyc', v_kyc, 'escalations', v_escalations, 'trust', v_trust, 'replaySignals', v_replay));
  return jsonb_build_object('kyc', v_kyc, 'escalations', v_escalations, 'trust', v_trust, 'replaySignals', v_replay);
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
  v_recovery jsonb;
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

  v_recovery := public.run_governance_moderation_recovery(batch_size);
  perform public.record_governance_metric('governance.detection.completed', 1, null, null, null, jsonb_build_object('checked', v_checked, 'signals', v_cases, 'recovery', v_recovery));
  return jsonb_build_object('checked', v_checked, 'signals', v_cases, 'recovery', v_recovery);
end;
$$;

create or replace view public.governance_operational_health as
select
  (select count(*) from public.governance_cases where state not in ('RESOLVED', 'DISMISSED')) as open_cases,
  (select count(*) from public.governance_cases where state not in ('RESOLVED', 'DISMISSED') and sla_due_at < now()) as overdue_cases,
  (select count(*) from public.marketplace_disputes where state not in ('RESOLVED_BUYER', 'RESOLVED_SELLER', 'RESOLVED_PLATFORM', 'DISMISSED')) as open_disputes,
  (select count(*) from public.marketplace_disputes where state not in ('RESOLVED_BUYER', 'RESOLVED_SELLER', 'RESOLVED_PLATFORM', 'DISMISSED') and sla_due_at < now()) as overdue_disputes,
  (select count(*) from public.governance_risk_signals where created_at > now() - interval '24 hours' and severity in ('high', 'critical')) as high_risk_signals_24h,
  (select count(*) from public.governance_enforcement_actions where state = 'ACTIVE') as active_enforcements,
  (select count(*) from public.seller_kyc_profiles where verification_state::text in ('PENDING_REVIEW', 'UNDER_REVIEW', 'ESCALATION_REQUIRED', 'RESUBMISSION_REQUIRED', 'EXPIRED')) as kyc_attention_required,
  (select count(*) from public.trust_scores where trust_level = 'restricted') as restricted_sellers,
  (select count(*) from public.governance_recovery_jobs where state in ('PENDING', 'RUNNING')) as recovery_backlog,
  (select count(*) from public.governance_escalation_events where state = 'OPEN') as open_escalations,
  now() as generated_at;

alter publication supabase_realtime add table public.governance_recovery_jobs;
alter publication supabase_realtime add table public.governance_escalation_events;

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('stabilization_s3_governance_hardening', 'Enables KYC lifecycle maturity, governance recovery jobs, escalation observability, and dispute SLA hardening.', true, 100, '{"roles":["ADMIN","SELLER"]}'),
  ('stabilization_s3_fraud_resilience', 'Enables review-first fraud resilience, payout abuse escalation, trust score repair, and governance replay visibility.', true, 100, '{"roles":["ADMIN"]}')
on conflict (key) do update
set description = excluded.description,
    is_enabled = excluded.is_enabled,
    rollout_percentage = excluded.rollout_percentage,
    audience = excluded.audience,
    updated_at = now();
