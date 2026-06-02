-- HL-2 HYPERLOCAL RANKING MIGRATION

-- 1. Ranking Requests
create table if not exists public.ranking_requests (
  id uuid primary key default gen_random_uuid(),
  discovery_request_id uuid references public.discovery_requests(id) on delete cascade,
  user_id uuid references auth.users(id),
  product_id uuid not null references public.products(id),
  buyer_latitude double precision not null,
  buyer_longitude double precision not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 2. Ranking Results
create table if not exists public.ranking_results (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.ranking_requests(id) on delete cascade,
  store_id uuid not null references public.vendors(id),
  rank_position integer not null,
  score numeric(6, 5) not null,
  explanation text,
  metrics_snapshot jsonb not null, -- Stores distanceScore, availabilityScore, etc.
  created_at timestamptz default now()
);

-- 3. Ranking Audit
create table if not exists public.ranking_audit (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.ranking_requests(id),
  action text not null, -- 'PROCESS', 'OVERRIDE', 'REJECT'
  actor_id uuid references auth.users(id),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 4. Ranking Intelligence
create table if not exists public.ranking_intelligence (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  entity_type text not null, -- 'product', 'vendor'
  metric_key text not null,
  metric_value numeric not null,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists ranking_results_request_idx on public.ranking_results(request_id);
create index if not exists ranking_results_store_idx on public.ranking_results(store_id);

-- RLS
alter table public.ranking_requests enable row level security;
alter table public.ranking_results enable row level security;

create policy "ranking_requests_owner_read" on public.ranking_requests for select using (user_id = auth.uid() or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "ranking_results_owner_read" on public.ranking_results for select using (
  exists (select 1 from public.ranking_requests r where r.id = request_id and (r.user_id = auth.uid() or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])))
);
