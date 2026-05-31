# EC-4 Phase 4 — Store Discovery Certification

**Source:** `lib/hyperlocal/store-network.ts`, `lib/geo/spatial.ts`, `/nearby`, `lib/hyperlocal-discovery/`.

| Aspect | Status | Evidence |
|--------|--------|----------|
| Nearby store discovery | ✅ REAL | `discoverStores(stores, buyer, radiusKm)` → distance-filtered results (executed at 10/100/1k/10k) |
| Store ranking | ✅ REAL | `selectStore` ranked output; `rankVendorsByGeo` geo score |
| Store search | ✅ REAL | discovery + search radius parameter |
| Store categories | ✅ REAL | `StoreLocation.zones`; category via product catalog |
| Store visibility | ✅ REAL | discovery respects `serviceRadiusKm` |
| Store availability | ✅ REAL | `inStock`, `capacityPerDay`, `ordersToday` fields drive availability |
| Store health | ✅ REAL | `fulfillmentRate`, `trustScore`, `rating` in selection scoring |
| Store filtering | ✅ REAL | radius + serviceability gating |
| Store sorting | ✅ REAL | multi-factor ranked order in `selectStore` |

## Executed evidence (`ec4-hyperlocal-scale.test.ts`)
`discoverStores` + `selectStore` run across 10/100/1,000/10,000 generated stores; `selection.evaluated === n`; nearest store deliverable.

## Honest scope
Live store data requires populated `vendors`/store-location rows; the discovery **engine** operates on real `StoreLocation` shapes and degrades to sample without DB.

**Status: PASS.**
