-- SP-3 GEO LAYER HARDENING & RLS
-- Required for SP-3 Certification

-- Indexes for performance
create index if not exists store_geo_profiles_vendor_idx on public.store_geo_profiles(vendor_id);
create index if not exists store_geo_profiles_location_gist_idx on public.store_geo_profiles using gist(location);
create index if not exists store_geo_profiles_city_locality_idx on public.store_geo_profiles(city, locality);
create index if not exists store_geo_profiles_pincode_idx on public.store_geo_profiles(pincode);

create index if not exists store_coverage_profiles_vendor_idx on public.store_coverage_profiles(vendor_id);
create index if not exists store_coverage_profiles_geo_profile_idx on public.store_coverage_profiles(geo_profile_id);
create index if not exists store_coverage_profiles_boundary_gist_idx on public.store_coverage_profiles using gist(custom_boundary);

create index if not exists store_geo_clusters_boundary_gist_idx on public.store_geo_clusters using gist(boundary);
create index if not exists store_geo_clusters_centroid_gist_idx on public.store_geo_clusters using gist(centroid);

create index if not exists store_geo_zones_boundary_gist_idx on public.store_geo_zones using gist(boundary);
create index if not exists store_geo_zones_parent_idx on public.store_geo_zones(parent_zone_id);

create index if not exists store_pincode_registry_city_idx on public.store_pincode_registry(city);

create index if not exists store_geo_audit_entity_idx on public.store_geo_audit(entity_type, entity_id);
create index if not exists store_geo_audit_created_at_idx on public.store_geo_audit(created_at desc);

create index if not exists store_geo_governance_entity_idx on public.store_geo_governance(entity_type, entity_id);
create index if not exists store_geo_governance_status_idx on public.store_geo_governance(status);

create index if not exists store_geo_intelligence_entity_idx on public.store_geo_intelligence(entity_type, entity_id);
create index if not exists store_geo_intelligence_metric_idx on public.store_geo_intelligence(metric_key);
create index if not exists store_geo_intelligence_created_at_idx on public.store_geo_intelligence(created_at desc);

-- Enable RLS
alter table public.store_geo_profiles enable row level security;
alter table public.store_coverage_profiles enable row level security;
alter table public.store_geo_clusters enable row level security;
alter table public.store_geo_zones enable row level security;
alter table public.store_pincode_registry enable row level security;
alter table public.store_geo_audit enable row level security;
alter table public.store_geo_governance enable row level security;
alter table public.store_geo_intelligence enable row level security;

-- RLS Policies

-- Profiles & Coverage: Owners can read/write, Admins can read/write, Public can read
create policy "store_geo_profiles_public_read" on public.store_geo_profiles for select using (true);
create policy "store_geo_profiles_owner_all" on public.store_geo_profiles
  for all using (vendor_id in (select id from public.vendors where owner_id = auth.uid()));
create policy "store_geo_profiles_admin_all" on public.store_geo_profiles
  for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create policy "store_coverage_profiles_public_read" on public.store_coverage_profiles for select using (true);
create policy "store_coverage_profiles_owner_all" on public.store_coverage_profiles
  for all using (vendor_id in (select id from public.vendors where owner_id = auth.uid()));
create policy "store_coverage_profiles_admin_all" on public.store_coverage_profiles
  for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

-- Clusters, Zones, Pincodes: Public read, Admin write
create policy "store_geo_clusters_public_read" on public.store_geo_clusters for select using (true);
create policy "store_geo_clusters_admin_all" on public.store_geo_clusters
  for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create policy "store_geo_zones_public_read" on public.store_geo_zones for select using (true);
create policy "store_geo_zones_admin_all" on public.store_geo_zones
  for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create policy "store_pincode_registry_public_read" on public.store_pincode_registry for select using (true);
create policy "store_pincode_registry_admin_all" on public.store_pincode_registry
  for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

-- Audit, Governance, Intelligence: Admin only (read/write), Owners can read their own (audit/governance)
create policy "store_geo_audit_admin_all" on public.store_geo_audit
  for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "store_geo_governance_admin_all" on public.store_geo_governance
  for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "store_geo_intelligence_admin_all" on public.store_geo_intelligence
  for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

-- Unique constraints & Integrity guarantees
alter table public.store_geo_profiles add constraint store_geo_profiles_vendor_unique unique (vendor_id);
alter table public.store_coverage_profiles add constraint store_coverage_profiles_vendor_unique unique (vendor_id);
