create extension if not exists postgis with schema extensions;

alter table public.vendors
  add column if not exists latitude numeric(10, 7),
  add column if not exists longitude numeric(10, 7),
  add column if not exists location geography(point, 4326),
  add column if not exists locality text,
  add column if not exists city text not null default 'Chennai',
  add column if not exists service_area_label text,
  add column if not exists delivery_radius_km numeric(6, 2) not null default 5,
  add column if not exists location_verified_at timestamptz;

alter table public.addresses
  add column if not exists location geography(point, 4326),
  add column if not exists delivery_instructions text,
  add column if not exists geocoding_confidence numeric(4, 3);

update public.vendors
set
  location = case
    when latitude is not null and longitude is not null then st_setsrid(st_makepoint(longitude::double precision, latitude::double precision), 4326)::geography
    else location
  end,
  delivery_radius_km = coalesce(delivery_radius_km, service_radius_km, 5)
where location is null and latitude is not null and longitude is not null;

update public.addresses
set location = st_setsrid(st_makepoint(longitude::double precision, latitude::double precision), 4326)::geography
where location is null and latitude is not null and longitude is not null;

create or replace function public.sync_vendor_location()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.location := st_setsrid(st_makepoint(new.longitude::double precision, new.latitude::double precision), 4326)::geography;
  end if;
  new.delivery_radius_km := coalesce(new.delivery_radius_km, new.service_radius_km, 5);
  return new;
end;
$$;

drop trigger if exists sync_vendor_location_before_write on public.vendors;
create trigger sync_vendor_location_before_write
before insert or update of latitude, longitude, delivery_radius_km, service_radius_km on public.vendors
for each row execute function public.sync_vendor_location();

create or replace function public.sync_address_location()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.location := st_setsrid(st_makepoint(new.longitude::double precision, new.latitude::double precision), 4326)::geography;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_address_location_before_write on public.addresses;
create trigger sync_address_location_before_write
before insert or update of latitude, longitude on public.addresses
for each row execute function public.sync_address_location();

create index if not exists vendors_location_gist_idx
  on public.vendors using gist(location)
  where deleted_at is null and status = 'ACTIVE';

create index if not exists vendors_city_locality_idx
  on public.vendors(city, locality)
  where deleted_at is null;

create index if not exists addresses_location_gist_idx
  on public.addresses using gist(location)
  where deleted_at is null;

create or replace function public.delivery_feasibility_for_vendor(
  target_vendor_id uuid,
  buyer_latitude double precision,
  buyer_longitude double precision
)
returns table (
  vendor_id uuid,
  distance_km double precision,
  radius_km double precision,
  is_deliverable boolean,
  service_status text
)
language sql
stable
set search_path = public, extensions
as $$
  with buyer as (
    select st_setsrid(st_makepoint(buyer_longitude, buyer_latitude), 4326)::geography as location
  )
  select
    v.id,
    st_distance(v.location, buyer.location) / 1000.0 as distance_km,
    v.delivery_radius_km::double precision as radius_km,
    st_dwithin(v.location, buyer.location, v.delivery_radius_km * 1000.0) as is_deliverable,
    case
      when st_dwithin(v.location, buyer.location, v.delivery_radius_km * 1000.0) then 'AVAILABLE'
      when st_dwithin(v.location, buyer.location, (v.delivery_radius_km + 1.5) * 1000.0) then 'LIMITED_EDGE'
      else 'OUTSIDE_RADIUS'
    end as service_status
  from public.vendors v
  cross join buyer
  where v.id = target_vendor_id
    and v.location is not null;
$$;

create or replace function public.nearby_vendors(
  buyer_latitude double precision,
  buyer_longitude double precision,
  radius_km double precision default 8,
  match_count integer default 24
)
returns table (
  id uuid,
  name text,
  slug text,
  locality text,
  city text,
  distance_km double precision,
  delivery_radius_km numeric,
  rating_average numeric,
  service_status text
)
language sql
stable
set search_path = public, extensions
as $$
  with buyer as (
    select st_setsrid(st_makepoint(buyer_longitude, buyer_latitude), 4326)::geography as location
  )
  select
    v.id,
    v.name,
    v.slug,
    coalesce(v.locality, v.metadata->>'locality') as locality,
    v.city,
    st_distance(v.location, buyer.location) / 1000.0 as distance_km,
    v.delivery_radius_km,
    v.rating_average,
    case
      when st_dwithin(v.location, buyer.location, v.delivery_radius_km * 1000.0) then 'AVAILABLE'
      else 'OUTSIDE_RADIUS'
    end as service_status
  from public.vendors v
  cross join buyer
  where v.status = 'ACTIVE'
    and v.deleted_at is null
    and v.location is not null
    and st_dwithin(v.location, buyer.location, radius_km * 1000.0)
  order by v.location <-> buyer.location, v.rating_average desc
  limit match_count;
