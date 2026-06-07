-- ============================================================================
-- 20260529215000_schema_drift_reconciliation.sql
-- ----------------------------------------------------------------------------
-- PURPOSE
--   Heal Supabase migration-history drift in ONE shot.
--
--   Root cause: columns/enum values were added retroactively INTO migrations
--   that were ALREADY recorded as applied on the remote database. Because
--   `supabase db push` never re-runs an applied migration, those additions
--   never reached the remote schema. Every later migration that INSERTs the
--   missing columns therefore fails with SQLSTATE 42703 (e.g. brands.logo_url,
--   product_quality_scores.metadata).
--
--   This migration re-applies every idempotent `add column if not exists` and
--   `add value if not exists` declared in the already-applied migration set.
--   Every statement is fully idempotent: it is a no-op where the object
--   already exists and a heal where it is missing. Safe on every database
--   regardless of how much drift exists.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ----------------------------------------------------------------------------
-- ENUM VALUE RECONCILIATION
--   NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction block in
--   older PG, but `add value if not exists` outside an explicit BEGIN is fine
--   under supabase db push (each statement auto-commits).
-- ----------------------------------------------------------------------------
alter type public.delivery_status add value if not exists 'DELIVERY_PENDING';
alter type public.delivery_status add value if not exists 'READY_FOR_DISPATCH';
alter type public.delivery_status add value if not exists 'DISPATCHED';
alter type public.delivery_status add value if not exists 'ARRIVING';
alter type public.delivery_status add value if not exists 'CANCELLED';
alter type public.verification_state add value if not exists 'UNDER_REVIEW';
alter type public.verification_state add value if not exists 'EXPIRED';
alter type public.verification_state add value if not exists 'ESCALATION_REQUIRED';
alter type public.reconciliation_case_type add value if not exists 'SETTLEMENT_MISMATCH';
alter type public.reconciliation_case_type add value if not exists 'PAYOUT_DUPLICATION_ATTEMPT';
alter type public.reconciliation_case_type add value if not exists 'REFUND_REPLAY_ANOMALY';
alter type public.reconciliation_case_type add value if not exists 'LEDGER_REPAIR_REQUIRED';

-- ----------------------------------------------------------------------------
-- COLUMN RECONCILIATION
-- ----------------------------------------------------------------------------
-- from 20260525233000_phase_7_ai_discovery_intelligence.sql
alter table public.products
  add column if not exists embedding vector(1536),
  add column if not exists embedding_text text,
  add column if not exists embedding_model text,
  add column if not exists embedding_updated_at timestamptz,
  add column if not exists search_quality_score numeric(5, 2) not null default 0,
  add column if not exists discovery_metadata jsonb not null default '{}'::jsonb;

-- from 20260526013000_phase_10_true_hyperlocal_geo.sql
alter table public.vendors
  add column if not exists latitude numeric(10, 7),
  add column if not exists longitude numeric(10, 7),
  add column if not exists location geography(point, 4326),
  add column if not exists locality text,
  add column if not exists city text not null default 'Chennai',
  add column if not exists service_area_label text,
  add column if not exists delivery_radius_km numeric(6, 2) not null default 5,
  add column if not exists location_verified_at timestamptz;

-- from 20260526013000_phase_10_true_hyperlocal_geo.sql
alter table public.addresses
  add column if not exists location geography(point, 4326),
  add column if not exists delivery_instructions text,
  add column if not exists geocoding_confidence numeric(4, 3);

-- from 20260526053000_phase_18_live_payment_orchestration.sql
alter table public.payment_attempts
  add column if not exists financial_state public.payment_financial_state not null default 'PAYMENT_CREATED',
  add column if not exists receipt text,
  add column if not exists provider_order_status text,
  add column if not exists provider_amount_due numeric(12, 2),
  add column if not exists provider_amount_paid numeric(12, 2),
  add column if not exists provider_created_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists verification_attempts integer not null default 0 check (verification_attempts >= 0),
  add column if not exists last_verified_at timestamptz,
  add column if not exists reconciliation_state text not null default 'NOT_STARTED',
  add column if not exists reconciliation_error text;

-- from 20260526090000_phase_21_live_ai_activation.sql
alter table public.products
  add column if not exists embedding_refresh_state text not null default 'STALE',
  add column if not exists embedding_refresh_error text,
  add column if not exists embedding_refresh_requested_at timestamptz not null default now();

-- from 20260526233000_stabilization_s2_logistics_hardening.sql
alter table public.delivery_tracking_events
  add column if not exists provider text;

-- from 20260526233000_stabilization_s2_logistics_hardening.sql
alter table public.delivery_tracking_events
  add column if not exists provider_event_id text;

