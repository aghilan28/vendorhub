create extension if not exists "pgcrypto";
create schema if not exists extensions;
create extension if not exists "unaccent" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions;

-- ---------------------------------------------------------------------------
-- IMMUTABLE wrapper around unaccent().
-- The single-argument unaccent(text) is only STABLE (it resolves the
-- "unaccent" dictionary via search_path at call time), so PostgreSQL rejects
-- it inside GENERATED ALWAYS AS STORED columns (SQLSTATE 42P17).
-- By pinning the dictionary explicitly we get a deterministic, IMMUTABLE
-- function that is safe to use in generated columns and functional indexes,
-- while producing identical output to the original unaccent(text).
-- ---------------------------------------------------------------------------
create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, $1);
$$;

-- ---------------------------------------------------------------------------
-- IMMUTABLE text[] -> text joiner.
-- The built-in array_to_string(anyarray, text) is only STABLE, which also
-- disqualifies it from generated columns. This text[]-specific wrapper joins
-- with a single space and is safe to mark IMMUTABLE.
-- ---------------------------------------------------------------------------
create or replace function public.immutable_array_to_string(text[])
returns text
language sql
immutable
parallel safe
as $$
  select coalesce(array_to_string($1, ' '), '');
$$;

do $$
begin
  create type public.commerce_language as enum ('en', 'ta', 'te', 'kn', 'ml', 'hi', 'roman');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.commerce_region as enum ('TN', 'KL', 'KA', 'AP', 'TS');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.taxonomy_level as enum ('DEPARTMENT', 'CATEGORY', 'SUBCATEGORY', 'PRODUCT_FAMILY', 'PRODUCT_GROUP', 'PRODUCT', 'VARIANT', 'SKU');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.perishability_class as enum ('ULTRA_FRESH', 'SAME_DAY_FRESH', 'SHORT_SHELF', 'MEDIUM_SHELF', 'LONG_SHELF', 'FROZEN', 'DRY_STABLE');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.variant_type as enum (
    'LOOSE',
    'WEIGHT',
    'VOLUME',
    'SACHET',
    'BOTTLE',
    'BOX',
    'TRAY',
    'BUNDLE',
    'COMBO',
    'PACKET',
    'PIECE',
    'SUBSCRIPTION',
    'REFILL',
    'SEASONAL_PACK'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.product_alias_type as enum ('COLLOQUIAL', 'SLANG', 'OCR', 'PHONETIC', 'VOICE', 'MISSPELLING', 'SHORTHAND', 'REGIONAL');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.product_image_kind as enum (
    'HERO',
    'TRANSPARENT_PNG',
    'PACKAGING',
    'SHELF',
    'MULTI_ANGLE',
    'MOBILE_THUMBNAIL',
    'SQUARE_CROP',
    'LOW_BANDWIDTH',
    'SELLER_UPLOADED',
    'AI_NORMALIZED'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.search_token_type as enum ('SEMANTIC', 'FUZZY', 'TRANSLITERATION', 'PHONETIC', 'AUTOCOMPLETE', 'RECIPE', 'CO_PURCHASE', 'INTENT');
exception when duplicate_object then null;
end $$;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  slug text not null unique,
  canonical_name text not null,
  multilingual_names jsonb not null default '{}'::jsonb,
  aliases text[] not null default '{}',
  search_terms text[] not null default '{}',
  regional_priority jsonb not null default '{}'::jsonb,
  seasonality jsonb not null default '{}'::jsonb,
  perishability_class public.perishability_class not null default 'DRY_STABLE',
  image_requirements jsonb not null default '{}'::jsonb,
  packaging_defaults jsonb not null default '{}'::jsonb,
  fulfillment_constraints jsonb not null default '{}'::jsonb,
  dietary_classification jsonb not null default '{}'::jsonb,
  discovery_tags text[] not null default '{}',
  sort_order integer not null default 0,
  is_active boolean not null default true
);

alter table public.categories
  add column if not exists department_id uuid references public.departments(id) on delete set null,
  add column if not exists canonical_name text,
  add column if not exists multilingual_names jsonb not null default '{}'::jsonb,
  add column if not exists aliases text[] not null default '{}',
  add column if not exists search_terms text[] not null default '{}',
  add column if not exists regional_priority jsonb not null default '{}'::jsonb,
  add column if not exists seasonality jsonb not null default '{}'::jsonb,
  add column if not exists perishability_class public.perishability_class not null default 'DRY_STABLE',
  add column if not exists image_requirements jsonb not null default '{}'::jsonb,
  add column if not exists packaging_defaults jsonb not null default '{}'::jsonb,
  add column if not exists fulfillment_constraints jsonb not null default '{}'::jsonb,
  add column if not exists dietary_classification jsonb not null default '{}'::jsonb,
  add column if not exists discovery_tags text[] not null default '{}',
  add column if not exists taxonomy_level public.taxonomy_level not null default 'CATEGORY',
  add column if not exists ontology_metadata jsonb not null default '{}'::jsonb;

update public.categories
set canonical_name = coalesce(canonical_name, name)
where canonical_name is null;

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  department_id uuid not null references public.departments(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  slug text not null unique,
  canonical_name text not null,
  multilingual_names jsonb not null default '{}'::jsonb,
  aliases text[] not null default '{}',
  search_terms text[] not null default '{}',
  regional_priority jsonb not null default '{}'::jsonb,
  seasonality jsonb not null default '{}'::jsonb,
  perishability_class public.perishability_class not null default 'DRY_STABLE',
  image_requirements jsonb not null default '{}'::jsonb,
  packaging_defaults jsonb not null default '{}'::jsonb,
  fulfillment_constraints jsonb not null default '{}'::jsonb,
  dietary_classification jsonb not null default '{}'::jsonb,
  discovery_tags text[] not null default '{}',
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table if not exists public.product_families (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  department_id uuid not null references public.departments(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  subcategory_id uuid references public.subcategories(id) on delete set null,
  slug text not null unique,
  canonical_name text not null,
  product_group text,
  multilingual_names jsonb not null default '{}'::jsonb,
  aliases text[] not null default '{}',
  search_terms text[] not null default '{}',
  regional_priority jsonb not null default '{}'::jsonb,
  seasonality jsonb not null default '{}'::jsonb,
  perishability_class public.perishability_class not null default 'DRY_STABLE',
  image_requirements jsonb not null default '{}'::jsonb,
  packaging_defaults jsonb not null default '{}'::jsonb,
  fulfillment_constraints jsonb not null default '{}'::jsonb,
  dietary_classification jsonb not null default '{}'::jsonb,
  discovery_tags text[] not null default '{}',
  is_active boolean not null default true
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  slug text not null unique,
  canonical_name text not null,
  manufacturer text,
  origin_region public.commerce_region,
  country_code char(2) not null default 'IN',
  aliases text[] not null default '{}',
  is_local_brand boolean not null default false,
  logo_url text,
  status text not null default 'ACTIVE',
  metadata jsonb not null default '{}'::jsonb
);
alter table public.brands
  add column if not exists logo_url text,
  add column if not exists status text not null default 'ACTIVE';

create table if not exists public.packaging_types (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  slug text not null unique,
  name text not null,
  description text,
  supports_loose_weight boolean not null default false,
  supports_ocr boolean not null default true,
  leak_risk numeric(4, 3) not null default 0 check (leak_risk between 0 and 1),
  crush_risk numeric(4, 3) not null default 0 check (crush_risk between 0 and 1),
  reuse_profile jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  slug text not null unique,
  symbol text not null,
  canonical_name text not null,
  dimension text not null,
  metric_base_unit text,
  metric_multiplier numeric(18, 6),
  allows_fractional boolean not null default true,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.traditional_units (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  slug text not null unique,
  canonical_name text not null,
  region_codes public.commerce_region[] not null default array[]::public.commerce_region[],
  approximate_metric_unit text,
  min_metric_value numeric(12, 3),
  max_metric_value numeric(12, 3),
  seller_defined boolean not null default true,
  notes text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.perishability_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  slug text not null unique,
  name text not null,
  perishability_class public.perishability_class not null,
  shelf_life_hours integer,
  freshness_window_minutes integer,
  storage_requirement text not null default 'ambient',
  heat_sensitivity numeric(4, 3) not null default 0 check (heat_sensitivity between 0 and 1),
  spoilage_rate numeric(4, 3) not null default 0 check (spoilage_rate between 0 and 1),
  delivery_urgency numeric(4, 3) not null default 0 check (delivery_urgency between 0 and 1),
  max_transit_duration_minutes integer,
  refrigeration_required boolean not null default false,
  sunlight_sensitivity numeric(4, 3) not null default 0 check (sunlight_sensitivity between 0 and 1),
  stackability numeric(4, 3) not null default 1 check (stackability between 0 and 1),
  leak_risk numeric(4, 3) not null default 0 check (leak_risk between 0 and 1),
  odor_sensitivity numeric(4, 3) not null default 0 check (odor_sensitivity between 0 and 1),
  breakability numeric(4, 3) not null default 0 check (breakability between 0 and 1),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.delivery_constraints (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  slug text not null unique,
  name text not null,
  max_delivery_radius_km numeric(6, 2),
  max_transit_duration_minutes integer,
  cold_chain_required boolean not null default false,
  insulated_delivery_required boolean not null default false,
  ice_required boolean not null default false,
  fragile_flag boolean not null default false,
  stackable boolean not null default true,
  morning_priority boolean not null default false,
  route_batching_allowed boolean not null default true,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.master_products (
  id uuid primary key default gen_random_uuid(),
  product_id uuid generated always as (id) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  canonical_name text not null,
  normalized_name text not null,
  slug text not null unique,
  description text,
  short_description text,
  department_id uuid not null references public.departments(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  subcategory_id uuid references public.subcategories(id) on delete set null,
  product_family_id uuid references public.product_families(id) on delete set null,
  product_group text,
  product_type text not null,
  brand_id uuid references public.brands(id) on delete set null,
  manufacturer text,
  origin_region public.commerce_region,
  hsn_code text,
  barcode text,
  internal_sku text not null unique,
  external_sku text,
  seller_visibility text not null default 'PUBLIC',
  active_status text not null default 'ACTIVE',
  english_name text not null,
  tamil_name text,
  tamil_transliteration text,
  telugu_name text,
  kannada_name text,
  malayalam_name text,
  hindi_name text,
  romanized_variants text[] not null default '{}',
  discovery_tags text[] not null default '{}',
  dietary_classification jsonb not null default '{}'::jsonb,
  regional_priority jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  search_document tsvector generated always as (
    setweight(to_tsvector('simple', public.immutable_unaccent(coalesce(canonical_name, ''))), 'A') ||
    setweight(to_tsvector('simple', public.immutable_unaccent(coalesce(english_name, ''))), 'A') ||
    setweight(to_tsvector('simple', public.immutable_unaccent(public.immutable_array_to_string(romanized_variants))), 'B') ||
    setweight(to_tsvector('simple', public.immutable_unaccent(coalesce(description, ''))), 'C')
  ) stored
);

alter table public.products
  add column if not exists master_product_id uuid references public.master_products(id) on delete set null,
  add column if not exists seller_catalog_metadata jsonb not null default '{}'::jsonb;

create table if not exists public.product_aliases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  product_id uuid not null references public.master_products(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  alias_type public.product_alias_type not null,
  language public.commerce_language not null default 'roman',
  region_codes public.commerce_region[] not null default array[]::public.commerce_region[],
  confidence numeric(4, 3) not null default 1 check (confidence between 0 and 1),
  source text not null default 'curated',
  metadata jsonb not null default '{}'::jsonb,
  unique (product_id, normalized_alias, alias_type, language)
);

create table if not exists public.catalog_product_variants (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid generated always as (id) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  product_id uuid not null references public.master_products(id) on delete cascade,
  variant_type public.variant_type not null,
  variant_name text not null,
  quantity numeric(12, 3),
  unit_id uuid references public.units(id) on delete set null,
  traditional_unit_id uuid references public.traditional_units(id) on delete set null,
  normalized_metric_value numeric(12, 3),
  normalized_metric_unit text,
  min_metric_value numeric(12, 3),
  max_metric_value numeric(12, 3),
  packaging_type_id uuid references public.packaging_types(id) on delete set null,
  shelf_life_hours integer,
  storage_requirement text not null default 'ambient',
  fragile_flag boolean not null default false,
  cold_chain_required boolean not null default false,
  estimated_weight_grams numeric(12, 3),
  dimensional_weight_grams numeric(12, 3),
  max_delivery_radius_km numeric(6, 2),
  freshness_window_minutes integer,
  reorder_threshold numeric(12, 3),
  sku_template text not null,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  check (min_metric_value is null or max_metric_value is null or min_metric_value <= max_metric_value)
);

alter table public.product_variants
  add column if not exists catalog_variant_id uuid references public.catalog_product_variants(id) on delete set null,
  add column if not exists variant_type public.variant_type,
  add column if not exists traditional_unit_id uuid references public.traditional_units(id) on delete set null,
  add column if not exists packaging_type_id uuid references public.packaging_types(id) on delete set null,
  add column if not exists freshness_window_minutes integer,
  add column if not exists max_delivery_radius_km numeric(6, 2);

create table if not exists public.catalog_product_images (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  product_id uuid not null references public.master_products(id) on delete cascade,
  variant_id uuid references public.catalog_product_variants(id) on delete cascade,
  image_kind public.product_image_kind not null,
  storage_path text not null,
  public_url text,
  alt_text text,
  width integer,
  height integer,
  aspect_ratio text not null default '1:1',
  mime_type text not null default 'image/webp',
  white_background boolean not null default true,
  mobile_optimized boolean not null default true,
  no_watermark boolean not null default true,
  lighting_quality text not null default 'standard',
  compression_artifact_score numeric(4, 3) not null default 0 check (compression_artifact_score between 0 and 1),
  lazy_loading_ready boolean not null default true,
  brightness_score numeric(4, 3) check (brightness_score between 0 and 1),
  blur_score numeric(4, 3) check (blur_score between 0 and 1),
  packaging_visibility numeric(4, 3) check (packaging_visibility between 0 and 1),
  ocr_readability numeric(4, 3) check (ocr_readability between 0 and 1),
  duplicate_hash text,
  dominant_colors text[] not null default '{}',
  visual_embedding_id text,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.product_images
  add column if not exists image_kind public.product_image_kind not null default 'SELLER_UPLOADED',
  add column if not exists brightness_score numeric(4, 3),
  add column if not exists blur_score numeric(4, 3),
  add column if not exists packaging_visibility numeric(4, 3),
  add column if not exists ocr_readability numeric(4, 3),
  add column if not exists duplicate_hash text,
  add column if not exists dominant_colors text[] not null default '{}',
  add column if not exists visual_embedding_id text,
  add column if not exists image_quality_metadata jsonb not null default '{}'::jsonb;

create table if not exists public.product_logistics_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  product_id uuid not null references public.master_products(id) on delete cascade,
  variant_id uuid references public.catalog_product_variants(id) on delete cascade,
  perishability_profile_id uuid not null references public.perishability_profiles(id) on delete restrict,
  delivery_constraint_id uuid not null references public.delivery_constraints(id) on delete restrict,
  region_codes public.commerce_region[] not null default array[]::public.commerce_region[],
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  unique (product_id, variant_id, perishability_profile_id, delivery_constraint_id)
);

create table if not exists public.search_tokens (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  product_id uuid references public.master_products(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  token text not null,
  normalized_token text not null,
  token_type public.search_token_type not null,
  language public.commerce_language not null default 'roman',
  region_codes public.commerce_region[] not null default array[]::public.commerce_region[],
  vector_search_id text,
  embedding_model text,
  recipe_associations text[] not null default '{}',
  co_purchase_tags text[] not null default '{}',
  weight numeric(6, 3) not null default 1,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.multilingual_mappings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  entity_table text not null,
  entity_id uuid not null,
  language public.commerce_language not null,
  native_text text not null,
  transliteration text,
  romanized_variants text[] not null default '{}',
  phonetic_tokens text[] not null default '{}',
  ocr_variants text[] not null default '{}',
  voice_variants text[] not null default '{}',
  confidence numeric(4, 3) not null default 1 check (confidence between 0 and 1),
  source text not null default 'curated',
  metadata jsonb not null default '{}',
  unique (entity_table, entity_id, language, native_text)
);

create table if not exists public.seller_products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  master_product_id uuid not null references public.master_products(id) on delete restrict,
  catalog_variant_id uuid references public.catalog_product_variants(id) on delete restrict,
  legacy_product_id uuid references public.products(id) on delete set null,
  seller_sku text not null,
  title_override text,
  description_override text,
  local_aliases text[] not null default '{}',
  price numeric(12, 2) not null check (price >= 0),
  mrp numeric(12, 2) check (mrp is null or mrp >= 0),
  currency char(3) not null default 'INR',
  delivery_radius_km numeric(6, 2),
  freshness_minutes integer,
  seller_image_path text,
  is_active boolean not null default true,
  overrides jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  unique (vendor_id, seller_sku)
);

create table if not exists public.seller_inventory (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  seller_product_id uuid not null references public.seller_products(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  locality text,
  city text,
  region public.commerce_region,
  stock_quantity numeric(12, 3) not null default 0 check (stock_quantity >= 0),
  reserved_quantity numeric(12, 3) not null default 0 check (reserved_quantity >= 0),
  stock_unit_id uuid references public.units(id) on delete set null,
  low_stock_threshold numeric(12, 3) not null default 0,
  availability_status text not null default 'IN_STOCK',
  available_from timestamptz,
  available_until timestamptz,
  freshness_captured_at timestamptz,
  batch_reference text,
  metadata jsonb not null default '{}'::jsonb,
  check (reserved_quantity <= stock_quantity)
);

create or replace function public.generate_catalog_sku(
  region_code text,
  category_code text,
  product_code text,
  variant_code text
)
returns text
language sql
immutable
as $$
  select upper(
    regexp_replace(coalesce(region_code, 'IN'), '[^A-Za-z0-9]+', '', 'g') || '-' ||
    regexp_replace(coalesce(category_code, 'CAT'), '[^A-Za-z0-9]+', '', 'g') || '-' ||
    regexp_replace(coalesce(product_code, 'PRODUCT'), '[^A-Za-z0-9]+', '', 'g') || '-' ||
    regexp_replace(coalesce(variant_code, 'VAR'), '[^A-Za-z0-9]+', '', 'g')
  );
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'departments', 'subcategories', 'product_families', 'brands', 'packaging_types',
    'units', 'traditional_units', 'perishability_profiles', 'delivery_constraints',
    'master_products', 'product_aliases', 'catalog_product_variants',
    'catalog_product_images', 'product_logistics_profiles', 'search_tokens',
    'multilingual_mappings', 'seller_products', 'seller_inventory'
  ]
  loop
    if not exists (
      select 1 from pg_trigger
      where tgname = format('set_%s_updated_at', table_name)
    ) then
      execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
    end if;
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

create index if not exists departments_active_idx on public.departments(sort_order, slug) where deleted_at is null and is_active = true;
create index if not exists categories_department_idx on public.categories(department_id, sort_order) where deleted_at is null;
create index if not exists subcategories_category_idx on public.subcategories(category_id, sort_order) where deleted_at is null;
create index if not exists product_families_subcategory_idx on public.product_families(subcategory_id) where deleted_at is null;
create index if not exists master_products_taxonomy_idx on public.master_products(department_id, category_id, subcategory_id, product_family_id) where deleted_at is null;
create index if not exists master_products_search_document_idx on public.master_products using gin(search_document);
create index if not exists master_products_name_trgm_idx on public.master_products using gin(normalized_name extensions.gin_trgm_ops);
create index if not exists product_aliases_product_idx on public.product_aliases(product_id) where deleted_at is null;
create index if not exists product_aliases_normalized_trgm_idx on public.product_aliases using gin(normalized_alias extensions.gin_trgm_ops);
create index if not exists catalog_product_variants_product_idx on public.catalog_product_variants(product_id) where deleted_at is null;
create index if not exists catalog_product_images_product_kind_idx on public.catalog_product_images(product_id, image_kind) where deleted_at is null;
create index if not exists product_logistics_profiles_product_idx on public.product_logistics_profiles(product_id, variant_id) where deleted_at is null;
create index if not exists search_tokens_product_idx on public.search_tokens(product_id, token_type) where deleted_at is null;
create index if not exists search_tokens_normalized_trgm_idx on public.search_tokens using gin(normalized_token extensions.gin_trgm_ops);
create index if not exists multilingual_mappings_entity_idx on public.multilingual_mappings(entity_table, entity_id, language) where deleted_at is null;
create index if not exists seller_products_vendor_idx on public.seller_products(vendor_id, is_active) where deleted_at is null;
create index if not exists seller_products_master_idx on public.seller_products(master_product_id, catalog_variant_id) where deleted_at is null;
create index if not exists seller_inventory_locality_idx on public.seller_inventory(region, city, locality, availability_status) where deleted_at is null;

create policy "commerce_foundation_public_departments_select" on public.departments for select using (is_active = true and deleted_at is null);
create policy "commerce_foundation_public_subcategories_select" on public.subcategories for select using (is_active = true and deleted_at is null);
create policy "commerce_foundation_public_product_families_select" on public.product_families for select using (is_active = true and deleted_at is null);
create policy "commerce_foundation_public_brands_select" on public.brands for select using (deleted_at is null);
create policy "commerce_foundation_public_reference_select" on public.packaging_types for select using (deleted_at is null);
create policy "commerce_foundation_public_units_select" on public.units for select using (deleted_at is null);
create policy "commerce_foundation_public_traditional_units_select" on public.traditional_units for select using (deleted_at is null);
create policy "commerce_foundation_public_perishability_select" on public.perishability_profiles for select using (deleted_at is null);
create policy "commerce_foundation_public_delivery_select" on public.delivery_constraints for select using (deleted_at is null);
create policy "commerce_foundation_public_master_products_select" on public.master_products for select using (active_status = 'ACTIVE' and deleted_at is null);
create policy "commerce_foundation_public_aliases_select" on public.product_aliases for select using (deleted_at is null);
create policy "commerce_foundation_public_variants_select" on public.catalog_product_variants for select using (is_active = true and deleted_at is null);
create policy "commerce_foundation_public_images_select" on public.catalog_product_images for select using (deleted_at is null);
create policy "commerce_foundation_public_logistics_select" on public.product_logistics_profiles for select using (deleted_at is null);
create policy "commerce_foundation_public_search_tokens_select" on public.search_tokens for select using (deleted_at is null);
create policy "commerce_foundation_public_mappings_select" on public.multilingual_mappings for select using (deleted_at is null);

create policy "commerce_foundation_admin_departments_all" on public.departments for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "commerce_foundation_admin_subcategories_all" on public.subcategories for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "commerce_foundation_admin_product_families_all" on public.product_families for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "commerce_foundation_admin_brands_all" on public.brands for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "commerce_foundation_admin_packaging_all" on public.packaging_types for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "commerce_foundation_admin_units_all" on public.units for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "commerce_foundation_admin_traditional_units_all" on public.traditional_units for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "commerce_foundation_admin_perishability_all" on public.perishability_profiles for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "commerce_foundation_admin_delivery_all" on public.delivery_constraints for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "commerce_foundation_admin_master_products_all" on public.master_products for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "commerce_foundation_admin_aliases_all" on public.product_aliases for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "commerce_foundation_admin_variants_all" on public.catalog_product_variants for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "commerce_foundation_admin_images_all" on public.catalog_product_images for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "commerce_foundation_admin_logistics_all" on public.product_logistics_profiles for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "commerce_foundation_admin_search_tokens_all" on public.search_tokens for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "commerce_foundation_admin_mappings_all" on public.multilingual_mappings for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create policy "seller_products_public_active_select" on public.seller_products for select using (is_active = true and deleted_at is null);
create policy "seller_products_vendor_all" on public.seller_products for all using (public.current_user_is_vendor_member(vendor_id)) with check (public.current_user_is_vendor_member(vendor_id));
create policy "seller_products_admin_all" on public.seller_products for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "seller_inventory_public_select" on public.seller_inventory for select using (deleted_at is null and availability_status = 'IN_STOCK');
create policy "seller_inventory_vendor_all" on public.seller_inventory for all using (public.current_user_is_vendor_member(vendor_id)) with check (public.current_user_is_vendor_member(vendor_id));
create policy "seller_inventory_admin_all" on public.seller_inventory for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

insert into public.departments (slug, canonical_name, multilingual_names, aliases, search_terms, regional_priority, perishability_class, image_requirements, packaging_defaults, fulfillment_constraints, discovery_tags, sort_order)
values
  ('grocery', 'Grocery', '{"ta":"மளிகை","te":"కిరాణా","kn":"ದಿನಸಿ","ml":"പലചരക്ക്","hi":"किराना"}', array['kirana', 'provisions', 'maligai'], array['rice', 'dal', 'oil', 'atta', 'masala'], '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}', 'DRY_STABLE', '{"required":["hero","square_crop","low_bandwidth"],"background":"white"}', '{"default":["packet","pouch","loose","cloth bag"]}', '{"batching_allowed":true}', array['monthly-essentials', 'hostel', 'family-pack'], 1),
  ('fruits-vegetables', 'Fruits & Vegetables', '{"ta":"பழங்கள் மற்றும் காய்கறிகள்","te":"పండ్లు మరియు కూరగాయలు","kn":"ಹಣ್ಣುಗಳು ಮತ್ತು ತರಕಾರಿಗಳು","ml":"പഴങ്ങളും പച്ചക്കറികളും","hi":"फल और सब्जियां"}', array['produce', 'kaikari', 'sabzi'], array['vegetables', 'greens', 'keerai', 'fruit'], '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}', 'SAME_DAY_FRESH', '{"required":["hero","seller_uploaded","mobile_thumbnail"],"background":"white"}', '{"default":["loose","tied bundle","newspaper wrap","banana-leaf wrap"]}', '{"max_transit_minutes":90,"crush_sensitive":true}', array['fresh', 'daily', 'quick-cook'], 2),
  ('dairy-breakfast', 'Dairy & Breakfast', '{"ta":"பால் மற்றும் காலை உணவு","te":"పాలు మరియు అల్పాహారం","kn":"ಹಾಲು ಮತ್ತು ಉಪಾಹಾರ","ml":"പാൽ, പ്രഭാതഭക്ഷണം","hi":"डेयरी और नाश्ता"}', array['milk', 'breakfast'], array['milk', 'curd', 'idli batter', 'paneer'], '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}', 'SHORT_SHELF', '{"required":["hero","packaging","ocr_readable"],"background":"white"}', '{"default":["packet","bottle","pouch"]}', '{"morning_priority":true,"cold_chain_optional":true}', array['breakfast', 'kids', 'protein-rich'], 3),
  ('bakery', 'Bakery', '{"ta":"பேக்கரி","te":"బేకరీ","kn":"ಬೇಕರಿ","ml":"ബേക്കറി","hi":"बेकरी"}', array['bread', 'bun', 'cake'], array['bread', 'bun', 'rusk', 'cake'], '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}', 'MEDIUM_SHELF', '{"required":["hero","shelf"],"background":"white"}', '{"default":["packet","box","tray"]}', '{"crush_sensitive":true}', array['tea-time', 'breakfast', 'kids'], 4),
  ('snacks-packaged-foods', 'Snacks & Packaged Foods', '{"ta":"ஸ்நாக்ஸ் மற்றும் பாக்கெட் உணவுகள்","te":"స్నాక్స్ మరియు ప్యాక్డ్ ఫుడ్స్","kn":"ಸ್ನ್ಯಾಕ್ಸ್ ಮತ್ತು ಪ್ಯಾಕ್ಡ್ ಆಹಾರ","ml":"സ്നാക്ക്സ്, പാക്കറ്റ് ഭക്ഷണം","hi":"नाश्ता और पैकेज्ड फूड"}', array['snacks', 'chips', 'mixture'], array['chips', 'namkeen', 'biscuits', 'mixture'], '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}', 'LONG_SHELF', '{"required":["hero","packaging","ocr_readable"],"background":"white"}', '{"default":["sachet","packet","pouch","box"]}', '{"batching_allowed":true}', array['tea-time', 'rainy-day', 'hostel'], 5),
  ('beverages', 'Beverages', '{"ta":"பானங்கள்","te":"పానీయాలు","kn":"ಪಾನೀಯಗಳು","ml":"പാനീയങ്ങൾ","hi":"पेय पदार्थ"}', array['drinks'], array['tea', 'coffee', 'juice', 'soft drink'], '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}', 'LONG_SHELF', '{"required":["hero","packaging"],"background":"white"}', '{"default":["bottle","tetra-pack","sachet","tin"]}', '{"leak_risk":true}', array['breakfast', 'tea-time', 'summer'], 6),
  ('frozen-foods', 'Frozen Foods', '{"ta":"உறைபனி உணவுகள்","te":"ఫ్రోజెన్ ఫుడ్స్","kn":"ಫ್ರೋಜನ್ ಆಹಾರ","ml":"ഫ്രോസൺ ഫുഡ്സ്","hi":"फ्रोजन फूड"}', array['frozen'], array['frozen parotta', 'peas', 'ice cream'], '{"TN":2,"KL":2,"KA":2,"AP":2,"TS":2}', 'FROZEN', '{"required":["hero","packaging"],"background":"white"}', '{"default":["packet","box","tray"]}', '{"cold_chain_required":true,"max_transit_minutes":45}', array['quick-cook'], 7),
  ('meat-seafood', 'Meat & Seafood', '{"ta":"இறைச்சி மற்றும் கடல் உணவு","te":"మాంసం మరియు సీఫుడ్","kn":"ಮಾಂಸ ಮತ್ತು ಸಮುದ್ರ ಆಹಾರ","ml":"മാംസം, കടൽഭക്ഷണം","hi":"मांस और सीफूड"}', array['fish', 'chicken', 'mutton'], array['fish', 'meen', 'chicken', 'mutton', 'prawns'], '{"TN":1,"KL":1,"KA":2,"AP":1,"TS":2}', 'ULTRA_FRESH', '{"required":["hero","seller_uploaded"],"background":"white"}', '{"default":["tray","packet","banana-leaf wrap"]}', '{"max_transit_minutes":45,"ice_required":true,"odor_sensitive":true}', array['protein-rich', 'lunch', 'dinner'], 8),
  ('household-essentials', 'Household Essentials', '{"ta":"வீட்டு அத்தியாவசியங்கள்","te":"ఇంటి అవసరాలు","kn":"ಮನೆಯ ಅಗತ್ಯಗಳು","ml":"വീട്ടാവശ്യങ്ങൾ","hi":"घरेलू आवश्यकताएं"}', array['home essentials'], array['tissue', 'foil', 'battery'], '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}', 'DRY_STABLE', '{"required":["hero","packaging"],"background":"white"}', '{"default":["packet","box","carton"]}', '{"batching_allowed":true}', array['monthly-essentials'], 9),
  ('cleaning-supplies', 'Cleaning Supplies', '{"ta":"சுத்தம் செய்யும் பொருட்கள்","te":"క్లీనింగ్ వస్తువులు","kn":"ಸ್ವಚ್ಛತಾ ಸಾಮಗ್ರಿಗಳು","ml":"ക്ലീനിംഗ് സാധനങ്ങൾ","hi":"सफाई सामग्री"}', array['cleaning'], array['detergent', 'phenyl', 'soap'], '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}', 'DRY_STABLE', '{"required":["hero","packaging","ocr_readable"],"background":"white"}', '{"default":["bottle","packet","sachet","refill"]}', '{"separate_from_food":true,"leak_risk":true}', array['monthly-essentials'], 10),
  ('personal-care', 'Personal Care', '{"ta":"தனிநபர் பராமரிப்பு","te":"పర్సనల్ కేర్","kn":"ವೈಯಕ್ತಿಕ ಆರೈಕೆ","ml":"പേഴ്സണൽ കെയർ","hi":"पर्सनल केयर"}', array['toiletries'], array['soap', 'shampoo', 'toothpaste'], '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}', 'DRY_STABLE', '{"required":["hero","packaging","ocr_readable"],"background":"white"}', '{"default":["sachet","bottle","tube","packet"]}', '{"batching_allowed":true}', array['hostel', 'monthly-essentials'], 11),
  ('baby-care', 'Baby Care', '{"ta":"குழந்தை பராமரிப்பு","te":"బేబీ కేర్","kn":"ಮಗು ಆರೈಕೆ","ml":"ബേബി കെയർ","hi":"बेबी केयर"}', array['baby'], array['diaper', 'wipes', 'baby food'], '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}', 'LONG_SHELF', '{"required":["hero","packaging","ocr_readable"],"background":"white"}', '{"default":["packet","box","jar"]}', '{"quality_sensitive":true}', array['kids'], 12),
  ('health-otc', 'Health & OTC', '{"ta":"ஆரோக்கியம் மற்றும் OTC","te":"ఆరోగ్యం మరియు OTC","kn":"ಆರೋಗ್ಯ ಮತ್ತು OTC","ml":"ആരോഗ്യം, OTC","hi":"हेल्थ और OTC"}', array['pharmacy', 'medicine'], array['paracetamol', 'ORS', 'bandage'], '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}', 'LONG_SHELF', '{"required":["packaging","ocr_readable"],"background":"white"}', '{"default":["strip","bottle","box"]}', '{"expiry_required":true,"regulated":true}', array['health', 'rainy-day'], 13),
  ('pooja-religious-essentials', 'Pooja & Religious Essentials', '{"ta":"பூஜை பொருட்கள்","te":"పూజా సామాగ్రి","kn":"ಪೂಜೆ ಸಾಮಗ್ರಿಗಳು","ml":"പൂജാ സാധനങ്ങൾ","hi":"पूजा सामग्री"}', array['pooja', 'puja'], array['camphor', 'kumkum', 'lamp oil'], '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}', 'LONG_SHELF', '{"required":["hero","packaging"],"background":"white"}', '{"default":["packet","bottle","loose"]}', '{"fragrance_sensitive":true}', array['pooja', 'festival'], 14),
  ('pet-supplies', 'Pet Supplies', '{"ta":"செல்லப்பிராணி பொருட்கள்","te":"పెట్ సప్లైస్","kn":"ಪೆಟ್ ಸಾಮಗ್ರಿಗಳು","ml":"പെറ്റ് സപ്ലൈസ്","hi":"पेट सप्लाई"}', array['pet food'], array['dog food', 'cat food'], '{"TN":2,"KL":2,"KA":2,"AP":2,"TS":2}', 'LONG_SHELF', '{"required":["hero","packaging"],"background":"white"}', '{"default":["packet","tin","box"]}', '{"separate_from_food":true}', array['pets'], 15),
  ('kitchen-utility', 'Kitchen & Utility', '{"ta":"சமையலறை பயன்பாடு","te":"కిచెన్ యుటిలిటీ","kn":"ಅಡಿಗೆ ಉಪಯೋಗ","ml":"കിച്ചൻ യൂട്ടിലിറ്റി","hi":"किचन यूटिलिटी"}', array['kitchen'], array['scrubber', 'lighter', 'storage box'], '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}', 'DRY_STABLE', '{"required":["hero"],"background":"white"}', '{"default":["packet","box"]}', '{"batching_allowed":true}', array['home'], 16),
  ('stationery-school-supplies', 'Stationery & School Supplies', '{"ta":"எழுத்துப்பொருள் மற்றும் பள்ளி பொருட்கள்","te":"స్టేషనరీ మరియు స్కూల్ సప్లైస్","kn":"ಸ್ಟೇಷನರಿ ಮತ್ತು ಶಾಲಾ ಸಾಮಗ್ರಿಗಳು","ml":"സ്റ്റേഷനറി, സ്കൂൾ സാധനങ്ങൾ","hi":"स्टेशनरी और स्कूल सप्लाई"}', array['stationery'], array['notebook', 'pen', 'pencil'], '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}', 'DRY_STABLE', '{"required":["hero"],"background":"white"}', '{"default":["packet","box"]}', '{"batching_allowed":true}', array['kids', 'school'], 17),
  ('home-utility', 'Home Utility', '{"ta":"வீட்டு பயன்பாடு","te":"హోమ్ యుటిలిటీ","kn":"ಮನೆ ಉಪಯೋಗ","ml":"ഹോം യൂട്ടിലിറ്റി","hi":"होम यूटिलिटी"}', array['utility'], array['rope', 'bulb', 'tape'], '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}', 'DRY_STABLE', '{"required":["hero"],"background":"white"}', '{"default":["packet","box"]}', '{"batching_allowed":true}', array['home'], 18),
  ('local-foods', 'Local Foods', '{"ta":"உள்ளூர் உணவுகள்","te":"స్థానిక ఆహారాలు","kn":"ಸ್ಥಳೀಯ ಆಹಾರಗಳು","ml":"പ്രാദേശിക ഭക്ഷണം","hi":"स्थानीय भोजन"}', array['native foods', 'regional foods'], array['murukku', 'banana chips', 'pickle'], '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}', 'MEDIUM_SHELF', '{"required":["hero","seller_uploaded"],"background":"white"}', '{"default":["packet","jar","banana-leaf wrap"]}', '{"seller_quality_required":true}', array['festival', 'tea-time', 'local'], 19),
  ('ready-to-eat', 'Ready-to-Eat', '{"ta":"உடனடி உணவு","te":"రెడీ టు ఈట్","kn":"ರೆಡಿ ಟು ಈಟ್","ml":"റെഡി ടു ഈറ്റ്","hi":"रेडी टू ईट"}', array['rte'], array['meal', 'curry', 'upma'], '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}', 'SHORT_SHELF', '{"required":["hero","seller_uploaded"],"background":"white"}', '{"default":["tray","box","packet"]}', '{"max_transit_minutes":60}', array['lunch', 'dinner', 'quick-cook'], 20),
  ('tiffin-batter-products', 'Tiffin & Batter Products', '{"ta":"டிபன் மற்றும் மாவு பொருட்கள்","te":"టిఫిన్ మరియు పిండి ఉత్పత్తులు","kn":"ಟಿಫಿನ್ ಮತ್ತು ಬ್ಯಾಟರ್ ಉತ್ಪನ್ನಗಳು","ml":"ടിഫിൻ, മാവ് ഉൽപ്പന്നങ്ങൾ","hi":"टिफिन और बैटर उत्पाद"}', array['idli batter', 'dosa batter'], array['idli', 'dosa', 'batter', 'adai'], '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}', 'SHORT_SHELF', '{"required":["hero","seller_uploaded","packaging"],"background":"white"}', '{"default":["pouch","packet","bottle"]}', '{"cold_chain_optional":true,"morning_priority":true}', array['breakfast', 'quick-cook'], 21),
  ('flowers-garlands', 'Flowers & Garlands', '{"ta":"மலர்கள் மற்றும் மாலைகள்","te":"పూలు మరియు మాలలు","kn":"ಹೂವುಗಳು ಮತ್ತು ಹಾರಗಳು","ml":"പൂക്കളും മാലകളും","hi":"फूल और माला"}', array['poo', 'mala', 'garland'], array['jasmine', 'malli', 'rose', 'garland'], '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}', 'ULTRA_FRESH', '{"required":["hero","seller_uploaded"],"background":"white"}', '{"default":["loose","tied bundle","banana-leaf wrap"]}', '{"crush_sensitive":true,"humidity_sensitive":true,"max_transit_minutes":45}', array['pooja', 'festival', 'wedding'], 22),
  ('local-seasonal-products', 'Local Seasonal Products', '{"ta":"உள்ளூர் பருவகால பொருட்கள்","te":"స్థానిక సీజనల్ ఉత్పత్తులు","kn":"ಸ್ಥಳೀಯ ಋತುಮಾನ ಉತ್ಪನ್ನಗಳು","ml":"പ്രാദേശിക സീസണൽ ഉൽപ്പന്നങ്ങൾ","hi":"स्थानीय मौसमी उत्पाद"}', array['seasonal'], array['mango', 'jackfruit', 'festival pack'], '{"TN":1,"KL":1,"KA":1,"AP":1,"TS":1}', 'SAME_DAY_FRESH', '{"required":["hero","seller_uploaded"],"background":"white"}', '{"default":["loose","packet","bundle"]}', '{"seasonal_availability":true}', array['festival', 'seasonal', 'local'], 23)
on conflict (slug) do update
set canonical_name = excluded.canonical_name,
    multilingual_names = excluded.multilingual_names,
    aliases = excluded.aliases,
    search_terms = excluded.search_terms,
    regional_priority = excluded.regional_priority,
    perishability_class = excluded.perishability_class,
    image_requirements = excluded.image_requirements,
    packaging_defaults = excluded.packaging_defaults,
    fulfillment_constraints = excluded.fulfillment_constraints,
    discovery_tags = excluded.discovery_tags,
    sort_order = excluded.sort_order;

insert into public.packaging_types (slug, name, description, supports_loose_weight, supports_ocr, leak_risk, crush_risk)
values
  ('sachet', 'Sachet', 'Small single-use sealed pack common in Indian FMCG.', false, true, 0.2, 0.1),
  ('pouch', 'Pouch', 'Flexible sealed pack for milk, batter, refills, and snacks.', false, true, 0.35, 0.2),
  ('packet', 'Packet', 'General retail packet.', false, true, 0.1, 0.2),
  ('tetra-pack', 'Tetra Pack', 'Shelf-stable beverage carton.', false, true, 0.15, 0.25),
  ('loose', 'Loose', 'Unpacked loose product sold by count or weight.', true, false, 0.05, 0.4),
  ('tied-bundle', 'Tied Bundle', 'Hand-tied bundle such as greens or flowers.', true, false, 0.05, 0.65),
  ('newspaper-wrap', 'Newspaper Wrap', 'Local low-cost wrap for produce or flowers.', true, false, 0.1, 0.5),
  ('tray', 'Tray', 'Tray pack for bakery, meat, or ready-to-eat items.', false, true, 0.25, 0.55),
  ('bottle', 'Bottle', 'Plastic or glass bottle.', false, true, 0.45, 0.35),
  ('tin', 'Tin', 'Metal tin for oils, beverages, or pet food.', false, true, 0.1, 0.1),
  ('jar', 'Jar', 'Glass or plastic jar.', false, true, 0.25, 0.35),
  ('carton', 'Carton', 'Cardboard carton for bulk or boxed items.', false, true, 0.05, 0.3),
  ('cloth-bag', 'Cloth Bag', 'Reusable cloth bag for grains and staples.', true, false, 0.05, 0.2),
  ('banana-leaf-wrap', 'Banana Leaf Wrap', 'Traditional fresh wrap for food, flowers, and fish.', true, false, 0.1, 0.45)
on conflict (slug) do update set name = excluded.name, description = excluded.description;

insert into public.units (slug, symbol, canonical_name, dimension, metric_base_unit, metric_multiplier, allows_fractional)
values
  ('gram', 'g', 'Gram', 'mass', 'g', 1, true),
  ('kilogram', 'kg', 'Kilogram', 'mass', 'g', 1000, true),
  ('milliliter', 'ml', 'Milliliter', 'volume', 'ml', 1, true),
  ('liter', 'l', 'Liter', 'volume', 'ml', 1000, true),
  ('piece', 'pc', 'Piece', 'count', 'pc', 1, false),
  ('packet', 'pkt', 'Packet', 'count', 'pc', 1, false),
  ('bundle', 'bundle', 'Bundle', 'count', 'pc', 1, false),
  ('bunch', 'bunch', 'Bunch', 'count', 'pc', 1, false),
  ('half-kg', '500g', 'Half Kilogram', 'mass', 'g', 500, true),
  ('quarter-kg', '250g', 'Quarter Kilogram', 'mass', 'g', 250, true),
  ('loose-count', 'loose', 'Loose Count', 'count', 'pc', 1, true)
on conflict (slug) do update set symbol = excluded.symbol, canonical_name = excluded.canonical_name;

insert into public.traditional_units (slug, canonical_name, region_codes, approximate_metric_unit, min_metric_value, max_metric_value, seller_defined, notes)
values
  ('kattu', 'Kattu', array['TN','KL','KA','AP','TS']::public.commerce_region[], 'g', 80, 250, true, 'Hand-tied bunch for greens, herbs, and flowers.'),
  ('padi', 'Padi', array['TN','KL']::public.commerce_region[], 'ml', 1200, 1600, true, 'Traditional grain volume measure; store seller calibration per locality.'),
  ('marakkal', 'Marakkal', array['TN','KL']::public.commerce_region[], 'ml', 8000, 12000, true, 'Traditional larger grain volume measure.'),
  ('loose', 'Loose', array['TN','KL','KA','AP','TS']::public.commerce_region[], null, null, null, true, 'Seller-defined loose sale.'),
  ('bunch', 'Bunch', array['TN','KL','KA','AP','TS']::public.commerce_region[], 'g', 50, 300, true, 'Loose bunch of herbs, greens, or flowers.'),
  ('bundle', 'Bundle', array['TN','KL','KA','AP','TS']::public.commerce_region[], 'g', 100, 1000, true, 'Seller-defined bundle.'),
  ('packet', 'Packet', array['TN','KL','KA','AP','TS']::public.commerce_region[], null, null, null, false, 'Packaged unit.'),
  ('half-kg', 'Half Kg', array['TN','KL','KA','AP','TS']::public.commerce_region[], 'g', 500, 500, false, '500 gram pack.'),
  ('quarter-kg', 'Quarter Kg', array['TN','KL','KA','AP','TS']::public.commerce_region[], 'g', 250, 250, false, '250 gram pack.'),
  ('piece', 'Piece', array['TN','KL','KA','AP','TS']::public.commerce_region[], null, 1, 1, false, 'Single count.')
on conflict (slug) do update set canonical_name = excluded.canonical_name, notes = excluded.notes;

insert into public.perishability_profiles (slug, name, perishability_class, shelf_life_hours, freshness_window_minutes, storage_requirement, heat_sensitivity, spoilage_rate, delivery_urgency, max_transit_duration_minutes, refrigeration_required, sunlight_sensitivity, stackability, leak_risk, odor_sensitivity, breakability)
values
  ('fish-ultra-fresh', 'Fish Ultra Fresh', 'ULTRA_FRESH', 8, 45, 'iced_insulated', 0.95, 0.95, 1, 45, true, 0.8, 0.25, 0.45, 0.9, 0.2),
  ('flowers-humidity-sensitive', 'Flowers Humidity Sensitive', 'ULTRA_FRESH', 12, 60, 'cool_ventilated', 0.75, 0.8, 0.9, 45, false, 0.9, 0.15, 0.05, 0.4, 0.85),
  ('milk-morning-cold', 'Milk Morning Cold', 'SHORT_SHELF', 24, 120, 'refrigerated', 0.85, 0.8, 0.85, 60, true, 0.6, 0.7, 0.55, 0.2, 0.25),
  ('greens-same-day', 'Greens Same Day', 'SAME_DAY_FRESH', 18, 180, 'cool_ventilated', 0.8, 0.75, 0.8, 75, false, 0.85, 0.2, 0.05, 0.5, 0.75),
  ('dry-grocery-stable', 'Dry Grocery Stable', 'DRY_STABLE', 4320, null, 'ambient', 0.1, 0.05, 0.1, 240, false, 0.15, 0.95, 0.05, 0.05, 0.1),
  ('frozen-cold-chain', 'Frozen Cold Chain', 'FROZEN', 720, 45, 'frozen', 1, 0.9, 0.95, 45, true, 0.8, 0.55, 0.2, 0.2, 0.25)
on conflict (slug) do update set name = excluded.name, perishability_class = excluded.perishability_class;

insert into public.delivery_constraints (slug, name, max_delivery_radius_km, max_transit_duration_minutes, cold_chain_required, insulated_delivery_required, ice_required, fragile_flag, stackable, morning_priority, route_batching_allowed, metadata)
values
  ('standard-hyperlocal', 'Standard Hyperlocal', 8, 120, false, false, false, false, true, false, true, '{}'),
  ('fish-iced-45', 'Fish Iced 45 Minutes', 5, 45, true, true, true, false, false, false, false, '{"odor_isolation":true}'),
  ('flowers-crush-sensitive-45', 'Flowers Crush Sensitive 45 Minutes', 5, 45, false, false, false, true, false, true, false, '{"humidity_sensitive":true}'),
  ('milk-morning-priority', 'Milk Morning Priority', 6, 60, true, true, false, false, true, true, true, '{}'),
  ('frozen-cold-chain-45', 'Frozen Cold Chain 45 Minutes', 5, 45, true, true, false, false, true, false, false, '{}')
on conflict (slug) do update set name = excluded.name, max_transit_duration_minutes = excluded.max_transit_duration_minutes;
