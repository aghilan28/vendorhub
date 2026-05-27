create extension if not exists vector with schema extensions;
create extension if not exists pg_trgm with schema extensions;

alter table public.products
  add column if not exists embedding vector(1536),
  add column if not exists embedding_text text,
  add column if not exists embedding_model text,
  add column if not exists embedding_updated_at timestamptz,
  add column if not exists search_quality_score numeric(5, 2) not null default 0,
  add column if not exists discovery_metadata jsonb not null default '{}'::jsonb;

create index if not exists products_embedding_hnsw_idx
  on public.products
  using hnsw (embedding vector_cosine_ops)
  where embedding is not null and deleted_at is null and status = 'ACTIVE';

create index if not exists products_name_trgm_idx
  on public.products
  using gin (name extensions.gin_trgm_ops)
  where deleted_at is null;

create index if not exists products_description_trgm_idx
  on public.products
  using gin (description extensions.gin_trgm_ops)
  where deleted_at is null;

create table if not exists public.search_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  query text not null,
  corrected_query text,
  mode text not null default 'hybrid',
  result_count integer not null default 0,
  latency_ms integer not null default 0,
  fallback_used boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists search_events_created_at_idx on public.search_events(created_at desc);
create index if not exists search_events_query_trgm_idx on public.search_events using gin (query extensions.gin_trgm_ops);

alter table public.search_events enable row level security;

drop policy if exists "search_events_admin_select" on public.search_events;
create policy "search_events_admin_select" on public.search_events
  for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

drop policy if exists "search_events_authenticated_insert" on public.search_events;
create policy "search_events_authenticated_insert" on public.search_events
  for insert with check (auth.role() = 'authenticated');

create or replace function public.build_product_embedding_text(target_product_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select concat_ws(
    ' | ',
    p.name,
    p.description,
    c.name,
    v.name,
    v.metadata->>'locality',
    p.ai_index_metadata,
    p.discovery_metadata
  )
  from public.products p
  join public.categories c on c.id = p.category_id
  join public.vendors v on v.id = p.vendor_id
  where p.id = target_product_id;
$$;

create or replace function public.search_products_hybrid(
  query_text text,
  query_embedding vector(1536) default null,
  match_count integer default 24,
  category_filter uuid default null
)
returns table (
  id uuid,
  name text,
  slug text,
  description text,
  base_price numeric,
  currency text,
  vendor_id uuid,
  category_id uuid,
  semantic_score double precision,
  fuzzy_score real,
  keyword_score real,
  operational_score double precision,
  hybrid_score double precision
)
language sql
stable
set search_path = public, extensions
as $$
  with candidates as (
    select
      p.id,
      p.name,
      p.slug,
      p.description,
      p.base_price,
      p.currency,
      p.vendor_id,
      p.category_id,
      case
        when query_embedding is null or p.embedding is null then 0
        else 1 - (p.embedding <=> query_embedding)
      end as semantic_score,
      greatest(similarity(p.name, query_text), similarity(coalesce(p.description, ''), query_text)) as fuzzy_score,
      ts_rank_cd(p.search_document, websearch_to_tsquery('english', query_text)) as keyword_score,
      (
        least(1, greatest(0, coalesce(i.stock_quantity - i.reserved_quantity, 0)) / 30.0) * 0.30 +
        least(1, greatest(0, v.rating_average) / 5.0) * 0.35 +
        least(1, greatest(0, v.rating_count) / 250.0) * 0.20 +
        case when v.status = 'ACTIVE' then 0.15 else 0 end
      ) as operational_score
    from public.products p
    join public.vendors v on v.id = p.vendor_id
    left join public.inventory i on i.product_id = p.id and i.deleted_at is null
    where p.status = 'ACTIVE'
      and p.deleted_at is null
      and (category_filter is null or p.category_id = category_filter)
  )
  select
    candidates.*,
    (
      semantic_score * 0.42 +
      fuzzy_score * 0.20 +
      keyword_score * 0.18 +
      operational_score * 0.20
    ) as hybrid_score
  from candidates
  where query_text = ''
    or semantic_score > 0.18
    or fuzzy_score > 0.12
    or keyword_score > 0
  order by hybrid_score desc
  limit match_count;
$$;

create or replace function public.related_products_by_vector(
  source_product_id uuid,
  match_count integer default 8
)
returns table (
  id uuid,
  name text,
  slug text,
  similarity double precision,
  reason text
)
language sql
stable
set search_path = public, extensions
as $$
  with source as (
    select embedding, category_id from public.products where id = source_product_id
  )
  select
    p.id,
    p.name,
    p.slug,
    case when s.embedding is null or p.embedding is null then 0 else 1 - (p.embedding <=> s.embedding) end as similarity,
    case when p.category_id = s.category_id then 'Similar category and buyer intent.' else 'Related buyer need with local availability.' end as reason
  from public.products p
  cross join source s
  where p.id <> source_product_id
    and p.status = 'ACTIVE'
    and p.deleted_at is null
  order by
    (case when s.embedding is null or p.embedding is null then 0 else 1 - (p.embedding <=> s.embedding) end) desc,
    case when p.category_id = s.category_id then 1 else 0 end desc
  limit match_count;
$$;

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('ai_semantic_search', 'Enables vector-backed semantic product discovery with fuzzy fallback.', true, 100, '{"roles":["BUYER","ADMIN"]}'),
  ('seller_listing_intelligence', 'Enables seller product listing guidance and quality scoring.', true, 100, '{"roles":["SELLER","ADMIN"]}'),
  ('recommendation_intelligence', 'Enables vector-similar related products and marketplace recommendations.', true, 100, '{"roles":["BUYER"]}')
on conflict (key) do update
set
  description = excluded.description,
  is_enabled = excluded.is_enabled,
  rollout_percentage = excluded.rollout_percentage,
  audience = excluded.audience,
  updated_at = now();