-- from 20260526233000_stabilization_s2_logistics_hardening.sql
alter table public.delivery_tracking_events
  add column if not exists event_hash text;

-- from 20260526233000_stabilization_s2_logistics_hardening.sql
alter table public.delivery_recovery_jobs
  add column if not exists priority integer not null default 50;

-- from 20260527003000_stabilization_s3_governance_hardening.sql
alter table public.seller_kyc_profiles
  add column if not exists expires_at timestamptz;

-- from 20260527003000_stabilization_s3_governance_hardening.sql
alter table public.seller_kyc_profiles
  add column if not exists escalation_reason text;

-- from 20260527003000_stabilization_s3_governance_hardening.sql
alter table public.verification_documents
  add column if not exists expires_at timestamptz;

-- from 20260527003000_stabilization_s3_governance_hardening.sql
alter table public.verification_documents
  add column if not exists evidence_hash text;

-- from 20260527003000_stabilization_s3_governance_hardening.sql
alter table public.dispute_evidence
  add column if not exists evidence_hash text;

-- from 20260527003000_stabilization_s3_governance_hardening.sql
alter table public.marketplace_disputes
  add column if not exists sla_due_at timestamptz;

-- from 20260527003000_stabilization_s3_governance_hardening.sql
alter table public.marketplace_disputes
  add column if not exists escalated_at timestamptz;

-- from 20260527003000_stabilization_s3_governance_hardening.sql
alter table public.governance_cases
  add column if not exists sla_due_at timestamptz;

-- from 20260527003000_stabilization_s3_governance_hardening.sql
alter table public.governance_cases
  add column if not exists appeal_count integer not null default 0;

-- from 20260528020000_phase_33_ai_commerce_intelligence.sql
alter table public.ai_retrieval_events
  add column if not exists semantic_match_quality numeric(8, 4),
  add column if not exists ranking_drift numeric(8, 4),
  add column if not exists recommendation_ctr numeric(8, 4),
  add column if not exists queue_latency_ms integer not null default 0;

-- from 20260528030000_phase_34_finance_operating_system.sql
alter table public.financial_reconciliation_runs
  add column if not exists replay_key text,
  add column if not exists drift_amount numeric(14, 2) not null default 0,
  add column if not exists replay_anomaly_count integer not null default 0 check (replay_anomaly_count >= 0),
  add column if not exists queue_pressure numeric(8, 4) not null default 0;

-- from 20260528030000_phase_34_finance_operating_system.sql
alter table public.settlement_records
  add column if not exists provider_settlement_id text,
  add column if not exists provider_settlement_state text,
  add column if not exists provider_settlement_amount numeric(12, 2),
  add column if not exists settlement_observed_at timestamptz,
  add column if not exists financial_risk_state text not null default 'HEALTHY';

-- from 20260528030000_phase_34_finance_operating_system.sql
alter table public.seller_payout_batches
  add column if not exists governance_hold boolean not null default false,
  add column if not exists risk_state text not null default 'LOW',
  add column if not exists payout_decision text,
  add column if not exists last_recovery_action text;

-- from 20260528030000_phase_34_finance_operating_system.sql
alter table public.refund_requests
  add column if not exists accounting_state text not null default 'PENDING',
  add column if not exists accounting_journal_id uuid references public.financial_ledger_journals(id) on delete set null,
  add column if not exists replay_anomaly_detected boolean not null default false;

-- from 20260529010000_phase_41_production_hardening.sql
alter table public.products
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- from 20260529010000_phase_41_production_hardening.sql
alter table public.products
  ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;

-- from 20260529020000_tier_1_commerce_foundation.sql
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

-- from 20260529020000_tier_1_commerce_foundation.sql
alter table public.brands
  add column if not exists logo_url text,
  add column if not exists status text not null default 'ACTIVE';

-- from 20260529020000_tier_1_commerce_foundation.sql
alter table public.products
  add column if not exists master_product_id uuid references public.master_products(id) on delete set null,
  add column if not exists seller_catalog_metadata jsonb not null default '{}'::jsonb;

-- from 20260529020000_tier_1_commerce_foundation.sql
alter table public.product_variants
  add column if not exists catalog_variant_id uuid references public.catalog_product_variants(id) on delete set null,
  add column if not exists variant_type public.variant_type,
  add column if not exists traditional_unit_id uuid references public.traditional_units(id) on delete set null,
  add column if not exists packaging_type_id uuid references public.packaging_types(id) on delete set null,
  add column if not exists freshness_window_minutes integer,
  add column if not exists max_delivery_radius_km numeric(6, 2);

