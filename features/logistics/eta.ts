import type { AdaptiveEtaSignal, DeliveryMode, DeliveryStatus } from "./types";

type EtaInput = {
  distanceKm: number;
  prepMinutes: number;
  mode: DeliveryMode;
  serviceRadiusKm?: number;
  trafficFactor?: "light" | "normal" | "heavy";
  status?: DeliveryStatus;
  lastEtaMinutes?: number | null;
  lastUpdatedAt?: string | null;
};

const modePickupBuffer: Record<DeliveryMode, number> = {
  seller_self: 8,
  shiprocket: 18,
  porter: 12,
  dunzo: 10,
};

const trafficMultiplier = {
  light: 0.9,
  normal: 1,
  heavy: 1.22,
};

export function estimateDeliveryEta(input: EtaInput) {
  const traffic = input.trafficFactor ?? "normal";
  const travelMinutes = Math.max(8, input.distanceKm * 5.2 * trafficMultiplier[traffic]);
  const providerBuffer = modePickupBuffer[input.mode];
  const edgePenalty = input.serviceRadiusKm && input.distanceKm > input.serviceRadiusKm * 0.8 ? 6 : 0;
  const lifecycleFactor = input.status ? etaLifecycleFactor[input.status] ?? 1 : 1;
  const computedMinutes = Math.round((input.prepMinutes + providerBuffer + travelMinutes + edgePenalty) * lifecycleFactor);
  const stalePenalty = input.lastUpdatedAt && minutesSince(input.lastUpdatedAt) > 15 ? 8 : 0;
  const estimatedMinutes = Math.max(0, Math.round((input.lastEtaMinutes ?? computedMinutes) * 0.35 + computedMinutes * 0.65 + stalePenalty));
  const confidence = input.distanceKm <= 4 && traffic !== "heavy" && stalePenalty === 0 ? "high" : input.distanceKm <= 8 ? "medium" : "low";
  return {
    estimatedMinutes,
    confidence,
    window: `${estimatedMinutes}-${estimatedMinutes + (confidence === "high" ? 7 : 12)} min`,
    reason: `${input.prepMinutes} min prep, ${input.distanceKm.toFixed(1)} km travel, ${input.mode.replace("_", " ")} buffer, ${traffic} traffic, ${input.status ?? "pre-dispatch"} lifecycle`,
  } as const;
}

export function estimateAdaptiveDeliveryEta(input: AdaptiveEtaSignal) {
  const trafficFactor = input.cityLoad > 0.75 || input.densityPressure > 0.7 ? "heavy" : input.cityLoad > 0.45 ? "normal" : "light";
  const base = estimateDeliveryEta({
    distanceKm: input.distanceKm,
    prepMinutes: input.prepMinutes,
    mode: input.mode,
    trafficFactor,
    status: input.status,
    lastEtaMinutes: input.lastEtaMinutes,
    lastUpdatedAt: input.lastUpdatedAt,
  });
  const providerPenalty = Math.min(18, Math.round(input.providerLatencyMs / 500));
  const densityPenalty = Math.round(input.densityPressure * 16);
  const slaPenalty = Math.max(0, Math.round((100 - input.historicalSlaScore) / 8));
  const backlogPenalty = Math.min(15, Math.round(input.dispatchBacklog / 20));
  const estimatedMinutes = Math.max(5, base.estimatedMinutes + providerPenalty + densityPenalty + slaPenalty + backlogPenalty);
  const pressure = Math.max(input.densityPressure, input.cityLoad, input.dispatchBacklog / 180, providerPenalty / 18);
  const confidence = pressure > 0.75 || input.historicalSlaScore < 60 ? "low" : pressure > 0.45 ? "medium" : base.confidence;

  return {
    estimatedMinutes,
    confidence,
    window: `${estimatedMinutes}-${estimatedMinutes + (confidence === "high" ? 7 : confidence === "medium" ? 12 : 18)} min`,
    pressure: Number(pressure.toFixed(3)),
    reason: `${base.reason}; density ${Math.round(input.densityPressure * 100)}%, provider ${input.providerLatencyMs}ms, SLA ${input.historicalSlaScore}, backlog ${input.dispatchBacklog}`,
  } as const;
}

export function etaProgressPercent(status: string) {
  const progress: Record<string, number> = {
    DELIVERY_PENDING: 8,
    READY_FOR_DISPATCH: 28,
    DISPATCHED: 48,
    IN_TRANSIT: 68,
    ARRIVING: 88,
    DELIVERED: 100,
    FAILED: 100,
    RETURN_INITIATED: 72,
    RETURNED: 100,
    CANCELLED: 100,
    PENDING_DISPATCH: 8,
    ASSIGNED: 28,
    PICKUP_PENDING: 28,
    PICKED_UP: 48,
    NEARBY: 88,
  };
  return progress[status] ?? 0;
}

export function estimateHyperlocalDistanceKm(input: { pickupLatitude?: number | null; pickupLongitude?: number | null; dropoffLatitude?: number | null; dropoffLongitude?: number | null }) {
  if (input.pickupLatitude == null || input.pickupLongitude == null || input.dropoffLatitude == null || input.dropoffLongitude == null) {
    return null;
  }

  const earthRadiusKm = 6371;
  const dLat = toRadians(input.dropoffLatitude - input.pickupLatitude);
  const dLon = toRadians(input.dropoffLongitude - input.pickupLongitude);
  const lat1 = toRadians(input.pickupLatitude);
  const lat2 = toRadians(input.dropoffLatitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

export function deliveryFeasibility(distanceKm: number | null, radiusKm = 5) {
  if (distanceKm == null) return { deliverable: false, state: "unknown", reason: "Delivery distance is unavailable." } as const;
  if (distanceKm <= radiusKm) return { deliverable: true, state: "available", reason: "Within seller delivery radius." } as const;
  if (distanceKm <= radiusKm + 1.5) return { deliverable: true, state: "edge", reason: "Edge-zone delivery; ETA confidence reduced." } as const;
  return { deliverable: false, state: "outside_radius", reason: "Outside seller delivery radius." } as const;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function minutesSince(value: string) {
  return Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
}

const etaLifecycleFactor: Partial<Record<DeliveryStatus, number>> = {
  DELIVERY_PENDING: 1,
  READY_FOR_DISPATCH: 0.78,
  DISPATCHED: 0.52,
  IN_TRANSIT: 0.36,
  ARRIVING: 0.16,
  DELIVERED: 0,
  FAILED: 1,
  RETURN_INITIATED: 0.9,
  RETURNED: 0,
  CANCELLED: 0,
};
