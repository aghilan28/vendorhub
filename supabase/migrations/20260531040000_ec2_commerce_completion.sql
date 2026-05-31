-- EC-2 Commerce Completion
-- Adds: store-credit/wallet ledger, seller payout ledger + payout records (mandated statuses),
-- review reports, seller review responses, shipments. All RLS-scoped. Idempotent.

-- ── Payout status + ledger ─────────────────────────────────────────────────────
do $$ begin
  create type public.ec2_payout_status as enum ('PENDING','PROCESSING','SETTLED','FAILED','REVERSED');
exception when duplicate_object then null; end $$;

create table if not exists public.seller_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.vendors(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  entry_type text not null check (entry_type in ('SALE','COMMISSION','REFUND_ADJUSTMENT','PAYOUT','REVERSAL','ADJUSTMENT')),
  amount bigint not null,
  balance_after bigint not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists seller_ledger_seller_idx on public.seller_ledger_entries (seller_id);

create table if not exists public.seller_payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.vendors(id) on delete cascade,
  status public.ec2_payout_status not null default 'PENDING',
  gross_amount bigint not null default 0,
  commission bigint not null default 0,
  refund_adjustments bigint not null default 0,
  net_amount bigint not null default 0,
  reference text not null,
  failure_reason text,
  initiated_at timestamptz not null default now(),
  settled_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists seller_payouts_seller_idx on public.seller_payouts (seller_id);
create index if not exists seller_payouts_status_idx on public.seller_payouts (status);

-- ── Store credit / wallet ledger ───────────────────────────────────────────────
create table if not exists public.store_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  amount bigint not null,
  balance_after bigint not null,
  source text not null check (source in ('refund','redemption','adjustment','promotion')),
  refund_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists store_credit_customer_idx on public.store_credit_ledger (customer_id);

-- ── Refunds (modes) ────────────────────────────────────────────────────────────
do $$ begin
  create type public.ec2_refund_mode as enum ('full','partial','wallet','store_credit');
exception when duplicate_object then null; end $$;

create table if not exists public.commerce_refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  customer_id uuid references public.profiles(id) on delete set null,
  mode public.ec2_refund_mode not null,
  order_total bigint not null,
  amount bigint not null,
  state text not null default 'INITIATED' check (state in ('INITIATED','PROCESSING','COMPLETED','FAILED')),
  gateway_reference text,
  wallet_credited boolean not null default false,
  reason text not null default '',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists commerce_refunds_order_idx on public.commerce_refunds (order_id);

-- ── Review reports + seller responses ────────────────────────────────────────────
create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index if not exists review_reports_review_idx on public.review_reports (review_id);

create table if not exists public.review_responses (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  unique (review_id)
);

-- ── Shipments ────────────────────────────────────────────────────────────────────
create table if not exists public.commerce_shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  provider text not null check (provider in ('shiprocket','delhivery','porter','local')),
  status text not null default 'CREATED',
  tracking_number text,
  awb text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists commerce_shipments_order_idx on public.commerce_shipments (order_id);

create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.commerce_shipments(id) on delete cascade,
  status text not null,
  location text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists shipment_events_shipment_idx on public.shipment_events (shipment_id);

-- ── Email outbox ───────────────────────────────────────────────────────────────
create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  template text not null,
  recipient text not null,
  subject text not null,
  body text not null,
  state text not null default 'QUEUED' check (state in ('QUEUED','SENT','FAILED')),
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists email_outbox_state_idx on public.email_outbox (state);

-- ── RLS ──────────────────────────────────────────────────────────────────────────
alter table public.seller_ledger_entries enable row level security;
alter table public.seller_payouts enable row level security;
alter table public.store_credit_ledger enable row level security;
alter table public.commerce_refunds enable row level security;
alter table public.review_reports enable row level security;
alter table public.review_responses enable row level security;
alter table public.commerce_shipments enable row level security;
alter table public.shipment_events enable row level security;
alter table public.email_outbox enable row level security;

-- Sellers read their own ledger/payouts; admins manage all.
create policy "seller_ledger_read" on public.seller_ledger_entries for select
  using (public.current_user_is_vendor_member(seller_id) or public.current_user_has_role(array['ADMIN','SUPER_ADMIN']));
create policy "seller_ledger_admin" on public.seller_ledger_entries for all
  using (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']))
  with check (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']));

create policy "seller_payouts_read" on public.seller_payouts for select
  using (public.current_user_is_vendor_member(seller_id) or public.current_user_has_role(array['ADMIN','SUPER_ADMIN']));
create policy "seller_payouts_admin" on public.seller_payouts for all
  using (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']))
  with check (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']));

-- Customers read their own store credit; admins manage.
create policy "store_credit_read" on public.store_credit_ledger for select
  using (customer_id = auth.uid() or public.current_user_has_role(array['ADMIN','SUPER_ADMIN']));
create policy "store_credit_admin" on public.store_credit_ledger for all
  using (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']))
  with check (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']));

-- Customers read their own refunds; admins manage.
create policy "commerce_refunds_read" on public.commerce_refunds for select
  using (customer_id = auth.uid() or public.current_user_has_role(array['ADMIN','SUPER_ADMIN']));
create policy "commerce_refunds_admin" on public.commerce_refunds for all
  using (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']))
  with check (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']));

-- Review reports: any authenticated user can file; admins manage.
create policy "review_reports_insert" on public.review_reports for insert
  with check (auth.uid() is not null);
create policy "review_reports_admin" on public.review_reports for select
  using (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']));

-- Seller responses: vendor members write their own; everyone reads.
create policy "review_responses_read" on public.review_responses for select using (true);
create policy "review_responses_write" on public.review_responses for all
  using (public.current_user_is_vendor_member(vendor_id) or public.current_user_has_role(array['ADMIN','SUPER_ADMIN']))
  with check (public.current_user_is_vendor_member(vendor_id) or public.current_user_has_role(array['ADMIN','SUPER_ADMIN']));

-- Shipments: readable by order participants + admins; system writes via service role.
create policy "shipments_read" on public.commerce_shipments for select
  using (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']) or exists (
    select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid()
  ));
create policy "shipment_events_read" on public.shipment_events for select
  using (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']));

-- Email outbox: admin-only visibility.
create policy "email_outbox_admin" on public.email_outbox for all
  using (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']))
  with check (public.current_user_has_role(array['ADMIN','SUPER_ADMIN']));
