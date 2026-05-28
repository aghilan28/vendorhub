create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

do $$
begin
  create type public.catalog_product_status as enum (
    'active',
    'hidden',
    'archived',
    'deprecated',
    'experimental',
    'pending_review',
    'blocked',
    'duplicate_candidate',
    'incomplete',
    'ai_generated'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.catalog_validation_domain as enum (
    'metadata',
    'image',
    'category',
    'variant',
    'search',
    'seller_catalog',
    'duplicate',
    'moderation',
    'ai_dataset'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.catalog_issue_severity as enum ('info', 'warning', 'major', 'critical');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.catalog_issue_state as enum ('open', 'acknowledged', 'resolved', 'waived', 'rolled_back');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.catalog_moderation_action as enum (
    'approve',
    'reject',
    'archive',
    'escalate',
    'restrict_seller',
    'require_manual_review',
    'hide',
    'restore'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.catalog_archive_action as enum ('archive', 'restore', 'deactivate', 'rollback', 'merge', 'split', 'deprecate', 'hide');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.bulk_normalization_job_type as enum (
    'bulk_category_fix',
    'bulk_image_replacement',
    'bulk_alias_generation',
    'bulk_transliteration',
    'bulk_sku_regeneration',
    'bulk_duplicate_merging',
    'bulk_status_change',
    'nightly_quality_scan',
    'duplicate_detection_scan',
    'image_validation_scan',
    'taxonomy_integrity_scan',
    'search_readiness_scan',
    'multilingual_coverage_scan',
    'seller_catalog_scan',
    'ai_safe_dataset_preparation'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.bulk_normalization_job_state as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'rolled_back');
exception when duplicate_object then null;
end $$;

alter table public.departments
  add column if not exists status public.catalog_product_status not null default 'active',
  add column if not exists is_mvp_enabled boolean not null default true,
  add column if not exists quality_score integer not null default 80 check (quality_score between 0 and 100),
  add column if not exists governance_metadata jsonb not null default '{}'::jsonb;

alter table public.categories
  add column if not exists status public.catalog_product_status not null default 'active',
  add column if not exists is_mvp_enabled boolean not null default true,
  add column if not exists quality_score integer not null default 80 check (quality_score between 0 and 100),
  add column if not exists governance_metadata jsonb not null default '{}'::jsonb;

alter table public.subcategories
  add column if not exists status public.catalog_product_status not null default 'active',
  add column if not exists is_mvp_enabled boolean not null default true,
  add column if not exists quality_score integer not null default 80 check (quality_score between 0 and 100),
  add column if not exists governance_metadata jsonb not null default '{}'::jsonb;

alter table public.product_families
  add column if not exists status public.catalog_product_status not null default 'active',
  add column if not exists is_mvp_enabled boolean not null default true,
  add column if not exists quality_score integer not null default 80 check (quality_score between 0 and 100),
  add column if not exists governance_metadata jsonb not null default '{}'::jsonb;

alter table public.master_products
  add column if not exists status public.catalog_product_status not null default 'pending_review',
  add column if not exists is_mvp_enabled boolean not null default true,
  add column if not exists quality_score integer not null default 0 check (quality_score between 0 and 100),
  add column if not exists duplicate_cluster_id uuid,
  add column if not exists deprecated_by_product_id uuid references public.master_products(id) on delete set null,
  add column if not exists moderation_required boolean not null default false,
  add column if not exists last_quality_scan_at timestamptz,
  add column if not exists governance_metadata jsonb not null default '{}'::jsonb;

alter table public.catalog_product_variants
  add column if not exists status public.catalog_product_status not null default 'active',
  add column if not exists is_mvp_enabled boolean not null default true,
  add column if not exists quality_score integer not null default 80 check (quality_score between 0 and 100),
  add column if not exists governance_metadata jsonb not null default '{}'::jsonb;

alter table public.seller_products
  add column if not exists status public.catalog_product_status not null default 'active',
  add column if not exists quality_score integer not null default 80 check (quality_score between 0 and 100),
  add column if not exists moderation_required boolean not null default false,
  add column if not exists governance_metadata jsonb not null default '{}'::jsonb;

create table if not exists public.product_quality_scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  product_id uuid not null references public.master_products(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  grade text not null,
  metadata_completeness_score integer not null check (metadata_completeness_score between 0 and 100),
  image_quality_score integer not null check (image_quality_score between 0 and 100),
  category_consistency_score integer not null check (category_consistency_score between 0 and 100),
  variant_validity_score integer not null check (variant_validity_score between 0 and 100),
  search_readiness_score integer not null check (search_readiness_score between 0 and 100),
  seller_usage_score integer not null check (seller_usage_score between 0 and 100),
  duplicate_confidence_score integer not null check (duplicate_confidence_score between 0 and 100),
  moderation_confidence_score integer not null check (moderation_confidence_score between 0 and 100),
  auto_visibility public.catalog_product_status not null,
  findings jsonb not null default '[]'::jsonb,
  scan_job_id uuid,
  scored_at timestamptz not null default now(),
  unique (product_id, scored_at)
);

create table if not exists public.product_duplicate_clusters (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  canonical_product_id uuid references public.master_products(id) on delete set null,
  status text not null default 'open',
  duplicate_confidence numeric(5, 4) not null check (duplicate_confidence between 0 and 1),
  detection_methods text[] not null default '{}',
  product_ids uuid[] not null default '{}',
  recommended_action text not null default 'review_merge',
  merge_strategy jsonb not null default '{}'::jsonb,
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.master_products
  add constraint master_products_duplicate_cluster_id_fkey
  foreign key (duplicate_cluster_id) references public.product_duplicate_clusters(id) on delete set null
  not valid;

create table if not exists public.product_validation_issues (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  product_id uuid references public.master_products(id) on delete cascade,
  variant_id uuid references public.catalog_product_variants(id) on delete cascade,
  seller_product_id uuid references public.seller_products(id) on delete cascade,
  domain public.catalog_validation_domain not null,
  severity public.catalog_issue_severity not null default 'warning',
  state public.catalog_issue_state not null default 'open',
  issue_code text not null,
  title text not null,
  detail text not null,
  suggested_fix jsonb not null default '{}'::jsonb,
  reversible boolean not null default true,
  auto_fixable boolean not null default false,
  detected_by text not null default 'catalog_governance_engine',
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  rollback_reference jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.product_image_audits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  product_id uuid references public.master_products(id) on delete cascade,
  catalog_image_id uuid references public.catalog_product_images(id) on delete cascade,
  seller_product_id uuid references public.seller_products(id) on delete cascade,
  seller_image_path text,
  image_kind public.product_image_kind not null,
  width integer,
  height integer,
  resolution_pass boolean not null default false,
  blur_score numeric(4, 3) check (blur_score between 0 and 1),
  brightness_score numeric(4, 3) check (brightness_score between 0 and 1),
  background_quality_score numeric(4, 3) check (background_quality_score between 0 and 1),
  watermark_detected boolean not null default false,
  compression_artifact_score numeric(4, 3) check (compression_artifact_score between 0 and 1),
  packaging_visibility numeric(4, 3) check (packaging_visibility between 0 and 1),
  ocr_readability numeric(4, 3) check (ocr_readability between 0 and 1),
  duplicate_hash text,
  perceptual_hash text,
  visual_embedding_id text,
  ai_generated_suspicion numeric(4, 3) not null default 0 check (ai_generated_suspicion between 0 and 1),
  pass boolean not null default false,
  failure_reasons text[] not null default '{}',
  audited_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.catalog_moderation_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product_id uuid references public.master_products(id) on delete set null,
  seller_product_id uuid references public.seller_products(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  action public.catalog_moderation_action not null,
  from_status public.catalog_product_status,
  to_status public.catalog_product_status,
  severity public.catalog_issue_severity not null default 'warning',
  reason text not null,
  reviewer_id uuid references public.profiles(id) on delete set null,
  evidence jsonb not null default '{}'::jsonb,
  reversible boolean not null default true,
  rollback_reference jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.catalog_archives (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product_id uuid references public.master_products(id) on delete set null,
  seller_product_id uuid references public.seller_products(id) on delete set null,
  action public.catalog_archive_action not null,
  from_status public.catalog_product_status,
  to_status public.catalog_product_status,
  snapshot jsonb not null,
  reason text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  restored_at timestamptz,
  restored_by uuid references public.profiles(id) on delete set null,
  rollback_of_archive_id uuid references public.catalog_archives(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.bulk_normalization_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  job_type public.bulk_normalization_job_type not null,
  state public.bulk_normalization_job_state not null default 'queued',
  requested_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  target_scope jsonb not null default '{}'::jsonb,
  dry_run boolean not null default true,
  total_count integer not null default 0,
  processed_count integer not null default 0,
  changed_count integer not null default 0,
  issue_count integer not null default 0,
  rollback_plan jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  error text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.search_validation_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  product_id uuid references public.master_products(id) on delete cascade,
  scan_job_id uuid references public.bulk_normalization_jobs(id) on delete set null,
  alias_count integer not null default 0,
  transliteration_count integer not null default 0,
  phonetic_token_count integer not null default 0,
  autocomplete_token_count integer not null default 0,
  multilingual_coverage jsonb not null default '{}'::jsonb,
  recipe_association_count integer not null default 0,
  co_purchase_tag_count integer not null default 0,
  readiness_score integer not null check (readiness_score between 0 and 100),
  missing_requirements text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.taxonomy_integrity_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  product_id uuid references public.master_products(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  scan_job_id uuid references public.bulk_normalization_jobs(id) on delete set null,
  depth_valid boolean not null default true,
  parent_relationship_valid boolean not null default true,
  orphan_product boolean not null default false,
  regional_tags_valid boolean not null default true,
  festival_tags_valid boolean not null default true,
  consistency_score integer not null check (consistency_score between 0 and 100),
  findings text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.seller_catalog_audits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  seller_product_id uuid not null references public.seller_products(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  master_product_id uuid references public.master_products(id) on delete set null,
  scan_job_id uuid references public.bulk_normalization_jobs(id) on delete set null,
  duplicate_risk numeric(4, 3) not null default 0 check (duplicate_risk between 0 and 1),
  local_brand_conflict boolean not null default false,
  misleading_image_risk numeric(4, 3) not null default 0 check (misleading_image_risk between 0 and 1),
  price_outlier_risk numeric(4, 3) not null default 0 check (price_outlier_risk between 0 and 1),
  fake_packaging_risk numeric(4, 3) not null default 0 check (fake_packaging_risk between 0 and 1),
  consistency_score integer not null check (consistency_score between 0 and 100),
  findings text[] not null default '{}',
  recommended_action text not null default 'none',
  metadata jsonb not null default '{}'::jsonb
);

create or replace function public.catalog_quality_grade(score integer)
returns text
language sql
immutable
as $$
  select case
    when score >= 90 then 'production_grade'
    when score >= 70 then 'good_improvable'
    when score >= 50 then 'needs_review'
    else 'auto_hidden'
  end;
$$;

create or replace function public.catalog_visibility_for_quality(score integer, current_status public.catalog_product_status)
returns public.catalog_product_status
language sql
immutable
as $$
  select case
    when current_status in ('archived', 'deprecated', 'blocked') then current_status
    when score < 50 then 'hidden'::public.catalog_product_status
    when score < 70 then 'pending_review'::public.catalog_product_status
    else 'active'::public.catalog_product_status
  end;
$$;

create or replace function public.calculate_catalog_product_quality(target_product_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p record;
  alias_count integer := 0;
  variant_count integer := 0;
  image_count integer := 0;
  search_count integer := 0;
  seller_count integer := 0;
  issue_count integer := 0;
  duplicate_count integer := 0;
  metadata_score integer := 0;
  image_score integer := 0;
  category_score integer := 0;
  variant_score integer := 0;
  search_score integer := 0;
  seller_score integer := 0;
  duplicate_score integer := 100;
  moderation_score integer := 100;
  final_score integer := 0;
  visibility public.catalog_product_status;
  findings jsonb := '[]'::jsonb;
  score_id uuid;
begin
  select * into p
  from public.master_products
  where id = target_product_id
    and deleted_at is null;

  if not found then
    raise exception 'Master product % not found', target_product_id;
  end if;

  select count(*) into alias_count from public.product_aliases where product_id = target_product_id and deleted_at is null;
  select count(*) into variant_count from public.catalog_product_variants where product_id = target_product_id and deleted_at is null;
  select count(*) into image_count from public.catalog_product_images where product_id = target_product_id and deleted_at is null;
  select count(*) into search_count from public.search_tokens where product_id = target_product_id and deleted_at is null;
  select count(*) into seller_count from public.seller_products where master_product_id = target_product_id and deleted_at is null;
  select count(*) into issue_count from public.product_validation_issues where product_id = target_product_id and state = 'open' and deleted_at is null;
  select count(*) into duplicate_count from public.product_duplicate_clusters where target_product_id = any(product_ids) and status in ('open', 'review_required') and deleted_at is null;

  metadata_score :=
    (case when coalesce(p.description, '') <> '' then 18 else 0 end) +
    (case when coalesce(p.short_description, '') <> '' then 10 else 0 end) +
    (case when p.tamil_name is not null then 8 else 0 end) +
    (case when p.telugu_name is not null then 8 else 0 end) +
    (case when p.kannada_name is not null then 8 else 0 end) +
    (case when p.malayalam_name is not null then 8 else 0 end) +
    (case when p.hindi_name is not null then 8 else 0 end) +
    least(14, alias_count * 4) +
    least(12, variant_count * 6) +
    least(6, cardinality(p.discovery_tags) * 2);
  metadata_score := least(100, metadata_score);

  image_score := case
    when image_count = 0 then 0
    else least(100, 45 + image_count * 15)
  end;

  category_score := case
    when p.department_id is not null and p.category_id is not null then 100
    else 25
  end;

  variant_score := case
    when variant_count = 0 then 20
    when exists (
      select 1
      from public.catalog_product_variants v
      where v.product_id = target_product_id
        and v.deleted_at is null
        and (
          coalesce(v.quantity, v.normalized_metric_value, v.min_metric_value, 1) <= 0
          or v.packaging_type_id is null
          or (v.variant_type in ('WEIGHT', 'VOLUME') and v.unit_id is null)
        )
    ) then 45
    else 100
  end;

  search_score := least(100, search_count * 10 + alias_count * 8 + cardinality(p.romanized_variants) * 5 + cardinality(p.discovery_tags) * 4);
  seller_score := least(100, 25 + seller_count * 15);
  duplicate_score := greatest(0, 100 - duplicate_count * 35);
  moderation_score := greatest(0, 100 - issue_count * 12 - case when p.status in ('ai_generated', 'blocked') then 30 else 0 end);

  final_score := round(
    metadata_score * 0.20 +
    image_score * 0.20 +
    category_score * 0.10 +
    variant_score * 0.10 +
    search_score * 0.10 +
    seller_score * 0.10 +
    duplicate_score * 0.10 +
    moderation_score * 0.10
  );
  visibility := public.catalog_visibility_for_quality(final_score, p.status);

  if metadata_score < 70 then findings := findings || jsonb_build_array('metadata_incomplete'); end if;
  if image_score < 70 then findings := findings || jsonb_build_array('image_quality_or_coverage_weak'); end if;
  if variant_score < 70 then findings := findings || jsonb_build_array('variant_integrity_weak'); end if;
  if search_score < 70 then findings := findings || jsonb_build_array('search_readiness_weak'); end if;
  if duplicate_score < 100 then findings := findings || jsonb_build_array('duplicate_candidate'); end if;

  insert into public.product_quality_scores (
    product_id,
    score,
    grade,
    metadata_completeness_score,
    image_quality_score,
    category_consistency_score,
    variant_validity_score,
    search_readiness_score,
    seller_usage_score,
    duplicate_confidence_score,
    moderation_confidence_score,
    auto_visibility,
    findings
  )
  values (
    target_product_id,
    final_score,
    public.catalog_quality_grade(final_score),
    metadata_score,
    image_score,
    category_score,
    variant_score,
    search_score,
    seller_score,
    duplicate_score,
    moderation_score,
    visibility,
    findings
  )
  returning id into score_id;

  update public.master_products
  set quality_score = final_score,
      status = visibility,
      moderation_required = final_score < 70 or p.status = 'ai_generated',
      last_quality_scan_at = now(),
      governance_metadata = coalesce(governance_metadata, '{}'::jsonb) || jsonb_build_object('lastQualityScoreId', score_id, 'lastQualityFindings', findings)
  where id = target_product_id;

  return jsonb_build_object(
    'productId', target_product_id,
    'scoreId', score_id,
    'score', final_score,
    'grade', public.catalog_quality_grade(final_score),
    'status', visibility,
    'findings', findings
  );
end;
$$;

create or replace function public.run_catalog_quality_scan(batch_size integer default 250)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  job_id uuid;
  product_record record;
  processed integer := 0;
  changed integer := 0;
  result jsonb;
begin
  insert into public.bulk_normalization_jobs (job_type, state, started_at, dry_run, target_scope)
  values ('nightly_quality_scan', 'running', now(), false, jsonb_build_object('batchSize', batch_size))
  returning id into job_id;

  for product_record in
    select id
    from public.master_products
    where deleted_at is null
    order by coalesce(last_quality_scan_at, 'epoch'::timestamptz), updated_at
    limit batch_size
  loop
    result := public.calculate_catalog_product_quality(product_record.id);
    processed := processed + 1;
    changed := changed + case when (result ->> 'status') <> 'active' then 1 else 0 end;
  end loop;

  update public.bulk_normalization_jobs
  set state = 'succeeded',
      completed_at = now(),
      total_count = processed,
      processed_count = processed,
      changed_count = changed,
      result = jsonb_build_object('processed', processed, 'visibilityChanges', changed)
  where id = job_id;

  return jsonb_build_object('jobId', job_id, 'processed', processed, 'visibilityChanges', changed);
exception when others then
  if job_id is not null then
    update public.bulk_normalization_jobs
    set state = 'failed',
        completed_at = now(),
        error = sqlerrm
    where id = job_id;
  end if;
  raise;
end;
$$;

create or replace function public.flag_catalog_duplicate_cluster(
  canonical_product uuid,
  duplicate_products uuid[],
  confidence numeric,
  methods text[] default array[]::text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cluster_id uuid;
  product_id uuid;
  all_products uuid[];
begin
  all_products := array(select distinct unnest(array_append(duplicate_products, canonical_product)));

  insert into public.product_duplicate_clusters (
    canonical_product_id,
    duplicate_confidence,
    detection_methods,
    product_ids,
    recommended_action,
    metadata
  )
  values (
    canonical_product,
    least(1, greatest(0, confidence)),
    methods,
    all_products,
    'review_merge',
    jsonb_build_object('createdBy', 'duplicate_detection_scan')
  )
  returning id into cluster_id;

  foreach product_id in array all_products
  loop
    update public.master_products
    set duplicate_cluster_id = cluster_id,
        status = case when id = canonical_product then status else 'duplicate_candidate'::public.catalog_product_status end,
        governance_metadata = coalesce(governance_metadata, '{}'::jsonb) || jsonb_build_object('duplicateClusterId', cluster_id)
    where id = product_id;

    insert into public.product_validation_issues (
      product_id,
      domain,
      severity,
      issue_code,
      title,
      detail,
      suggested_fix
    )
    values (
      product_id,
      'duplicate',
      case when confidence >= 0.9 then 'major' else 'warning' end,
      'duplicate_candidate',
      'Potential duplicate product',
      'Duplicate detection found matching name, barcode, image, variant, phonetic, or multilingual signals.',
      jsonb_build_object('clusterId', cluster_id, 'canonicalProductId', canonical_product, 'action', 'review_merge')
    );
  end loop;

  return cluster_id;
end;
$$;

create or replace function public.archive_catalog_product(target_product_id uuid, archive_reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row public.master_products%rowtype;
  archive_id uuid;
begin
  select * into old_row
  from public.master_products
  where id = target_product_id
    and deleted_at is null;

  if not found then
    raise exception 'Master product % not found', target_product_id;
  end if;

  insert into public.catalog_archives (
    product_id,
    action,
    from_status,
    to_status,
    snapshot,
    reason,
    actor_id
  )
  values (
    target_product_id,
    'archive',
    old_row.status,
    'archived',
    to_jsonb(old_row),
    archive_reason,
    auth.uid()
  )
  returning id into archive_id;

  update public.master_products
  set status = 'archived',
      active_status = 'ARCHIVED',
      governance_metadata = coalesce(governance_metadata, '{}'::jsonb) || jsonb_build_object('archivedAt', now(), 'archiveId', archive_id, 'archiveReason', archive_reason)
  where id = target_product_id;

  insert into public.catalog_moderation_events (
    product_id,
    action,
    from_status,
    to_status,
    severity,
    reason,
    reviewer_id,
    rollback_reference
  )
  values (
    target_product_id,
    'archive',
    old_row.status,
    'archived',
    'warning',
    archive_reason,
    auth.uid(),
    jsonb_build_object('archiveId', archive_id)
  );

  return archive_id;
end;
$$;

create or replace function public.restore_catalog_product(target_archive_id uuid, restore_reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  archive_row public.catalog_archives%rowtype;
  restored_status public.catalog_product_status;
  restore_archive_id uuid;
begin
  select * into archive_row
  from public.catalog_archives
  where id = target_archive_id;

  if not found or archive_row.product_id is null then
    raise exception 'Archive % not found', target_archive_id;
  end if;

  restored_status := coalesce(archive_row.from_status, 'pending_review'::public.catalog_product_status);

  update public.master_products
  set status = restored_status,
      active_status = case when restored_status = 'active' then 'ACTIVE' else active_status end,
      governance_metadata = coalesce(governance_metadata, '{}'::jsonb) || jsonb_build_object('restoredAt', now(), 'restoredFromArchiveId', target_archive_id, 'restoreReason', restore_reason)
  where id = archive_row.product_id;

  update public.catalog_archives
  set restored_at = now(),
      restored_by = auth.uid()
  where id = target_archive_id;

  insert into public.catalog_archives (
    product_id,
    action,
    from_status,
    to_status,
    snapshot,
    reason,
    actor_id,
    rollback_of_archive_id
  )
  values (
    archive_row.product_id,
    'restore',
    'archived',
    restored_status,
    archive_row.snapshot,
    restore_reason,
    auth.uid(),
    target_archive_id
  )
  returning id into restore_archive_id;

  return restore_archive_id;
end;
$$;

create or replace function public.validate_catalog_variant_integrity(target_variant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
  issues text[] := array[]::text[];
  score integer := 100;
begin
  select * into v from public.catalog_product_variants where id = target_variant_id and deleted_at is null;
  if not found then
    raise exception 'Catalog variant % not found', target_variant_id;
  end if;

  if coalesce(v.quantity, v.normalized_metric_value, v.min_metric_value, 1) <= 0 then
    issues := array_append(issues, 'impossible_quantity');
    score := score - 40;
  end if;

  if v.variant_type in ('WEIGHT', 'VOLUME') and v.unit_id is null then
    issues := array_append(issues, 'missing_metric_unit');
    score := score - 25;
  end if;

  if v.packaging_type_id is null then
    issues := array_append(issues, 'missing_packaging_type');
    score := score - 20;
  end if;

  if v.traditional_unit_id is not null and v.min_metric_value is not null and v.max_metric_value is not null and v.max_metric_value > v.min_metric_value * 8 then
    issues := array_append(issues, 'traditional_unit_range_unrealistic');
    score := score - 15;
  end if;

  score := greatest(0, least(100, score));

  if cardinality(issues) > 0 then
    insert into public.product_validation_issues (
      product_id,
      variant_id,
      domain,
      severity,
      issue_code,
      title,
      detail,
      suggested_fix
    )
    values (
      v.product_id,
      target_variant_id,
      'variant',
      case when score < 50 then 'major' else 'warning' end,
      'variant_integrity_failed',
      'Variant integrity validation failed',
      array_to_string(issues, ', '),
      jsonb_build_object('issues', issues)
    );
  end if;

  update public.catalog_product_variants
  set quality_score = score,
      status = case when score < 50 then 'hidden' else status end,
      governance_metadata = coalesce(governance_metadata, '{}'::jsonb) || jsonb_build_object('lastVariantValidationIssues', issues)
  where id = target_variant_id;

  return jsonb_build_object('variantId', target_variant_id, 'score', score, 'issues', issues);
end;
$$;

create or replace view public.catalog_data_health_admin as
select
  count(*) filter (where mp.deleted_at is null) as total_products,
  count(*) filter (where mp.status = 'active' and mp.deleted_at is null) as active_products,
  count(*) filter (where mp.status = 'hidden' and mp.deleted_at is null) as hidden_products,
  count(*) filter (where mp.status = 'archived' and mp.deleted_at is null) as archived_products,
  count(*) filter (where mp.status = 'duplicate_candidate' and mp.deleted_at is null) as duplicate_candidates,
  count(*) filter (where mp.moderation_required and mp.deleted_at is null) as moderation_required,
  round(avg(mp.quality_score) filter (where mp.deleted_at is null), 2) as average_quality_score,
  count(*) filter (where mp.quality_score >= 90 and mp.deleted_at is null) as production_grade_products,
  count(*) filter (where mp.quality_score < 50 and mp.deleted_at is null) as auto_hidden_quality_products,
  count(distinct pdc.id) filter (where pdc.deleted_at is null and pdc.status = 'open') as open_duplicate_clusters,
  count(pvi.id) filter (where pvi.deleted_at is null and pvi.state = 'open') as open_validation_issues
from public.master_products mp
left join public.product_duplicate_clusters pdc on mp.duplicate_cluster_id = pdc.id
left join public.product_validation_issues pvi on pvi.product_id = mp.id;

create or replace view public.catalog_quality_distribution_admin as
select
  public.catalog_quality_grade(quality_score) as quality_band,
  count(*) as product_count,
  round(avg(quality_score), 2) as average_score
from public.master_products
where deleted_at is null
group by public.catalog_quality_grade(quality_score)
order by min(quality_score) desc;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'product_quality_scores',
    'product_duplicate_clusters',
    'product_validation_issues',
    'product_image_audits',
    'catalog_moderation_events',
    'catalog_archives',
    'bulk_normalization_jobs',
    'search_validation_reports',
    'taxonomy_integrity_reports',
    'seller_catalog_audits'
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

create index if not exists master_products_governance_status_idx on public.master_products(status, is_mvp_enabled, quality_score desc) where deleted_at is null;
create index if not exists master_products_duplicate_cluster_idx on public.master_products(duplicate_cluster_id) where duplicate_cluster_id is not null and deleted_at is null;
create index if not exists product_quality_scores_product_scored_idx on public.product_quality_scores(product_id, scored_at desc) where deleted_at is null;
create index if not exists product_duplicate_clusters_status_idx on public.product_duplicate_clusters(status, duplicate_confidence desc) where deleted_at is null;
create index if not exists product_validation_issues_open_idx on public.product_validation_issues(domain, severity, created_at desc) where deleted_at is null and state = 'open';
create index if not exists product_image_audits_product_idx on public.product_image_audits(product_id, pass, audited_at desc) where deleted_at is null;
create index if not exists catalog_moderation_events_product_idx on public.catalog_moderation_events(product_id, created_at desc);
create index if not exists catalog_archives_product_idx on public.catalog_archives(product_id, created_at desc);
create index if not exists bulk_normalization_jobs_state_idx on public.bulk_normalization_jobs(job_type, state, created_at desc) where deleted_at is null;
create index if not exists search_validation_reports_product_idx on public.search_validation_reports(product_id, readiness_score) where deleted_at is null;
create index if not exists taxonomy_integrity_reports_product_idx on public.taxonomy_integrity_reports(product_id, consistency_score) where deleted_at is null;
create index if not exists seller_catalog_audits_vendor_idx on public.seller_catalog_audits(vendor_id, consistency_score) where deleted_at is null;

create policy "catalog_governance_admin_quality_scores_all" on public.product_quality_scores for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "catalog_governance_admin_duplicate_clusters_all" on public.product_duplicate_clusters for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "catalog_governance_admin_validation_issues_all" on public.product_validation_issues for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "catalog_governance_admin_image_audits_all" on public.product_image_audits for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "catalog_governance_admin_moderation_events_all" on public.catalog_moderation_events for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "catalog_governance_admin_archives_all" on public.catalog_archives for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "catalog_governance_admin_bulk_jobs_all" on public.bulk_normalization_jobs for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "catalog_governance_admin_search_reports_all" on public.search_validation_reports for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "catalog_governance_admin_taxonomy_reports_all" on public.taxonomy_integrity_reports for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "catalog_governance_admin_seller_audits_all" on public.seller_catalog_audits for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create policy "catalog_governance_seller_audit_select" on public.seller_catalog_audits for select using (public.current_user_is_vendor_member(vendor_id));
create policy "catalog_governance_seller_product_issues_select" on public.product_validation_issues for select using (
  seller_product_id is not null
  and exists (
    select 1
    from public.seller_products sp
    where sp.id = seller_product_id
      and public.current_user_is_vendor_member(sp.vendor_id)
  )
);
