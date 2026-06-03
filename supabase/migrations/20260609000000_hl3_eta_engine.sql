-- HL-3 ETA ENGINE MIGRATION

-- 1. ETA Requests
create table if not exists public.eta_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  store_id uuid not null references public.vendors(id),
  product_id uuid references public.products(id),
  buyer_latitude double precision not null,
  buyer_longitude double precision not null,
  traffic_mode text default 'normal',
  transport_mode text default 'BIKE',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 2. ETA Results
create table if not exists public.eta_results (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.eta_requests(id) on delete cascade,
  estimated_minutes integer not null,
  min_eta integer,
  max_eta integer,
  confidence numeric(4, 3),
  explanation text,
  risk_level text,
  created_at timestamptz default now()
);

-- 3. ETA Audit
create table if not exists public.eta_audit (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.eta_requests(id),
  action text not null,
  actor_id uuid references auth.users(id),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 4. ETA Intelligence
create table if not exists public.eta_intelligence (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.vendors(id),
  metric_key text not null, -- 'avg_prep_time', 'eta_accuracy'
  metric_value numeric not null,
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists eta_results_request_idx on public.eta_results(request_id);
create index if not exists eta_intelligence_store_idx on public.eta_intelligence(store_id);

-- RLS
alter table public.eta_requests enable row level security;
alter table public.eta_results enable row level security;

create policy "eta_requests_owner_read" on public.eta_requests for select using (user_id = auth.uid() or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "eta_results_owner_read" on public.eta_results for select using (
  exists (select 1 from public.eta_requests r where r.id = request_id and (r.user_id = auth.uid() or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])))
);

-- 5. ETA Versions (for historical tracking of model changes)
create table if not exists public.eta_versions (
  id uuid primary key default gen_random_uuid(),
  version_name text not null,
  is_active boolean default false,
  parameters jsonb not null,
  created_at timestamptz default now()
);

-- 6. ETA Confidence Records
create table if not exists public.eta_confidence_metrics (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.eta_results(id) on delete cascade,
  data_quality_score numeric(4, 3),
  prediction_reliability_score numeric(4, 3),
  created_at timestamptz default now()
);

-- 7. ETA Risks
create table if not exists public.eta_risks (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.eta_results(id) on delete cascade,
  risk_type text not null, -- 'TRAFFIC', 'FULFILLMENT', 'CAPACITY'
  impact_score numeric(4, 3),
  description text,
  created_at timestamptz default now()
);

-- Indexes for new tables
create index if not exists eta_confidence_result_idx on public.eta_confidence_metrics(result_id);
create index if not exists eta_risks_result_idx on public.eta_risks(result_id);

-- RLS for new tables
alter table public.eta_versions enable row level security;
alter table public.eta_confidence_metrics enable row level security;
alter table public.eta_risks enable row level security;

create policy "eta_versions_admin_read" on public.eta_versions for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "eta_confidence_owner_read" on public.eta_confidence_metrics for select using (
  exists (
    select 1 from public.eta_results res
    join public.eta_requests req on req.id = res.request_id
    where res.id = result_id and (req.user_id = auth.uid() or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]))
  )
);
create policy "eta_risks_owner_read" on public.eta_risks for select using (
  exists (
    select 1 from public.eta_results res
    join public.eta_requests req on req.id = res.request_id
    where res.id = result_id and (req.user_id = auth.uid() or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]))
  )
);
