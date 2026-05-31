# PP3_REALITY_AUDIT

**Program:** VendorHub Product Population — Wave 1 (PP-3): Product Master Foundation & Product Ontology
**Method:** Source-code audit only. Reports not trusted; migrations, `lib/`, `types/` inspected directly.
**Audited ref:** branch `pp3-product-master` (cut from `pp2-brand-universe`, carrying PP-1 + PP-2).

---

## 0. Headline

A large product-related **schema** already exists (`master_products`, `products`, `product_variants`,
`catalog_product_variants`, `packaging_types`, `product_families`, `seller_products`, `seller_inventory`,
`inventory*`, plus AI/quality/affinity tables). Commerce-foundation also ships SKU/variant/search
helpers. But there is **no `lib/products/` ontology engine** — no unified product-master model with a
SKU engine, variant engine, attribute-inheritance engine, governance, validation, and
search/recommendation/intelligence projections binding products to PP-1 taxonomy and PP-2 brands.

PP-3 builds that ontology layer **additively**, reusing PP-1 (`lib/taxonomy`) and PP-2 (`lib/brands`)
and the existing commerce-foundation helpers, **without modifying any of them** and **without
populating products / inventory / sellers**.

---

## 1. Subsystem classification (REAL / PARTIAL / MISSING)

| # | Subsystem | Status | Evidence |
|---|---|---|---|
| 1 | Product tables | **PARTIAL** | `master_products`, `products` (phase_1 + tier_1) exist but no unified ontology master |
| 2 | SKU structures | **PARTIAL** | `generateCatalogSku`/`buildVariantCode` in commerce-foundation; no SKU registry / multi-namespace SKU engine (vendor/UPC/EAN/GTIN/marketplace/supplier) |
| 3 | Inventory structures | **REAL (out of scope)** | `inventory`, `seller_inventory`, `inventory_movements`, snapshots — PP-3 must NOT touch/populate these |
| 4 | `master_products` table | **REAL** | `tier_1_commerce_foundation.sql` |
| 5 | Catalog models | **PARTIAL** | `catalog_product_variants`, `catalog_product_images`, `product_logistics_profiles` exist; no canonical variant/packaging ontology engine |
| 6 | PP-1 integration | **REAL (available)** | `@/lib/taxonomy` exports `TaxonomyEngine`, `AttributeRegistry`, `slugify`, clock |
| 7 | PP-2 integration | **REAL (available)** | `@/lib/brands` exports `BrandEngine`, `buildCanonicalBrandEngine` |
| 8 | Search dependencies | **PARTIAL** | `buildSearchRepresentation`, `search_tokens`; no product-ontology search projection |
| 9 | Recommendation dependencies | **PARTIAL** | `product_affinities`, `lib/ai/recommendation-engine.ts`; no product-ontology reco projection |
| 10 | Intelligence dependencies | **PARTIAL** | intelligence subsystems exist; no product-ontology intelligence hooks |
| — | `lib/products/` ontology engine | **MISSING** | directory does not exist |

**Summary:** 2 REAL-available (PP-1/PP-2), 1 REAL out-of-scope (inventory), 6 PARTIAL, 1 MISSING (the deliverable).

---

## 2. Constraints captured

- **No modification/duplication of PP-1, PP-2, or existing schema.** Reuse `slugify`,
  `createDeterministicClock`, `TaxonomyEngine`, `AttributeRegistry` (PP-1), `BrandEngine` (PP-2), and
  `normalizeCommerceText`/`generateCatalogSku` (commerce-foundation).
- **Avoid table-name collisions** with `master_products`/`products`/`product_variants`: PP-3 adds
  `product_masters`, `product_master_variants`, `product_sku_registry`, `product_barcode_registry`,
  `product_packaging_registry`, `product_audit_log`, `product_change_requests`.
- **Additive, idempotent migration** (per `ops-migration-audit`); reuse `set_updated_at` /
  `current_user_has_role`; RLS enabled; integrity functions.
- **No product population / mass datasets / inventory / sellers.** Scale certification uses
  deterministic *synthetic generators* only; a tiny illustrative sample (Aavin Milk, Dove Shampoo,
  per the directive examples) demonstrates the model — it is not population.
- **Determinism:** slug/hash-derived IDs + SKUs, injectable clock; no `Date.now()`/`Math.random()`.

---

## 3. Decision

Build `lib/products/` — product engine, SKU engine, variant engine, inheritance engine, governance
engine, validation engine, and search/recommendation/intelligence projections — plus an additive
migration, deterministic tests, and scale certification to 1,000,000 products. Bind products to PP-1
taxonomy and PP-2 brands. Populate nothing.
