create extension if not exists pg_trgm with schema extensions;
create extension if not exists vector with schema extensions;

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

create index if not exists products_search_tokens_gin_idx on public.products using gin (search_tokens);
create index if not exists products_transliteration_tokens_gin_idx on public.products using gin (transliteration_tokens);
create index if not exists products_voice_tokens_gin_idx on public.products using gin (voice_tokens);
create index if not exists products_intent_tags_gin_idx on public.products using gin (intent_tags);
create index if not exists products_vector_index_key_idx on public.products(vector_index_key) where deleted_at is null;

create table if not exists public.search_tokens (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product_id uuid not null references public.products(id) on delete cascade,
  token text not null,
  token_type text not null check (token_type in ('search', 'phonetic', 'fuzzy', 'transliteration', 'voice', 'recipe', 'festival', 'context')),
  language text not null default 'en',
  weight numeric(5, 4) not null default 1,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists search_tokens_product_token_type_idx on public.search_tokens(product_id, token, token_type, language);
create index if not exists search_tokens_token_trgm_idx on public.search_tokens using gin (token extensions.gin_trgm_ops);
create index if not exists search_tokens_type_language_idx on public.search_tokens(token_type, language);

create table if not exists public.transliteration_maps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_text text not null,
  canonical_text text not null,
  source_language text not null,
  target_language text not null default 'en',
  phonetic_key text not null,
  confidence numeric(5, 4) not null default 0.8,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists transliteration_maps_source_target_idx on public.transliteration_maps(source_text, source_language, target_language);
create index if not exists transliteration_maps_source_trgm_idx on public.transliteration_maps using gin (source_text extensions.gin_trgm_ops);

create table if not exists public.slang_aliases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  canonical_term text not null,
  alias text not null,
  language text not null default 'romanized',
  region text,
  semantic_group text not null,
  intent_tags text[] not null default '{}',
  confidence numeric(5, 4) not null default 0.85,
  approved boolean not null default true,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists slang_aliases_alias_region_idx on public.slang_aliases(alias, coalesce(region, 'all'), language);
create index if not exists slang_aliases_alias_trgm_idx on public.slang_aliases using gin (alias extensions.gin_trgm_ops);
create index if not exists slang_aliases_semantic_group_idx on public.slang_aliases(semantic_group);

create table if not exists public.product_affinities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_product_id uuid not null references public.products(id) on delete cascade,
  target_product_id uuid not null references public.products(id) on delete cascade,
  affinity_type text not null check (affinity_type in ('frequently_bought_together', 'recipe', 'substitute', 'basket', 'regional_combo')),
  region text,
  score numeric(6, 5) not null default 0,
  evidence jsonb not null default '{}'::jsonb
);

create unique index if not exists product_affinities_pair_type_idx on public.product_affinities(source_product_id, target_product_id, affinity_type, coalesce(region, 'all'));

create table if not exists public.recipe_mappings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  recipe_key text not null,
  recipe_name text not null,
  language text not null default 'en',
  region text,
  required_terms text[] not null default '{}',
  optional_terms text[] not null default '{}',
  product_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists recipe_mappings_key_region_language_idx on public.recipe_mappings(recipe_key, coalesce(region, 'all'), language);

