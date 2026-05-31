# PP3_PRODUCT_ARCHITECTURE

**Program:** VendorHub Product Population — Wave 1 (PP-3)
**Deliverable:** Product Master Foundation & Product Ontology System (`lib/products/`)
**Status:** Built, validated, certified. No products/inventory/sellers populated. PP-1 & PP-2 untouched.

---

## 1. Hierarchy (Phase 1)

```
DEPARTMENT > CATEGORY > SUBCATEGORY > FAMILY > TYPE   (PP-1 taxonomy)
                                              > BRAND   (PP-2 brand universe)
                                              > PRODUCT > SKU > VARIANT   (PP-3)
                                                              > INVENTORY_ITEM (PP-4+)
```

`PRODUCT_HIERARCHY_LEVELS` documents all ten levels. PP-3 owns PRODUCT / SKU / VARIANT; upper levels
are consumed from PP-1 (taxonomy) and PP-2 (brands). INVENTORY_ITEM is defined but populated only by
later waves.

## 2. Module map (`lib/products/`)

| Module | Responsibility |
|---|---|
| `types.ts` | Product master / variant / packaging / SKU / inheritance / governance / validation types |
| `sku.ts` | Deterministic collision-free SKU generation (`generateInternalSku`, `stableHash`) + `UniqueRegistry` |
| `engine.ts` | `ProductEngine` (products + variants + SKU/barcode registries + lookups) + `resolveProducts` |
| `inheritance.ts` | Attribute inheritance across GLOBAL→TAXONOMY→BRAND→PRODUCT→VARIANT + conflict detection (Phase 6) |
| `validation.ts` | `validateProducts` integrity engine (Phase 12) |
| `governance.ts` | `ProductGovernance` — create/edit/archive/restore/approve/reject/merge/split + version history + audit + approval (Phase 7) |
| `search.ts` | Product/SKU/barcode search-readiness projection (Phase 8) |
| `recommendation.ts` | Product/variant similarity + affinity + bundle readiness (Phase 9) |
| `intelligence.ts` | Intelligence hooks + aggregation buckets (Phase 10) |
| `scale.ts` | Synthetic generator + scale certification to 1,000,000 (Phase 13) |
| `sample-products.ts` | Small illustrative sample (Aavin Milk, Dove Shampoo, …) — NOT population |
| `index.ts` | Barrel + `buildSampleProductEngine` / `buildSampleProductSystem` |

## 3. Reuse of PP-1 / PP-2 (no modification, no duplication)

`lib/products` imports `slugify`, `createDeterministicClock`, `TaxonomyEngine`, `AttributeRegistry`
(PP-1), `BrandEngine` (PP-2) and `normalizeCommerceText` (commerce-foundation). Validation binds
products to a real taxonomy engine (department/category) and brand engine. PP-1/PP-2 source unchanged.

## 4. Product master model (Phase 2)

`ProductMaster`: id, name, slug, description, brandId, departmentId (required), categoryId, familyId,
typeId, status, lifecycleStatus, version, attributes, localizedNames (future localization), variants,
created/updated/deletedAt, mergedIntoId, metadata (future marketplace extensions).

## 5. SKU architecture (Phase 3)

`generateInternalSku` → `VH-{DEPT4}-{BRAND4}-{PRODUCTHASH}-{VARIANT}`, where PRODUCTHASH is a
deterministic ~64-bit `stableHash` (two Math.imul FNV streams, no truncation) — unique, deterministic,
collision-resistant (0 collisions at 1,000,000 products / 2,000,000 SKUs), searchable and governable.
Variants also carry vendor / marketplace / supplier SKUs and barcode / UPC / EAN / GTIN identifiers,
all enforced unique by the SKU and barcode registries.

## 6. Variant + packaging (Phases 4–5)

Variants carry typed axes (size, weight, volume, flavor, color, pack_size, material, bundle,
configuration) — e.g. Aavin Milk 500ml/1L/2L, Dove Shampoo 180ml/340ml/650ml. `PackagingSpec` models
UNIT / PACK / MULTIPACK / BOX / CASE / CARTON / BUNDLE with base unit, base quantity and units-per-pack.

## 7. Attribute inheritance (Phase 6)

`resolveInheritance` merges GLOBAL → TAXONOMY → BRAND → PRODUCT → VARIANT (nearest wins), records
overridden values, and detects unknown attributes, invalid enum values (validated against the PP-1
`AttributeRegistry`) and locked-key override conflicts.

## 8. Governance (Phase 7)

`ProductGovernance`: create/edit/archive/restore/approve/reject/merge/split with per-product version
history, an audit trail and an approval workflow. Merge re-parents variants; split distributes variants
into new products.

## 9. Database (Phase 11)

`supabase/migrations/20260531020000_pp3_product_master.sql` (additive + idempotent):
`product_masters`, `product_master_variants`, `product_sku_registry`, `product_barcode_registry`,
`product_packaging_registry`, `product_audit_log`, `product_version_history`, `product_change_requests`;
RLS enabled; reuses `set_updated_at` / `current_user_has_role`; `product_integrity_check()` function.
Existing `master_products` / `products` tables are left untouched.

## 10. Determinism

No `Date.now()` / `Math.random()` in core logic; slug/hash-derived IDs and SKUs, injectable clock.
The sample system builds byte-identically across runs (covered by a test).
