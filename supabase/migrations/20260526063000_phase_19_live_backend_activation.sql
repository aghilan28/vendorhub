-- Phase 19: live backend activation, consistency hardening, and operational RPCs.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_price_non_negative'
  ) then
    alter table public.products
      add constraint products_price_non_negative
      check (base_price >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_currency_iso'
  ) then
    alter table public.products
      add constraint products_currency_iso
      check (currency ~ '^[A-Z]{3}$');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'inventory_quantities_non_negative') then
    alter table public.inventory add constraint inventory_quantities_non_negative check (stock_quantity >= 0 and reserved_quantity >= 0 and low_stock_threshold >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'inventory_reserved_not_above_stock') then
    alter table public.inventory add constraint inventory_reserved_not_above_stock check (reserved_quantity <= stock_quantity);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cart_items_quantity_valid') then
    alter table public.cart_items add constraint cart_items_quantity_valid check (quantity between 1 and 99);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_amounts_non_negative') then
    alter table public.orders add constraint orders_amounts_non_negative check (
      subtotal_amount >= 0 and tax_amount >= 0 and delivery_fee_amount >= 0 and discount_amount >= 0 and total_amount >= 0
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_currency_iso') then
    alter table public.orders add constraint orders_currency_iso check (currency ~ '^[A-Z]{3}$');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'order_items_quantity_positive') then
    alter table public.order_items add constraint order_items_quantity_positive check (quantity > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'order_items_amounts_non_negative') then
    alter table public.order_items add constraint order_items_amounts_non_negative check (unit_price >= 0 and total_price >= 0);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reviews_rating_range') then
    alter table public.reviews add constraint reviews_rating_range check (rating between 1 and 5);
  end if;
end $$;

create index if not exists products_active_created_idx on public.products(created_at desc) where status = 'ACTIVE' and deleted_at is null;
create index if not exists products_active_category_created_idx on public.products(category_id, created_at desc) where status = 'ACTIVE' and deleted_at is null;
create index if not exists inventory_stock_lookup_idx on public.inventory(product_id, variant_id, stock_status) where deleted_at is null;
create index if not exists cart_items_active_user_updated_idx on public.cart_items(user_id, updated_at desc) where deleted_at is null;
create index if not exists wishlists_active_user_updated_idx on public.wishlists(user_id, updated_at desc) where deleted_at is null;
create index if not exists notifications_recipient_unread_idx on public.notifications(recipient_id, created_at desc) where deleted_at is null and read_at is null;
create index if not exists audit_logs_actor_created_idx on public.audit_logs(actor_id, created_at desc);
create index if not exists search_events_query_created_idx on public.search_events(query, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles','user_roles','addresses','vendors','vendor_members','vendor_verification','vendor_settings',
    'categories','products','product_images','product_variants','inventory','cart_items','wishlists','reviews',
    'orders','order_items','order_status_history','order_notes','notifications','notification_preferences',
    'audit_logs','system_flags','feature_flags','sessions_metadata'
  ]
  loop
    execute format('drop trigger if exists %I_touch_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', table_name, table_name);
  end loop;
end $$;

create or replace function public.assert_product_available(target_product_id uuid, target_variant_id uuid default null, requested_quantity integer default 1)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  product_rec record;
  inventory_rec record;
begin
  if requested_quantity < 1 or requested_quantity > 99 then
    raise exception 'Invalid quantity.' using errcode = '22023';
  end if;

  select p.id, p.vendor_id, p.status, p.deleted_at, v.status as vendor_status
  into product_rec
  from public.products p
  join public.vendors v on v.id = p.vendor_id
  where p.id = target_product_id;

  if product_rec.id is null or product_rec.status <> 'ACTIVE' or product_rec.deleted_at is not null or product_rec.vendor_status <> 'ACTIVE' then
    raise exception 'Product is not available.' using errcode = 'P0002';
  end if;

  select *
  into inventory_rec
  from public.inventory
  where product_id = target_product_id
    and variant_id is not distinct from target_variant_id
    and deleted_at is null
  limit 1;

  if inventory_rec.id is null then
    raise exception 'Inventory row is missing.' using errcode = 'P0002';
  end if;

  if inventory_rec.stock_quantity - inventory_rec.reserved_quantity < requested_quantity then
    raise exception 'Insufficient inventory.' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'product_id', target_product_id,
    'variant_id', target_variant_id,
    'available_quantity', inventory_rec.stock_quantity - inventory_rec.reserved_quantity,
    'stock_status', inventory_rec.stock_status
  );
end;
$$;

create or replace function public.upsert_live_cart_item(target_product_id uuid, target_variant_id uuid default null, target_quantity integer default 1)
returns public.cart_items
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.cart_items;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  perform public.assert_product_available(target_product_id, target_variant_id, target_quantity);

  insert into public.cart_items (user_id, product_id, variant_id, quantity, deleted_at)
  values (auth.uid(), target_product_id, target_variant_id, target_quantity, null)
  on conflict (user_id, product_id, variant_id)
  do update set
    quantity = excluded.quantity,
    deleted_at = null,
    reserved_until = null,
    updated_at = now()
  returning * into result;

  insert into public.audit_logs (actor_id, action, entity_table, entity_id, new_values, metadata)
  values (auth.uid(), 'cart_item.upserted', 'cart_items', result.id, to_jsonb(result), jsonb_build_object('product_id', target_product_id));

  return result;
end;
$$;