create table if not exists public.festival_tags (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  festival_key text not null,
  region text,
  product_id uuid references public.products(id) on delete cascade,
  tag text not null,
  demand_window tstzrange,
  boost_weight numeric(5, 4) not null default 0.25,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists festival_tags_festival_region_idx on public.festival_tags(festival_key, coalesce(region, 'all'));
create index if not exists festival_tags_window_idx on public.festival_tags using gist (demand_window);

create table if not exists public.locality_product_scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product_id uuid not null references public.products(id) on delete cascade,
  locality text not null,
  city text not null,
  popularity_score numeric(6, 5) not null default 0,
  freshness_score numeric(6, 5) not null default 0,
  availability_score numeric(6, 5) not null default 0,
  seasonal_score numeric(6, 5) not null default 0,
  demand_velocity numeric(8, 4) not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists locality_product_scores_product_locality_idx on public.locality_product_scores(product_id, locality, city);

create table if not exists public.seller_discovery_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  locality text,
  city text,
  seller_quality_score numeric(6, 5) not null default 0,
  freshness_score numeric(6, 5) not null default 0,
  delivery_speed_score numeric(6, 5) not null default 0,
  stock_reliability_score numeric(6, 5) not null default 0,
  locality_reputation_score numeric(6, 5) not null default 0,
  image_quality_score numeric(6, 5) not null default 0,
  pricing_consistency_score numeric(6, 5) not null default 0,
  operating_windows jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists seller_discovery_profiles_vendor_idx on public.seller_discovery_profiles(vendor_id);

create table if not exists public.seasonal_product_boosts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product_id uuid not null references public.products(id) on delete cascade,
  season_key text not null,
  region text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  boost_weight numeric(5, 4) not null default 0.2,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists seasonal_product_boosts_active_idx on public.seasonal_product_boosts(starts_at, ends_at, season_key);

create table if not exists public.search_analytics (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  query text not null,
  normalized_query text not null,
  language text[] not null default '{}',
  intents text[] not null default '{}',
  locality text,
  city text,
  result_count integer not null default 0,
  clicked_product_id uuid references public.products(id) on delete set null,
  abandoned boolean not null default false,
  voice_like boolean not null default false,
  slang_detected boolean not null default false,
  multilingual boolean not null default false,
  latency_ms integer not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists search_analytics_created_at_idx on public.search_analytics(created_at desc);
create index if not exists search_analytics_query_trgm_idx on public.search_analytics using gin (query extensions.gin_trgm_ops);
create index if not exists search_analytics_locality_idx on public.search_analytics(city, locality);

create table if not exists public.failed_search_queries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  query text not null,
  normalized_query text not null,
  language text[] not null default '{}',
  locality text,
  city text,
  failure_reason text not null default 'no_results',
  missing_product_candidates text[] not null default '{}',
  alias_suggestions jsonb not null default '[]'::jsonb,
  occurrence_count integer not null default 1,
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists failed_search_queries_scope_idx on public.failed_search_queries(normalized_query, coalesce(city, 'all'), coalesce(locality, 'all'));

create table if not exists public.autocomplete_terms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  term text not null,
  normalized_term text not null,
  language text not null default 'en',
  term_type text not null check (term_type in ('product', 'alias', 'recipe', 'festival', 'locality', 'seller', 'context')),
  locality text,
  city text,
  weight numeric(8, 4) not null default 1,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists autocomplete_terms_scope_idx on public.autocomplete_terms(normalized_term, language, term_type, coalesce(city, 'all'), coalesce(locality, 'all'));
create index if not exists autocomplete_terms_trgm_idx on public.autocomplete_terms using gin (normalized_term extensions.gin_trgm_ops);

create table if not exists public.geo_product_indexes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product_id uuid not null references public.products(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  locality text not null,
  city text not null,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  service_radius_km numeric(6, 2) not null default 5,
  delivery_eta_minutes integer,
  stock_available integer not null default 0,
  perishability_class text not null default 'ambient',
  freshness_score numeric(6, 5) not null default 0,
  routing_metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists geo_product_indexes_product_vendor_idx on public.geo_product_indexes(product_id, vendor_id);
create index if not exists geo_product_indexes_locality_idx on public.geo_product_indexes(city, locality);

create table if not exists public.contextual_ranking_signals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product_id uuid not null references public.products(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete cascade,
  signal_key text not null,
  signal_scope text not null check (signal_scope in ('time', 'festival', 'weather', 'locality', 'seller', 'basket', 'perishability', 'behavioral')),
  locality text,
  city text,
  starts_at timestamptz,
  ends_at timestamptz,
  score numeric(6, 5) not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists contextual_ranking_signals_lookup_idx on public.contextual_ranking_signals(signal_scope, signal_key, city, locality);
create index if not exists contextual_ranking_signals_product_idx on public.contextual_ranking_signals(product_id, signal_scope);

alter table public.search_tokens enable row level security;
alter table public.transliteration_maps enable row level security;
alter table public.slang_aliases enable row level security;
alter table public.product_affinities enable row level security;
alter table public.recipe_mappings enable row level security;
alter table public.festival_tags enable row level security;
alter table public.locality_product_scores enable row level security;
alter table public.seller_discovery_profiles enable row level security;
alter table public.seasonal_product_boosts enable row level security;
alter table public.search_analytics enable row level security;
alter table public.failed_search_queries enable row level security;
alter table public.autocomplete_terms enable row level security;
alter table public.geo_product_indexes enable row level security;
alter table public.contextual_ranking_signals enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'search_tokens',
    'transliteration_maps',
    'slang_aliases',
    'product_affinities',
    'recipe_mappings',
    'festival_tags',
    'locality_product_scores',
    'seller_discovery_profiles',
    'seasonal_product_boosts',
    'search_analytics',
    'failed_search_queries',
    'autocomplete_terms',
    'geo_product_indexes',
    'contextual_ranking_signals'
  ]
  loop
    execute format('drop policy if exists "%s_admin_all" on public.%I', table_name, table_name);
    execute format('create policy "%s_admin_all" on public.%I for all using (public.current_user_has_role(array[''ADMIN'', ''SUPER_ADMIN'']::text[])) with check (public.current_user_has_role(array[''ADMIN'', ''SUPER_ADMIN'']::text[]))', table_name, table_name);
    execute format('drop policy if exists "%s_public_read" on public.%I', table_name, table_name);
    execute format('create policy "%s_public_read" on public.%I for select using (true)', table_name, table_name);
  end loop;
end $$;

drop policy if exists "search_analytics_authenticated_insert" on public.search_analytics;
create policy "search_analytics_authenticated_insert" on public.search_analytics
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "failed_search_queries_authenticated_insert" on public.failed_search_queries;
create policy "failed_search_queries_authenticated_insert" on public.failed_search_queries
  for insert with check (auth.role() = 'authenticated');

insert into public.slang_aliases (canonical_term, alias, language, region, semantic_group, intent_tags, confidence)
values
  ('coriander', 'malli', 'ta', 'Tamil Nadu', 'herbs', array['recipe'], 0.95),
  ('coriander', 'kothamalli', 'romanized', 'Tamil Nadu', 'herbs', array['recipe'], 0.96),
  ('small onion', 'sambar onion', 'en', 'South India', 'onion', array['recipe'], 0.97),
  ('small onion', 'chinna vengayam', 'romanized', 'Tamil Nadu', 'onion', array['recipe'], 0.97),
  ('dosa batter', 'amma dosa maavu', 'romanized', 'Tamil Nadu', 'breakfast', array['time_window', 'recipe'], 0.92),
  ('pooja flowers', 'malligai', 'romanized', 'Tamil Nadu', 'pooja', array['pooja', 'festival', 'freshness'], 0.91),
  ('tea snacks', 'tea kadai snacks', 'romanized', 'South India', 'snacks', array['time_window'], 0.9),
  ('fish fry items', 'meen varuval', 'romanized', 'Tamil Nadu', 'seafood', array['recipe', 'freshness'], 0.89)
on conflict do nothing;

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('tier2_hyperlocal_discovery', 'Enables South Indian hyperlocal multilingual discovery, slang resolution, geo/time/festival ranking, and search learning.', true, 100, '{"roles":["BUYER","ADMIN","SELLER"]}')
on conflict (key) do update
set
  description = excluded.description,
  is_enabled = excluded.is_enabled,
  rollout_percentage = excluded.rollout_percentage,
  audience = excluded.audience,
  updated_at = now();
