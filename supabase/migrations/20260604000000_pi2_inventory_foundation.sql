-- PI-2 INVENTORY FOUNDATION MIGRATION

-- 1. Inventory Positions
create table if not exists public.inventory_positions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  seller_id uuid not null references public.profiles(id),
  sku text not null,
  on_hand integer not null default 0 check (on_hand >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  allocated integer not null default 0 check (allocated >= 0),
  incoming integer not null default 0 check (incoming >= 0),
  damaged integer not null default 0 check (damaged >= 0),
  returned integer not null default 0 check (returned >= 0),
  safety_stock integer not null default 5 check (safety_stock >= 0),
  reorder_threshold integer not null default 10 check (reorder_threshold >= 0),
  reorder_quantity integer not null default 20 check (reorder_quantity >= 0),
  status text not null default 'ACTIVE',
  type text not null default 'PHYSICAL',
  lifecycle_status text not null default 'CREATED',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(product_id, vendor_id),
  check (reserved + allocated <= on_hand)
);

-- 2. Inventory Events
create table if not exists public.inventory_events (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventory_positions(id) on delete cascade,
  event_type text not null,
  delta integer not null,
  after_quantity integer not null,
  reason text,
  actor_id uuid references public.profiles(id),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 3. Inventory Governance
create table if not exists public.inventory_governance (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventory_positions(id) on delete cascade,
  issue_type text not null,
  severity text not null default 'WARNING',
  status text not null default 'OPEN',
  resolved_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 4. Inventory Intelligence
create table if not exists public.inventory_intelligence (
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
create index if not exists inventory_positions_product_idx on public.inventory_positions(product_id);
create index if not exists inventory_positions_vendor_idx on public.inventory_positions(vendor_id);
create index if not exists inventory_events_inventory_idx on public.inventory_events(inventory_id);
create index if not exists inventory_governance_inventory_idx on public.inventory_governance(inventory_id);

-- RLS
alter table public.inventory_positions enable row level security;
alter table public.inventory_events enable row level security;

create policy "inventory_positions_public_read" on public.inventory_positions for select using (true);
create policy "inventory_positions_admin_all" on public.inventory_positions
  for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create policy "inventory_events_party_read" on public.inventory_events for select using (
  exists (select 1 from public.inventory_positions p where p.id = inventory_id and (p.seller_id = auth.uid() or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])))
);

-- Triggers
create trigger update_inventory_positions_updated_at before update on public.inventory_positions for each row execute function public.update_timestamp_column();