create or replace function public.remove_live_cart_item(target_cart_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row public.cart_items;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  update public.cart_items
  set deleted_at = now(), updated_at = now()
  where id = target_cart_item_id and user_id = auth.uid() and deleted_at is null
  returning * into old_row;

  if old_row.id is null then
    raise exception 'Cart item not found.' using errcode = 'P0002';
  end if;

  insert into public.audit_logs (actor_id, action, entity_table, entity_id, old_values, metadata)
  values (auth.uid(), 'cart_item.removed', 'cart_items', old_row.id, to_jsonb(old_row), jsonb_build_object('product_id', old_row.product_id));
end;
$$;

create or replace function public.clear_live_cart()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cleared_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  update public.cart_items
  set deleted_at = now(), updated_at = now()
  where user_id = auth.uid() and deleted_at is null;

  get diagnostics cleared_count = row_count;

  insert into public.audit_logs (actor_id, action, entity_table, metadata)
  values (auth.uid(), 'cart.cleared', 'cart_items', jsonb_build_object('cleared_count', cleared_count));

  return cleared_count;
end;
$$;

create or replace function public.toggle_live_wishlist(target_product_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  wishlist_row public.wishlists;
  active_row public.wishlists;
  active boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  perform public.assert_product_available(target_product_id, null, 1);

  select *
  into active_row
  from public.wishlists
  where user_id = auth.uid() and product_id = target_product_id and deleted_at is null
  limit 1;

  if active_row.id is not null then
    update public.wishlists
    set deleted_at = now(), updated_at = now()
    where id = active_row.id
    returning * into wishlist_row;
    active := false;
  else
    insert into public.wishlists (user_id, product_id, deleted_at)
    values (auth.uid(), target_product_id, null)
    on conflict (user_id, product_id)
    do update set deleted_at = null, updated_at = now()
    returning * into wishlist_row;
    active := true;
  end if;

  insert into public.audit_logs (actor_id, action, entity_table, entity_id, new_values, metadata)
  values (auth.uid(), 'wishlist.toggled', 'wishlists', wishlist_row.id, to_jsonb(wishlist_row), jsonb_build_object('active', active));

  return jsonb_build_object('id', wishlist_row.id, 'product_id', wishlist_row.product_id, 'active', active);
end;
$$;

create or replace function public.update_live_inventory(target_inventory_id uuid, target_stock_quantity integer, reason text default 'seller_adjustment')
returns public.inventory
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row public.inventory;
  result public.inventory;
  delta integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select * into old_row from public.inventory where id = target_inventory_id and deleted_at is null for update;

  if old_row.id is null then
    raise exception 'Inventory row not found.' using errcode = 'P0002';
  end if;

  if not (public.current_user_is_vendor_member(old_row.vendor_id) or public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[])) then
    raise exception 'Forbidden inventory mutation.' using errcode = '42501';
  end if;

  if target_stock_quantity < old_row.reserved_quantity then
    raise exception 'Stock cannot fall below reserved quantity.' using errcode = '22023';
  end if;

  delta := target_stock_quantity - old_row.stock_quantity;

  update public.inventory
  set stock_quantity = target_stock_quantity,
      stock_status = case
        when target_stock_quantity = 0 then 'OUT_OF_STOCK'::public.stock_status
        when target_stock_quantity <= low_stock_threshold then 'LOW_STOCK'::public.stock_status
        else 'IN_STOCK'::public.stock_status
      end,
      updated_at = now()
  where id = target_inventory_id
  returning * into result;

  insert into public.inventory_movements (inventory_id, vendor_id, movement_type, quantity_delta, quantity_after, reason, reference_type, reference_id, actor_id)
  values (result.id, result.vendor_id, 'ADJUSTMENT', delta, result.stock_quantity, reason, 'inventory', result.id, auth.uid());

  insert into public.audit_logs (actor_id, vendor_id, action, entity_table, entity_id, old_values, new_values)
  values (auth.uid(), result.vendor_id, 'inventory.updated', 'inventory', result.id, to_jsonb(old_row), to_jsonb(result));

  return result;
end;
$$;

create or replace function public.record_live_search_event(
  query_text text,
  corrected_query_text text default null,
  search_mode text default 'hybrid',
  result_count integer default 0,
  latency_ms integer default 0,
  fallback_used boolean default false,
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
  insert into public.search_events (user_id, query, corrected_query, mode, result_count, latency_ms, fallback_used, metadata)
  values (auth.uid(), left(coalesce(query_text, ''), 500), corrected_query_text, search_mode, greatest(result_count, 0), greatest(latency_ms, 0), fallback_used, event_metadata)
  returning id into event_id;

  return event_id;
end;
$$;

create or replace function public.mark_notification_read(target_notification_id uuid)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.notifications;
begin
  update public.notifications
  set read_at = coalesce(read_at, now()), updated_at = now()
  where id = target_notification_id
    and deleted_at is null
    and (recipient_id = auth.uid() or public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[]))
  returning * into result;

  if result.id is null then
    raise exception 'Notification not found.' using errcode = 'P0002';
  end if;

  return result;
end;
$$;

grant execute on function public.assert_product_available(uuid, uuid, integer) to authenticated;
grant execute on function public.upsert_live_cart_item(uuid, uuid, integer) to authenticated;
grant execute on function public.remove_live_cart_item(uuid) to authenticated;
grant execute on function public.clear_live_cart() to authenticated;
grant execute on function public.toggle_live_wishlist(uuid) to authenticated;
grant execute on function public.update_live_inventory(uuid, integer, text) to authenticated;
grant execute on function public.record_live_search_event(text, text, text, integer, integer, boolean, jsonb) to anon, authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