$$;

create or replace function public.search_products_hyperlocal(
  query_text text,
  buyer_latitude double precision,
  buyer_longitude double precision,
  radius_km double precision default 8,
  match_count integer default 24,
  category_filter uuid default null
)
returns table (
  id uuid,
  name text,
  slug text,
  description text,
  base_price numeric,
  currency text,
  vendor_id uuid,
  category_id uuid,
  distance_km double precision,
  deliverable boolean,
  geo_score double precision,
  operational_score double precision,
  hyperlocal_score double precision
)
language sql
stable
set search_path = public, extensions
as $$
  with buyer as (
    select st_setsrid(st_makepoint(buyer_longitude, buyer_latitude), 4326)::geography as location
  ),
  candidates as (
    select
      p.id,
      p.name,
      p.slug,
      p.description,
      p.base_price,
      p.currency,
      p.vendor_id,
      p.category_id,
      st_distance(v.location, buyer.location) / 1000.0 as distance_km,
      st_dwithin(v.location, buyer.location, v.delivery_radius_km * 1000.0) as deliverable,
      greatest(0, 1 - ((st_distance(v.location, buyer.location) / 1000.0) / greatest(v.delivery_radius_km, 1))) as geo_score,
      (
        least(1, greatest(0, coalesce(i.stock_quantity - i.reserved_quantity, 0)) / 30.0) * 0.32 +
        least(1, greatest(0, v.rating_average) / 5.0) * 0.36 +
        case when v.status = 'ACTIVE' then 0.16 else 0 end +
        case when coalesce(i.stock_quantity - i.reserved_quantity, 0) > 0 then 0.16 else 0 end
      ) as operational_score,
      ts_rank_cd(p.search_document, websearch_to_tsquery('english', query_text)) as keyword_score,
      greatest(similarity(p.name, query_text), similarity(coalesce(p.description, ''), query_text)) as fuzzy_score
    from public.products p
    join public.vendors v on v.id = p.vendor_id
    left join public.inventory i on i.product_id = p.id and i.deleted_at is null
    cross join buyer
    where p.status = 'ACTIVE'
      and p.deleted_at is null
      and v.status = 'ACTIVE'
      and v.deleted_at is null
      and v.location is not null
      and st_dwithin(v.location, buyer.location, radius_km * 1000.0)
      and (category_filter is null or p.category_id = category_filter)
  )
  select
    id,
    name,
    slug,
    description,
    base_price,
    currency,
    vendor_id,
    category_id,
    distance_km,
    deliverable,
    geo_score,
    operational_score,
    (geo_score * 0.34 + operational_score * 0.28 + keyword_score * 0.2 + fuzzy_score * 0.18) as hyperlocal_score
  from candidates
  where query_text = ''
    or keyword_score > 0
    or fuzzy_score > 0.12
  order by hyperlocal_score desc, distance_km asc
  limit match_count;
$$;

create table if not exists public.geo_search_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  query text,
  buyer_location geography(point, 4326),
  radius_km numeric(6, 2),
  result_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists geo_search_events_location_gist_idx on public.geo_search_events using gist(buyer_location);
create index if not exists geo_search_events_created_at_idx on public.geo_search_events(created_at desc);

alter table public.geo_search_events enable row level security;

drop policy if exists "geo_search_events_admin_select" on public.geo_search_events;
create policy "geo_search_events_admin_select" on public.geo_search_events
  for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

drop policy if exists "geo_search_events_authenticated_insert" on public.geo_search_events;
create policy "geo_search_events_authenticated_insert" on public.geo_search_events
  for insert with check (auth.role() = 'authenticated');

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('hyperlocal_geo_discovery', 'Enables PostGIS-backed radius discovery, distance ranking, and delivery feasibility checks.', true, 100, '{"roles":["BUYER","SELLER","ADMIN"]}'),
  ('seller_service_zones', 'Enables vendor service radius configuration and coverage visibility.', true, 100, '{"roles":["SELLER","ADMIN"]}'),
  ('geo_admin_governance', 'Enables geographic marketplace density and delivery coverage oversight.', true, 100, '{"roles":["ADMIN","SUPER_ADMIN"]}')
on conflict (key) do update
set description = excluded.description,
    is_enabled = excluded.is_enabled,
    rollout_percentage = excluded.rollout_percentage,
    audience = excluded.audience,
    updated_at = now();
