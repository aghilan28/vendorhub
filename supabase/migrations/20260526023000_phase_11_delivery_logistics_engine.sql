create type public.delivery_mode as enum ('SELLER_SELF', 'SHIPROCKET', 'PORTER', 'DUNZO');
create type public.delivery_status as enum (
  'PENDING_DISPATCH',
  'ASSIGNED',
  'PICKUP_PENDING',
  'PICKED_UP',
  'IN_TRANSIT',
  'NEARBY',
  'DELIVERED',
  'FAILED',
  'RETURN_INITIATED',
  'RETURNED'
);

create table public.delivery_partners (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  name text not null,
  mode public.delivery_mode not null,
  service_level text not null default 'HYPERLOCAL',
  phone text,
  integration_status text not null default 'PLACEHOLDER',
  metadata jsonb not null default '{}'::jsonb
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  delivery_partner_id uuid references public.delivery_partners(id) on delete set null,
  mode public.delivery_mode not null default 'SELLER_SELF',
  status public.delivery_status not null default 'PENDING_DISPATCH',
  assigned_to text,
  assigned_phone text,
  pickup_location geography(point, 4326),
  dropoff_location geography(point, 4326),
  distance_km numeric(8, 3),
  eta_minutes integer,
  eta_confidence text not null default 'MEDIUM',
  promised_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb
);

create table public.delivery_assignments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  delivery_partner_id uuid references public.delivery_partners(id) on delete set null,
  assigned_by uuid references public.profiles(id) on delete set null,
  assignee_name text,
  assignee_phone text,
  status text not null default 'ACTIVE',
  accepted_at timestamptz,
  released_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table public.delivery_tracking_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  status public.delivery_status not null,
  event_type text not null,
  title text not null,
  body text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_type text not null default 'SYSTEM',
  location geography(point, 4326),
  location_label text,
  eta_minutes integer,
  metadata jsonb not null default '{}'::jsonb
);

create table public.shipment_metadata (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivery_id uuid not null unique references public.deliveries(id) on delete cascade,
  provider public.delivery_mode not null,
  external_shipment_id text,
  external_tracking_reference text,
  external_tracking_url text,
  sync_status text not null default 'PENDING',
  last_synced_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

create table public.delivery_eta_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  eta_minutes integer not null,
  confidence text not null default 'MEDIUM',
  reason text,
  distance_km numeric(8, 3),
  traffic_factor text,
  metadata jsonb not null default '{}'::jsonb
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['delivery_partners', 'deliveries', 'delivery_assignments', 'shipment_metadata']
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

create or replace function public.is_valid_delivery_transition(from_status public.delivery_status, to_status public.delivery_status)
returns boolean
language sql
immutable
as $$
  select case from_status
    when 'PENDING_DISPATCH' then to_status in ('ASSIGNED', 'FAILED')
    when 'ASSIGNED' then to_status in ('PICKUP_PENDING', 'FAILED')
    when 'PICKUP_PENDING' then to_status in ('PICKED_UP', 'FAILED')
    when 'PICKED_UP' then to_status in ('IN_TRANSIT', 'FAILED')
    when 'IN_TRANSIT' then to_status in ('NEARBY', 'FAILED')
    when 'NEARBY' then to_status in ('DELIVERED', 'FAILED')
    when 'DELIVERED' then to_status in ('RETURN_INITIATED')
    when 'FAILED' then to_status in ('PENDING_DISPATCH', 'RETURN_INITIATED')
    when 'RETURN_INITIATED' then to_status in ('RETURNED')
    when 'RETURNED' then false
    else false
  end;
$$;

create or replace function public.enforce_delivery_transition()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    if not public.is_valid_delivery_transition(old.status, new.status) then
      raise exception 'Invalid delivery transition from % to %', old.status, new.status;
    end if;
    if new.status = 'DELIVERED' then
      new.delivered_at := coalesce(new.delivered_at, now());
    elsif new.status = 'FAILED' then
      new.failed_at := coalesce(new.failed_at, now());
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_delivery_transition_before_update on public.deliveries;
create trigger enforce_delivery_transition_before_update
before update of status on public.deliveries
for each row execute function public.enforce_delivery_transition();

create index delivery_partners_mode_idx on public.delivery_partners(mode) where deleted_at is null;
create index deliveries_order_id_idx on public.deliveries(order_id);
create index deliveries_vendor_status_idx on public.deliveries(vendor_id, status);
create index deliveries_buyer_status_idx on public.deliveries(buyer_id, status);
create index deliveries_pickup_location_gist_idx on public.deliveries using gist(pickup_location);
create index deliveries_dropoff_location_gist_idx on public.deliveries using gist(dropoff_location);
create index delivery_tracking_events_delivery_created_idx on public.delivery_tracking_events(delivery_id, created_at desc);
create index delivery_tracking_events_location_gist_idx on public.delivery_tracking_events using gist(location);
create index delivery_assignments_delivery_idx on public.delivery_assignments(delivery_id, status);
create index shipment_metadata_provider_idx on public.shipment_metadata(provider, sync_status);
create index delivery_eta_logs_delivery_created_idx on public.delivery_eta_logs(delivery_id, created_at desc);

alter table public.delivery_partners enable row level security;
alter table public.deliveries enable row level security;
alter table public.delivery_assignments enable row level security;
alter table public.delivery_tracking_events enable row level security;
alter table public.shipment_metadata enable row level security;
alter table public.delivery_eta_logs enable row level security;

create policy "delivery_partners_authenticated_select" on public.delivery_partners for select using (auth.role() = 'authenticated');
create policy "delivery_partners_admin_all" on public.delivery_partners for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create policy "deliveries_buyer_vendor_admin_select" on public.deliveries for select using (
  buyer_id = auth.uid()
  or public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);
create policy "deliveries_vendor_admin_write" on public.deliveries for all using (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
) with check (
  public.current_user_is_vendor_member(vendor_id)
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);

create policy "delivery_assignments_party_select" on public.delivery_assignments for select using (
  exists (
    select 1 from public.deliveries d
    where d.id = delivery_id
      and (d.buyer_id = auth.uid() or public.current_user_is_vendor_member(d.vendor_id) or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]))
  )
);
create policy "delivery_assignments_vendor_admin_write" on public.delivery_assignments for all using (
  exists (select 1 from public.deliveries d where d.id = delivery_id and (public.current_user_is_vendor_member(d.vendor_id) or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])))
) with check (
  exists (select 1 from public.deliveries d where d.id = delivery_id and (public.current_user_is_vendor_member(d.vendor_id) or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])))
);

