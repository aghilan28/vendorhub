-- Phase 26: performance, scalability, latency, and high-load commerce hardening.

create extension if not exists pg_stat_statements with schema extensions;

create index if not exists products_active_created_idx
  on public.products(created_at desc, id)
  where deleted_at is null and status = 'ACTIVE';

create index if not exists products_active_category_created_idx
  on public.products(category_id, created_at desc, id)
  where deleted_at is null and status = 'ACTIVE';

create index if not exists products_active_vendor_updated_idx
  on public.products(vendor_id, updated_at desc, id)
  where deleted_at is null;

create index if not exists products_active_search_quality_idx
  on public.products(search_quality_score desc, updated_at desc, id)
  where deleted_at is null and status = 'ACTIVE';

create index if not exists product_images_primary_product_idx
  on public.product_images(product_id, is_primary desc, sort_order)
  where deleted_at is null;

create index if not exists product_variants_product_active_idx
  on public.product_variants(product_id, is_active, sku)
  where deleted_at is null;

create index if not exists inventory_product_variant_stock_idx
  on public.inventory(product_id, variant_id, stock_status)
  where deleted_at is null;

create index if not exists inventory_vendor_stock_pressure_idx
  on public.inventory(vendor_id, stock_status, updated_at desc)
  where deleted_at is null;

create index if not exists inventory_movements_vendor_inventory_created_idx
  on public.inventory_movements(vendor_id, inventory_id, created_at desc);

create index if not exists cart_items_user_live_product_idx
  on public.cart_items(user_id, product_id, variant_id)
  where deleted_at is null;

create index if not exists orders_vendor_created_idx
  on public.orders(vendor_id, created_at desc, id)
  where deleted_at is null;

create index if not exists orders_buyer_created_idx
  on public.orders(buyer_id, created_at desc, id)
  where deleted_at is null;

create index if not exists orders_status_created_idx
  on public.orders(status, created_at desc, id)
  where deleted_at is null;

create index if not exists orders_payment_status_created_idx
  on public.orders(payment_status, created_at desc, id)
  where deleted_at is null;

create index if not exists orders_checkout_transaction_metadata_idx
  on public.orders((metadata ->> 'checkout_transaction_id'))
  where deleted_at is null and metadata ? 'checkout_transaction_id';

create index if not exists order_items_vendor_order_idx
  on public.order_items(vendor_id, order_id)
  where deleted_at is null;

create index if not exists order_status_history_order_created_idx
  on public.order_status_history(order_id, created_at desc);

create index if not exists notifications_vendor_created_idx
  on public.notifications(vendor_id, created_at desc)
  where deleted_at is null and vendor_id is not null;

create index if not exists notifications_recipient_created_idx
  on public.notifications(recipient_id, created_at desc)
  where deleted_at is null and recipient_id is not null;

create index if not exists notifications_admin_alert_created_idx
  on public.notifications(type, created_at desc)
  where deleted_at is null and type = 'ADMIN_ALERT';

create index if not exists audit_logs_created_idx
  on public.audit_logs(created_at desc);

create index if not exists refund_requests_state_created_idx
  on public.refund_requests(state, created_at desc);

create index if not exists transaction_integrity_alerts_state_created_idx
  on public.transaction_integrity_alerts(state, created_at desc);

create index if not exists checkout_idempotency_user_locked_idx
  on public.checkout_idempotency_keys(user_id, locked_until)
  where completed_at is null;

create index if not exists checkout_transactions_state_recovery_idx
  on public.checkout_transactions(state, recovery_after, created_at desc);

create index if not exists payment_attempts_provider_state_idx
  on public.payment_attempts(provider, state, created_at desc);

create index if not exists payment_webhook_events_processed_idx
  on public.payment_webhook_events(processed_at, created_at desc)
  where processed_at is null;

create index if not exists transaction_outbox_state_created_idx
  on public.transaction_outbox_events(state, created_at)
  where state in ('PENDING', 'FAILED');

create index if not exists deliveries_vendor_status_updated_idx
  on public.deliveries(vendor_id, status, updated_at desc);

create index if not exists deliveries_buyer_status_updated_idx
  on public.deliveries(buyer_id, status, updated_at desc);

create index if not exists deliveries_order_idx
  on public.deliveries(order_id);

create index if not exists delivery_tracking_events_delivery_created_idx
  on public.delivery_tracking_events(delivery_id, created_at desc);

create index if not exists vendors_active_location_radius_gist_idx
  on public.vendors using gist(location)
  where deleted_at is null and status = 'ACTIVE' and location is not null;

