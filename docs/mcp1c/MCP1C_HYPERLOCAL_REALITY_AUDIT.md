# MCP-1C — Hyperlocal Reality Audit (evidence-based, from code)

> Source of truth for this phase. Grounded in file paths verified on the MCP-1B
> tip (`feat/mcp1b-catalog-population`). Prior reports were not trusted.

## Verified starting state
- `tsc --noEmit` ✅ · `eslint .` ✅ (1 pre-existing warning) · `vitest` ✅ 411/46 · `next build` ✅ (pre-1C).
- Chain: 0A…0G + 1A + 1B complete. node_modules present.

## Capability classification

| Capability | Class | Evidence | 1C action |
|---|---|---|---|
| GPS services / coordinates | **Real** | `lib/geo/spatial.ts` — `isValidCoordinates`, `vendorCoordinates`; `Vendor.latitude/longitude`, `BuyerLocation`. | Reuse. |
| Maps integration | **Partial** | `features/geo/components/map-preview.tsx` (static preview). | Out of scope (no new map vendor); reuse. |
| Distance calculation | **Real** | `distanceKm` (haversine) + `formatDistance` in `lib/geo/spatial.ts`. | Reuse as engine primitive. |
| Address validation | **Partial** | MCP-1A onboarding validates pincode/format; no parsing/completion/dedup/eligibility. | Build Address Intelligence platform. |
| Store coordinates | **Real** | `vendorCoordinates(vendor)`. | Reuse. |
| Buyer coordinates | **Real** | `defaultBuyerLocation`, `chennaiLocationPresets` (`lib/geo/locations.ts`). | Reuse. |
| Location storage | **Partial** | vendor lat/long columns; PostGIS noted in audits. | Engine consumes coordinates; storage unchanged. |
| Geospatial queries | **Real (env-gated)** | logistics RPCs (`lib/logistics/live-operations.ts`), PostGIS hyperlocal (Marketplace Reality Audit). | Reuse; degrade to deterministic engine. |
| Serviceability logic | **Partial** | `deliveryFeasibility` (status/distance/radius/ETA) + `canDeliver` in `lib/geo`. | Build a full Serviceability engine (reasons + score + confidence + zone/operational/risk). |
| Delivery estimation | **Partial** | `deliveryFeasibility.etaMinutes` (single number). | Build Delivery Estimation engine (window/confidence/delay-risk/breakdown). |
| Routing logic | **Partial** | logistics dispatch RPCs (`run_live_dispatch_intelligence`). | Build store-selection + delivery network on top. |
| Location search | **Real** | `geocodeAddress`, `cityCenterFallback` (`lib/geo/geocoder.ts`); hyperlocal-discovery search. | Reuse. |
| Nearest store selection | **Partial** | `rankVendorsByGeo`/`geoScoreForVendor` (distance-only). | Build multi-factor Store Selection engine. |
| Location intelligence | **Partial** | `lib/hyperlocal-operations` (`buildGeoCommerceProfile`, `buildDeliveryIntelligence`). | Build Hyperlocal Intelligence (coverage gaps/hotspots/expansion). |

## Reuse map (do NOT rebuild)
`lib/geo` (`distanceKm`, `isValidCoordinates`, `deliveryFeasibility`,
`geoScoreForVendor`, `rankVendorsByGeo`, `geocodeAddress`, location presets),
`lib/hyperlocal-operations` (geo commerce, delivery intelligence),
`lib/hyperlocal-discovery` (search), `lib/logistics` (dispatch/SLA RPCs),
`lib/commerce-transaction` + `lib/seller-activation` (trust/fulfillment signals).

## What MCP-1C builds (`lib/hyperlocal/`)
A deterministic engine reusing `lib/geo`: location foundation (geohash,
normalize/validate/resolve/score/confidence, zones/boundaries), address
intelligence (parse/validate/complete/dedupe/eligibility), store location network
(coverage/zones/radius/territory/availability/capacity), serviceability engine
(can-deliver + reasons + score + confidence), nearest-store selection
(multi-factor), delivery estimation (ETA/window/confidence/delay-risk),
delivery network (zones/territories/capacity/courier/health), and hyperlocal
intelligence (coverage gaps/demand hotspots/expansion/delivery+zone risks).

## Honest scope
No live DB in the sandbox; live reads degrade to clearly-labelled samples
(`sampled: true`). The engine computes deterministically (haversine + scoring);
real geocoding/PostGIS/courier execution remain env-gated and reuse the existing
RPCs. Geohash is computed in-engine (no external lib).
