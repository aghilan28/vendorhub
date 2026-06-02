import type { StoreType, TransportMode, TrafficIntensity } from "./types";

export interface TravelTimeResult {
  baseMinutes: number;
  confidence: number;
}

const speedKmH: Record<TransportMode, number> = {
  walking: 4.5,
  bike: 15,
  scooter: 25,
  car: 30,
  delivery_vehicle: 28,
};

const trafficMultipliers: Record<TrafficIntensity, number> = {
  light: 0.85,
  normal: 1,
  heavy: 1.35,
  gridlock: 2.2,
};

export function calculateTravelTime(
  distanceKm: number,
  mode: TransportMode,
  traffic: TrafficIntensity = "normal"
): TravelTimeResult {
  const speed = speedKmH[mode];
  const baseMinutes = (distanceKm / speed) * 60;
  const trafficMultiplier = trafficMultipliers[traffic];

  return {
    baseMinutes: Math.max(2, baseMinutes * trafficMultiplier),
    confidence: distanceKm <= 5 ? 0.95 : distanceKm <= 10 ? 0.8 : 0.6,
  };
}

export interface FulfillmentTiming {
  pickingMinutes: number;
  packingMinutes: number;
  dispatchMinutes: number;
  totalMinutes: number;
  confidence: number;
}

const storeTypeFulfillmentBase: Record<StoreType, { picking: number; packing: number; dispatch: number }> = {
  dark_store: { picking: 3, packing: 2, dispatch: 2 },
  pharmacy: { picking: 5, packing: 3, dispatch: 2 },
  supermarket: { picking: 12, packing: 5, dispatch: 3 },
  general_store: { picking: 6, packing: 3, dispatch: 2 },
  specialty_store: { picking: 8, packing: 4, dispatch: 3 },
};

export function calculateFulfillmentTime(
  storeType: StoreType,
  capacity: number = 1, // 0-1, 1 is full capacity
  backlog: number = 0
): FulfillmentTiming {
  const base = storeTypeFulfillmentBase[storeType];
  const capacityFactor = 1 + (1 - capacity) * 0.5; // Up to 50% slower if capacity is low
  const backlogPenalty = Math.min(20, backlog * 1.5); // 1.5 min per order in backlog

  const picking = base.picking * capacityFactor + backlogPenalty * 0.6;
  const packing = base.packing * capacityFactor + backlogPenalty * 0.3;
  const dispatch = base.dispatch + backlogPenalty * 0.1;

  return {
    pickingMinutes: Math.round(picking),
    packingMinutes: Math.round(packing),
    dispatchMinutes: Math.round(dispatch),
    totalMinutes: Math.round(picking + packing + dispatch),
    confidence: capacity > 0.8 ? 0.9 : capacity > 0.5 ? 0.7 : 0.4,
  };
}