create index if not exists vendors_active_geo_sort_idx
  on public.vendors(city, locality, rating_average desc, updated_at desc)
  where deleted_at is null and status = 'ACTIVE';

create index if not exists addresses_user_default_idx
  on public.addresses(user_id, is_default desc, updated_at desc)
  where deleted_at is null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'embedding'
  ) then
    execute 'create index if not exists products_embedding_ivfflat_idx on public.products using ivfflat (embedding vector_cosine_ops) with (lists = 100) where deleted_at is null and status = ''ACTIVE'' and embedding is not null';
  end if;
end;
$$;

create table if not exists public.performance_observability_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null,
  metric text not null,
  latency_ms integer not null default 0,
  over_budget boolean not null default false,
  cache_hit boolean,
  payload_bytes integer,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists performance_observability_metric_created_idx
  on public.performance_observability_events(metric, created_at desc);

create index if not exists performance_observability_over_budget_idx
  on public.performance_observability_events(created_at desc)
  where over_budget = true;

alter table public.performance_observability_events enable row level security;

drop policy if exists "performance_observability_admin_select" on public.performance_observability_events;
create policy "performance_observability_admin_select" on public.performance_observability_events
  for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

drop policy if exists "performance_observability_authenticated_insert" on public.performance_observability_events;
create policy "performance_observability_authenticated_insert" on public.performance_observability_events
  for insert with check (auth.role() in ('anon', 'authenticated'));

create or replace function public.record_performance_event(
  event_source text,
  event_metric text,
  latency_ms integer default 0,
  over_budget boolean default false,
  cache_hit boolean default null,
  payload_bytes integer default null,
  event_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  event_id uuid;
begin
  insert into public.performance_observability_events (
    source,
    metric,
    latency_ms,
    over_budget,
    cache_hit,
    payload_bytes,
    metadata
  )
  values (
    left(coalesce(event_source, 'unknown'), 80),
    left(coalesce(event_metric, 'latency'), 120),
    greatest(coalesce(latency_ms, 0), 0),
    coalesce(over_budget, false),
    cache_hit,
    payload_bytes,
    coalesce(event_metadata, '{}'::jsonb)
  )
  returning id into event_id;

  return event_id;
end;
$$;

grant execute on function public.record_performance_event(text, text, integer, boolean, boolean, integer, jsonb) to anon, authenticated;

create or replace function public.nearby_vendors_optimized(
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
  ),
  candidates as materialized (
    select v.*
    from public.vendors v
    cross join buyer
    where v.status = 'ACTIVE'
      and v.deleted_at is null
      and v.location is not null
      and st_dwithin(v.location, buyer.location, least(greatest(radius_km, 1), 25) * 1000.0)
    order by v.location <-> buyer.location
    limit least(greatest(match_count * 3, 24), 150)
  )
  select
    c.id,
    c.name,
    c.slug,
    coalesce(c.locality, c.metadata->>'locality') as locality,
    c.city,
    st_distance(c.location, buyer.location) / 1000.0 as distance_km,
    c.delivery_radius_km,
    c.rating_average,
    case
      when st_dwithin(c.location, buyer.location, c.delivery_radius_km * 1000.0) then 'AVAILABLE'
      else 'OUTSIDE_RADIUS'
    end as service_status
  from candidates c
  cross join buyer
  order by c.location <-> buyer.location, c.rating_average desc
  limit least(greatest(match_count, 1), 60);
$$;

create or replace view public.performance_hot_indexes_admin as
select
  schemaname,
  relname,
  indexrelname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
from pg_stat_user_indexes
where schemaname = 'public'
order by idx_scan desc, idx_tup_read desc;

grant select on public.performance_hot_indexes_admin to authenticated;

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('phase_26_performance_scalability', 'Enables deterministic cache policy, scalable indexes, realtime coalescing, AI retrieval caching, and performance observability.', true, 100, '{"roles":["BUYER","SELLER","ADMIN"]}'),
  ('phase_26_pgvector_ann_indexing', 'Enables ANN indexing for active product embeddings where pgvector is available.', true, 100, '{"roles":["ADMIN","SUPER_ADMIN"]}'),
  ('phase_26_realtime_coalescing', 'Enables batched realtime invalidation and cross-tab event coalescing to prevent subscription storms.', true, 100, '{"roles":["BUYER","SELLER","ADMIN"]}')
on conflict (key) do update
set description = excluded.description,
    is_enabled = excluded.is_enabled,
    rollout_percentage = excluded.rollout_percentage,
    audience = excluded.audience,
    updated_at = now();
