create extension if not exists vector with schema extensions;

create table if not exists public.inventory_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  inventory_id uuid references public.inventory(id) on delete set null,
  seller_id uuid not null references public.vendors(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  current_stock numeric(12, 3) not null default 0,
  reserved_stock numeric(12, 3) not null default 0,
  damaged_stock numeric(12, 3) not null default 0,
  spoilage_stock numeric(12, 3) not null default 0,
  incoming_stock numeric(12, 3) not null default 0,
  freshness_score numeric(6, 5) not null default 0,
  batch_time timestamptz,
  estimated_expiry timestamptz,
  spoilage_risk numeric(6, 5) not null default 0,
  last_restocked_at timestamptz,
  reorder_threshold numeric(12, 3) not null default 0,
  predicted_sellout_time timestamptz,
  inventory_velocity numeric(10, 4) not null default 0,
  locality_demand_score numeric(6, 5) not null default 0,
  loose_inventory jsonb not null default '{}'::jsonb,
  behavioral_vector vector(384),
  temporal_vector vector(384),
  locality_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists inventory_snapshots_product_created_idx on public.inventory_snapshots(product_id, created_at desc);
create index if not exists inventory_snapshots_seller_created_idx on public.inventory_snapshots(seller_id, created_at desc);
create index if not exists inventory_snapshots_risk_idx on public.inventory_snapshots(spoilage_risk desc, locality_demand_score desc);

create table if not exists public.locality_demand_scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  locality text not null,
  city text not null,
  product_id uuid references public.products(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  hourly_score numeric(8, 5) not null default 0,
  daily_score numeric(8, 5) not null default 0,
  festival_score numeric(8, 5) not null default 0,
  climate_score numeric(8, 5) not null default 0,
  weekend_score numeric(8, 5) not null default 0,
  salary_cycle_score numeric(8, 5) not null default 0,
  demand_embedding vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists locality_demand_scores_scope_idx on public.locality_demand_scores(locality, city, coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.pricing_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  seller_id uuid not null references public.vendors(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  old_price numeric(12, 2) not null,
  recommended_price numeric(12, 2),
  new_price numeric(12, 2),
  price_delta_percent numeric(8, 4) not null default 0,
  pricing_reason text not null,
  signal_payload jsonb not null default '{}'::jsonb,
  volatility_score numeric(6, 5) not null default 0,
  manipulation_risk text not null default 'low',
  approved_by_seller boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists pricing_events_product_created_idx on public.pricing_events(product_id, created_at desc);
create index if not exists pricing_events_risk_idx on public.pricing_events(manipulation_risk, volatility_score desc);

create table if not exists public.perishability_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product_id uuid not null references public.products(id) on delete cascade,
  perishability_class text not null,
  shelf_life_hours integer not null,
  freshness_decay_rate numeric(8, 5) not null default 0,
  cold_chain_required boolean not null default false,
  heat_sensitive boolean not null default false,
  delivery_urgency_score numeric(6, 5) not null default 0,
  product_embedding vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists perishability_profiles_product_idx on public.perishability_profiles(product_id);

create table if not exists public.seller_health_scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  seller_id uuid not null references public.vendors(id) on delete cascade,
  fulfillment_reliability numeric(6, 5) not null default 0,
  stock_accuracy numeric(6, 5) not null default 0,
  delivery_timeliness numeric(6, 5) not null default 0,
  freshness_quality numeric(6, 5) not null default 0,
  reorder_pattern_score numeric(6, 5) not null default 0,
  demand_velocity numeric(10, 4) not null default 0,
  peak_operational_hours text[] not null default '{}',
  seller_health_score numeric(6, 2) not null default 0,
  risk_level text not null default 'low',
  seller_embedding vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists seller_health_scores_seller_idx on public.seller_health_scores(seller_id);

create table if not exists public.basket_affinities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  anchor_product_id uuid not null references public.products(id) on delete cascade,
  affinity_product_id uuid not null references public.products(id) on delete cascade,
  basket_type text not null,
  locality text,
  city text,
  score numeric(8, 5) not null default 0,
  evidence jsonb not null default '{}'::jsonb,
  product_affinity_embedding vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists basket_affinities_pair_scope_idx on public.basket_affinities(anchor_product_id, affinity_product_id, basket_type, coalesce(city, 'all'), coalesce(locality, 'all'));

create table if not exists public.festival_demand_curves (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  festival_key text not null,
  event_key text,
  locality text,
  city text,
  product_id uuid references public.products(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  curve jsonb not null default '{}'::jsonb,
  surge_multiplier numeric(8, 5) not null default 1,
  preparation_alert_threshold numeric(8, 5) not null default 0.7,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists festival_demand_curves_scope_idx on public.festival_demand_curves(festival_key, city, locality);

create table if not exists public.realtime_telemetry_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null,
  locality text,
  city text,
  seller_id uuid references public.vendors(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  value numeric(14, 4),
  stream_key text not null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists realtime_telemetry_events_stream_idx on public.realtime_telemetry_events(stream_key, created_at desc);
create index if not exists realtime_telemetry_events_type_created_idx on public.realtime_telemetry_events(event_type, created_at desc);

create table if not exists public.delivery_risk_scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product_id uuid references public.products(id) on delete cascade,
  seller_id uuid references public.vendors(id) on delete cascade,
  locality text not null,
  city text not null,
  eta_minutes integer not null,
  traffic_score numeric(6, 5) not null default 0,
  rain_score numeric(6, 5) not null default 0,
  locality_complexity_score numeric(6, 5) not null default 0,
  heat_sensitivity boolean not null default false,
  batching_allowed boolean not null default true,
  delivery_risk_level text not null default 'low',
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists delivery_risk_scores_scope_idx on public.delivery_risk_scores(city, locality, delivery_risk_level);

create table if not exists public.operational_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  alert_domain text not null,
  risk_level text not null,
  title text not null,
  evidence jsonb not null default '[]'::jsonb,
  recovery_suggestion text not null,
  seller_id uuid references public.vendors(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  locality text,
  city text,
  state text not null default 'OPEN',
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists operational_alerts_open_idx on public.operational_alerts(state, risk_level, created_at desc);

create table if not exists public.demand_forecasts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  forecast_for timestamptz not null,
  locality text not null,
  city text not null,
  product_id uuid references public.products(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  predicted_hourly_sales numeric(12, 4) not null default 0,
  predicted_daily_sales numeric(12, 4) not null default 0,
  demand_spike boolean not null default false,
  stock_risk text not null default 'low',
  confidence numeric(6, 5) not null default 0,
  factors jsonb not null default '[]'::jsonb,
  demand_embedding vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists demand_forecasts_scope_idx on public.demand_forecasts(city, locality, forecast_for desc);
create index if not exists demand_forecasts_product_idx on public.demand_forecasts(product_id, forecast_for desc);

create table if not exists public.spoilage_predictions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  inventory_snapshot_id uuid references public.inventory_snapshots(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  seller_id uuid not null references public.vendors(id) on delete cascade,
  freshness_score numeric(6, 5) not null default 0,
  spoilage_risk numeric(6, 5) not null default 0,
  predicted_spoilage_at timestamptz not null,
  distress_sale_recommended boolean not null default false,
  markdown_percent numeric(6, 2) not null default 0,
  delivery_urgency text not null default 'low',
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists spoilage_predictions_risk_idx on public.spoilage_predictions(spoilage_risk desc, predicted_spoilage_at);

create table if not exists public.locality_supply_pressure (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  locality text not null,
  city text not null,
  product_id uuid references public.products(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  available_supply numeric(14, 4) not null default 0,
  reserved_supply numeric(14, 4) not null default 0,
  demand_velocity numeric(14, 4) not null default 0,
  supply_pressure_score numeric(6, 5) not null default 0,
  balancing_action text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists locality_supply_pressure_scope_idx on public.locality_supply_pressure(city, locality, supply_pressure_score desc);

create table if not exists public.geo_commerce_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  locality text not null,
  city text not null,
  archetype text not null,
  demand_heat numeric(6, 5) not null default 0,
  competition_density numeric(6, 5) not null default 0,
  supply_pressure numeric(6, 5) not null default 0,
  consumption_model jsonb not null default '{}'::jsonb,
  locality_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists geo_commerce_profiles_locality_idx on public.geo_commerce_profiles(city, locality);

create table if not exists public.inventory_velocity_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  seller_id uuid not null references public.vendors(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  locality text not null,
  city text not null,
  category_id uuid references public.categories(id) on delete set null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  sales_velocity numeric(12, 5) not null default 0,
  restock_velocity numeric(12, 5) not null default 0,
  spoilage_velocity numeric(12, 5) not null default 0,
  locality_demand_velocity numeric(12, 5) not null default 0,
  operational_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists inventory_velocity_snapshots_scope_idx on public.inventory_velocity_snapshots(city, locality, product_id, window_end desc);

create table if not exists public.freshness_decay_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  product_id uuid not null references public.products(id) on delete cascade,
  perishability_class text not null,
  shelf_life_hours numeric(10, 3) not null,
  decay_curve jsonb not null default '[]'::jsonb,
  climate_adjusted_shelf_life_hours numeric(10, 3) not null,
  delivery_freshness_threshold_minutes integer not null default 60,
  heat_damage_risk numeric(6, 5) not null default 0,
  freshness_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists freshness_decay_profiles_product_idx on public.freshness_decay_profiles(product_id);

create table if not exists public.distress_pricing_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  seller_id uuid not null references public.vendors(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  locality text not null,
  city text not null,
  waste_risk_score numeric(6, 5) not null default 0,
  markdown_suggestion numeric(6, 2) not null default 0,
  clearance_urgency text not null default 'low',
  locality_demand_match_score numeric(6, 5) not null default 0,
  campaign_recommendation text,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists distress_pricing_events_idempotency_idx on public.distress_pricing_events(idempotency_key);
create index if not exists distress_pricing_events_scope_idx on public.distress_pricing_events(city, locality, clearance_urgency, created_at desc);

create table if not exists public.seller_operational_scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  seller_id uuid not null references public.vendors(id) on delete cascade,
  seller_health_score numeric(6, 2) not null default 0,
  seller_risk_score numeric(6, 2) not null default 0,
  seller_operational_grade text not null default 'C',
  seller_reliability_trend text not null default 'stable',
  fulfillment_accuracy numeric(6, 5) not null default 0,
  delivery_reliability numeric(6, 5) not null default 0,
  freshness_reliability numeric(6, 5) not null default 0,
  stock_accuracy numeric(6, 5) not null default 0,
  cancellation_rate numeric(6, 5) not null default 0,
  late_delivery_rate numeric(6, 5) not null default 0,
  seller_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists seller_operational_scores_seller_created_idx on public.seller_operational_scores(seller_id, created_at desc);

create table if not exists public.realtime_operational_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null,
  region text not null default 'south-india',
  partition_key text not null,
  idempotency_key text not null,
  sequence bigint,
  locality text,
  city text,
  seller_id uuid references public.vendors(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  replay_state text not null default 'processed',
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists realtime_operational_events_idempotency_idx on public.realtime_operational_events(idempotency_key);
create index if not exists realtime_operational_events_partition_idx on public.realtime_operational_events(partition_key, created_at desc);

create table if not exists public.demand_forecast_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  forecast_for timestamptz not null,
  locality text not null,
  city text not null,
  product_id uuid references public.products(id) on delete cascade,
  hourly_curve jsonb not null default '[]'::jsonb,
  temporal_profile jsonb not null default '{}'::jsonb,
  surge_probability numeric(6, 5) not null default 0,
  locality_demand_projection numeric(14, 4) not null default 0,
  confidence numeric(6, 5) not null default 0,
  demand_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists demand_forecast_snapshots_scope_idx on public.demand_forecast_snapshots(city, locality, forecast_for desc);

create table if not exists public.operational_alert_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  domain text not null,
  severity text not null,
  state text not null default 'open',
  title text not null,
  escalation_target text not null,
  suppression_key text not null,
  replay_key text not null,
  evidence jsonb not null default '[]'::jsonb,
  locality text,
  city text,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists operational_alert_events_replay_idx on public.operational_alert_events(replay_key);
create index if not exists operational_alert_events_state_idx on public.operational_alert_events(state, severity, created_at desc);

create table if not exists public.delivery_complexity_scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  product_id uuid references public.products(id) on delete cascade,
  seller_id uuid references public.vendors(id) on delete cascade,
  locality text not null,
  city text not null,
  traffic_score numeric(6, 5) not null default 0,
  rain_score numeric(6, 5) not null default 0,
  heat_score numeric(6, 5) not null default 0,
  apartment_complexity_score numeric(6, 5) not null default 0,
  rural_access_score numeric(6, 5) not null default 0,
  festival_congestion_score numeric(6, 5) not null default 0,
  fragility_score numeric(6, 5) not null default 0,
  perishability_score numeric(6, 5) not null default 0,
  eta_confidence numeric(6, 5) not null default 0,
  delivery_failure_probability numeric(6, 5) not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists delivery_complexity_scores_scope_idx on public.delivery_complexity_scores(city, locality, created_at desc);

create table if not exists public.geo_commerce_heatmaps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  locality text not null,
  city text not null,
  metric text not null,
  intensity numeric(6, 5) not null default 0,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  locality_vector vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists geo_commerce_heatmaps_scope_idx on public.geo_commerce_heatmaps(city, locality, metric, created_at desc);

create table if not exists public.inventory_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  inventory_id uuid references public.inventory(id) on delete set null,
  seller_id uuid not null references public.vendors(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  inventory_state text not null,
  inventory_health_score numeric(6, 2) not null default 0,
  sellout_eta_hours numeric(12, 4),
  spoilage_eta_hours numeric(12, 4),
  freshness_confidence numeric(6, 5) not null default 0,
  locality_pressure_score numeric(6, 5) not null default 0,
  operational_embedding vector(384),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists inventory_health_snapshots_scope_idx on public.inventory_health_snapshots(seller_id, product_id, created_at desc);
create index if not exists inventory_health_snapshots_state_idx on public.inventory_health_snapshots(inventory_state, inventory_health_score);

alter table public.inventory_snapshots enable row level security;
alter table public.locality_demand_scores enable row level security;
alter table public.pricing_events enable row level security;
alter table public.perishability_profiles enable row level security;
alter table public.seller_health_scores enable row level security;
alter table public.basket_affinities enable row level security;
alter table public.festival_demand_curves enable row level security;
alter table public.realtime_telemetry_events enable row level security;
alter table public.delivery_risk_scores enable row level security;
alter table public.operational_alerts enable row level security;
alter table public.demand_forecasts enable row level security;
alter table public.spoilage_predictions enable row level security;
alter table public.locality_supply_pressure enable row level security;
alter table public.geo_commerce_profiles enable row level security;
alter table public.inventory_velocity_snapshots enable row level security;
alter table public.freshness_decay_profiles enable row level security;
alter table public.distress_pricing_events enable row level security;
alter table public.seller_operational_scores enable row level security;
alter table public.realtime_operational_events enable row level security;
alter table public.demand_forecast_snapshots enable row level security;
alter table public.operational_alert_events enable row level security;
alter table public.delivery_complexity_scores enable row level security;
alter table public.geo_commerce_heatmaps enable row level security;
alter table public.inventory_health_snapshots enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'inventory_snapshots',
    'locality_demand_scores',
    'pricing_events',
    'perishability_profiles',
    'seller_health_scores',
    'basket_affinities',
    'festival_demand_curves',
    'realtime_telemetry_events',
    'delivery_risk_scores',
    'operational_alerts',
    'demand_forecasts',
    'spoilage_predictions',
    'locality_supply_pressure',
    'geo_commerce_profiles',
    'inventory_velocity_snapshots',
    'freshness_decay_profiles',
    'distress_pricing_events',
    'seller_operational_scores',
    'realtime_operational_events',
    'demand_forecast_snapshots',
    'operational_alert_events',
    'delivery_complexity_scores',
    'geo_commerce_heatmaps',
    'inventory_health_snapshots'
  ]
  loop
    execute format('drop policy if exists "%s_admin_all" on public.%I', table_name, table_name);
    execute format('create policy "%s_admin_all" on public.%I for all using (public.current_user_has_role(array[''ADMIN'', ''SUPER_ADMIN'']::text[])) with check (public.current_user_has_role(array[''ADMIN'', ''SUPER_ADMIN'']::text[]))', table_name, table_name);
    execute format('drop policy if exists "%s_seller_read" on public.%I', table_name, table_name);
    execute format('create policy "%s_seller_read" on public.%I for select using (true)', table_name, table_name);
  end loop;
end $$;

drop policy if exists "realtime_telemetry_events_authenticated_insert" on public.realtime_telemetry_events;
create policy "realtime_telemetry_events_authenticated_insert" on public.realtime_telemetry_events
  for insert with check (auth.role() = 'authenticated');

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('tier3_hyperlocal_operations', 'Enables real-time inventory, pricing, perishability, demand, delivery, seller, telemetry, and locality balancing intelligence.', true, 100, '{"roles":["SELLER","ADMIN","SUPER_ADMIN"]}')
on conflict (key) do update
set
  description = excluded.description,
  is_enabled = excluded.is_enabled,
  rollout_percentage = excluded.rollout_percentage,
  audience = excluded.audience,
  updated_at = now();
