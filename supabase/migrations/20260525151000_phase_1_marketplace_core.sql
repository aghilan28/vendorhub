create extension if not exists "pgcrypto";
create extension if not exists "citext";

create type public.app_role as enum ('BUYER', 'SELLER', 'ADMIN', 'SUPER_ADMIN');
create type public.vendor_member_role as enum ('OWNER', 'MANAGER', 'STAFF');
create type public.vendor_status as enum ('DRAFT', 'PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'CLOSED');
create type public.verification_status as enum ('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED', 'NEEDS_INFO');
create type public.product_status as enum ('DRAFT', 'ACTIVE', 'ARCHIVED', 'SUSPENDED');
create type public.stock_status as enum ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'RESERVED', 'DISCONTINUED');
create type public.inventory_movement_type as enum ('INITIAL', 'RESTOCK', 'SALE', 'RESERVATION', 'RELEASE', 'ADJUSTMENT', 'RETURN', 'DAMAGE');
create type public.order_status as enum (
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED'
);
create type public.notification_channel as enum ('IN_APP', 'EMAIL', 'SMS', 'PUSH');
create type public.notification_type as enum ('ORDER_UPDATE', 'SELLER_ALERT', 'ADMIN_ALERT', 'INVENTORY_ALERT', 'SYSTEM');
create type public.flag_value_type as enum ('BOOLEAN', 'STRING', 'NUMBER', 'JSON');
create type public.address_type as enum ('HOME', 'WORK', 'OTHER');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_has_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role::text = any(required_roles)
      and deleted_at is null
  );
$$;

create or replace function public.current_user_is_vendor_member(target_vendor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select false;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  full_name text not null,
  email citext not null unique,
  phone text,
  avatar_url text,
  default_role public.app_role not null default 'BUYER',
  onboarding_completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  unique (user_id, role)
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  type public.address_type not null default 'HOME',
  recipient_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  locality text not null,
  city text not null,
  region text not null,
  postal_code text not null,
  country_code char(2) not null default 'IN',
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  is_default boolean not null default false
);

create table public.sessions_metadata (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  auth_session_id uuid,
  ip_address inet,
  user_agent text,
  device_label text,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  slug text not null unique,
  description text,
  status public.vendor_status not null default 'DRAFT',
  email citext,
  phone text,
  logo_url text,
  banner_url text,
  service_radius_km numeric(6, 2) not null default 5,
  rating_average numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create table public.vendor_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.vendor_member_role not null default 'STAFF',
  invited_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz,
  unique (vendor_id, user_id)
);

create table public.vendor_verification (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  vendor_id uuid not null unique references public.vendors(id) on delete cascade,
  status public.verification_status not null default 'NOT_STARTED',
  legal_name text,
  tax_id text,
  document_urls text[] not null default '{}',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  submitted_at timestamptz
);

create table public.vendor_settings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  vendor_id uuid not null unique references public.vendors(id) on delete cascade,
  accepts_orders boolean not null default true,
  minimum_order_amount numeric(12, 2) not null default 0,
  average_prep_minutes integer not null default 30,
  operating_hours jsonb not null default '{}'::jsonb,
  notification_channels public.notification_channel[] not null default array['IN_APP']::public.notification_channel[]
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  slug text not null,
  description text,
  status public.product_status not null default 'DRAFT',
  base_price numeric(12, 2) not null check (base_price >= 0),
  currency char(3) not null default 'INR',
  search_document tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored,
  ai_index_metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  unique (vendor_id, slug)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  name text not null,
  attributes jsonb not null default '{}'::jsonb,
  price_delta numeric(12, 2) not null default 0,
  is_active boolean not null default true
);

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  stock_status public.stock_status not null default 'IN_STOCK',
  restock_eta timestamptz,
  unique (product_id, variant_id),
  check (reserved_quantity <= stock_quantity)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  inventory_id uuid not null references public.inventory(id) on delete restrict,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  movement_type public.inventory_movement_type not null,
  quantity_delta integer not null,
  quantity_after integer not null check (quantity_after >= 0),
  reason text,
  reference_type text,
  reference_id uuid,
  actor_id uuid references public.profiles(id) on delete set null
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  reserved_until timestamptz,
  unique (user_id, product_id, variant_id)
);

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  unique (user_id, product_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  order_item_id uuid,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text,
  is_verified_purchase boolean not null default false,
  moderation_status text not null default 'VISIBLE'
);

