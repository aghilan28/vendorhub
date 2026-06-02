-- PI-1 COMMERCE GRAPH ACTIVATION MIGRATION

-- 1. Product Store Links
create table if not exists public.product_store_links (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade, -- vendor_id acts as store_id
  seller_id uuid not null references public.profiles(id),
  status text not null default 'APPROVED',
  source text not null default 'MANUAL',
  confidence numeric(4, 3) default 1.0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(product_id, vendor_id)
);

-- 2. Store Catalogs (View or Materialized Table)
create table if not exists public.store_catalogs (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  health_score numeric(4, 3) default 0.0,
  intelligence_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(vendor_id)
);

-- 3. Relationship Approvals
create table if not exists public.catalog_relationship_approvals (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.product_store_links(id) on delete cascade,
  approver_id uuid references public.profiles(id),
  status text not null,
  notes text,
  created_at timestamptz default now()
);

-- 4. Catalog Audit
create table if not exists public.catalog_audit (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  entity_type text not null,
  action text not null,
  actor_id uuid references auth.users(id),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists product_store_links_product_idx on public.product_store_links(product_id);
create index if not exists product_store_links_vendor_idx on public.product_store_links(vendor_id);
create index if not exists product_store_links_status_idx on public.product_store_links(status);

-- RLS
alter table public.product_store_links enable row level security;
alter table public.store_catalogs enable row level security;

create policy "product_store_links_public_read" on public.product_store_links for select using (true);
create policy "product_store_links_admin_all" on public.product_store_links
  for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create policy "store_catalogs_public_read" on public.store_catalogs for select using (true);
create policy "store_catalogs_admin_all" on public.store_catalogs
  for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

-- Triggers for updated_at
create trigger update_product_store_links_updated_at before update on public.product_store_links for each row execute function public.update_timestamp_column();
create trigger update_store_catalogs_updated_at before update on public.store_catalogs for each row execute function public.update_timestamp_column();
