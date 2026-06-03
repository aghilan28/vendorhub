-- HL-1 DISCOVERY POPULATION
-- Populates discovery_intelligence with baseline coverage metrics

do $$
declare
  v_product record;
  v_store_count integer;
begin
  for v_product in select * from public.products loop
    select count(*) into v_store_count
    from public.product_store_links
    where product_id = v_product.id and status = 'APPROVED';

    insert into public.discovery_intelligence (entity_id, entity_type, metric_key, metric_value)
    values (v_product.id, 'product', 'initial_store_reach', v_store_count)
    on conflict do nothing;
  end loop;
end $$;