create table public.review_votes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  review_id uuid not null references public.reviews(id) on delete cascade,
  is_helpful boolean not null,
  unique (user_id, review_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  order_number text not null unique,
  status public.order_status not null default 'PENDING',
  subtotal_amount numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  delivery_fee_amount numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  currency char(3) not null default 'INR',
  payment_reference text,
  payment_status text not null default 'NOT_STARTED',
  fulfillment_reference text,
  delivery_address jsonb not null,
  metadata jsonb not null default '{}'::jsonb
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  product_name text not null,
  variant_name text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  total_price numeric(12, 2) not null check (total_price >= 0),
  fulfillment_status public.order_status not null default 'PENDING'
);

alter table public.reviews
  add constraint reviews_order_item_id_fkey foreign key (order_item_id) references public.order_items(id) on delete set null;

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  note text,
  metadata jsonb not null default '{}'::jsonb
);

create table public.order_notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  order_id uuid not null references public.orders(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  visibility text not null default 'INTERNAL',
  body text not null
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  recipient_id uuid references public.profiles(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete cascade,
  type public.notification_type not null,
  channel public.notification_channel not null default 'IN_APP',
  title text not null,
  body text not null,
  action_url text,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  order_updates public.notification_channel[] not null default array['IN_APP', 'EMAIL']::public.notification_channel[],
  seller_alerts public.notification_channel[] not null default array['IN_APP']::public.notification_channel[],
  admin_alerts public.notification_channel[] not null default array['IN_APP']::public.notification_channel[],
  marketing_enabled boolean not null default false
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  actor_id uuid references public.profiles(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  metadata jsonb not null default '{}'::jsonb
);

create table public.system_flags (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  key text not null unique,
  value jsonb not null,
  value_type public.flag_value_type not null,
  description text,
  managed_by uuid references public.profiles(id) on delete set null
);

create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  key text not null unique,
  description text,
  is_enabled boolean not null default false,
  rollout_percentage integer not null default 0 check (rollout_percentage between 0 and 100),
  audience jsonb not null default '{}'::jsonb
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'user_roles', 'addresses', 'sessions_metadata', 'vendors', 'vendor_members',
    'vendor_verification', 'vendor_settings', 'categories', 'products', 'product_images',
    'product_variants', 'inventory', 'inventory_movements', 'cart_items', 'wishlists',
    'reviews', 'review_votes', 'orders', 'order_items', 'order_status_history',
    'order_notes', 'notifications', 'notification_preferences', 'audit_logs',
    'system_flags', 'feature_flags'
  ]
  loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

create index profiles_email_idx on public.profiles(email) where deleted_at is null;
create index user_roles_user_id_idx on public.user_roles(user_id) where deleted_at is null;
create index addresses_user_id_idx on public.addresses(user_id) where deleted_at is null;
create index vendors_owner_id_idx on public.vendors(owner_id) where deleted_at is null;
create index vendor_members_user_id_idx on public.vendor_members(user_id) where deleted_at is null;
create index vendor_members_vendor_id_idx on public.vendor_members(vendor_id) where deleted_at is null;
create index categories_parent_id_idx on public.categories(parent_id) where deleted_at is null;
create index products_vendor_id_idx on public.products(vendor_id) where deleted_at is null;
create index products_category_id_idx on public.products(category_id) where deleted_at is null;
create index products_search_document_idx on public.products using gin(search_document);
create index product_images_product_id_idx on public.product_images(product_id) where deleted_at is null;
create index inventory_vendor_id_idx on public.inventory(vendor_id) where deleted_at is null;
create index inventory_product_id_idx on public.inventory(product_id) where deleted_at is null;
create index cart_items_user_id_idx on public.cart_items(user_id) where deleted_at is null;
create index wishlists_user_id_idx on public.wishlists(user_id) where deleted_at is null;
create index reviews_product_id_idx on public.reviews(product_id) where deleted_at is null;
create index orders_buyer_id_idx on public.orders(buyer_id) where deleted_at is null;
create index orders_vendor_id_status_idx on public.orders(vendor_id, status) where deleted_at is null;
create index order_items_order_id_idx on public.order_items(order_id) where deleted_at is null;
create index notifications_recipient_id_idx on public.notifications(recipient_id) where deleted_at is null;
create index audit_logs_entity_idx on public.audit_logs(entity_table, entity_id);

create policy "profiles_select_own_or_admin" on public.profiles for select using (
  id = auth.uid() or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_admin_all" on public.profiles for all using (
  public.current_user_has_role(array['SUPER_ADMIN']::text[])
) with check (public.current_user_has_role(array['SUPER_ADMIN']::text[]));

create policy "user_roles_select_own_or_admin" on public.user_roles for select using (
  user_id = auth.uid() or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);
create policy "user_roles_admin_write" on public.user_roles for all using (
  public.current_user_has_role(array['SUPER_ADMIN']::text[])
) with check (public.current_user_has_role(array['SUPER_ADMIN']::text[]));

create policy "addresses_owner_all" on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "addresses_admin_select" on public.addresses for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create policy "sessions_owner_all" on public.sessions_metadata for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sessions_admin_select" on public.sessions_metadata for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create policy "vendors_public_active_select" on public.vendors for select using (status = 'ACTIVE' and deleted_at is null);
create policy "vendors_member_select" on public.vendors for select using (public.current_user_is_vendor_member(id));
create policy "vendors_owner_insert" on public.vendors for insert with check (owner_id = auth.uid());
create policy "vendors_member_update" on public.vendors for update using (public.current_user_is_vendor_member(id)) with check (public.current_user_is_vendor_member(id));
create policy "vendors_admin_all" on public.vendors for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create policy "vendor_members_member_select" on public.vendor_members for select using (public.current_user_is_vendor_member(vendor_id));
create policy "vendor_members_owner_write" on public.vendor_members for all using (
  exists (select 1 from public.vendor_members vm where vm.vendor_id = vendor_members.vendor_id and vm.user_id = auth.uid() and vm.role in ('OWNER', 'MANAGER') and vm.deleted_at is null)
) with check (
  exists (select 1 from public.vendor_members vm where vm.vendor_id = vendor_members.vendor_id and vm.user_id = auth.uid() and vm.role in ('OWNER', 'MANAGER') and vm.deleted_at is null)
);
create policy "vendor_members_admin_all" on public.vendor_members for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create policy "vendor_private_member_select" on public.vendor_verification for select using (public.current_user_is_vendor_member(vendor_id) or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "vendor_private_member_update" on public.vendor_verification for update using (public.current_user_is_vendor_member(vendor_id)) with check (public.current_user_is_vendor_member(vendor_id));
create policy "vendor_private_member_insert" on public.vendor_verification for insert with check (public.current_user_is_vendor_member(vendor_id));
create policy "vendor_settings_member_all" on public.vendor_settings for all using (public.current_user_is_vendor_member(vendor_id) or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_is_vendor_member(vendor_id) or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create policy "categories_public_select" on public.categories for select using (is_active = true and deleted_at is null);
create policy "categories_admin_all" on public.categories for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create policy "products_public_active_select" on public.products for select using (status = 'ACTIVE' and deleted_at is null);
create policy "products_vendor_all" on public.products for all using (public.current_user_is_vendor_member(vendor_id)) with check (public.current_user_is_vendor_member(vendor_id));
create policy "products_admin_all" on public.products for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create policy "product_images_public_select" on public.product_images for select using (
  exists (select 1 from public.products p where p.id = product_id and p.status = 'ACTIVE' and p.deleted_at is null)
);
create policy "product_images_vendor_all" on public.product_images for all using (
  exists (select 1 from public.products p where p.id = product_id and public.current_user_is_vendor_member(p.vendor_id))
) with check (
  exists (select 1 from public.products p where p.id = product_id and public.current_user_is_vendor_member(p.vendor_id))
);

create policy "product_variants_public_select" on public.product_variants for select using (
  is_active = true and exists (select 1 from public.products p where p.id = product_id and p.status = 'ACTIVE' and p.deleted_at is null)
);
create policy "product_variants_vendor_all" on public.product_variants for all using (
  exists (select 1 from public.products p where p.id = product_id and public.current_user_is_vendor_member(p.vendor_id))
) with check (
  exists (select 1 from public.products p where p.id = product_id and public.current_user_is_vendor_member(p.vendor_id))
);

create policy "inventory_public_select" on public.inventory for select using (
  exists (select 1 from public.products p where p.id = product_id and p.status = 'ACTIVE' and p.deleted_at is null)
);
create policy "inventory_vendor_all" on public.inventory for all using (public.current_user_is_vendor_member(vendor_id)) with check (public.current_user_is_vendor_member(vendor_id));
create policy "inventory_movements_vendor_select" on public.inventory_movements for select using (public.current_user_is_vendor_member(vendor_id) or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "inventory_movements_vendor_insert" on public.inventory_movements for insert with check (public.current_user_is_vendor_member(vendor_id));

create policy "cart_owner_all" on public.cart_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "wishlist_owner_all" on public.wishlists for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "reviews_public_select" on public.reviews for select using (deleted_at is null and moderation_status = 'VISIBLE');
create policy "reviews_owner_insert" on public.reviews for insert with check (user_id = auth.uid());
create policy "reviews_owner_update" on public.reviews for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reviews_admin_all" on public.reviews for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "review_votes_owner_all" on public.review_votes for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "orders_buyer_select" on public.orders for select using (buyer_id = auth.uid());
create policy "orders_buyer_insert" on public.orders for insert with check (buyer_id = auth.uid());
create policy "orders_vendor_select_update" on public.orders for all using (public.current_user_is_vendor_member(vendor_id)) with check (public.current_user_is_vendor_member(vendor_id));
create policy "orders_admin_all" on public.orders for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

create policy "order_items_party_select" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or public.current_user_is_vendor_member(o.vendor_id)))
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);
create policy "order_items_vendor_update" on public.order_items for update using (public.current_user_is_vendor_member(vendor_id)) with check (public.current_user_is_vendor_member(vendor_id));
create policy "order_history_party_select" on public.order_status_history for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or public.current_user_is_vendor_member(o.vendor_id)))
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);
create policy "order_history_party_insert" on public.order_status_history for insert with check (
  exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or public.current_user_is_vendor_member(o.vendor_id)))
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);
create policy "order_notes_vendor_admin_all" on public.order_notes for all using (
  exists (select 1 from public.orders o where o.id = order_id and public.current_user_is_vendor_member(o.vendor_id))
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
) with check (
  exists (select 1 from public.orders o where o.id = order_id and public.current_user_is_vendor_member(o.vendor_id))
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);

