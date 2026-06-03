-- SP-3 GEO LAYER INTEGRITY FUNCTIONS
-- Required for SP-3 Certification

-- 1. Geo Profile Validation
create or replace function public.validate_store_geo_profile(target_profile_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  profile_row record;
begin
  select * into profile_row from public.store_geo_profiles where id = target_profile_id;
  if not found then return false; end if;

  -- Coordinates must be valid
  if profile_row.latitude < -90 or profile_row.latitude > 90 or
     profile_row.longitude < -180 or profile_row.longitude > 180 then
    return false;
  end if;

  -- Required fields
  if profile_row.city is null or profile_row.city = '' then
    return false;
  end if;

  return true;
end;
$$;

-- 2. Coverage Validation
create or replace function public.validate_store_coverage(target_vendor_id uuid, target_point geography(point, 4326))
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.store_coverage_profiles cp
    join public.store_geo_profiles gp on gp.vendor_id = cp.vendor_id
    where cp.vendor_id = target_vendor_id
      and cp.is_active = true
      and (
        (cp.custom_boundary is not null and st_contains(cp.custom_boundary::geometry, target_point::geometry))
        or
        (cp.custom_boundary is null and st_dwithin(gp.location, target_point, cp.radius_km * 1000))
      )
  );
$$;

-- 3. Cluster Consistency
create or replace function public.check_cluster_consistency(target_cluster_id uuid)
returns jsonb
language plpgsql
as $$
declare
  cluster_row record;
  vendor_count integer;
begin
  select * into cluster_row from public.store_geo_clusters where id = target_cluster_id;
  if not found then return jsonb_build_object('error', 'Cluster not found'); end if;

  select count(*) into vendor_count
  from public.store_geo_profiles
  where st_contains(cluster_row.boundary::geometry, location::geometry);

  return jsonb_build_object(
    'cluster_id', target_cluster_id,
    'vendor_count', vendor_count,
    'is_healthy', vendor_count > 0
  );
end;
$$;

-- 4. Zone Consistency
create or replace function public.check_zone_consistency(target_zone_id uuid)
returns jsonb
language plpgsql
as $$
declare
  zone_row record;
  subzone_count integer;
begin
  select * into zone_row from public.store_geo_zones where id = target_zone_id;
  if not found then return jsonb_build_object('error', 'Zone not found'); end if;

  select count(*) into subzone_count
  from public.store_geo_zones
  where parent_zone_id = target_zone_id;

  return jsonb_build_object(
    'zone_id', target_zone_id,
    'subzone_count', subzone_count,
    'has_boundary', zone_row.boundary is not null
  );
end;
$$;

-- 5. Governance Consistency
create or replace function public.check_geo_governance_consistency(target_entity_id uuid)
returns boolean
language sql
as $$
  select not exists (
    select 1
    from public.store_geo_governance
    where entity_id = target_entity_id
      and status = 'NON_COMPLIANT'
  );
$$;
