create extension if not exists vector with schema extensions;

create table if not exists public.ai_ocr_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null,
  seller_id uuid references public.vendors(id) on delete set null,
  locality text,
  language_hints text[] not null default '{}',
  layout_type text not null default 'unknown',
  extracted_items jsonb not null default '[]'::jsonb,
  extracted_totals jsonb not null default '{}'::jsonb,
  noise_score numeric(6, 5) not null default 0,
  confidence numeric(6, 5) not null default 0,
  needs_human_review boolean not null default true,
  document_vector vector(384),
  audit_trail jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.ai_whatsapp_ingestion (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  seller_id uuid references public.vendors(id) on delete set null,
  message_id text not null,
  replay_key text not null unique,
  intent text not null,
  locality text,
  raw_text text,
  structured_event jsonb not null default '{}'::jsonb,
  line_items jsonb not null default '[]'::jsonb,
  confidence numeric(6, 5) not null default 0,
  voice_ready_transcript text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.ai_product_matches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  input_text text not null,
  canonical_product_id uuid references public.products(id) on delete set null,
  variant_match text,
  confidence numeric(6, 5) not null default 0,
  ambiguous boolean not null default true,
  candidates jsonb not null default '[]'::jsonb,
  corrections text[] not null default '{}',
  match_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.ai_catalog_drafts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  seller_id uuid references public.vendors(id) on delete set null,
  source text not null,
  title text not null,
  category_slug text not null,
  brand text,
  variants jsonb not null default '[]'::jsonb,
  aliases text[] not null default '{}',
  search_tokens text[] not null default '{}',
  multilingual_tags text[] not null default '{}',
  confidence numeric(6, 5) not null default 0,
  moderation_state text not null default 'needs_review',
  rollback_token text not null,
  safety_flags text[] not null default '{}',
  draft_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.ai_image_analysis (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  seller_id uuid references public.vendors(id) on delete set null,
  image_id text not null,
  packaging_visibility_score numeric(6, 5) not null default 0,
  image_quality_score numeric(6, 5) not null default 0,
  duplicate_confidence numeric(6, 5) not null default 0,
  packaging_text_extraction text[] not null default '{}',
  category_hints text[] not null default '{}',
  perceptual_hash text not null,
  packaging_fingerprint text not null,
  issues text[] not null default '{}',
  moderation_required boolean not null default true,
  image_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.ai_duplicate_clusters (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  cluster_key text not null unique,
  product_ids uuid[] not null default '{}',
  confidence numeric(6, 5) not null default 0,
  reason text not null,
  state text not null default 'needs_review',
  duplicate_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.ai_inventory_suggestions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  seller_id uuid references public.vendors(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  suggestion_type text not null,
  title text not null,
  action text not null,
  priority text not null default 'medium',
  confidence numeric(6, 5) not null default 0,
  state text not null default 'open',
  suggestion_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.ai_pricing_recommendations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  seller_id uuid references public.vendors(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  current_price numeric(12, 2),
  recommended_price numeric(12, 2),
  markdown_percent numeric(8, 4) not null default 0,
  anti_overpricing_alert boolean not null default false,
  confidence numeric(6, 5) not null default 0,
  moderation_state text not null default 'needs_review',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.ai_spoilage_predictions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  seller_id uuid references public.vendors(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  freshness_score numeric(6, 5) not null default 0,
  spoilage_probability numeric(6, 5) not null default 0,
  heat_damage_risk numeric(6, 5) not null default 0,
  sell_probability numeric(6, 5) not null default 0,
  clearance_recommendation text,
  prediction_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.ai_seller_assistance_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  seller_id uuid references public.vendors(id) on delete cascade,
  assistance_type text not null,
  title text not null,
  action text not null,
  priority text not null default 'medium',
  confidence numeric(6, 5) not null default 0,
  accepted_by_seller boolean,
  assist_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.ai_moderation_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  subject_type text not null,
  subject_id text not null,
  state text not null default 'needs_review',
  reviewer_id uuid references auth.users(id) on delete set null,
  reason text not null,
  rollback_token text,
  audit_trail jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.ai_confidence_scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  subject_type text not null,
  subject_id text not null,
  confidence_score numeric(6, 5) not null default 0,
  hallucination_risk numeric(6, 5) not null default 0,
  policy_risk numeric(6, 5) not null default 0,
  counterfeit_risk numeric(6, 5) not null default 0,
  unsafe_substitution_risk numeric(6, 5) not null default 0,
  fake_pricing_risk numeric(6, 5) not null default 0,
  thresholds jsonb not null default '{}'::jsonb,
  audit_events jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.ai_operational_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  domain text not null,
  title text not null,
  risk_level text not null,
  confidence numeric(6, 5) not null default 0,
  source text not null default 'tier4_ai_automation',
  replay_key text not null unique,
  state text not null default 'open',
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists ai_ocr_documents_seller_idx on public.ai_ocr_documents(seller_id, created_at desc);
create index if not exists ai_whatsapp_ingestion_seller_idx on public.ai_whatsapp_ingestion(seller_id, created_at desc);
create index if not exists ai_product_matches_product_idx on public.ai_product_matches(canonical_product_id, created_at desc);
create index if not exists ai_catalog_drafts_moderation_idx on public.ai_catalog_drafts(moderation_state, created_at desc);
create index if not exists ai_image_analysis_hash_idx on public.ai_image_analysis(perceptual_hash, packaging_fingerprint);
create index if not exists ai_inventory_suggestions_seller_idx on public.ai_inventory_suggestions(seller_id, state, created_at desc);
create index if not exists ai_moderation_reviews_state_idx on public.ai_moderation_reviews(state, created_at desc);
create index if not exists ai_operational_alerts_state_idx on public.ai_operational_alerts(state, risk_level, created_at desc);

alter table public.ai_catalog_drafts enable row level security;
alter table public.ai_image_analysis enable row level security;
alter table public.ai_product_matches enable row level security;
alter table public.ai_ocr_documents enable row level security;
alter table public.ai_whatsapp_ingestion enable row level security;
alter table public.ai_inventory_suggestions enable row level security;
alter table public.ai_pricing_recommendations enable row level security;
alter table public.ai_spoilage_predictions enable row level security;
alter table public.ai_seller_assistance_events enable row level security;
alter table public.ai_duplicate_clusters enable row level security;
alter table public.ai_moderation_reviews enable row level security;
alter table public.ai_confidence_scores enable row level security;
alter table public.ai_operational_alerts enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'ai_catalog_drafts',
    'ai_image_analysis',
    'ai_product_matches',
    'ai_ocr_documents',
    'ai_whatsapp_ingestion',
    'ai_inventory_suggestions',
    'ai_pricing_recommendations',
    'ai_spoilage_predictions',
    'ai_seller_assistance_events',
    'ai_duplicate_clusters',
    'ai_moderation_reviews',
    'ai_confidence_scores',
    'ai_operational_alerts'
  ]
  loop
    execute format('drop policy if exists "%s_admin_all" on public.%I', table_name, table_name);
    execute format('create policy "%s_admin_all" on public.%I for all using (public.current_user_has_role(array[''ADMIN'', ''SUPER_ADMIN'']::text[])) with check (public.current_user_has_role(array[''ADMIN'', ''SUPER_ADMIN'']::text[]))', table_name, table_name);
    execute format('drop policy if exists "%s_seller_read" on public.%I', table_name, table_name);
    execute format('create policy "%s_seller_read" on public.%I for select using (auth.role() = ''authenticated'')', table_name, table_name);
  end loop;
end $$;

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('tier4_ai_commerce_automation', 'Enables AI-native OCR, WhatsApp ingestion, image intelligence, product matching, catalog drafts, seller assistance, and human-reviewed informal commerce digitization.', true, 100, '{"roles":["SELLER","ADMIN","SUPER_ADMIN"]}')
on conflict (key) do update
set
  description = excluded.description,
  is_enabled = excluded.is_enabled,
  rollout_percentage = excluded.rollout_percentage,
  audience = excluded.audience,
  updated_at = now();
