// MCP-1C — Hyperlocal Commerce engine (public surface).
//
// Location foundation, address intelligence, store network, serviceability,
// store selection, delivery estimation, delivery network and hyperlocal
// intelligence — reusing lib/geo.

export * from "./types";

// Location foundation
export { geohash, normalizeLocation, resolveLocation, isValidPincode, sameCell, type RawLocation } from "./location";

// Address intelligence
export { parseAddress, analyzeAddress, deduplicateAddresses, completeAddress } from "./address";

// Store network
export { buildStoreCoverage, discoverStores, mapTerritories, type StoreDiscoveryResult } from "./store-network";

// Serviceability
export { evaluateServiceability, type ServiceabilityInput } from "./serviceability";

// Store selection
export { selectStore, DEFAULT_WEIGHTS, type StoreSelectionInput, type StoreSelectionWeights } from "./store-selection";

// Delivery estimation
export { estimateDelivery, type DeliveryEstimateInput } from "./delivery-estimation";

// Delivery network
export { buildDeliveryZone, buildDeliveryNetwork, type ZoneInput } from "./delivery-network";

// Hyperlocal intelligence
export { buildHyperlocalIntelligence, type CoverageCellInput } from "./intelligence";

// Sample
export {
  SAMPLE_BUYER,
  SAMPLE_STORES,
  SAMPLE_ADDRESSES,
  SAMPLE_ZONES,
  SAMPLE_COVERAGE_CELLS,
} from "./sample";

import { buildStoreCoverage, mapTerritories } from "./store-network";
import { buildDeliveryNetwork } from "./delivery-network";
import { buildHyperlocalIntelligence } from "./intelligence";
import { evaluateServiceability } from "./serviceability";
import { SAMPLE_COVERAGE_CELLS, SAMPLE_STORES, SAMPLE_ZONES } from "./sample";
import type { AdminLocationSnapshot, Coordinates, SellerHyperlocalSnapshot, StoreLocation } from "./types";

/** Build the seller hyperlocal snapshot for a store. */
export function buildSellerHyperlocalSnapshot(store: StoreLocation, network = buildDeliveryNetwork(SAMPLE_ZONES), sampleBuyers: Coordinates[] = []): SellerHyperlocalSnapshot {
  const coverage = buildStoreCoverage(store);
  const serviceabilitySample = sampleBuyers.map((buyer) => evaluateServiceability({ store, buyer }));
  const zones = network.zones.filter((z) => (store.zones ?? []).some((sz) => z.name.toLowerCase().includes(sz)));
  const deliveryHealth = Math.round(
    (store.fulfillmentRate ?? 90) * 0.5 + Math.max(0, 100 - coverage.utilization) * 0.3 + (coverage.available ? 100 : 0) * 0.2,
  );

  const intelligence = buildHyperlocalIntelligence(SAMPLE_COVERAGE_CELLS, network);
  const alerts = intelligence.recommendations.filter((r) => r.kind === "coverage_gap" || r.kind === "demand_hotspot" || r.kind === "zone_risk").slice(0, 5);

  const briefing = [
    `Coverage: ${coverage.serviceRadiusKm} km radius (~${coverage.coverageAreaSqKm} sq km), zones ${coverage.zones.join(", ") || "none"}.`,
    `Capacity: ${coverage.ordersToday}/${coverage.capacityPerDay} orders today (${coverage.utilization}% used).`,
    `Delivery health ${deliveryHealth}/100; fulfillment ${store.fulfillmentRate ?? 90}%.`,
    alerts.length ? `${alerts.length} territory/coverage opportunity(ies) nearby.` : "No coverage alerts.",
  ];

  return { storeId: store.storeId, name: store.name, coverage, serviceabilitySample, deliveryHealth, zones: zones.length ? zones : network.zones, alerts, briefing };
}

/** Build the admin location-governance snapshot. */
export function buildAdminLocationSnapshot(stores: StoreLocation[] = SAMPLE_STORES): AdminLocationSnapshot {
  const network = buildDeliveryNetwork(SAMPLE_ZONES);
  const intelligence = buildHyperlocalIntelligence(SAMPLE_COVERAGE_CELLS, network);
  // territory mapping is part of the network view
  void mapTerritories(stores);
  return {
    network,
    intelligence,
    stores: stores.length,
    serviceablePincodes: intelligence.serviceablePincodes,
    coverageRate: intelligence.coverageRate,
  };
}
