# VENDORHUB SEARCH VALIDATION EVIDENCE
Source: Migration Files (Ground Truth for Populated Data)
--------------------------------------------------

TERM: Milk
QUERY PATH: SELECT * FROM categories/brands WHERE name ILIKE '%Milk%'
RESULT COUNT: 12
SOURCE TABLE: categories
SAMPLE RECORD: INSERT INTO public.categories (id, department_id, name, slug, canonical_name) VALUES ('9ed43ddb-e373-4110-85ca-69bb75fa1f38', '043395db-1df5-4a53-afcc...
SOURCE TABLE: brands
SAMPLE RECORD: INSERT INTO public.brands (id, slug, canonical_name, manufacturer, logo_url, status, metadata) VALUES ('2e589398-14ef-4265-ba5d-dd61eef2568a', 'chenna...

TERM: Dairy
QUERY PATH: SELECT * FROM categories/brands WHERE name ILIKE '%Dairy%'
RESULT COUNT: 12
SOURCE TABLE: categories
SAMPLE RECORD: INSERT INTO public.departments (id, slug, canonical_name) VALUES ('043395db-1df5-4a53-afcc-ee9ff845a16f', 'dairy-breakfast', 'Dairy & Breakfast') ON C...
SOURCE TABLE: brands
SAMPLE RECORD: INSERT INTO public.brands (id, slug, canonical_name, manufacturer, logo_url, status, metadata) VALUES ('86a790a3-a167-4dd8-a665-f47a4f89c5d8', 'mother...

TERM: Aavin
QUERY PATH: SELECT * FROM categories/brands WHERE name ILIKE '%Aavin%'
RESULT COUNT: 1
SOURCE TABLE: brands
SAMPLE RECORD: INSERT INTO public.brands (id, slug, canonical_name, manufacturer, logo_url, status, metadata) VALUES ('fd3b4629-5a7d-4a75-a03f-7da065a419b1', 'aavin'...

TERM: Amul
QUERY PATH: SELECT * FROM categories/brands WHERE name ILIKE '%Amul%'
RESULT COUNT: 1
SOURCE TABLE: brands
SAMPLE RECORD: INSERT INTO public.brands (id, slug, canonical_name, manufacturer, logo_url, status, metadata) VALUES ('23b924ed-698e-497c-96df-f0671b7a31ab', 'amul',...

TERM: Coffee
QUERY PATH: SELECT * FROM categories/brands WHERE name ILIKE '%Coffee%'
RESULT COUNT: 1
SOURCE TABLE: categories
SAMPLE RECORD: INSERT INTO public.subcategories (id, department_id, category_id, slug, canonical_name) VALUES ('bd8aaf53-e67c-45d1-8f1a-09c29f1e79ef', '246b5b35-3752...

TERM: Bru
QUERY PATH: SELECT * FROM categories/brands WHERE name ILIKE '%Bru%'
RESULT COUNT: 2
SOURCE TABLE: categories
SAMPLE RECORD: INSERT INTO public.subcategories (id, department_id, category_id, slug, canonical_name) VALUES ('faac4965-e026-4b00-a6d7-336b11bd40b0', 'd7838e79-a2dd...
SOURCE TABLE: brands
SAMPLE RECORD: INSERT INTO public.brands (id, slug, canonical_name, manufacturer, logo_url, status, metadata) VALUES ('9f8de535-93b5-4cbb-9977-5daa3bd7380c', 'bru', ...

TERM: Horlicks
QUERY PATH: SELECT * FROM categories/brands WHERE name ILIKE '%Horlicks%'
RESULT COUNT: 1
SOURCE TABLE: brands
SAMPLE RECORD: INSERT INTO public.brands (id, slug, canonical_name, manufacturer, logo_url, status, metadata) VALUES ('0cb36545-b2be-4ac6-bfb4-966fb9e77d71', 'horlic...

TERM: Dettol
QUERY PATH: SELECT * FROM categories/brands WHERE name ILIKE '%Dettol%'
RESULT COUNT: 1
SOURCE TABLE: brands
SAMPLE RECORD: INSERT INTO public.brands (id, slug, canonical_name, manufacturer, logo_url, status, metadata) VALUES ('80a82e33-4362-43b4-a5c3-db3ddc57b32b', 'dettol...

TERM: Apple
QUERY PATH: SELECT * FROM categories/brands WHERE name ILIKE '%Apple%'
RESULT COUNT: 1
SOURCE TABLE: brands
SAMPLE RECORD: INSERT INTO public.brands (id, slug, canonical_name, manufacturer, logo_url, status, metadata) VALUES ('77d63644-cb5e-4f4f-8818-3f52406c6c6e', 'apple'...

TERM: Samsung
QUERY PATH: SELECT * FROM categories/brands WHERE name ILIKE '%Samsung%'
RESULT COUNT: 1
SOURCE TABLE: brands
SAMPLE RECORD: INSERT INTO public.brands (id, slug, canonical_name, manufacturer, logo_url, status, metadata) VALUES ('23aa3bf3-ad8c-4a51-9d9f-88fb354dbfb4', 'samsun...

TERM: HP
QUERY PATH: SELECT * FROM categories/brands WHERE name ILIKE '%HP%'
RESULT COUNT: 2
SOURCE TABLE: categories
SAMPLE RECORD: INSERT INTO public.subcategories (id, department_id, category_id, slug, canonical_name) VALUES ('12f94a9e-c433-4a69-93c0-56da2a55c030', 'd7838e79-a2dd...
SOURCE TABLE: brands
SAMPLE RECORD: INSERT INTO public.brands (id, slug, canonical_name, manufacturer, logo_url, status, metadata) VALUES ('2a0daba2-1c96-4ab3-b973-391d7ffa9b79', 'hp', '...

TERM: Dell
QUERY PATH: SELECT * FROM categories/brands WHERE name ILIKE '%Dell%'
RESULT COUNT: 1
SOURCE TABLE: brands
SAMPLE RECORD: INSERT INTO public.brands (id, slug, canonical_name, manufacturer, logo_url, status, metadata) VALUES ('17e917ff-57ea-43b2-922a-1a33c436c923', 'dell',...

TERM: Paracetamol
QUERY PATH: SELECT * FROM categories/brands WHERE name ILIKE '%Paracetamol%'
RESULT COUNT: 0
STATUS: FAILED - NO DATA FOUND
