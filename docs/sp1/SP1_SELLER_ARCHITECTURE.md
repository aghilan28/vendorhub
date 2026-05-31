# SP1_SELLER_ARCHITECTURE

**Program:** VendorHub Marketplace Population — Wave 2 (SP-1)
**Deliverable:** Seller Universe & Store Network (`lib/sellers/`)
**Status:** Built, validated, certified. Wave-1 foundations and existing vendor/seller tables untouched.

## 1. Model (Phases 1–2)

- **Seller** — a business/chain or its regional operating entity: id, name, slug, sellerType
  (ENTERPRISE/CHAIN/REGIONAL/FRANCHISE/INDEPENDENT), legalEntity, businessType, verificationStatus,
  taxId (synthetic GSTIN-style, no PII), operationalStatus, lifecycleStatus, `parentChainId`
  (traceability to the real chain), homeRegion, metadata.
- **Store** — an outlet owned by a seller: id, name, slug, storeType (classification), departments
  (PP-1 slugs), description, sellerId, verification/operational/lifecycle status, location
  (city/area/region/pincode/lat/lng), operatingHours, metadata.

A seller owns many stores; a chain (national parent) owns many regional sellers.

## 2. Module map (`lib/sellers/`)

| Module | Responsibility |
|---|---|
| `types.ts` | Seller/Store/classification/governance/validation types |
| `engine.ts` | `SellerNetworkEngine` (sellers + stores + ownership traversal + indexes) + resolvers |
| `classification.ts` | Store classification engine + store-type→department mapping (Phase 5) |
| `validation.ts` | Validation engine (Phase 10) |
| `governance.ts` | `StoreGovernance` — create/edit/archive/restore/approve/reject/verify/suspend + version history + audit + approval (Phase 6) |
| `search.ts` | Seller/store/category/location/chain search readiness (Phase 7) |
| `analytics.ts` | Seller/store performance, coverage, density, expansion, penetration hooks (Phase 8) |
| `canonical-sellers.ts` | Real chain dataset + deterministic seller/store population |
| `scale.ts` | Synthetic generator + scale certification (Phase 11) |
| `index.ts` | Barrel + `buildCanonicalSellerNetwork` |

## 3. Reuse & determinism

Reuses `slugify`, `createDeterministicClock` (PP-1) and `CommerceRegion`. Stores map to PP-1
departments via `STORE_TYPE_DEPARTMENTS`. Deterministic slug/hash IDs + injectable clock; no
`Date.now()`/`Math.random()`. Wave-1 and existing `vendors`/`seller_*` tables are not modified.

## 4. Database (Phase 9)

`supabase/migrations/20260531040000_sp1_seller_universe.sql` (additive + idempotent):
`seller_universe`, `store_universe`, `store_classification`, `store_verification`, `store_audit_log`,
`store_version_history`, `store_change_requests`; RLS enabled; reuses `set_updated_at`/`current_user_has_role`;
`seller_network_integrity_check()` function. Existing `vendors`/`seller_*` tables are untouched.
