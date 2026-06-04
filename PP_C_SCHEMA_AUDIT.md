# Product Universe Schema Audit (PP-C)

## 1. Current State Assessment

### Table: products
- **Status:** Exists.
- **Required Columns (Missing):**
  - `brand_id` (Currently only in `master_products`)
  - `unit` (Currently in `catalog_product_variants`)
  - `package_size` (Currently in `catalog_product_variants` as quantity/unit)
  - `image_url` (Currently in `product_images` or `catalog_product_images`)
  - `search_terms` (Currently uses `search_document` tsvector and `search_tokens` array)
- **Required Columns (Exists):**
  - `id`
  - `name`
  - `slug`
  - `category_id`
  - `description`
  - `status`
- **Constraints:** `unique(vendor_id, slug)`.
- **Indexes:** GIN index on `search_document`, tsvector.

### Table: master_products
- **Status:** Exists.
- **Role:** Acts as the global catalog for the product universe.
- **Columns:** Contains `brand_id`, `category_id`, `canonical_name`, etc.

### Table: product_variants / catalog_product_variants
- **Status:** Exists.
- **Role:** Handles variants (size, weight, volume).

### Table: brands
- **Status:** Exists.
- **Count:** ~2,000 brands populated in Wave 3.

### Table: categories / departments / subcategories / product_families
- **Status:** Exists.
- **Hierarchy:** L1 (Department) -> L2 (Category) -> L3 (Subcategory) -> L4 (Product Family).

## 2. Required Schema Enhancements

To meet the Primary Success Criteria for Phase PP-C, the `products` table must be hardened with direct access to critical fields.

### Proposed ALTER TABLE public.products:
- `brand_id` uuid REFERENCES brands(id)
- `unit` text
- `package_size` text
- `image_url` text
- `search_terms` text[]

### Required Constraints:
- `category_id` NOT NULL
- `brand_id` NOT NULL
- `status` NOT NULL

### Required Indexes:
- `idx_products_brand_id`
- `idx_products_category_id`
- `idx_products_search_terms` (GIN)
- `idx_products_status_active`

## 3. Audit Conclusion
The current schema is technically sufficient via joins to `master_products` and `brands`, but the requirement explicitly demands these columns in the `products` table. A hardening migration is required before population.
