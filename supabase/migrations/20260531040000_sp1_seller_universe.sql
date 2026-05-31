-- SP-1: Seller Universe Foundation & Store Network System (Wave 2)
-- Additive + idempotent. Introduces the canonical seller + store registries (identity, classification,
-- governance audit, verification, approval) on top of Wave 1. Does NOT modify Wave-1 foundations, the
-- pre-existing vendors/seller_* tables, and starts NO inventory/product-mapping/delivery/hyperlocal.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------------------------
do $$ begin create type public.seller_universe_type as enum ('ENTERPRISE','CHAIN','REGIONAL','FRANCHISE','INDEPENDENT'); exception when duplicate_object then null; end $$;
do $$ begin create type public.seller_business_type as enum ('PRIVATE_LIMITED','PUBLIC_LIMITED','LLP','PARTNERSHIP','PROPRIETORSHIP','COOPERATIVE'); exception when duplicate_object then null; end $$;
do $$ begin create type public.seller_verification_status as enum ('UNVERIFIED','PENDING','VERIFIED','REJECTED'); exception when duplicate_object then null; end $$;
do $$ begin create type public.seller_operational_status as enum ('ACTIVE','PAUSED','SUSPENDED','CLOSED'); exception when duplicate_object then null; end $$;
do $$ begin create type public.seller_lifecycle_status as enum ('DRAFT','ACTIVE','ARCHIVED','MERGED'); exception when duplicate_object then null; end $$;
do $$ begin
  create type public.store_classification_type as enum (
    'GROCERY','SUPERMARKET','HYPERMARKET','PHARMACY','BAKERY','FRESH_PRODUCE','MEAT','FISH','PET_SUPPLIES',
    'ELECTRONICS','FASHION','HOUSEHOLD','STATIONERY','POOJA','HEALTH','BABY_CARE','SWEETS','SPECIALTY'
  );
exception when duplicate_object then null; end $$;
do $$ begin create type public.store_operation as enum ('CREATE','EDIT','ARCHIVE','RESTORE','APPROVE','REJECT','VERIFY','SUSPEND'); exception when duplicate_object then null; end $$;
do $$ begin create type public.store_change_request_status as enum ('PENDING_APPROVAL','APPROVED','REJECTED','APPLIED'); exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------------------------
-- Seller registry
-- ---------------------------------------------------------------------------------------------
create table if not exists public.seller_universe (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  seller_key text not null unique,
  parent_chain_key text references public.seller_universe(seller_key) on delete set null,
  name text not null,
  slug text not null unique,
  seller_type public.seller_universe_type not null default 'INDEPENDENT',
  legal_entity text not null,
  business_type public.seller_business_type not null default 'PRIVATE_LIMITED',
  verification_status public.seller_verification_status not null default 'UNVERIFIED',
  tax_id text,
  operational_status public.seller_operational_status not null default 'ACTIVE',
  lifecycle_status public.seller_lifecycle_status not null default 'ACTIVE',
  home_region text not null default 'TN',
  metadata jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------------------------
-- Store registry + classification + verification
-- ---------------------------------------------------------------------------------------------
create table if not exists public.store_universe (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  store_key text not null unique,
  seller_key text not null references public.seller_universe(seller_key) on delete cascade,
  name text not null,
  slug text not null unique,
  store_type public.store_classification_type not null,
  departments text[] not null default '{}',
  description text not null default '',
  verification_status public.seller_verification_status not null default 'UNVERIFIED',
  operational_status public.seller_operational_status not null default 'ACTIVE',
  lifecycle_status public.seller_lifecycle_status not null default 'ACTIVE',
  city text,
  area text,
  region text,
  pincode text,
  latitude numeric,
  longitude numeric,
  operating_hours text not null default '08:00-22:00',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.store_classification (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  store_key text not null references public.store_universe(store_key) on delete cascade,
  store_type public.store_classification_type not null,
  departments text[] not null default '{}',
  unique (store_key)
);

create table if not exists public.store_verification (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  store_key text not null references public.store_universe(store_key) on delete cascade,
  status public.seller_verification_status not null default 'UNVERIFIED',
  verified_by text,
  verified_at timestamptz,
  notes text,
  unique (store_key)
);

-- ---------------------------------------------------------------------------------------------
-- Governance: audit + version history + approval workflow (Phase 6)
-- ---------------------------------------------------------------------------------------------
create table if not exists public.store_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  operation public.store_operation not null,
  actor text not null default 'system',
  store_keys text[] not null default '{}',
  before_state jsonb not null default '[]'::jsonb,
  after_state jsonb not null default '[]'::jsonb,
  note text
);

create table if not exists public.store_version_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  store_key text not null references public.store_universe(store_key) on delete cascade,
  version integer not null,
  operation public.store_operation not null,
  actor text not null default 'system',
  snapshot jsonb not null default '{}'::jsonb
);

