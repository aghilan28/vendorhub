-- PP-1: Canonical Commerce Taxonomy Foundation
-- Additive + idempotent. Introduces the unified hierarchical taxonomy ontology
-- (single source of truth) plus its attribute framework, synonyms, governance audit
-- trail and approval workflow. Complements (does NOT replace) the existing per-level
-- departments/categories/subcategories/product_families tables. No products/inventory.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------------------------
do $$
begin
  create type public.taxonomy_node_level as enum (
    'DEPARTMENT', 'CATEGORY', 'SUBCATEGORY', 'PRODUCT_FAMILY', 'PRODUCT_TYPE', 'VARIANT_GROUP'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.taxonomy_node_status as enum (
    'DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED', 'MERGED', 'SPLIT'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.taxonomy_attribute_data_type as enum ('string', 'number', 'boolean', 'enum', 'measure');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.taxonomy_operation as enum ('CREATE', 'EDIT', 'DEPRECATE', 'MERGE', 'SPLIT', 'ARCHIVE', 'RESTORE');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.taxonomy_change_request_status as enum ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'APPLIED');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Reusable attribute framework (defined once, referenced by key)
-- ---------------------------------------------------------------------------------------------
create table if not exists public.taxonomy_attribute_definitions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  key text not null unique,
  label text not null,
  data_type public.taxonomy_attribute_data_type not null,
  unit text,
  allowed_values text[] not null default '{}',
  applies_to_levels public.taxonomy_node_level[] not null default '{}',
  is_filterable boolean not null default false,
  is_searchable boolean not null default false,
  is_variant_defining boolean not null default false,
  description text,
  metadata jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------------------------
-- Canonical hierarchical taxonomy nodes (self-referential, unlimited future depth)
-- ---------------------------------------------------------------------------------------------
create table if not exists public.taxonomy_nodes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- Stable engine handle (hierarchical slug from the lib/taxonomy source of truth).
  node_key text not null unique,
  parent_key text references public.taxonomy_nodes(node_key) on delete restrict,
  level public.taxonomy_node_level not null,
  depth integer not null default 0 check (depth >= 0),
  slug text not null unique,
  local_slug text not null,
  path text not null unique,
  path_keys text[] not null default '{}',
  canonical_name text not null,
  -- Future localization / multilingual support.
  localized_names jsonb not null default '{}'::jsonb,
  synonyms text[] not null default '{}',
  search_terms text[] not null default '{}',
  attribute_keys text[] not null default '{}',
  -- SEO support.
  seo_meta_title text,
  seo_meta_description text,
  seo_keywords text[] not null default '{}',
  seo_canonical_path text,
  -- Future region-specific extensions.
  regions text[] not null default '{}',
  sort_order integer not null default 0,
  status public.taxonomy_node_status not null default 'ACTIVE',
  is_active boolean not null default true,
  -- Versioning + soft delete + merge lineage.
  version integer not null default 1 check (version >= 1),
  merged_into_key text references public.taxonomy_nodes(node_key) on delete set null,
  -- Future marketplace-specific extensions.
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

-- Attribute assignments (which node declares which reusable attribute).
create table if not exists public.taxonomy_node_attributes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  node_key text not null references public.taxonomy_nodes(node_key) on delete cascade,
  attribute_key text not null references public.taxonomy_attribute_definitions(key) on delete restrict,
  value jsonb,
  unique (node_key, attribute_key)
);

-- Synonym / search-readiness grouping.
create table if not exists public.taxonomy_synonyms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  node_key text not null references public.taxonomy_nodes(node_key) on delete cascade,
  term text not null,
  normalized_term text not null,
  language text not null default 'en',
  kind text not null default 'synonym',
  unique (node_key, normalized_term, language)
);

-- ---------------------------------------------------------------------------------------------
-- Governance: audit trail + approval workflow
-- ---------------------------------------------------------------------------------------------
create table if not exists public.taxonomy_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  operation public.taxonomy_operation not null,
  actor text not null default 'system',
  node_keys text[] not null default '{}',
  before_state jsonb not null default '[]'::jsonb,
  after_state jsonb not null default '[]'::jsonb,
  note text
);

