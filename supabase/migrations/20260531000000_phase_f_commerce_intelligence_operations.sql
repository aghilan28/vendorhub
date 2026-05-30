-- KARTEX Phase F — Commerce Intelligence Operationalization: storage + audit.
-- Two tables turn intelligence ALGORITHMS into OPERATED software:
--   commerce_intelligence_decisions  — the unified, auditable decision ledger
--                                        (every domain: pricing/forecast/inventory/
--                                         routing/search/reco/seller/buyer).
--   pricing_proposals                 — governed price changes (never auto-applied
--                                        for high-risk; full approve/rollback trail).
-- Idempotent (IF NOT EXISTS); RLS enabled; service-role (admin client) writes.

-- ===========================================================================
-- Unified intelligence decision ledger
-- ===========================================================================
create table if not exists public.commerce_intelligence_decisions (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  model_key text,
  decision_type text not null,
  subject_type text,
  subject_id text,
  inputs jsonb not null default '{}'::jsonb,
  decision jsonb not null default '{}'::jsonb,
  action text not null default 'advisory',          -- advisory | proposed | applied | auto | rolled_back
  reversible boolean not null default true,
  confidence numeric,
  outcome jsonb,
  actor_id uuid,
  trace_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ci_decisions_domain_created on public.commerce_intelligence_decisions (domain, created_at desc);
create index if not exists idx_ci_decisions_subject on public.commerce_intelligence_decisions (subject_type, subject_id);
create index if not exists idx_ci_decisions_created on public.commerce_intelligence_decisions (created_at desc);
create index if not exists idx_ci_decisions_type on public.commerce_intelligence_decisions (decision_type, created_at desc);

alter table public.commerce_intelligence_decisions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='commerce_intelligence_decisions' and policyname='ci_decisions_admin_read') then
    create policy ci_decisions_admin_read on public.commerce_intelligence_decisions
      for select using (
        exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('ADMIN','SUPER_ADMIN') and ur.deleted_at is null)
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='commerce_intelligence_decisions' and policyname='ci_decisions_actor_read') then
    create policy ci_decisions_actor_read on public.commerce_intelligence_decisions
      for select using (actor_id = auth.uid());
  end if;
end $$;

-- ===========================================================================
-- Pricing proposals (governed price changes)
-- ===========================================================================
create table if not exists public.pricing_proposals (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null,
  vendor_id uuid,
  current_price_minor bigint not null,
  proposed_price_minor bigint not null,
  currency text not null default 'INR',
  strategy text not null,                            -- static|promotional|inventory_based|demand_based|competitive|distress
  reasons jsonb not null default '[]'::jsonb,
  guardrail_breached boolean not null default false,
  risk text not null default 'medium',               -- low|medium|high|critical
  status text not null default 'proposed' check (status in ('proposed','approved','rejected','applied','auto_applied','rolled_back')),
  decision_id uuid references public.commerce_intelligence_decisions(id) on delete set null,
  proposed_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  applied_at timestamptz,
  rolled_back_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_pricing_proposals_vendor_status on public.pricing_proposals (vendor_id, status);
create index if not exists idx_pricing_proposals_product on public.pricing_proposals (product_id, created_at desc);
create index if not exists idx_pricing_proposals_status_created on public.pricing_proposals (status, created_at desc);

alter table public.pricing_proposals enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pricing_proposals' and policyname='pricing_proposals_admin_all') then
    create policy pricing_proposals_admin_all on public.pricing_proposals
      for select using (
        exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('ADMIN','SUPER_ADMIN') and ur.deleted_at is null)
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='pricing_proposals' and policyname='pricing_proposals_vendor_read') then
    create policy pricing_proposals_vendor_read on public.pricing_proposals
      for select using (
        exists (
          select 1 from public.vendor_members vm
          where vm.vendor_id = pricing_proposals.vendor_id and vm.user_id = auth.uid() and vm.deleted_at is null
        )
      );
  end if;
end $$;

comment on table public.commerce_intelligence_decisions is 'Phase F: unified auditable ledger of every commerce-intelligence decision across all domains.';
comment on table public.pricing_proposals is 'Phase F: governed price-change proposals with approve/apply/rollback trail. High-risk changes are never auto-applied.';
