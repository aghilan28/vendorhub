-- PP-5: Media Population, Image Intelligence & Product Visualization
-- Additive + idempotent. Introduces the product media registries (assets, gallery, thumbnails,
-- quality, governance audit, change requests) on top of the PP-3/PP-4 product universe. Does NOT
-- modify PP-1/2/3/4, the pre-existing catalog_product_images table, products/inventory/sellers.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------------------------
do $$
begin
  create type public.product_media_kind as enum ('PRIMARY', 'GALLERY', 'THUMBNAIL', 'PACKAGING', 'BRAND_ASSET', 'CATEGORY_ASSET', 'VIDEO', 'VIEW_360', 'AR');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.product_media_status as enum ('DRAFT', 'ACTIVE', 'ARCHIVED', 'REJECTED', 'REPLACED');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.product_media_thumbnail_variant as enum ('STOREFRONT', 'SEARCH', 'CARD', 'CATEGORY', 'ADMIN');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.product_media_operation as enum ('APPROVE', 'REJECT', 'ARCHIVE', 'RESTORE', 'REPLACE', 'VERSION', 'MODERATE');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.product_media_change_request_status as enum ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'APPLIED');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Media registry (primary / gallery / packaging / brand / category assets)
-- ---------------------------------------------------------------------------------------------
create table if not exists public.product_media_assets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  media_key text not null unique,
  product_key text not null,
  variant_key text,
  kind public.product_media_kind not null,
  role text,
  url text not null,
  format text not null default 'webp',
  width integer not null default 0,
  height integer not null default 0,
  aspect_ratio text not null default '1:1',
  alt_text text,
  checksum text not null,
  is_placeholder boolean not null default false,
  status public.product_media_status not null default 'ACTIVE',
  version integer not null default 1 check (version >= 1),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------------------------
-- Gallery registry (ordered roles per product)
-- ---------------------------------------------------------------------------------------------
create table if not exists public.product_media_gallery (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_key text not null,
  media_key text not null references public.product_media_assets(media_key) on delete cascade,
  role text not null,
  sort_order integer not null default 0,
  unique (product_key, role, sort_order)
);

-- ---------------------------------------------------------------------------------------------
-- Thumbnail registry (per storefront surface)
-- ---------------------------------------------------------------------------------------------
create table if not exists public.product_media_thumbnails (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_key text not null,
  variant public.product_media_thumbnail_variant not null,
  url text not null,
  width integer not null,
  height integer not null,
  unique (product_key, variant)
);

-- ---------------------------------------------------------------------------------------------
-- Quality registry (media health per product)
-- ---------------------------------------------------------------------------------------------
create table if not exists public.product_media_quality (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product_key text not null unique,
  coverage_score numeric not null default 0,
  resolution_score numeric not null default 0,
  completeness_score numeric not null default 0,
  duplication_score numeric not null default 0,
  validation_score numeric not null default 0,
  readiness_score numeric not null default 0,
  health_score numeric not null default 0
);

-- ---------------------------------------------------------------------------------------------
-- Governance: audit + change requests (Phase 9)
-- ---------------------------------------------------------------------------------------------
create table if not exists public.product_media_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  operation public.product_media_operation not null,
  actor text not null default 'system',
  media_keys text[] not null default '{}',
  before_state jsonb not null default '[]'::jsonb,
  after_state jsonb not null default '[]'::jsonb,
  note text
);

create table if not exists public.product_media_change_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  operation public.product_media_operation not null,
  status public.product_media_change_request_status not null default 'PENDING_APPROVAL',
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
    'product_media_assets', 'product_media_gallery', 'product_media_thumbnails',
    'product_media_quality', 'product_media_audit_log', 'product_media_change_requests'
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
create index if not exists product_media_assets_product_idx on public.product_media_assets(product_key) where deleted_at is null;
create index if not exists product_media_assets_kind_idx on public.product_media_assets(kind, status) where deleted_at is null;
create index if not exists product_media_assets_checksum_idx on public.product_media_assets(checksum);
create index if not exists product_media_gallery_product_idx on public.product_media_gallery(product_key, sort_order);
create index if not exists product_media_thumbnails_product_idx on public.product_media_thumbnails(product_key);
create index if not exists product_media_quality_health_idx on public.product_media_quality(health_score);
create index if not exists product_media_audit_created_idx on public.product_media_audit_log(created_at desc);
create index if not exists product_media_change_requests_status_idx on public.product_media_change_requests(status, created_at desc);

-- ---------------------------------------------------------------------------------------------
-- RLS policies: public read of active media; admin full control.
-- ---------------------------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_media_assets' and policyname = 'product_media_assets_public_select') then
    create policy "product_media_assets_public_select" on public.product_media_assets for select using (status = 'ACTIVE' and deleted_at is null);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_media_gallery' and policyname = 'product_media_gallery_public_select') then
    create policy "product_media_gallery_public_select" on public.product_media_gallery for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_media_thumbnails' and policyname = 'product_media_thumbnails_public_select') then
    create policy "product_media_thumbnails_public_select" on public.product_media_thumbnails for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'product_media_quality' and policyname = 'product_media_quality_public_select') then
    create policy "product_media_quality_public_select" on public.product_media_quality for select using (true);
  end if;
end $$;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'product_media_assets', 'product_media_gallery', 'product_media_thumbnails',
    'product_media_quality', 'product_media_audit_log', 'product_media_change_requests'
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
-- Integrity guard: surfaces missing primaries, broken URLs and duplicate checksums.
-- ---------------------------------------------------------------------------------------------
create or replace function public.product_media_integrity_check()
returns table (issue_code text, entity_key text, detail text)
language sql
stable
as $$
  -- Assets with a malformed URL.
  select 'BROKEN_URL'::text, a.media_key, a.url
  from public.product_media_assets a
  where a.url !~ '^https?://'
  union all
  -- Assets with invalid dimensions.
  select 'INVALID_DIMENSIONS'::text, a.media_key, format('%sx%s', a.width, a.height)
  from public.product_media_assets a
  where a.width <= 0 or a.height <= 0
  union all
  -- Checksums shared by more than one product (duplicate assets).
  select 'DUPLICATE_ASSET'::text, a.checksum, count(distinct a.product_key)::text
  from public.product_media_assets a
  group by a.checksum
  having count(distinct a.product_key) > 1;
$$;
