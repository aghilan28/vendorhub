# SP3_REALITY_AUDIT (Wave 2 — SP-3)

_Vendorhub Marketplace Population Program — GEO INTELLIGENCE, STORE GEOGRAPHY & LOCATION FOUNDATION_

## Audit timestamp

- Generated: 2026-06-02

---

## Evidence sources audited (from repo)

1. `lib/geo/*`
   - `lib/geo/index.ts`
   - `lib/geo/locations.ts`
   - `lib/geo/delivery.ts`
   - `lib/geo/spatial.ts`
   - `lib/geo/types.ts`
2. `types/index.ts`
   - `Vendor` and `BuyerLocation` shape definitions
3. `store/location-store.ts`
   - Browser GPS acquisition and manual presets selection
4. `store/delivery-store.ts`
   - Delivery UI state (not geo-zone foundations)
5. `store/intelligence-store.ts`
   - Behavioral intelligence store (not geo/pincode engines)
6. (Repo directory scan performed)
   - `lib/india/*` (pincode/administrative mapping not found in audited files)
   - `lib/logistics/*` (delivery integration not found as geo-zone foundations in audited files)

---

## Mandatory reality audit: required determinations

### 1) Existing geo libraries

**CLASSIFICATION: REAL**

**What exists**

- A geospatial feasibility + ranking layer is already implemented.

**Evidence**

- `lib/geo/spatial.ts`
  - coordinate validation (`isValidCoordinates`)
  - haversine distance (`distanceKm`)
  - delivery feasibility using `vendor.serviceRadiusKm` (`deliveryFeasibility`)
  - vendor/product geo scoring + ranking (`geoScoreForVendor`, `rankProductsByGeo`, `rankVendorsByGeo`)
- `lib/geo/delivery.ts`
  - wraps feasibility into user-facing delivery availability label (`canDeliver`, `productDeliveryLabel`)
- `lib/geo/types.ts`
  - defines delivery feasibility types and geo-ranked result types

---

### 2) Existing GPS systems

**CLASSIFICATION: REAL (client-side GPS only)**

**What exists**

- Browser geolocation capture for buyer location.

**Evidence**

- `store/location-store.ts`
  - `requestBrowserLocation` uses `navigator.geolocation.getCurrentPosition(...)`

---

### 3) Existing location models

**CLASSIFICATION: PARTIAL**

**What exists**

- `BuyerLocation` is defined and used for feasibility.
- Hardcoded buyer “location presets” exist (Chennai).

**Evidence**

- `types/index.ts`
  - `BuyerLocation` includes: `id`, `label`, `source`, `latitude`, `longitude`, `locality`, `city`, optional `pincode`, optional `accuracyMeters`
- `lib/geo/locations.ts`
  - `chennaiLocationPresets: LocationPreset[]` with latitude/longitude/locality/city/pincode

**What’s missing (for SP-3 “store canonical geographic model”)**

- No canonical “Store Geo Profile” / “Store Location Profile” model with the full required fields (country/state/district/neighborhood/timezone/geohash/confidence/source/status/audit metadata/future localization).
- `Vendor` has optional geo fields but not a structured enrichment/audit model.

---

### 4) Existing pincode systems

**CLASSIFICATION: PARTIAL**

**What exists**

- Pincode exists as optional field on `BuyerLocation`.
- Hardcoded presets include pincode strings.

**Evidence**

- `types/index.ts`
  - `BuyerLocation.pincode?: string`
- `lib/geo/locations.ts`
  - presets include `pincode: "600017"`, etc.

**What’s missing**

- No pincode validation, resolution, lookup, and administrative mapping engine found in audited files.
- No pincode registry model or gap detection/coverage analysis found.

---

### 5) Existing delivery zone systems

**CLASSIFICATION: MISSING (foundation-level zones/polygons not present)**

**What exists**

- Delivery feasibility is radius-based around vendor coordinates (`serviceRadiusKm`), not zone/subzone governance foundations.

**Evidence**

- `types/index.ts`
  - `Vendor.serviceRadiusKm?: number`
- `lib/geo/spatial.ts`
  - `deliveryFeasibility(...)` uses distance vs `radius = vendor.serviceRadiusKm`

**What’s missing**

- No zone model: `Zone`, `Subzone`, `coverage polygon`, `zone type/priority/status/governance` as required by SP-3 Phase 6.
- No polygon coverage generation; no zone governance workflow.

---

### 6) Existing store location fields

**CLASSIFICATION: PARTIAL**

**What exists**

- Store-like entity `Vendor` has optional geo fields.

**Evidence**

- `types/index.ts` (`Vendor`)
  - optional: `latitude?`, `longitude?`, `locality?`, `city?`, `area?`, `serviceRadiusKm?`

**What’s missing**

- No canonical store geo profile structure and no enrichment fields (district/country/state/neighborhood/timezone/geohash/location confidence/location source/status/audit metadata) found in audited types.
- No “coverage profile” model present.

---

### 7) Existing hyperlocal systems

**CLASSIFICATION: PARTIAL**

**What exists**

- “Hyperlocal” behavior currently maps to radius-based feasibility and geo ranking.

**Evidence**

- `lib/geo/spatial.ts`
  - `deliveryFeasibility` returns `available/limited/outside_radius/unknown`
  - `rankProductsByGeo` and `rankVendorsByGeo` based on distance and feasibility

**What’s missing**

- No store clustering system (city/locality/pincode/market/store density/commerce cluster).
- No store coverage engine with tiers/classifications (urban/semi-urban/rural/metro/hyperlocal/regional).
- No geo-search-ready structures for nearest-store/pincode/city/locality/cluster queries.

---

### 8) Existing map integrations

**CLASSIFICATION: MISSING (not audited/present in inspected modules)**

**Evidence**

- No map integration module was identified in audited files.
- Only browser GPS capture exists.

**Note**

- This audit is based on the audited files listed under “Evidence sources audited”.

---

### 9) Existing intelligence integrations

**CLASSIFICATION: PARTIAL**

**What exists**

- Behavioral intelligence is tracked (not geo intelligence).

**Evidence**

- `store/intelligence-store.ts`
  - stores `BehavioralCommerceEvent[]` for ranking behavior

**What’s missing**

- No explicit “geo intelligence projections” layer found.
- No integration between geo models and intelligence systems discovered in audited files.

---

## Summary table (requested classifications)

| Area                               | Classification          |
| ---------------------------------- | ----------------------- |
| Existing geo libraries             | REAL                    |
| Existing GPS systems               | REAL (client-side only) |
| Existing location models           | PARTIAL                 |
| Existing pincode systems           | PARTIAL                 |
| Existing delivery zone systems     | MISSING                 |
| Existing store location fields     | PARTIAL                 |
| Existing hyperlocal systems        | PARTIAL                 |
| Existing map integrations          | MISSING                 |
| Existing intelligence integrations | PARTIAL                 |

---

## Reality audit conclusion (SP-3 readiness)

SP-3 cannot be “implemented by refactor” of existing canonical store geometry because:

- Delivery feasibility exists, but it is **radius-based** and **not** zone/polygon/coverage-governed.
- Pincode and administrative mapping are **not** implemented as engines.
- There is no canonical store geo profile/coverage profile schema yet (required full field set missing).

Therefore SP-3 must introduce **new canonical geographic intelligence models** and **additive database migrations**, while staying non-destructive to SP-1 and SP-2 (as mandated).

---
