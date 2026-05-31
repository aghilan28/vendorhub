-- PP-2: Brand Universe Foundation & Brand Intelligence System
-- Additive + idempotent. Introduces the canonical brand system (companies, brands, ownership,
-- aliases, taxonomy links, governance audit + approval) on top of PP-1's taxonomy_nodes. Does NOT
-- modify the pre-existing public.brands table, PP-1 tables, products, inventory or sellers.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------------------------
do $$
begin
  create type public.brand_status as enum ('DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED', 'MERGED');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.brand_verification_status as enum ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.brand_operation as enum ('CREATE', 'EDIT', 'MERGE', 'ARCHIVE', 'RESTORE', 'VERIFY', 'REJECT', 'DEPRECATE');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.brand_change_request_status as enum ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'APPLIED');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Companies (parent/holding) + self-referential M&A hierarchy
-- ---------------------------------------------------------------------------------------------
create table if not exists public.brand_companies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  company_key text not null unique,
  parent_company_key text references public.brand_companies(company_key) on delete set null,
  name text not null,
  slug text not null unique,
  country text not null default 'IN',
  industry text not null default 'OTHER',
  founded_year integer,
  aliases text[] not null default '{}',
  status public.brand_status not null default 'ACTIVE',
  metadata jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------------------------
-- Canonical brands
-- ---------------------------------------------------------------------------------------------
create table if not exists public.brand_universe (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  brand_key text not null unique,
  name text not null,
  slug text not null unique,
  description text not null default '',
  logo_url text,
  website text,
  country text not null default 'IN',
  company_key text references public.brand_companies(company_key) on delete set null,
  industry text not null default 'OTHER',
  founded_year integer,
  verification_status public.brand_verification_status not null default 'UNVERIFIED',
  status public.brand_status not null default 'ACTIVE',
  origin_region text,
  is_local_brand boolean not null default false,
  -- Future localization / multi-language.
  localized_names jsonb not null default '{}'::jsonb,
  aliases text[] not null default '{}',
  merged_into_key text references public.brand_universe(brand_key) on delete set null,
  -- Future marketplace-specific extensions.
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

-- Ownership / transfer relationships (supports M&A history beyond the direct company_key).
create table if not exists public.brand_ownership (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  brand_key text not null references public.brand_universe(brand_key) on delete cascade,
  company_key text not null references public.brand_companies(company_key) on delete cascade,
  relationship text not null default 'OWNS',
  effective_from date,
  effective_to date,
  metadata jsonb not null default '{}'::jsonb,
  unique (brand_key, company_key, relationship)
);

-- Aliases / synonyms / misspellings (search readiness).
create table if not exists public.brand_aliases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  brand_key text not null references public.brand_universe(brand_key) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  kind text not null default 'alias',
  unique (brand_key, normalized_alias)
);

-- Brand -> PP-1 taxonomy mapping (Phase 4).
create table if not exists public.brand_taxonomy_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  brand_key text not null references public.brand_universe(brand_key) on delete cascade,
  taxonomy_node_key text not null,
  link_kind text not null default 'department',
  unique (brand_key, taxonomy_node_key)
);

-- ---------------------------------------------------------------------------------------------
-- Governance: audit trail + approval workflow
-- ---------------------------------------------------------------------------------------------
create table if not exists public.brand_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  operation public.brand_operation not null,
  actor text not null default 'system',
  brand_keys text[] not null default '{}',
  before_state jsonb not null default '[]'::jsonb,
  after_state jsonb not null default '[]'::jsonb,
  note text
);

create table if not exists public.brand_change_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  operation public.brand_operation not null,
  status public.brand_change_request_status not null default 'PENDING_APPROVAL',
  requested_by text not null,
  reviewed_by text,
  payload jsonb not null default '{}'::jsonb,
  note text
);

-- ---------------------------------------------------------------------------------------------
-- updated_at triggers + RLS enablement (reuses existing public.set_updated_at()).
-- ---------------------------------------------------------------------------------------------
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'brand_companies', 'brand_universe', 'brand_ownership', 'brand_aliases',
    'brand_taxonomy_links', 'brand_audit_log', 'brand_change_requests'
  ]
  loop
    if exists (select 1 from pg_proc where proname = 'set_updated_at') then
      if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = tbl and column_name = 'updated_at'
      ) and not exists (
        select 1 from pg_trigger where tgname = format('set_%s_updated_at', tbl)
      ) then
        execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', tbl, tbl);
      end if;
    end if;
    execute format('alter table public.%I enable row level security', tbl);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------------------------
