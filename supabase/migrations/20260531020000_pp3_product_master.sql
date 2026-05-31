-- PP-3: Product Master Foundation & Product Ontology System
-- Additive + idempotent. Introduces the canonical product master model (products, variants, SKU /
-- barcode / packaging registries, governance audit + approval) on top of PP-1 taxonomy_nodes and
-- PP-2 brand_universe. Does NOT modify PP-1, PP-2, the pre-existing master_products/products tables,
-- and creates NO products/inventory/sellers (ontology layer only).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------------------------
do $$
begin
  create type public.product_master_status as enum ('DRAFT', 'ACTIVE', 'ARCHIVED', 'MERGED', 'SPLIT');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.product_lifecycle_status as enum ('PLANNED', 'ACTIVE', 'DISCONTINUED', 'END_OF_LIFE');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.product_sku_namespace as enum ('INTERNAL', 'VENDOR', 'MARKETPLACE', 'SUPPLIER');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.product_barcode_standard as enum ('BARCODE', 'UPC', 'EAN', 'GTIN');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.product_packaging_level as enum ('UNIT', 'PACK', 'MULTIPACK', 'BOX', 'CASE', 'CARTON', 'BUNDLE');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.product_operation as enum ('CREATE', 'EDIT', 'ARCHIVE', 'RESTORE', 'APPROVE', 'REJECT', 'MERGE', 'SPLIT');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.product_change_request_status as enum ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'APPLIED');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Product masters
-- ---------------------------------------------------------------------------------------------
create table if not exists public.product_masters (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  product_key text not null unique,
  name text not null,
  slug text not null unique,
  description text not null default '',
  -- PP-2 brand + PP-1 taxonomy bindings (stored as keys; enforced by the validation engine).
  brand_key text,
  department_key text not null,
  category_key text,
  family_key text,
  type_key text,
  status public.product_master_status not null default 'ACTIVE',
  lifecycle_status public.product_lifecycle_status not null default 'ACTIVE',
  version integer not null default 1 check (version >= 1),
  attributes jsonb not null default '{}'::jsonb,
  localized_names jsonb not null default '{}'::jsonb,
  merged_into_key text references public.product_masters(product_key) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

-- ---------------------------------------------------------------------------------------------
-- Product variants
-- ---------------------------------------------------------------------------------------------
create table if not exists public.product_master_variants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  variant_key text not null unique,
  product_key text not null references public.product_masters(product_key) on delete cascade,
  name text not null,
  slug text not null,
  axes jsonb not null default '{}'::jsonb,
  internal_sku text not null,
  packaging_level public.product_packaging_level not null default 'UNIT',
  base_unit text not null default 'unit',
  base_quantity numeric not null default 1,
  units_per_pack integer not null default 1,
  attributes jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  status public.product_master_status not null default 'ACTIVE',
  unique (product_key, slug)
);

-- ---------------------------------------------------------------------------------------------
-- SKU registry (unique, multi-namespace) + barcode registry (Phase 3)
-- ---------------------------------------------------------------------------------------------
create table if not exists public.product_sku_registry (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sku text not null,
  namespace public.product_sku_namespace not null default 'INTERNAL',
  variant_key text not null references public.product_master_variants(variant_key) on delete cascade,
  unique (namespace, sku)
);

create table if not exists public.product_barcode_registry (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  barcode text not null,
  standard public.product_barcode_standard not null default 'EAN',
  variant_key text not null references public.product_master_variants(variant_key) on delete cascade,
  unique (standard, barcode)
);

-- ---------------------------------------------------------------------------------------------
-- Packaging registry (Phase 5)
-- ---------------------------------------------------------------------------------------------
create table if not exists public.product_packaging_registry (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  variant_key text not null references public.product_master_variants(variant_key) on delete cascade,
  level public.product_packaging_level not null,
  base_unit text not null,
  base_quantity numeric not null default 1,
  units_per_pack integer not null default 1,
  parent_level public.product_packaging_level,
  metadata jsonb not null default '{}'::jsonb,
  unique (variant_key, level)
);

