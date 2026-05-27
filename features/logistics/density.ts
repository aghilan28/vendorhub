import type { LogisticsDensityDecision, LogisticsZoneSignal } from "./types";

export function evaluateDeliveryDensity(zone: LogisticsZoneSignal): LogisticsDensityDecision {
  const activePressure = zone.activeDeliveries / Math.max(1, zone.availableCapacity);
  const dispatchPressure = zone.pendingDispatches / Math.max(1, zone.availableCapacity);
  const sellerDensity = zone.sellerCount / Math.max(1, zone.availableCapacity);
  const etaPressure = zone.averageEtaMinutes / 75;
  const providerPressure = zone.providerFailureCount / 8;
  const slaPressure = zone.slaBreachCount / 12;
  const pressure = clamp01(Math.max(activePressure, dispatchPressure, etaPressure, providerPressure, slaPressure) * 0.72 + Math.min(1, sellerDensity) * 0.28);
  const congestion = pressure >= 0.9 ? "critical" : pressure >= 0.7 ? "high" : pressure >= 0.45 ? "medium" : "low";
  const capacityBalance = Number((zone.availableCapacity / Math.max(1, zone.activeDeliveries + zone.pendingDispatches)).toFixed(3));
  const hotspot = congestion === "high" || congestion === "critical";

  return {
    zoneId: zone.zoneId,
    pressure: Number(pressure.toFixed(3)),
    congestion,
    capacityBalance,
    hotspot,
    recommendedAction:
      congestion === "critical"
        ? "ops_intervention"
        : congestion === "high"
          ? "rebalance_capacity"
          : congestion === "medium"
            ? "pace_dispatch"
            : "normal_dispatch",
  };
}

export function rankZonesByPressure(zones: LogisticsZoneSignal[]) {
  return zones.map(evaluateDeliveryDensity).sort((left, right) => right.pressure - left.pressure || left.zoneId.localeCompare(right.zoneId));
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
