-- Phase 21: live AI activation, embedding synchronization, and retrieval observability.

create extension if not exists vector with schema extensions;
create extension if not exists pg_trgm with schema extensions;

alter table public.products
  add column if not exists embedding_refresh_state text not null default 'STALE',
  add column if not exists embedding_refresh_error text,
  add column if not exists embedding_refresh_requested_at timestamptz not null default now();

create index if not exists products_embedding_refresh_idx
  on public.products(embedding_refresh_state, embedding_refresh_requested_at)
  where deleted_at is null and status = 'ACTIVE';

create index if not exists products_search_quality_idx
  on public.products(search_quality_score desc, updated_at desc)
  where deleted_at is null and status = 'ACTIVE';

create table if not exists public.ai_retrieval_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  query text,
  locale text,
  retrieval_mode text not null,
  candidate_count integer not null default 0,
  result_count integer not null default 0,
  latency_ms integer not null default 0,
  fallback_used boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists ai_retrieval_events_created_idx on public.ai_retrieval_events(created_at desc);
create index if not exists ai_retrieval_events_mode_idx on public.ai_retrieval_events(retrieval_mode, created_at desc);
create index if not exists ai_retrieval_events_query_trgm_idx on public.ai_retrieval_events using gin (query extensions.gin_trgm_ops);

alter table public.ai_retrieval_events enable row level security;

drop policy if exists "ai_retrieval_events_admin_select" on public.ai_retrieval_events;
create policy "ai_retrieval_events_admin_select" on public.ai_retrieval_events
  for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

drop policy if exists "ai_retrieval_events_authenticated_insert" on public.ai_retrieval_events;
create policy "ai_retrieval_events_authenticated_insert" on public.ai_retrieval_events
  for insert with check (auth.role() in ('anon', 'authenticated'));

create or replace function public.mark_product_embedding_stale()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
    or old.name is distinct from new.name
    or old.description is distinct from new.description
    or old.category_id is distinct from new.category_id
    or old.ai_index_metadata is distinct from new.ai_index_metadata
    or old.discovery_metadata is distinct from new.discovery_metadata
    or old.status is distinct from new.status
  then
    new.embedding_refresh_state := 'STALE';
    new.embedding_refresh_error := null;
    new.embedding_refresh_requested_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists products_mark_embedding_stale on public.products;
create trigger products_mark_embedding_stale
before insert or update on public.products
for each row execute function public.mark_product_embedding_stale();

create or replace function public.record_ai_retrieval_event(
  event_type text,
  query_text text default null,
  query_locale text default 'en',
  retrieval_mode text default 'hybrid',
  candidate_count integer default 0,
  result_count integer default 0,
  latency_ms integer default 0,
  fallback_used boolean default false,
  event_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  event_id uuid;
begin
  insert into public.ai_retrieval_events (
    user_id,
    event_type,
    query,
    locale,
    retrieval_mode,
    candidate_count,
    result_count,
    latency_ms,
    fallback_used,
    metadata
  )
  values (
    auth.uid(),
    left(coalesce(event_type, 'search'), 80),
    left(query_text, 500),
    left(coalesce(query_locale, 'en'), 16),
    left(coalesce(retrieval_mode, 'hybrid'), 80),
    greatest(candidate_count, 0),
    greatest(result_count, 0),
    greatest(latency_ms, 0),
    fallback_used,
    coalesce(event_metadata, '{}'::jsonb)
  )
  returning id into event_id;

  return event_id;
end;
$$;

grant execute on function public.record_ai_retrieval_event(text, text, text, text, integer, integer, integer, boolean, jsonb) to anon, authenticated;

create or replace view public.ai_embedding_freshness_admin as
select
  p.id,
  p.name,
  p.slug,
  p.updated_at,
  p.embedding_model,
  p.embedding_updated_at,
  p.embedding_refresh_state,
  p.embedding_refresh_requested_at,
  p.embedding_refresh_error,
  p.search_quality_score,
  case
    when p.embedding is null then 'missing'
    when p.embedding_updated_at is null then 'missing'
    when p.embedding_updated_at < p.updated_at then 'stale'
    when p.embedding_updated_at < now() - interval '72 hours' then 'aging'
    else 'fresh'
  end as freshness_state
from public.products p
where p.deleted_at is null;

grant select on public.ai_embedding_freshness_admin to authenticated;