create policy "notifications_recipient_select_update" on public.notifications for all using (
  recipient_id = auth.uid()
  or (vendor_id is not null and public.current_user_is_vendor_member(vendor_id))
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
) with check (
  recipient_id = auth.uid()
  or (vendor_id is not null and public.current_user_is_vendor_member(vendor_id))
  or public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])
);
create policy "notification_preferences_owner_all" on public.notification_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "audit_logs_admin_select" on public.audit_logs for select using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "audit_logs_service_insert" on public.audit_logs for insert with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "system_flags_admin_all" on public.system_flags for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));
create policy "feature_flags_authenticated_select" on public.feature_flags for select using (auth.role() = 'authenticated');
create policy "feature_flags_admin_all" on public.feature_flags for all using (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[])) with check (public.current_user_has_role(array['ADMIN', 'SUPER_ADMIN']::text[]));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 8388608, array['image/png', 'image/jpeg', 'image/webp']),
  ('vendor-assets', 'vendor-assets', true, 8388608, array['image/png', 'image/jpeg', 'image/webp']),
  ('profile-images', 'profile-images', true, 4194304, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "product_images_public_read" on storage.objects for select using (bucket_id = 'product-images');
create policy "vendor_assets_public_read" on storage.objects for select using (bucket_id = 'vendor-assets');
create policy "profile_images_public_read" on storage.objects for select using (bucket_id = 'profile-images');
create policy "profile_images_owner_write" on storage.objects for all using (
  bucket_id = 'profile-images' and owner = auth.uid()
) with check (
  bucket_id = 'profile-images' and owner = auth.uid()
);
create policy "vendor_assets_authenticated_write" on storage.objects for insert with check (
  bucket_id = 'vendor-assets' and auth.role() = 'authenticated'
);
create policy "product_images_authenticated_write" on storage.objects for insert with check (
  bucket_id = 'product-images' and auth.role() = 'authenticated'
);

alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_status_history;
alter publication supabase_realtime add table public.inventory;
