# SP2_REALITY_AUDIT

**Program:** VendorHub Marketplace Completion — Wave 2 (SP-2): Store Classification, Category & Capability
**Method:** Source-code audit only. Reports not trusted; SP-1 code, migrations and `lib/` inspected.
**Audited ref:** branch `sp2-store-classification` (cut from `sp1-seller-universe`, carrying Wave 1 + SP-1).

---

## 0. Headline

SP-1 delivered the canonical seller + store universe (1,147 sellers, 7,320 stores) with a basic
`storeType` (18 values) and a `store_classification` table. But stores have **no category hierarchy,
no store-format type system, no capability profile, no product capability, and no fulfillment
profile**. There is **no `lib/store-classification/` engine**.

SP-2 builds the canonical classification + capability + fulfillment layer on top of SP-1 (consumed
via imports), classifies all 7,320 stores, and adds an additive migration — without modifying SP-1
or starting inventory / product mappings / hyperlocal ranking.

---

## 1. Subsystem classification (REAL / PARTIAL / MISSING)

| # | Subsystem | Status | Evidence |
|---|---|---|---|
| 1 | Seller classifications | **REAL** | SP-1 `seller.sellerType` (ENTERPRISE/CHAIN/REGIONAL/FRANCHISE/INDEPENDENT) |
| 2 | Vendor classifications | **PARTIAL** | legacy `vendors` table; not used by SP-1/SP-2 |
| 3 | Store classifications | **PARTIAL** | SP-1 `storeType` (18) + `store_classification` table; no category hierarchy/capability/fulfillment |
| 4 | Taxonomy integrations | **REAL (available)** | SP-1 `STORE_TYPE_DEPARTMENTS` maps store types → PP-1 departments |
| 5 | Search dependencies | **REAL (available)** | SP-1 `buildStoreSearchIndex`; SP-2 adds classification/capability search readiness |
| 6 | Recommendation dependencies | **MISSING** | no store similarity/affinity readiness |
| 7 | Intelligence dependencies | **MISSING** | no store health/growth/risk hooks |
| 8 | SP-1 integration points | **REAL (available)** | `SellerNetworkEngine`, `Store`, `STORE_TYPE_DEPARTMENTS`, `buildCanonicalSellerNetwork` |
| — | `lib/store-classification/` | **MISSING** | directory does not exist (the deliverable) |

**Summary:** SP-1 substrate REAL; the category/capability/fulfillment classification layer is MISSING.

---

## 2. Constraints captured

- Do not modify or restructure SP-1; consume `SellerNetworkEngine`/`Store`/`STORE_TYPE_DEPARTMENTS`
  via imports. Reuse `slugify`/`createDeterministicClock` (PP-1).
- Additive, idempotent migration (per `ops-migration-audit`); new namespaced tables
  (`store_category_taxonomy`, `store_type_registry`, `store_capability_profiles`,
  `store_fulfillment_profiles`, `store_compliance_profiles`, `store_capability_assignments`, audit/governance);
  do not reuse SP-1's `store_classification` table name. RLS; reuse `set_updated_at`/`current_user_has_role`.
- Deterministic derivation (no `Date.now()`/`Math.random()`).
- No inventory, product mappings, delivery networks, or hyperlocal ranking.

## 3. Decision

Build `lib/store-classification/` (category engine, capability engine, fulfillment engine, validation,
governance, and search/recommendation/intelligence projections), deterministically classify all 7,320
SP-1 stores (category L1/L2 + store-format type + capability profile + product capability + fulfillment
profile), add an additive migration, deterministic tests, scale certification (1k/5k/10k/50k) and docs.