create table if not exists public.taxonomy_change_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  operation public.taxonomy_operation not null,
  status public.taxonomy_change_request_status not null default 'PENDING_APPROVAL',
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
    'taxonomy_attribute_definitions', 'taxonomy_nodes', 'taxonomy_node_attributes',
    'taxonomy_synonyms', 'taxonomy_audit_log', 'taxonomy_change_requests'
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
create index if not exists taxonomy_nodes_parent_idx on public.taxonomy_nodes(parent_key) where deleted_at is null;
create index if not exists taxonomy_nodes_level_idx on public.taxonomy_nodes(level, sort_order) where deleted_at is null;
create index if not exists taxonomy_nodes_status_idx on public.taxonomy_nodes(status) where deleted_at is null;
create index if not exists taxonomy_nodes_active_idx on public.taxonomy_nodes(is_active, level) where deleted_at is null;
create index if not exists taxonomy_nodes_path_idx on public.taxonomy_nodes(path);
create index if not exists taxonomy_node_attributes_node_idx on public.taxonomy_node_attributes(node_key);
create index if not exists taxonomy_synonyms_node_idx on public.taxonomy_synonyms(node_key);
create index if not exists taxonomy_synonyms_term_idx on public.taxonomy_synonyms(normalized_term);
create index if not exists taxonomy_audit_log_created_idx on public.taxonomy_audit_log(created_at desc);
create index if not exists taxonomy_change_requests_status_idx on public.taxonomy_change_requests(status, created_at desc);

-- ---------------------------------------------------------------------------------------------
-- RLS policies: public read of active reference data; admin full control.
-- ---------------------------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'taxonomy_nodes' and policyname = 'taxonomy_nodes_public_select') then
    create policy "taxonomy_nodes_public_select" on public.taxonomy_nodes for select using (is_active = true and deleted_at is null);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'taxonomy_attribute_definitions' and policyname = 'taxonomy_attribute_definitions_public_select') then
    create policy "taxonomy_attribute_definitions_public_select" on public.taxonomy_attribute_definitions for select using (deleted_at is null);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'taxonomy_node_attributes' and policyname = 'taxonomy_node_attributes_public_select') then
    create policy "taxonomy_node_attributes_public_select" on public.taxonomy_node_attributes for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'taxonomy_synonyms' and policyname = 'taxonomy_synonyms_public_select') then
    create policy "taxonomy_synonyms_public_select" on public.taxonomy_synonyms for select using (true);
  end if;
end $$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'taxonomy_attribute_definitions', 'taxonomy_nodes', 'taxonomy_node_attributes',
    'taxonomy_synonyms', 'taxonomy_audit_log', 'taxonomy_change_requests'
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
-- SQL-side integrity guard: surfaces orphan / duplicate / depth issues for the governance layer.
-- ---------------------------------------------------------------------------------------------
create or replace function public.taxonomy_integrity_check()
returns table (issue_code text, node_key text, detail text)
language sql
stable
as $$
  -- Orphan nodes: non-department nodes whose parent_key does not resolve.
  select 'ORPHAN_NODE'::text, n.node_key, n.parent_key
  from public.taxonomy_nodes n
  where n.parent_key is not null
    and not exists (select 1 from public.taxonomy_nodes p where p.node_key = n.parent_key)
  union all
  -- Departments must be roots.
  select 'INVALID_PARENT'::text, n.node_key, n.parent_key
  from public.taxonomy_nodes n
  where n.level = 'DEPARTMENT' and n.parent_key is not null
  union all
  -- Non-departments must have a parent.
  select 'MISSING_ROOT_PARENT'::text, n.node_key, null::text
  from public.taxonomy_nodes n
  where n.level <> 'DEPARTMENT' and n.parent_key is null
  union all
  -- Depth must match level position (DEPARTMENT=0 .. VARIANT_GROUP=5).
  select 'DEPTH_VIOLATION'::text, n.node_key, n.depth::text
  from public.taxonomy_nodes n
  where n.depth <> array_position(
    array['DEPARTMENT', 'CATEGORY', 'SUBCATEGORY', 'PRODUCT_FAMILY', 'PRODUCT_TYPE', 'VARIANT_GROUP'],
    n.level::text
  ) - 1;
$$;
