-- MCP-0A — Media Pipeline, Product Media Management & Catalog Activation
-- Provisions storage buckets, the media domain tables, and RLS so the
-- marketplace can store, process, moderate and govern media at catalog scale.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- Storage buckets (idempotent)
-- ─────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images',     'product-images',     true,  15000000, array['image/jpeg','image/png','image/webp','image/avif','image/gif']),
  ('product-thumbnails', 'product-thumbnails', true,   2000000, array['image/webp','image/jpeg']),
  ('product-webp',       'product-webp',       true,   8000000, array['image/webp','image/avif']),
  ('brand-assets',       'brand-assets',       true,   8000000, array['image/jpeg','image/png','image/webp','image/avif']),
  ('store-assets',       'store-assets',       true,  12000000, array['image/jpeg','image/png','image/webp','image/avif']),
  ('category-assets',    'category-assets',    true,   8000000, array['image/jpeg','image/png','image/webp','image/avif']),
  ('marketing-assets',   'marketing-assets',   true,  20000000, array['image/jpeg','image/png','image/webp','image/avif']),
  ('temp-uploads',       'temp-uploads',       false, 25000000, array['image/jpeg','image/png','image/webp','image/avif','image/gif']),
  ('moderation-review',  'moderation-review',  false, 25000000, array['image/jpeg','image/png','image/webp','image/avif']),
  ('archive',            'archive',            false, 25000000, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do nothing;

-- Public read for public buckets
do $$
begin
  create policy "media_public_read" on storage.objects
    for select using (
      bucket_id in ('product-images','product-thumbnails','product-webp','brand-assets','store-assets','category-assets','marketing-assets')
    );
exception when duplicate_object then null; end $$;

-- Authenticated users may upload to product/store/brand buckets and temp area
do $$
begin
  create policy "media_authenticated_write" on storage.objects
    for insert to authenticated with check (
      bucket_id in ('product-images','product-thumbnails','product-webp','brand-assets','store-assets','category-assets','temp-uploads')
    );
exception when duplicate_object then null; end $$;

do $$
begin
  create policy "media_owner_update" on storage.objects
    for update to authenticated using (owner = auth.uid());
exception when duplicate_object then null; end $$;

do $$
begin
  create policy "media_owner_delete" on storage.objects
    for delete to authenticated using (owner = auth.uid());
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- Media domain tables
-- ─────────────────────────────────────────────────────────────────────────
do $$
begin
  create type public.media_status as enum (
    'uploading','processing','pending_moderation','active','rejected','archived','failed'
  );
exception when duplicate_object then null; end $$;

do $$
begin
  create type public.media_moderation_state as enum (
    'pending','approved','rejected','flagged','escalated'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'image',
  status public.media_status not null default 'processing',
  bucket text not null,
  path text not null,
  vendor_id uuid references public.vendors(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  owner_id uuid,
  original_filename text,
  alt_text text,
  width integer not null default 0,
  height integer not null default 0,
  bytes bigint not null default 0,
  format text,
  sha256 text,
  perceptual_hash text,
  quality_score integer not null default 0,
  quality_flags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, path)
);

create index if not exists media_assets_product_idx on public.media_assets (product_id);
create index if not exists media_assets_vendor_idx on public.media_assets (vendor_id);
create index if not exists media_assets_sha_idx on public.media_assets (sha256);
create index if not exists media_assets_phash_idx on public.media_assets (perceptual_hash);
create index if not exists media_assets_status_idx on public.media_assets (status);

create table if not exists public.media_variants (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  purpose text not null,
  bucket text not null,
  path text not null,
  format text not null,
  width integer not null default 0,
  height integer not null default 0,
  bytes bigint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists media_variants_asset_idx on public.media_variants (asset_id);

create table if not exists public.media_moderation (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  state public.media_moderation_state not null default 'pending',
  risk_score integer not null default 0,
  reasons text[] not null default '{}',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists media_moderation_state_idx on public.media_moderation (state);

create table if not exists public.media_analysis (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  labels text[] not null default '{}',
  unsafe_score numeric not null default 0,
  dominant_colors text[] not null default '{}',
  duplicate_of uuid references public.media_assets(id),
  created_at timestamptz not null default now()
);

create table if not exists public.media_audit (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references public.media_assets(id) on delete cascade,
  event text not null,
  actor_id uuid,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists media_audit_asset_idx on public.media_audit (asset_id);

-- ─────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────
alter table public.media_assets enable row level security;
alter table public.media_variants enable row level security;
alter table public.media_moderation enable row level security;
alter table public.media_analysis enable row level security;
alter table public.media_audit enable row level security;

do $$
begin
  create policy "media_assets_public_read" on public.media_assets
    for select using (status = 'active');
exception when duplicate_object then null; end $$;

do $$
begin
  create policy "media_assets_owner_all" on public.media_assets
    for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$
begin
  create policy "media_variants_read" on public.media_variants for select using (true);
exception when duplicate_object then null; end $$;

-- Extend product_images with media metadata used by the gallery/quality engine
alter table public.product_images add column if not exists kind text not null default 'image';
alter table public.product_images add column if not exists width integer;
alter table public.product_images add column if not exists height integer;
alter table public.product_images add column if not exists quality_score integer;
alter table public.product_images add column if not exists media_asset_id uuid references public.media_assets(id);

create index if not exists product_images_asset_idx on public.product_images (media_asset_id);