create table if not exists public.store_change_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  operation public.store_operation not null,
  status public.store_change_request_status not null default 'PENDING_APPROVAL',
  requested_by text not null,
  reviewed_by text,
  payload jsonb not null default '{}'::jsonb,
  note text
);

-- ---------------------------------------------------------------------------------------------
-- updated_at triggers + RLS enablement (reuses existing public.set_updated_at()).
-- ---------------------------------------------------------------------------------------------
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'seller_universe','store_universe','store_classification','store_verification',
    'store_audit_log','store_version_history','store_change_requests'
  ]
  loop
    if exists (select 1 from pg_proc where proname = 'set_updated_at') then
      if exists (select 1 from information_schema.columns where table_schema='public' and table_name=tbl and column_name='updated_at')
         and not exists (select 1 from pg_trigger where tgname = format('set_%s_updated_at', tbl)) then
        execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', tbl, tbl);
      end if;
    end if;
    execute format('alter table public.%I enable row level security', tbl);
  end loop;
end; $$;

-- ---------------------------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------------------------
create index if not exists seller_universe_parent_idx on public.seller_universe(parent_chain_key) where deleted_at is null;
create index if not exists seller_universe_type_idx on public.seller_universe(seller_type, home_region) where deleted_at is null;
create index if not exists store_universe_seller_idx on public.store_universe(seller_key) where deleted_at is null;
create index if not exists store_universe_type_idx on public.store_universe(store_type) where deleted_at is null;
create index if not exists store_universe_region_idx on public.store_universe(region, city) where deleted_at is null;
create index if not exists store_classification_type_idx on public.store_classification(store_type);
create index if not exists store_audit_created_idx on public.store_audit_log(created_at desc);
create index if not exists store_version_history_store_idx on public.store_version_history(store_key, version desc);
create index if not exists store_change_requests_status_idx on public.store_change_requests(status, created_at desc);

-- ---------------------------------------------------------------------------------------------
-- RLS policies: public read of active sellers/stores; admin full control.
-- ---------------------------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='seller_universe' and policyname='seller_universe_public_select') then
    create policy "seller_universe_public_select" on public.seller_universe for select using (operational_status = 'ACTIVE' and deleted_at is null);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='store_universe' and policyname='store_universe_public_select') then
    create policy "store_universe_public_select" on public.store_universe for select using (operational_status = 'ACTIVE' and deleted_at is null);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='store_classification' and policyname='store_classification_public_select') then
    create policy "store_classification_public_select" on public.store_classification for select using (true);
  end if;
end $$;

do $$
declare tbl text;
begin
  foreach tbl in array array[
    'seller_universe','store_universe','store_classification','store_verification',
    'store_audit_log','store_version_history','store_change_requests'
  ]
  loop
    if exists (select 1 from pg_proc where proname = 'current_user_has_role') then
      if not exists (select 1 from pg_policies where schemaname='public' and tablename=tbl and policyname=format('%s_admin_all', tbl)) then
        execute format(
          'create policy "%s_admin_all" on public.%I for all using (public.current_user_has_role(array[''ADMIN'',''SUPER_ADMIN'']::text[])) with check (public.current_user_has_role(array[''ADMIN'',''SUPER_ADMIN'']::text[]))',
          tbl, tbl
        );
      end if;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Integrity guard: surfaces orphan stores, broken ownership and verification conflicts.
-- ---------------------------------------------------------------------------------------------
create or replace function public.seller_network_integrity_check()
returns table (issue_code text, entity_key text, detail text)
language sql
stable
as $$
  -- Stores whose owning seller does not resolve.
  select 'ORPHAN_STORE'::text, s.store_key, s.seller_key
  from public.store_universe s
  where not exists (select 1 from public.seller_universe se where se.seller_key = s.seller_key)
  union all
  -- Sellers whose parent chain does not resolve.
  select 'BROKEN_OWNERSHIP'::text, se.seller_key, se.parent_chain_key
  from public.seller_universe se
  where se.parent_chain_key is not null
    and not exists (select 1 from public.seller_universe p where p.seller_key = se.parent_chain_key)
  union all
  -- Verification conflicts (rejected but operationally active).
  select 'VERIFICATION_CONFLICT'::text, s.store_key, null::text
  from public.store_universe s
  where s.verification_status = 'REJECTED' and s.operational_status = 'ACTIVE';
$$;