create policy "delivery_events_party_select" on public.delivery_tracking_events for select using (
  exists (
    select 1 from public.deliveries d
    where d.id = delivery_id
      and (d.buyer_id = auth.uid() or public.current_user_is_vendor_member(d.vendor_id) or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]))
  )
);
create policy "delivery_events_vendor_admin_insert" on public.delivery_tracking_events for insert with check (
  exists (select 1 from public.deliveries d where d.id = delivery_id and (public.current_user_is_vendor_member(d.vendor_id) or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])))
);

create policy "shipment_metadata_party_select" on public.shipment_metadata for select using (
  exists (
    select 1 from public.deliveries d
    where d.id = delivery_id
      and (d.buyer_id = auth.uid() or public.current_user_is_vendor_member(d.vendor_id) or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]))
  )
);
create policy "shipment_metadata_vendor_admin_write" on public.shipment_metadata for all using (
  exists (select 1 from public.deliveries d where d.id = delivery_id and (public.current_user_is_vendor_member(d.vendor_id) or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])))
) with check (
  exists (select 1 from public.deliveries d where d.id = delivery_id and (public.current_user_is_vendor_member(d.vendor_id) or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])))
);

create policy "delivery_eta_logs_party_select" on public.delivery_eta_logs for select using (
  exists (
    select 1 from public.deliveries d
    where d.id = delivery_id
      and (d.buyer_id = auth.uid() or public.current_user_is_vendor_member(d.vendor_id) or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]))
  )
);
create policy "delivery_eta_logs_vendor_admin_insert" on public.delivery_eta_logs for insert with check (
  exists (select 1 from public.deliveries d where d.id = delivery_id and (public.current_user_is_vendor_member(d.vendor_id) or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])))
);

alter publication supabase_realtime add table public.deliveries;
alter publication supabase_realtime add table public.delivery_tracking_events;
alter publication supabase_realtime add table public.delivery_assignments;

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('delivery_logistics_engine', 'Enables delivery lifecycle, tracking timelines, dispatch queues, and ETA infrastructure.', true, 100, '{"roles":["BUYER","SELLER","ADMIN"]}'),
  ('shiprocket_integration_architecture', 'Enables Shiprocket shipment creation and tracking sync placeholders.', true, 100, '{"roles":["SELLER","ADMIN"]}'),
  ('self_delivery_workflows', 'Enables seller-managed local delivery updates and completion confirmation.', true, 100, '{"roles":["SELLER"]}')
on conflict (key) do update
set description = excluded.description,
    is_enabled = excluded.is_enabled,
    rollout_percentage = excluded.rollout_percentage,
    audience = excluded.audience,
    updated_at = now();
