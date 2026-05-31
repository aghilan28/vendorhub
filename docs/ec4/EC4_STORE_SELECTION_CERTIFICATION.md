# EC-4 Phase 6 — Store Selection Certification

**Source:** `lib/hyperlocal/store-selection.ts` (`selectStore`, `DEFAULT_WEIGHTS`).

| Selection dimension | Status | Evidence |
|---------------------|--------|----------|
| Nearest store | ✅ REAL | distance factor in `StoreSelectionFactor.distance` |
| Best store | ✅ REAL | weighted multi-factor → `selection.best` (RankedStore) |
| Inventory-aware | ✅ REAL | `inventory` factor; `inStock` gate |
| Price-aware | ✅ REAL | `price` factor |
| Trust-aware | ✅ REAL | `trust` factor (from `trustScore`) |
| Capacity-aware | ✅ REAL | `capacity` factor (`capacityPerDay`/`ordersToday`) |
| Fulfillment-aware | ✅ REAL | `fulfillment` factor (`fulfillmentRate`) |

## Weighting
`DEFAULT_WEIGHTS` blends all 7 factors (distance/inventory/rating/trust/capacity/fulfillment/price). Output: `StoreSelection { best, ranked[], evaluated, serviceable }`.

## Executed evidence (`ec4-hyperlocal-scale.test.ts`)
`selectStore({stores, buyer})` across 10/100/1,000/10,000 stores: `evaluated === n`, `serviceable ≥ 0`, `best.storeId` present when serviceable candidates exist. Serviceability + stock gates applied before ranking.

**Status: PASS.**
