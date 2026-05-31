# SP2_CLASSIFICATION_ARCHITECTURE

**Program:** VendorHub Marketplace Completion — Wave 2 (SP-2)
**Deliverable:** Store Classification, Category & Capability System (`lib/store-classification/`)
**Status:** Built, validated, certified. SP-1 (and Wave 1) untouched.

## 1. What every store now has

Each SP-1 store is enriched with a deterministic classification profile:

- **Category** — Level-1 (Retail/Food/Healthcare/Electronics/Fashion/Home/Services/Specialty/Automotive/Pet) → Level-2.
- **Store-format type** — National/Regional/Local Chain, Independent, Franchise, Flagship, Warehouse, Dark Store, Fulfillment Center, Micro Hub, Hybrid.
- **Capability profile** — delivery, pickup, sameDay, instantDelivery, COD, returns, refunds, bulkOrders, subscription, b2b, b2c, hyperlocal.
- **Product capability** — allowed/restricted departments + compliance requirements (e.g. Pharmacy → drug licence, can't sell electronics/fashion).
- **Fulfillment profile** — modes (pickup/store-delivery/courier/partner/warehouse/dark-store/hybrid) + primary mode + radius.

## 2. Module map (`lib/store-classification/`)

| Module | Responsibility |
|---|---|
| `types.ts` | Category/type/capability/fulfillment/validation/governance types |
| `category.ts` | Category hierarchy + store-type→category map + format-type derivation (Phases 1-2) |
| `capability.ts` | Capability + product-capability derivation (Phases 3-4) |
| `fulfillment.ts` | Fulfillment engine (Phase 5) |
| `engine.ts` | `StoreClassificationEngine` (profiles + L1/L2/format/capability indexes) + `classifyStore` |
| `validation.ts` | Validation engine (Phase 10) |
| `governance.ts` | `ClassificationGovernance` — assign/edit/override/approve/reject/reset + audit + approval (Phase 9) |
| `search.ts` | Category/type/capability/fulfillment search readiness (Phase 6) |
| `recommendation.ts` | Store similarity/alternatives/ranking inputs (Phase 7) |
| `intelligence.ts` | Store health/growth/risk/… hooks + buckets (Phase 8) |
| `scale.ts` | Scale certification (Phase 12) |
| `index.ts` | Barrel + `buildCanonicalStoreClassification` |

## 3. Reuse & determinism

Consumes SP-1 `SellerNetworkEngine`/`Store`/`STORE_TYPE_DEPARTMENTS` via imports (SP-1 unmodified).
Everything is derived deterministically from store type + seller type + a stable store-id hash; no
`Date.now()`/`Math.random()`.

## 4. Database (Phase 9)

`supabase/migrations/20260531050000_sp2_store_classification.sql` (additive + idempotent):
`store_category_taxonomy`, `store_type_registry`, `store_capability_profiles`, `store_fulfillment_profiles`,
`store_compliance_profiles`, `store_capability_assignments`, plus audit + change-request tables; RLS
enabled; reuses `set_updated_at`/`current_user_has_role`; `store_classification_integrity_check()` function.
SP-1's `store_classification` table and `seller_universe`/`store_universe` are untouched.
