insert into public.categories (id, name, slug, description, sort_order, is_active)
values
  ('10000000-0000-4000-8000-000000000001', 'Fresh Produce', 'fresh-produce', 'Daily vegetables, herbs, and fruit from nearby growers.', 10, true),
  ('10000000-0000-4000-8000-000000000002', 'Bakery & Breakfast', 'bakery-breakfast', 'Fresh breads, breakfast staples, and small-batch baked goods.', 20, true),
  ('10000000-0000-4000-8000-000000000003', 'Home Essentials', 'home-essentials', 'Cleaning, paper goods, and everyday household supplies.', 30, true),
  ('10000000-0000-4000-8000-000000000004', 'Personal Care', 'personal-care', 'Trusted care products from local pharmacies and wellness shops.', 40, true),
  ('10000000-0000-4000-8000-000000000005', 'Ready Meals', 'ready-meals', 'Prepared meals and snacks from neighborhood kitchens.', 50, true)
on conflict (slug) do update
set name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active;

insert into public.profiles (id, full_name, email, phone, default_role, onboarding_completed_at)
values
  ('20000000-0000-4000-8000-000000000001', 'Ananya Rao', 'ananya.buyer@vendorhub.local', '+919876543210', 'BUYER', now()),
  ('20000000-0000-4000-8000-000000000002', 'Rohan Mehta', 'rohan.seller@vendorhub.local', '+919812345678', 'SELLER', now()),
  ('20000000-0000-4000-8000-000000000003', 'Meera Iyer', 'meera.admin@vendorhub.local', '+919700001122', 'ADMIN', now()),
  ('20000000-0000-4000-8000-000000000004', 'Farhan Ali', 'farhan.grocer@vendorhub.local', '+919811112233', 'SELLER', now())
on conflict (id) do update
set full_name = excluded.full_name,
    email = excluded.email,
    phone = excluded.phone,
    default_role = excluded.default_role;

insert into public.user_roles (user_id, role, granted_by)
values
  ('20000000-0000-4000-8000-000000000001', 'BUYER', null),
  ('20000000-0000-4000-8000-000000000002', 'SELLER', '20000000-0000-4000-8000-000000000003'),
  ('20000000-0000-4000-8000-000000000003', 'ADMIN', null),
  ('20000000-0000-4000-8000-000000000004', 'SELLER', '20000000-0000-4000-8000-000000000003')
on conflict (user_id, role) do nothing;

insert into public.vendors (id, owner_id, name, slug, description, status, email, phone, service_radius_km, rating_average, rating_count, metadata)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'Malleswaram Morning Basket', 'malleswaram-morning-basket', 'A neighborhood produce seller focused on early morning vegetable and fruit delivery.', 'ACTIVE', 'hello@morningbasket.local', '+918041112233', 4.5, 4.7, 248, '{"locality":"Malleswaram","city":"Bengaluru"}'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000004', 'Indiranagar Daily Pantry', 'indiranagar-daily-pantry', 'A compact essentials shop with pantry refills, cleaning goods, and quick delivery windows.', 'ACTIVE', 'orders@dailypantry.local', '+918044445555', 3.8, 4.5, 183, '{"locality":"Indiranagar","city":"Bengaluru"}'),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'Cantonment Bakehouse', 'cantonment-bakehouse', 'Small-batch breads, buns, rusks, and breakfast boxes baked before sunrise.', 'ACTIVE', 'care@cantonmentbakehouse.local', '+918066667777', 5.0, 4.8, 321, '{"locality":"Cantonment","city":"Bengaluru"}')
on conflict (slug) do update
set description = excluded.description,
    status = excluded.status,
    rating_average = excluded.rating_average,
    rating_count = excluded.rating_count;

insert into public.vendor_members (vendor_id, user_id, role, joined_at)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'OWNER', now()),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000004', 'OWNER', now()),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'OWNER', now())
on conflict (vendor_id, user_id) do update
set role = excluded.role,
    joined_at = excluded.joined_at;