create index if not exists brand_universe_company_idx on public.brand_universe(company_key) where deleted_at is null;
create index if not exists brand_universe_status_idx on public.brand_universe(status, verification_status) where deleted_at is null;
create index if not exists brand_universe_industry_idx on public.brand_universe(industry) where deleted_at is null;
create index if not exists brand_universe_local_idx on public.brand_universe(is_local_brand) where deleted_at is null;
create index if not exists brand_companies_parent_idx on public.brand_companies(parent_company_key);
create index if not exists brand_ownership_brand_idx on public.brand_ownership(brand_key);
create index if not exists brand_ownership_company_idx on public.brand_ownership(company_key);
create index if not exists brand_aliases_norm_idx on public.brand_aliases(normalized_alias);
create index if not exists brand_taxonomy_links_node_idx on public.brand_taxonomy_links(taxonomy_node_key);
create index if not exists brand_audit_log_created_idx on public.brand_audit_log(created_at desc);
create index if not exists brand_change_requests_status_idx on public.brand_change_requests(status, created_at desc);

-- ---------------------------------------------------------------------------------------------
-- RLS policies: public read of active brand reference data; admin full control.
-- ---------------------------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'brand_universe' and policyname = 'brand_universe_public_select') then
    create policy "brand_universe_public_select" on public.brand_universe for select using (status = 'ACTIVE' and deleted_at is null);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'brand_companies' and policyname = 'brand_companies_public_select') then
    create policy "brand_companies_public_select" on public.brand_companies for select using (deleted_at is null);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'brand_aliases' and policyname = 'brand_aliases_public_select') then
    create policy "brand_aliases_public_select" on public.brand_aliases for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'brand_taxonomy_links' and policyname = 'brand_taxonomy_links_public_select') then
    create policy "brand_taxonomy_links_public_select" on public.brand_taxonomy_links for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'brand_ownership' and policyname = 'brand_ownership_public_select') then
    create policy "brand_ownership_public_select" on public.brand_ownership for select using (true);
  end if;
end $$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'brand_companies', 'brand_universe', 'brand_ownership', 'brand_aliases',
    'brand_taxonomy_links', 'brand_audit_log', 'brand_change_requests'
  ]
  loop
    if exists (select 1 from pg_proc where proname = 'current_user_has_role') then
      if not exists (
        select 1 from pg_policies where schemaname = 'public' and tablename = tbl and policyname = format('%s_admin_all', tbl)
      ) then
        execute format(
          'create policy "%s_admin_all" on public.%I for all using (public.current_user_has_role(array[''ADMIN'', ''SUPER_ADMIN'']::text[])) with check (public.current_user_has_role(array[''ADMIN'', ''SUPER_ADMIN'']::text[]))',
          tbl, tbl
        );
      end if;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Integrity guard: surfaces broken/circular ownership and orphan companies for governance.
-- ---------------------------------------------------------------------------------------------
create or replace function public.brand_integrity_check()
returns table (issue_code text, entity_key text, detail text)
language sql
stable
as $$
  -- Brands referencing a missing company.
  select 'BROKEN_OWNERSHIP'::text, b.brand_key, b.company_key
  from public.brand_universe b
  where b.company_key is not null
    and not exists (select 1 from public.brand_companies c where c.company_key = b.company_key)
  union all
  -- Companies referencing a missing parent.
  select 'BROKEN_OWNERSHIP'::text, c.company_key, c.parent_company_key
  from public.brand_companies c
  where c.parent_company_key is not null
    and not exists (select 1 from public.brand_companies p where p.company_key = c.parent_company_key)
  union all
  -- Orphan companies: own no brands and parent no other company.
  select 'ORPHAN_COMPANY'::text, c.company_key, null::text
  from public.brand_companies c
  where not exists (select 1 from public.brand_universe b where b.company_key = c.company_key)
    and not exists (select 1 from public.brand_companies s where s.parent_company_key = c.company_key);
$$;
