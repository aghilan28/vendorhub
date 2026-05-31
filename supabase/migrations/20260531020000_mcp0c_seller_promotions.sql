-- MCP-0C — Seller promotions (coupons / discounts / bundles / campaigns)
-- Adds the promotions surface the Reality Audit flagged as missing, with RLS.

create extension if not exists "pgcrypto";

do $$
begin
  create type public.promotion_type as enum ('coupon', 'percent', 'flat', 'bundle');
exception when duplicate_object then null; end $$;

do $$
begin
  create type public.promotion_state as enum ('draft', 'scheduled', 'active', 'paused', 'expired');
exception when duplicate_object then null; end $$;

create table if not exists public.seller_promotions (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  code text not null,
  type public.promotion_type not null default 'percent',
  value numeric(12, 2) not null default 0,
  min_order numeric(12, 2) not null default 0,
  state public.promotion_state not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer,
  used_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, code)
);

create index if not exists seller_promotions_vendor_idx on public.seller_promotions (vendor_id);
create index if not exists seller_promotions_state_idx on public.seller_promotions (state);

create table if not exists public.seller_promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.seller_promotions(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  discount_amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists seller_promotion_redemptions_promo_idx on public.seller_promotion_redemptions (promotion_id);

alter table public.seller_promotions enable row level security;
alter table public.seller_promotion_redemptions enable row level security;

-- Active promotions are publicly readable (so checkout can apply them).
do $$
begin
  create policy "promotions_public_read_active" on public.seller_promotions
    for select using (state = 'active');
exception when duplicate_object then null; end $$;

-- Vendor members manage their own promotions.
do $$
begin
  create policy "promotions_vendor_manage" on public.seller_promotions
    for all to authenticated
    using (exists (select 1 from public.vendor_members vm where vm.vendor_id = seller_promotions.vendor_id and vm.user_id = auth.uid() and vm.deleted_at is null))
    with check (exists (select 1 from public.vendor_members vm where vm.vendor_id = seller_promotions.vendor_id and vm.user_id = auth.uid() and vm.deleted_at is null));
exception when duplicate_object then null; end $$;

do $$
begin
  create policy "promotion_redemptions_read" on public.seller_promotion_redemptions
    for select to authenticated using (true);
exception when duplicate_object then null; end $$;