insert into public.vendor_settings (vendor_id, minimum_order_amount, average_prep_minutes, operating_hours)
values
  ('30000000-0000-4000-8000-000000000001', 149, 22, '{"mon":"06:00-21:00","tue":"06:00-21:00","wed":"06:00-21:00","thu":"06:00-21:00","fri":"06:00-21:30","sat":"06:00-21:30","sun":"07:00-20:00"}'),
  ('30000000-0000-4000-8000-000000000002', 199, 28, '{"mon":"08:00-22:00","tue":"08:00-22:00","wed":"08:00-22:00","thu":"08:00-22:00","fri":"08:00-22:30","sat":"08:00-22:30","sun":"09:00-21:00"}'),
  ('30000000-0000-4000-8000-000000000003', 120, 18, '{"mon":"07:00-19:00","tue":"07:00-19:00","wed":"07:00-19:00","thu":"07:00-19:00","fri":"07:00-20:00","sat":"07:00-20:00","sun":"07:30-13:00"}')
on conflict (vendor_id) do update
set minimum_order_amount = excluded.minimum_order_amount,
    average_prep_minutes = excluded.average_prep_minutes,
    operating_hours = excluded.operating_hours;

insert into public.products (id, vendor_id, category_id, name, slug, description, status, base_price, currency, published_at)
values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Nandi Valley Tomato Pack 1 kg', 'nandi-valley-tomato-pack-1kg', 'Firm, tangy tomatoes sorted for same-day cooking and salads.', 'ACTIVE', 48, 'INR', now()),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Breakfast Banana Dozen', 'breakfast-banana-dozen', 'Naturally ripened medium bananas from a Chikkaballapur supplier.', 'ACTIVE', 72, 'INR', now()),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', 'Eco Floor Cleaner Lemongrass 1 L', 'eco-floor-cleaner-lemongrass-1l', 'Low-foam everyday cleaner with a mild lemongrass scent.', 'ACTIVE', 165, 'INR', now()),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004', 'Pharmacy Cotton Roll 200 g', 'pharmacy-cotton-roll-200g', 'Soft absorbent cotton roll suitable for home first-aid kits.', 'ACTIVE', 92, 'INR', now()),
  ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'Millet Sandwich Loaf', 'millet-sandwich-loaf', 'Fresh-baked millet loaf with a soft crumb and nutty finish.', 'ACTIVE', 110, 'INR', now()),
  ('40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000005', 'Paneer Puff Box of 4', 'paneer-puff-box-4', 'Flaky puffs with spiced paneer filling packed for quick tea-time orders.', 'ACTIVE', 160, 'INR', now())
on conflict (vendor_id, slug) do update
set description = excluded.description,
    status = excluded.status,
    base_price = excluded.base_price,
    published_at = excluded.published_at;

insert into public.inventory (vendor_id, product_id, stock_quantity, reserved_quantity, low_stock_threshold, stock_status)
values
  ('30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 86, 8, 15, 'IN_STOCK'),
  ('30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000002', 42, 5, 12, 'IN_STOCK'),
  ('30000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000003', 19, 2, 8, 'IN_STOCK'),
  ('30000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000004', 7, 1, 10, 'LOW_STOCK'),
  ('30000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000005', 23, 4, 8, 'IN_STOCK'),
  ('30000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000006', 12, 3, 10, 'LOW_STOCK')
on conflict (product_id, variant_id) do update
set stock_quantity = excluded.stock_quantity,
    reserved_quantity = excluded.reserved_quantity,
    low_stock_threshold = excluded.low_stock_threshold,
    stock_status = excluded.stock_status;

insert into public.reviews (user_id, product_id, rating, title, body, is_verified_purchase)
values
  ('20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 5, 'Great for rasam and chutney', 'Arrived firm and clean. The pack had a good mix of sizes for cooking.', true),
  ('20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000005', 4, 'Good loaf for weekday toast', 'Slices held together well and stayed soft the next morning.', true);

insert into public.feature_flags (key, description, is_enabled, rollout_percentage, audience)
values
  ('seller_inventory_reservations', 'Enables the future inventory reservation workflow after checkout.', false, 0, '{"roles":["SELLER","ADMIN"]}'),
  ('buyer_realtime_order_tracking', 'Controls future realtime order tracking surfaces.', false, 0, '{"roles":["BUYER"]}'),
  ('ai_search_preview', 'Reserved flag for future AI-assisted product search.', false, 0, '{"roles":["BUYER","ADMIN"]}')
on conflict (key) do update
set description = excluded.description,
    is_enabled = excluded.is_enabled,
    rollout_percentage = excluded.rollout_percentage,
    audience = excluded.audience;
