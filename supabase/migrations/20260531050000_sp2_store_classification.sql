-- SP-2: Store Classification, Category & Capability System (Wave 2)
-- Additive + idempotent. Introduces the store category/type/capability/fulfillment/compliance
-- registries on top of SP-1 stores. Does NOT modify SP-1 (seller_universe/store_universe) or its
-- store_classification table, and starts NO inventory/product-mapping/delivery/hyperlocal.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------------------------
do $$ begin create type public.store_category_l1 as enum ('RETAIL','FOOD','HEALTHCARE','ELECTRONICS','FASHION','HOME','SERVICES','SPECIALTY','AUTOMOTIVE','PET'); exception when duplicate_object then null; end $$;
do $$ begin
  create type public.store_format_type as enum (
    'NATIONAL_CHAIN','REGIONAL_CHAIN','LOCAL_CHAIN','INDEPENDENT_STORE','FRANCHISE','FLAGSHIP',
    'WAREHOUSE','DARK_STORE','FULFILLMENT_CENTER','MICRO_HUB','HYBRID_STORE'
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.store_fulfillment_mode as enum (
    'PICKUP','STORE_DELIVERY','COURIER','PARTNER_DELIVERY','WAREHOUSE_FULFILLMENT','DARK_STORE_FULFILLMENT','HYBRID_FULFILLMENT'
  );
exception when duplicate_object then null; end $$;
do $$ begin create type public.store_classification_operation as enum ('ASSIGN','EDIT','OVERRIDE','APPROVE','REJECT','RESET'); exception when duplicate_object then null; end $$;
do $$ begin create type public.store_classification_change_status as enum ('PENDING_APPROVAL','APPROVED','REJECTED','APPLIED'); exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------------------------
-- Store category taxonomy (L1 -> L2) + store-type registry
-- ---------------------------------------------------------------------------------------------
create table if not exists public.store_category_taxonomy (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  category_l1 public.store_category_l1 not null,
  category_l2 text not null,
  unique (category_l1, category_l2)
);

create table if not exists public.store_type_registry (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  format_type public.store_format_type not null unique,
  description text
);

-- ---------------------------------------------------------------------------------------------
-- Capability / fulfillment / compliance profiles + capability assignments
-- ---------------------------------------------------------------------------------------------
create table if not exists public.store_capability_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  store_key text not null unique,
  category_l1 public.store_category_l1 not null,
  category_l2 text not null,
  format_type public.store_format_type not null,
  capabilities jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version >= 1)
);

create table if not exists public.store_fulfillment_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  store_key text not null unique,
  modes public.store_fulfillment_mode[] not null default '{}',
  primary_mode public.store_fulfillment_mode not null,
  max_radius_km numeric not null default 0
);

create table if not exists public.store_compliance_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  store_key text not null unique,
  allowed_departments text[] not null default '{}',
  restricted_departments text[] not null default '{}',
  compliance_requirements text[] not null default '{}'
);

create table if not exists public.store_capability_assignments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  store_key text not null,
  capability text not null,
  enabled boolean not null default true,
  unique (store_key, capability)
);

-- ---------------------------------------------------------------------------------------------
-- Governance: audit + approval workflow (Phase 9)
-- ---------------------------------------------------------------------------------------------
create table if not exists public.store_classification_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  operation public.store_classification_operation not null,
  actor text not null default 'system',
  store_keys text[] not null default '{}',
  before_state jsonb not null default '[]'::jsonb,
  after_state jsonb not null default '[]'::jsonb,
  note text
);

create table if not exists public.store_classification_change_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  operation public.store_classification_operation not null,
  status public.store_classification_change_status not null default 'PENDING_APPROVAL',
  requested_by text not null,
  reviewed_by text,
  payload jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------------------------
-- updated_at triggers + RLS enablement (reuses existing public.set_updated_at()).
-- ---------------------------------------------------------------------------------------------
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'store_category_taxonomy','store_type_registry','store_capability_profiles','store_fulfillment_profiles',
    'store_compliance_profiles','store_capability_assignments','store_classification_audit_log','store_classification_change_requests'
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
create index if not exists store_capability_profiles_cat_idx on public.store_capability_profiles(category_l1, category_l2);
create index if not exists store_capability_profiles_format_idx on public.store_capability_profiles(format_type);
create index if not exists store_fulfillment_profiles_primary_idx on public.store_fulfillment_profiles(primary_mode);
create index if not exists store_capability_assignments_store_idx on public.store_capability_assignments(store_key);
create index if not exists store_capability_assignments_cap_idx on public.store_capability_assignments(capability) where enabled;
create index if not exists store_classification_audit_created_idx on public.store_classification_audit_log(created_at desc);
create index if not exists store_classification_change_status_idx on public.store_classification_change_requests(status, created_at desc);

-- ---------------------------------------------------------------------------------------------
-- RLS policies: public read of classification reference data; admin full control.
-- ---------------------------------------------------------------------------------------------
do $$
declare tbl text;
begin
  foreach tbl in array array['store_category_taxonomy','store_type_registry','store_capability_profiles','store_fulfillment_profiles','store_compliance_profiles','store_capability_assignments']
  loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=tbl and policyname=format('%s_public_select', tbl)) then
      execute format('create policy "%s_public_select" on public.%I for select using (true)', tbl, tbl);
    end if;
  end loop;
  foreach tbl in array array[
    'store_category_taxonomy','store_type_registry','store_capability_profiles','store_fulfillment_profiles',
    'store_compliance_profiles','store_capability_assignments','store_classification_audit_log','store_classification_change_requests'
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
-- Integrity guard: surfaces conflicting capabilities and compliance violations.
-- ---------------------------------------------------------------------------------------------
create or replace function public.store_classification_integrity_check()
returns table (issue_code text, entity_key text, detail text)
language sql
stable
as $$
  -- Instant delivery without delivery capability.
  select 'CONFLICTING_CAPABILITY'::text, p.store_key, 'instantDelivery_without_delivery'
  from public.store_capability_profiles p
  where (p.capabilities->>'instantDelivery')::boolean is true
    and coalesce((p.capabilities->>'delivery')::boolean, false) is false
  union all
  -- Sells medicine without a drug licence.
  select 'COMPLIANCE_VIOLATION'::text, c.store_key, 'medicine_without_drug_license'
  from public.store_compliance_profiles c
  where 'medicine' = any(c.allowed_departments)
    and not ('drug_license' = any(c.compliance_requirements));
$$;
