-- PI-3 AVAILABILITY ENGINE MIGRATION

-- 1. Availability Records
create table if not exists public.availability_records (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade, -- vendor_id acts as store_id
  inventory_id uuid not null references public.inventory_positions(id) on delete cascade,
  seller_id uuid not null references public.profiles(id),
  status text not null default 'AVAILABLE',
  eligibility text not null default 'PURCHASABLE',
  type text not null default 'PHYSICAL',
  source text not null default 'SYSTEM',
  confidence numeric(4, 3) default 1.0,
  lifecycle text not null default 'ACTIVE',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(product_id, vendor_id)
);

-- 2. Availability Governance
create table if not exists public.availability_governance (
  id uuid primary key default gen_random_uuid(),
  availability_id uuid not null references public.availability_records(id) on delete cascade,
  policy_key text not null,
  status text not null default 'PENDING',
  reason text,
  last_checked_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 3. Availability Audit
create table if not exists public.availability_audit (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  entity_type text not null,
  action text not null,
  actor_id uuid references auth.users(id),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz default now()
);

-- 4. Availability Intelligence
create table if not exists public.availability_intelligence (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  entity_type text not null, -- 'product', 'vendor', 'seller'
  metric_key text not null,
  metric_value numeric not null,
  context_window text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists availability_records_product_idx on public.availability_records(product_id);
create index if not exists availability_records_vendor_idx on public.availability_records(vendor_id);
create index if not exists availability_records_inventory_idx on public.availability_records(inventory_id);
create index if not exists availability_records_status_idx on public.availability_records(status);
create index if not exists availability_records_eligibility_idx on public.availability_records(eligibility);

-- RLS
alter table public.availability_records enable row level security;
alter table public.availability_governance enable row level security;

create policy "availability_records_public_read" on public.availability_records for select using (true);
create policy "availability_records_admin_all" on public.availability_records
  for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

-- Triggers
create trigger update_availability_records_updated_at before update on public.availability_records for each row execute function public.update_timestamp_column();
