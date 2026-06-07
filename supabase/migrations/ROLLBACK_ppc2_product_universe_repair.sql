-- ROLLBACK for PP-C2 product universe (run manually if needed)
BEGIN;
DELETE FROM public.inventory WHERE vendor_id IN (SELECT id FROM public.vendors WHERE slug LIKE 'vh-%');
DELETE FROM public.products  WHERE vendor_id IN (SELECT id FROM public.vendors WHERE slug LIKE 'vh-%');
DELETE FROM public.vendor_members WHERE vendor_id IN (SELECT id FROM public.vendors WHERE slug LIKE 'vh-%');
DELETE FROM public.vendors  WHERE slug LIKE 'vh-%';
-- profiles/auth users left intact by default; uncomment to remove:
-- DELETE FROM public.profiles WHERE email LIKE 'owner+vh-%@vendorhub.in';
-- DELETE FROM auth.users WHERE email LIKE 'owner+vh-%@vendorhub.in';
COMMIT;
