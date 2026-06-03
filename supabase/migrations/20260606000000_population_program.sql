-- PI-1, PI-2, PI-3 DATA POPULATION PROGRAM
-- Deterministically populates Commerce Graph, Inventory, and Availability from existing universes.

do $$
declare
  v_product record;
  v_vendor record;
  v_link_id uuid;
  v_inventory_id uuid;
begin
  -- 1. Populate Product Store Links (PI-1)
  -- For each product, link it to its primary vendor
  for v_product in select * from public.products where deleted_at is null loop
    for v_vendor in select * from public.vendors where id = v_product.vendor_id and deleted_at is null loop

      insert into public.product_store_links (product_id, vendor_id, seller_id, status, source, confidence, metadata)
      values (
        v_product.id,
        v_vendor.id,
        v_vendor.owner_id,
        'APPROVED',
        'SYSTEM',
        1.0,
        jsonb_build_object(
          'populated_at', now(),
          'wave', 3,
          'phase', 'PI-1'
        )
      )
      on conflict (product_id, vendor_id) do nothing
      returning id into v_link_id;

      -- 2. Populate Inventory Positions (PI-2)
      -- Derive inventory from product stock_count
      insert into public.inventory_positions (
        product_id, vendor_id, seller_id, sku,
        on_hand, reserved, safety_stock,
        status, lifecycle_status
      )
      values (
        v_product.id,
        v_vendor.id,
        v_vendor.owner_id,
        coalesce(v_product.slug, v_product.id::text),
        v_product.stock_count,
        0,
        5,
        'ACTIVE',
        'CREATED'
      )
      on conflict (product_id, vendor_id) do update
      set on_hand = excluded.on_hand
      returning id into v_inventory_id;

      -- 3. Populate Availability Records (PI-3)
      insert into public.availability_records (
        product_id, vendor_id, inventory_id, seller_id,
        status, eligibility, lifecycle
      )
      values (
        v_product.id,
        v_vendor.id,
        v_inventory_id,
        v_vendor.owner_id,
        case when v_product.stock_count > 0 then 'AVAILABLE' else 'UNAVAILABLE' end,
        case when v_product.stock_count > 0 and v_vendor.status = 'ACTIVE' then 'PURCHASABLE' else 'NOT_PURCHASABLE' end,
        'ACTIVE'
      )
      on conflict (product_id, vendor_id) do update
      set status = excluded.status, eligibility = excluded.eligibility;

    end loop;
  end loop;
end $$;