-- from 20260529020000_tier_1_commerce_foundation.sql
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

-- from 20260529030000_tier_1_5_catalog_governance.sql
alter table public.departments
  add column if not exists status public.catalog_product_status not null default 'active',
  add column if not exists is_mvp_enabled boolean not null default true,
  add column if not exists quality_score integer not null default 80 check (quality_score between 0 and 100),
  add column if not exists governance_metadata jsonb not null default '{}'::jsonb;

-- from 20260529030000_tier_1_5_catalog_governance.sql
alter table public.categories
  add column if not exists status public.catalog_product_status not null default 'active',
  add column if not exists is_mvp_enabled boolean not null default true,
  add column if not exists quality_score integer not null default 80 check (quality_score between 0 and 100),
  add column if not exists governance_metadata jsonb not null default '{}'::jsonb;

-- from 20260529030000_tier_1_5_catalog_governance.sql
alter table public.subcategories
  add column if not exists status public.catalog_product_status not null default 'active',
  add column if not exists is_mvp_enabled boolean not null default true,
  add column if not exists quality_score integer not null default 80 check (quality_score between 0 and 100),
  add column if not exists governance_metadata jsonb not null default '{}'::jsonb;

-- from 20260529030000_tier_1_5_catalog_governance.sql
alter table public.product_families
  add column if not exists status public.catalog_product_status not null default 'active',
  add column if not exists is_mvp_enabled boolean not null default true,
  add column if not exists quality_score integer not null default 80 check (quality_score between 0 and 100),
  add column if not exists governance_metadata jsonb not null default '{}'::jsonb;

-- from 20260529030000_tier_1_5_catalog_governance.sql
alter table public.master_products
  add column if not exists status public.catalog_product_status not null default 'pending_review',
  add column if not exists is_mvp_enabled boolean not null default true,
  add column if not exists quality_score integer not null default 0 check (quality_score between 0 and 100),
  add column if not exists duplicate_cluster_id uuid,
  add column if not exists deprecated_by_product_id uuid references public.master_products(id) on delete set null,
  add column if not exists moderation_required boolean not null default false,
  add column if not exists last_quality_scan_at timestamptz,
  add column if not exists governance_metadata jsonb not null default '{}'::jsonb;

-- from 20260529030000_tier_1_5_catalog_governance.sql
alter table public.catalog_product_variants
  add column if not exists status public.catalog_product_status not null default 'active',
  add column if not exists is_mvp_enabled boolean not null default true,
  add column if not exists quality_score integer not null default 80 check (quality_score between 0 and 100),
  add column if not exists governance_metadata jsonb not null default '{}'::jsonb;

-- from 20260529030000_tier_1_5_catalog_governance.sql
alter table public.seller_products
  add column if not exists status public.catalog_product_status not null default 'active',
  add column if not exists quality_score integer not null default 80 check (quality_score between 0 and 100),
  add column if not exists moderation_required boolean not null default false,
  add column if not exists governance_metadata jsonb not null default '{}'::jsonb;

-- from 20260529030000_tier_1_5_catalog_governance.sql
alter table public.product_quality_scores
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- from 20260529040000_tier_2_hyperlocal_discovery.sql
alter table public.products
  add column if not exists search_tokens text[] not null default '{}',
  add column if not exists phonetic_tokens text[] not null default '{}',
  add column if not exists fuzzy_tokens text[] not null default '{}',
  add column if not exists transliteration_tokens text[] not null default '{}',
  add column if not exists voice_tokens text[] not null default '{}',
  add column if not exists recipe_tokens text[] not null default '{}',
  add column if not exists festival_tokens text[] not null default '{}',
  add column if not exists context_tokens text[] not null default '{}',
  add column if not exists localized_names jsonb not null default '{}'::jsonb,
  add column if not exists regional_aliases text[] not null default '{}',
  add column if not exists slang_aliases text[] not null default '{}',
  add column if not exists phonetic_aliases text[] not null default '{}',
  add column if not exists transliterated_aliases text[] not null default '{}',
  add column if not exists semantic_embedding_id text,
  add column if not exists vector_index_key text,
  add column if not exists intent_tags text[] not null default '{}',
  add column if not exists contextual_tags text[] not null default '{}',
  add column if not exists behavioral_tags text[] not null default '{}',
  add column if not exists emotional_tags text[] not null default '{}',
  add column if not exists recipe_tags text[] not null default '{}',
  add column if not exists locality_embeddings text[] not null default '{}',
  add column if not exists perishability_class text not null default 'ambient',
  add column if not exists freshness_window_hours integer not null default 720,
  add column if not exists cold_chain_required boolean not null default false;