-- ---------------------------------------------------------------------------------------------
-- Governance: audit + version history + approval workflow (Phase 7)
-- ---------------------------------------------------------------------------------------------
create table if not exists public.product_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  operation public.product_operation not null,
  actor text not null default 'system',
  product_keys text[] not null default '{}',
  before_state jsonb not null default '[]'::jsonb,
  after_state jsonb not null default '[]'::jsonb,
  note text
);

create table if not exists public.product_version_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_key text not null references public.product_masters(product_key) on delete cascade,
  version integer not null,
  operation public.product_operation not null,
  actor text not null default 'system',
  snapshot jsonb not null default '{}'::jsonb,
  unique (product_key, version, operation, created_at)
);

create table if not exists public.product_change_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  operation public.product_operation not null,
  status public.product_change_request_status not null default 'PENDING_APPROVAL',
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
    'product_masters', 'product_master_variants', 'product_sku_registry', 'product_barcode_registry',
    'product_packaging_registry', 'product_audit_log', 'product_version_history', 'product_change_requests'
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
create index if not exists product_masters_brand_idx on public.product_masters(brand_key) where deleted_at is null;
create index if not exists product_masters_dept_idx on public.product_masters(department_key) where deleted_at is null;
create index if not exists product_masters_status_idx on public.product_masters(status, lifecycle_status) where deleted_at is null;
create index if not exists product_variants_product_idx on public.product_master_variants(product_key);
create index if not exists product_variants_sku_idx on public.product_master_variants(internal_sku);
create index if not exists product_sku_registry_variant_idx on public.product_sku_registry(variant_key);
create index if not exists product_barcode_registry_variant_idx on public.product_barcode_registry(variant_key);
create index if not exists product_packaging_variant_idx on public.product_packaging_registry(variant_key);
create index if not exists product_audit_log_created_idx on public.product_audit_log(created_at desc);
create index if not exists product_version_history_product_idx on public.product_version_history(product_key, version desc);
create index if not exists product_change_requests_status_idx on public.product_change_requests(status, created_at desc);

-- ---------------------------------------------------------------------------------------------
-- RLS policies: public read of active product reference data; admin full control.
-- ---------------------------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_masters' and policyname = 'product_masters_public_select') then
    create policy "product_masters_public_select" on public.product_masters for select using (status = 'ACTIVE' and deleted_at is null);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_master_variants' and policyname = 'product_master_variants_public_select') then
    create policy "product_master_variants_public_select" on public.product_master_variants for select using (status = 'ACTIVE');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_sku_registry' and policyname = 'product_sku_registry_public_select') then
    create policy "product_sku_registry_public_select" on public.product_sku_registry for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_barcode_registry' and policyname = 'product_barcode_registry_public_select') then
    create policy "product_barcode_registry_public_select" on public.product_barcode_registry for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_packaging_registry' and policyname = 'product_packaging_registry_public_select') then
    create policy "product_packaging_registry_public_select" on public.product_packaging_registry for select using (true);
  end if;
end $$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'product_masters', 'product_master_variants', 'product_sku_registry', 'product_barcode_registry',
    'product_packaging_registry', 'product_audit_log', 'product_version_history', 'product_change_requests'
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
-- Integrity guard: surfaces broken variant trees, missing SKUs and orphan products.
-- ---------------------------------------------------------------------------------------------
create or replace function public.product_integrity_check()
returns table (issue_code text, entity_key text, detail text)
language sql
stable
as $$
  -- Variants pointing at a missing product.
  select 'BROKEN_VARIANT_TREE'::text, v.variant_key, v.product_key
  from public.product_master_variants v
  where not exists (select 1 from public.product_masters p where p.product_key = v.product_key)
  union all
  -- Variants without an internal SKU.
  select 'MISSING_VARIANT_SKU'::text, v.variant_key, null::text
  from public.product_master_variants v
  where v.internal_sku is null or v.internal_sku = ''
  union all
  -- Products with no department mapping.
  select 'ORPHAN_PRODUCT'::text, p.product_key, null::text
  from public.product_masters p
  where p.department_key is null or p.department_key = '';
$$;
