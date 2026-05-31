// MCP-1C Phase 7 — Delivery Estimation Engine (deterministic, pure).
//
// Computes ETA, delivery window, confidence, delay risk and a time breakdown
// (fulfillment + travel + operational + marketplace). Reuses lib/geo `distanceKm`.

import { distanceKm } from "@/lib/geo";
import type { Coordinates, DeliveryEstimate, StoreLocation } from "./types";

const AVG_SPEED_KMPH = 22; // urban hyperlocal courier average
const MARKETPLACE_OVERHEAD_MIN = 4; // routing/assignment overhead

export interface DeliveryEstimateInput {
  store: StoreLocation;
  buyer: Coordinates | null;
  /** Current store utilization 0..100 (optional; derived from store if absent). */
  utilization?: number;
}

export function estimateDelivery(input: DeliveryEstimateInput): DeliveryEstimate {
  const { store, buyer } = input;
  const distance = buyer ? distanceKm(buyer, store.coordinates) : null;

  const utilization =
    input.utilization ?? (store.capacityPerDay ? Math.round(((store.ordersToday ?? 0) / store.capacityPerDay) * 100) : 0);

  const fulfillmentMinutes = store.fulfillmentPromiseMinutes ?? 30;
  const travelMinutes = distance === null ? 0 : Math.round((distance / AVG_SPEED_KMPH) * 60) + 2;
  // operational time grows with utilization (queueing)
  const operationalMinutes = Math.round((utilization / 100) * 15);
  const marketplaceMinutes = MARKETPLACE_OVERHEAD_MIN;

  if (distance === null) {
    return {
      etaMinutes: null,
      windowStartMinutes: null,
      windowEndMinutes: null,
      confidence: 0,
      delayRisk: 0,
      breakdown: { fulfillmentMinutes, travelMinutes: 0, operationalMinutes, marketplaceMinutes },
      label: "Set a delivery location to see ETA",
    };
  }

  const etaMinutes = fulfillmentMinutes + travelMinutes + operationalMinutes + marketplaceMinutes;
  // window: ±20% around ETA, min ±6 min
  const spread = Math.max(6, Math.round(etaMinutes * 0.2));
  const windowStartMinutes = Math.max(10, etaMinutes - Math.round(spread / 2));
  const windowEndMinutes = etaMinutes + spread;

  // delay risk: utilization + low fulfillment rate + long distance
  const fulfillmentRate = store.fulfillmentRate ?? 95;
  let delayRisk = 0;
  delayRisk += Math.max(0, utilization - 70) * 0.6;
  delayRisk += Math.max(0, 95 - fulfillmentRate) * 1.2;
  delayRisk += distance > (store.serviceRadiusKm ?? 8) * 0.85 ? 18 : 0;
  delayRisk = Math.max(0, Math.min(100, Math.round(delayRisk)));

  const confidence = Math.max(0, Math.min(100, 100 - delayRisk));

  return {
    etaMinutes,
    windowStartMinutes,
    windowEndMinutes,
    confidence,
    delayRisk,
    breakdown: { fulfillmentMinutes, travelMinutes, operationalMinutes, marketplaceMinutes },
    label: `${windowStartMinutes}–${windowEndMinutes} min`,
  };
}
