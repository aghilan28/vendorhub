-- HL-1 NEARBY DISCOVERY MIGRATION

-- 1. Discovery Requests
create table if not exists public.discovery_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  query text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius_km numeric(6, 2) default 8.0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 2. Discovery Results (Snapshot of what was shown to user)
create table if not exists public.discovery_results (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.discovery_requests(id) on delete cascade,
  product_id uuid not null references public.products(id),
  store_count integer not null default 0,
  best_distance_km numeric(10, 3),
  results_data jsonb not null, -- Stores the StoreResult array
  created_at timestamptz default now()
);

-- 3. Discovery Audit
create table if not exists public.discovery_audit (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.discovery_requests(id),
  action text not null, -- e.g. 'SEARCH', 'FILTER', 'CLICK'
  actor_id uuid references auth.users(id),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 4. Discovery Intelligence
create table if not exists public.discovery_intelligence (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  entity_type text not null, -- 'product', 'zone'
  metric_key text not null,
  metric_value numeric not null,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists discovery_requests_user_idx on public.discovery_requests(user_id);
create index if not exists discovery_requests_created_at_idx on public.discovery_requests(created_at desc);
create index if not exists discovery_results_request_idx on public.discovery_results(request_id);

-- RLS
alter table public.discovery_requests enable row level security;
alter table public.discovery_results enable row level security;

create policy "discovery_requests_owner_read" on public.discovery_requests for select using (user_id = auth.uid() or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "discovery_requests_owner_insert" on public.discovery_requests for insert with check (user_id = auth.uid());

create policy "discovery_results_owner_read" on public.discovery_results for select using (
  exists (select 1 from public.discovery_requests r where r.id = request_id and (r.user_id = auth.uid() or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])))
);
