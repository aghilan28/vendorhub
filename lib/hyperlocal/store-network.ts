// MCP-1C Phase 4 — Store Location Network (deterministic, pure).
//
// Store coverage areas, service zones, delivery radius, territory mapping,
// discovery, ranking and availability/capacity. Reuses lib/geo `distanceKm`.

import { distanceKm } from "@/lib/geo";
import { evaluateServiceability } from "./serviceability";
import type { Coordinates, StoreCoverage, StoreLocation } from "./types";

/** Coverage profile for a store (area, zones, utilization, availability). */
export function buildStoreCoverage(store: StoreLocation): StoreCoverage {
  const radius = store.serviceRadiusKm ?? 0;
  const coverageAreaSqKm = Math.round(Math.PI * radius * radius);
  const capacityPerDay = store.capacityPerDay ?? 0;
  const ordersToday = store.ordersToday ?? 0;
  const utilization = capacityPerDay ? Math.min(200, Math.round((ordersToday / capacityPerDay) * 100)) : 0;
  return {
    storeId: store.storeId,
    name: store.name,
    serviceRadiusKm: radius,
    coverageAreaSqKm,
    zones: store.zones ?? [],
    capacityPerDay,
    ordersToday,
    utilization,
    available: radius > 0 && utilization < 100,
  };
}

export interface StoreDiscoveryResult {
  store: StoreLocation;
  distanceKm: number | null;
  serviceable: boolean;
}

/** Discover stores near a buyer within a search radius. */
export function discoverStores(stores: StoreLocation[], buyer: Coordinates | null, searchRadiusKm = 12): StoreDiscoveryResult[] {
  return stores
    .map((store) => {
      const distance = buyer ? distanceKm(buyer, store.coordinates) : null;
      const serviceable = buyer ? evaluateServiceability({ store, buyer }).canDeliver : false;
      return { store, distanceKm: distance, serviceable };
    })
    .filter((r) => r.distanceKm === null || r.distanceKm <= searchRadiusKm)
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
}

/** Territory mapping: group stores by zone. */
export function mapTerritories(stores: StoreLocation[]): Array<{ zone: string; stores: number; capacity: number }> {
  const map = new Map<string, { stores: number; capacity: number }>();
  for (const store of stores) {
    for (const zone of store.zones ?? ["unzoned"]) {
      const entry = map.get(zone) ?? { stores: 0, capacity: 0 };
      entry.stores += 1;
      entry.capacity += store.capacityPerDay ?? 0;
      map.set(zone, entry);
    }
  }
  return [...map.entries()].map(([zone, e]) => ({ zone, ...e })).sort((a, b) => b.stores - a.stores);
}
