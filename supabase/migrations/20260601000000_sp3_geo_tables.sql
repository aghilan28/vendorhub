-- SP-3 GEO LAYER COMPLETION MIGRATION
-- Required tables for Wave 2 Certification

-- 1. Store Geo Profiles
create table if not exists public.store_geo_profiles (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  location geography(point, 4326) not null,
  latitude double precision not null,
  longitude double precision not null,
  locality text,
  city text not null,
  state text,
  pincode text,
  formatted_address text,
  confidence numeric(4, 3) default 1.0,
  is_verified boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Store Coverage Profiles
create table if not exists public.store_coverage_profiles (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  geo_profile_id uuid references public.store_geo_profiles(id) on delete set null,
  radius_km numeric(6, 2) default 5.0,
  custom_boundary geography(polygon, 4326),
  excluded_pincodes text[],
  is_active boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Store Geo Clusters
create table if not exists public.store_geo_clusters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  boundary geography(polygon, 4326),
  centroid geography(point, 4326),
  density_score numeric(4, 3),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Store Geo Zones
create table if not exists public.store_geo_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  zone_type text default 'MARKETPLACE', -- e.g. DELIVERY, LOGISTICS, GOVERNANCE
  boundary geography(polygon, 4326),
  parent_zone_id uuid references public.store_geo_zones(id),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Store Pincode Registry
create table if not exists public.store_pincode_registry (
  id uuid primary key default gen_random_uuid(),
  pincode text not null,
  city text,
  state text,
  is_serviceable boolean default true,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(pincode)
);

-- 6. Store Geo Audit
create table if not exists public.store_geo_audit (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  entity_type text not null, -- e.g. 'geo_profile', 'coverage_profile'
  action text not null, -- e.g. 'CREATE', 'UPDATE', 'VERIFY'
  actor_id uuid references auth.users(id),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz default now()
);

-- 7. Store Geo Governance
create table if not exists public.store_geo_governance (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  entity_type text not null,
  policy_key text not null,
  status text not null default 'PENDING', -- e.g. 'COMPLIANT', 'NON_COMPLIANT'
  reason text,
  last_checked_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 8. Store Geo Intelligence
create table if not exists public.store_geo_intelligence (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  entity_type text not null, -- e.g. 'zone', 'cluster', 'pincode'
  metric_key text not null, -- e.g. 'demand_density', 'seller_saturation'
  metric_value numeric not null,
  context_window text, -- e.g. 'last_24h', 'realtime'
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Create updated_at triggers
create or replace function public.update_timestamp_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_store_geo_profiles_updated_at before update on public.store_geo_profiles for each row execute function public.update_timestamp_column();
create trigger update_store_coverage_profiles_updated_at before update on public.store_coverage_profiles for each row execute function public.update_timestamp_column();
create trigger update_store_geo_clusters_updated_at before update on public.store_geo_clusters for each row execute function public.update_timestamp_column();
create trigger update_store_geo_zones_updated_at before update on public.store_geo_zones for each row execute function public.update_timestamp_column();
create trigger update_store_pincode_registry_updated_at before update on public.store_pincode_registry for each row execute function public.update_timestamp_column();
