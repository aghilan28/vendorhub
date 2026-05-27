-- Phase 19 continuation: seller/admin operational completion and backend consistency hardening.

create index if not exists products_vendor_status_updated_idx on public.products(vendor_id, status, updated_at desc) where deleted_at is null;
create index if not exists orders_status_created_idx on public.orders(status, created_at desc) where deleted_at is null;
create index if not exists inventory_movements_vendor_created_idx on public.inventory_movements(vendor_id, created_at desc);
create index if not exists refund_requests_state_created_idx on public.refund_requests(state, created_at desc);
create index if not exists transaction_integrity_alerts_state_created_idx on public.transaction_integrity_alerts(state, created_at desc);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'vendors_service_radius_valid') then
    alter table public.vendors add constraint vendors_service_radius_valid check (service_radius_km > 0 and service_radius_km <= 50);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vendors_rating_valid') then
    alter table public.vendors add constraint vendors_rating_valid check (rating_average between 0 and 5 and rating_count >= 0);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'vendor_settings_prep_minutes_valid') then
    alter table public.vendor_settings add constraint vendor_settings_prep_minutes_valid check (average_prep_minutes between 1 and 240);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vendor_settings_minimum_order_non_negative') then
    alter table public.vendor_settings add constraint vendor_settings_minimum_order_non_negative check (minimum_order_amount >= 0);
  end if;
end $$;

create or replace function public.ensure_current_user_vendor_member(target_vendor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if not (
    public.current_user_is_vendor_member(target_vendor_id)
    or public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[])
  ) then
    raise exception 'Vendor ownership required.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.update_live_order_status(target_order_id uuid, target_status public.order_status, status_note text default null)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row public.orders;
  result public.orders;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select * into old_row from public.orders where id = target_order_id and deleted_at is null for update;

  if old_row.id is null then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;

  if not (
    old_row.buyer_id = auth.uid()
    or public.current_user_is_vendor_member(old_row.vendor_id)
    or public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[])
  ) then
    raise exception 'Forbidden order mutation.' using errcode = '42501';
  end if;

  update public.orders
  set status = target_status,
      updated_at = now()
  where id = target_order_id
  returning * into result;

  insert into public.order_status_history (order_id, status, changed_by, note, metadata)
  values (result.id, target_status, auth.uid(), status_note, jsonb_build_object('previous_status', old_row.status));

  insert into public.notifications (recipient_id, vendor_id, type, channel, title, body, action_url, metadata)
  values (
    result.buyer_id,
    result.vendor_id,
    'ORDER_UPDATE',
    'IN_APP',
    'Order status updated',
    format('Order %s is now %s.', result.order_number, target_status::text),
    '/orders/' || result.id::text,
    jsonb_build_object('order_id', result.id, 'status', target_status)
  );

  insert into public.audit_logs (actor_id, vendor_id, action, entity_table, entity_id, old_values, new_values)
  values (auth.uid(), result.vendor_id, 'order.status_updated', 'orders', result.id, to_jsonb(old_row), to_jsonb(result));

  return result;
end;
$$;

create or replace function public.moderate_live_vendor(target_vendor_id uuid, target_status public.vendor_status, moderation_note text default null)
returns public.vendors
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row public.vendors;
  result public.vendors;
begin
  if not public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[]) then
    raise exception 'Admin authorization required.' using errcode = '42501';
  end if;

  select * into old_row from public.vendors where id = target_vendor_id and deleted_at is null for update;

  if old_row.id is null then
    raise exception 'Vendor not found.' using errcode = 'P0002';
  end if;

  update public.vendors
  set status = target_status,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('lastModerationNote', moderation_note, 'lastModeratedAt', now()),
      updated_at = now()
  where id = target_vendor_id
  returning * into result;

  insert into public.audit_logs (actor_id, vendor_id, action, entity_table, entity_id, old_values, new_values, metadata)
  values (auth.uid(), result.id, 'vendor.moderated', 'vendors', result.id, to_jsonb(old_row), to_jsonb(result), jsonb_build_object('note', moderation_note));

  insert into public.notifications (recipient_id, vendor_id, type, channel, title, body, action_url, metadata)
  values (
    result.owner_id,
    result.id,
    'ADMIN_ALERT',
    'IN_APP',
    'Seller account reviewed',
    format('Your store status changed to %s.', target_status::text),
    '/seller/dashboard',
    jsonb_build_object('vendor_id', result.id, 'status', target_status)
  );

  return result;
end;
$$;

create or replace function public.moderate_live_product(target_product_id uuid, target_status public.product_status, moderation_note text default null)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row public.products;
  result public.products;
begin
  if not public.current_user_has_role(array['ADMIN','SUPER_ADMIN']::text[]) then
    raise exception 'Admin authorization required.' using errcode = '42501';
  end if;

  select * into old_row from public.products where id = target_product_id and deleted_at is null for update;

  if old_row.id is null then
    raise exception 'Product not found.' using errcode = 'P0002';
  end if;

  update public.products
  set status = target_status,
      published_at = case when target_status = 'ACTIVE' then coalesce(published_at, now()) else published_at end,
      ai_index_metadata = coalesce(ai_index_metadata, '{}'::jsonb) || jsonb_build_object('lastModerationNote', moderation_note, 'lastModeratedAt', now()),
      updated_at = now()
  where id = target_product_id
  returning * into result;

  insert into public.audit_logs (actor_id, vendor_id, action, entity_table, entity_id, old_values, new_values, metadata)
  values (auth.uid(), result.vendor_id, 'product.moderated', 'products', result.id, to_jsonb(old_row), to_jsonb(result), jsonb_build_object('note', moderation_note));

  insert into public.notifications (vendor_id, type, channel, title, body, action_url, metadata)
  values (
    result.vendor_id,
    'ADMIN_ALERT',
    'IN_APP',
    'Product moderation updated',
    format('%s changed to %s.', result.name, target_status::text),
    '/seller/products/' || result.id::text,
    jsonb_build_object('product_id', result.id, 'status', target_status)
  );

  return result;
end;
$$;

grant execute on function public.ensure_current_user_vendor_member(uuid) to authenticated;
grant execute on function public.update_live_order_status(uuid, public.order_status, text) to authenticated;
grant execute on function public.moderate_live_vendor(uuid, public.vendor_status, text) to authenticated;
grant execute on function public.moderate_live_product(uuid, public.product_status, text) to authenticated;
