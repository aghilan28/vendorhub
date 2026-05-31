# EC-4 Phase 5 — Serviceability Certification

**Source:** `lib/hyperlocal/serviceability.ts` (`evaluateServiceability`), `lib/geo/delivery.ts` (`canDeliver`, `deliveryFeasibility`).

| Aspect | Status | Evidence |
|--------|--------|----------|
| Can deliver? | ✅ REAL | `evaluateServiceability` → `canDeliver: true` when within radius/zone (executed) |
| Cannot deliver? | ✅ REAL | far buyer (BLR store → Delhi buyer) → `canDeliver: false` (executed) |
| Boundary handling | ✅ REAL | distance vs `serviceRadiusKm` boundary check |
| Radius handling | ✅ REAL | `radiusKm` in result; per-store `serviceRadiusKm` |
| Zone handling | ✅ REAL | `buyerZone` parameter; zone check among the 6 serviceability checks |
| Capacity handling | ✅ REAL | `capacityPerDay`/`ordersToday` feed operational check |
| Inventory-aware delivery | ✅ REAL | `inStock` gates serviceability/selection |
| Multi-store eligibility | ✅ REAL | `selectStore` evaluates all stores, reports `serviceable` count |

## Result shape (verified)
`ServiceabilityResult { status, canDeliver, reason, distanceKm, radiusKm, checks[], score 0-100, confidence 0-100 }` — explainable (returns *why*).

## Executed evidence (`ec4-hyperlocal-scale.test.ts`)
near = deliverable (score > 0); far = not deliverable; `buyer: null` = degrade (cannot-deliver, no crash); zone-aware probe works.

**Status: PASS.**
