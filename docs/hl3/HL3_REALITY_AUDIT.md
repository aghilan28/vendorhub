# HL3 Reality Audit - ETA Engine & Delivery Time Intelligence

## Classifications

### Existing Geo Engines: PARTIAL
- `lib/geo/spatial.ts` provides basic Haversine distance and a primitive ETA calculation.
- `lib/geo/delivery.ts` checks feasibility but lacks granular mode-based travel time.

### Existing Ranking Engines: REAL
- `lib/hyperlocal-discovery/index.ts` implements a multi-signal ranking engine.
- `features/intelligence/search-ranking.ts` provides buyer-facing search ranking.

### Existing Store Classification: PARTIAL
- `lib/hyperlocal-discovery/index.ts` classifies products by perishability.
- Store types (Dark Store, Pharmacy, etc.) are used in logic but not centrally modeled for fulfillment timings.

### Existing Availability Systems: REAL
- `product.stockCount` and `inventory` tables are used across the system.
- Availability is a core signal in ranking.

### Existing Delivery Systems: PARTIAL
- `features/logistics/eta.ts` contains an advanced `estimateAdaptiveDeliveryEta`.
- This needs to be moved/integrated into a formal `lib/eta` engine as per HL-3 requirements.

### Existing Seller Systems: REAL
- `lib/api/queries/seller.ts` handles vendor data and performance snapshots.

### Existing Intelligence Dependencies: PARTIAL
- `lib/ai/ranking-intelligence.ts` exists but is focused on ranking rather than ETA-specific intelligence.

### Existing Operations Dependencies: PARTIAL
- `lib/hyperlocal-operations/index.ts` exists but is minimal.

### Existing Location Systems: REAL
- `lib/geo/locations.ts` and `spatial.ts` handle coordinates and distances reliably.

### Existing Fulfillment Systems: PARTIAL
- `fulfillmentPromiseMinutes` exists in vendor/product metadata but isn't broken down into picking/packing/dispatch.

## Conclusion
The foundation exists but the ETA logic is fragmented between `lib/geo` and `features/logistics`. HL-3 will consolidate and harden this into a dedicated `lib/eta` engine with database-backed audit and risk modeling.
