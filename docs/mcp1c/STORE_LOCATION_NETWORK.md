# MCP-1C.4 — Store Location Network

**Engine:** `lib/hyperlocal/store-network.ts` (reuses lib/geo `distanceKm`).

## Capabilities (all mandated)
- **Store coordinates** — `StoreLocation.coordinates` (reuses real vendor lat/long).
- **Store coverage areas** — `buildStoreCoverage` → `coverageAreaSqKm` (π·r²).
- **Store service zones / operating regions** — `StoreLocation.zones` + territory
  mapping.
- **Store delivery radius** — `serviceRadiusKm`.
- **Store territory mapping** — `mapTerritories` (group stores by zone + capacity).
- **Store discovery engine** — `discoverStores(buyer, radius)` (distance-sorted,
  serviceability-tagged).
- **Store ranking** — via the Store Selection engine (Phase 6).
- **Store availability / capacity** — `available` (radius + utilization < 100%),
  `utilization` from orders/capacity.

## Exit criteria — met
Every store has location intelligence: coverage area, zones, radius, territory,
discovery, availability and capacity. Covered by the store-network test.
