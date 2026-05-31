# PP1_REALITY_AUDIT

**Program:** VendorHub Product Population — Wave 1 (PP-1): Canonical Commerce Taxonomy Foundation
**Method:** Source-code audit only. The directive's premise ("0 categories / 0 populated catalog")
was **not trusted** — it was checked against migrations, `lib/`, `types/`, and `app/`.
**Audited ref:** `main` @ `4df0098` → work branch `pp1-taxonomy-foundation`.

---

## 0. Headline finding (premise correction)

The directive states VendorHub has *0 categories* and must build taxonomy "before any product
ingestion can happen." **At the data-row level this is true** (no product/category rows are seeded
for general commerce). **At the schema/code level it is not** — a substantial taxonomy foundation
already exists:

- A `public.taxonomy_level` enum: `DEPARTMENT, CATEGORY, SUBCATEGORY, PRODUCT_FAMILY, PRODUCT_GROUP, PRODUCT, VARIANT, SKU`.
- Tables: `departments`, `categories` (extended), `subcategories`, `product_families`, `brands`,
  plus reference tables (`units`, `traditional_units`, `packaging_types`, `perishability_profiles`,
  `delivery_constraints`), `master_products`, `catalog_product_variants`, `search_tokens`,
  `multilingual_mappings`, `seller_products`, `seller_inventory`.
- `lib/commerce-foundation/catalog.ts` (normalization, SKU, search representation) and
  `@/types/commerce-foundation` (incl. a flat `TaxonomyNode` interface, `MASTER_DEPARTMENTS` = 23 slugs).
- `lib/catalog-governance/engine.ts` (catalog quality scoring, duplicate detection, bulk normalization).

**What is genuinely MISSING** is the directive's required deliverable: a unified, deterministic
**`lib/taxonomy/` engine** — a single hierarchical source-of-truth with traversal, an attribute
framework, a validation engine, a governance/merge/split layer, search/recommendation/intelligence
*readiness* projections, a canonical sample taxonomy (26+ departments, 500+ categories), deterministic
tests, and scale certification. PP-1 builds exactly this, **on top of** (not duplicating) the
existing schema.

---

## 1. Subsystem classification (REAL / PARTIAL / MISSING)

| # | Taxonomy-related subsystem | Status | Evidence |
|---|---|---|---|
| 1 | Category tables | **REAL** | `categories` (phase_1, extended in `tier_1_commerce_foundation`), with `department_id`, `taxonomy_level`, slug, multilingual, discovery tags |
| 2 | Department / subcategory / product-family tables | **REAL** | `departments`, `subcategories`, `product_families` in `tier_1_commerce_foundation.sql` |
| 3 | Taxonomy hierarchy *levels* | **REAL (enum)** | `public.taxonomy_level` enum (8 levels) |
| 4 | Unified hierarchical node engine (traversal/parent/child) | **MISSING** | no `lib/taxonomy/`; per-level tables only, no unlimited-depth node model |
| 5 | Attribute framework (reusable definitions) | **PARTIAL** | ad-hoc `jsonb` columns (`dietary_classification`, `ontology_metadata`); no reusable, de-duplicated attribute registry |
| 6 | Brand classification | **REAL (schema)** | `brands` table (PP-2 will populate) |
| 7 | Catalog models | **REAL** | `master_products`, `catalog_product_variants`, images/logistics profiles |
| 8 | Search dependencies | **PARTIAL** | `search_tokens`, `master_products.search_document` (tsvector), `lib/commerce-foundation.buildSearchRepresentation`; no taxonomy-level search-readiness projection |
| 9 | Recommendation dependencies | **PARTIAL** | `lib/ai/recommendation-engine.ts`, `personalization.ts` exist but consume products, not a taxonomy affinity/substitution model |
| 10 | Intelligence dependencies | **PARTIAL** | `lib/executive-intelligence`, `lib/ai-commerce-automation` exist; no taxonomy aggregation hooks |
| 11 | Analytics dependencies | **PARTIAL** | analytics consume orders/products; no taxonomy rollup buckets |
| 12 | Taxonomy validation engine | **MISSING** | no circular/orphan/duplicate/depth validators (a `taxonomy_integrity_reports` table exists in `tier_1_5_catalog_governance` but no engine populates it) |
| 13 | Taxonomy governance (create/edit/merge/split/archive/restore + approval) | **MISSING** | RLS admin policies exist on tables, but no governance state machine / audit / merge-split |
| 14 | Scale certification | **MISSING** | none |
| 15 | `lib/taxonomy/` deliverable | **MISSING** | directory does not exist |

**Summary:** 4 REAL, 6 PARTIAL, 5 MISSING. The schema substrate is strong; the *taxonomy engine
layer* the directive demands does not exist yet.

---

## 2. Interoperability constraints captured for the build

- **Reuse, do not duplicate:** the new engine will reuse `CommerceLanguage` / `CommerceRegion` and
  align its 6 directive levels to the existing 8-level `taxonomy_level` enum via a documented map
  (`PRODUCT_TYPE → PRODUCT_GROUP`, `VARIANT_GROUP → VARIANT`).
- **No naming collision:** existing `@/types/commerce-foundation` already exports a flat
  `TaxonomyNode`; the new engine's node type lives in `lib/taxonomy/` (namespaced) to avoid clashes.
- **Migration gate rules** (`scripts/ops-migration-audit.mjs`): no destructive ops; every
  object-creating migration must include an idempotency clause (`if not exists` / `create or replace`
  / `do $$ … exception when duplicate_object`). New migration will be fully additive + idempotent.
- **Existing helpers reused:** `public.set_updated_at()` and `public.current_user_has_role()` exist
  and will back triggers/RLS on the new tables.
- **Determinism:** tests must be 100% deterministic → the engine uses an injectable, deterministic
  clock and path-derived stable IDs (no `Date.now()`/`Math.random()` in core paths).

---

## 3. Decision

Proceed to build `lib/taxonomy/` as the canonical, deterministic taxonomy engine + validation +
governance + search/recommendation/intelligence readiness + canonical sample taxonomy, plus an
additive SQL schema migration (`taxonomy_nodes` + attribute/synonym/governance tables), deterministic
tests, scale certification, and documentation — **extending** the existing foundation, populating
**no products/inventory/sellers/stores**.
