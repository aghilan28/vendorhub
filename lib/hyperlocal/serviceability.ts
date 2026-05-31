// MCP-1C Phase 5 — Serviceability Engine (deterministic, pure).
//
// Determines can-deliver / cannot-deliver / why, with coverage / distance /
// radius / zone / operational / risk validation, a serviceability score and a
// confidence. Reuses lib/geo `distanceKm`.

import { distanceKm } from "@/lib/geo";
import type { Coordinates, ServiceabilityCheck, ServiceabilityResult, StoreLocation } from "./types";

export interface ServiceabilityInput {
  store: StoreLocation;
  buyer: Coordinates | null;
  buyerZone?: string;
  buyerPincode?: string;
}

export function evaluateServiceability(input: ServiceabilityInput): ServiceabilityResult {
  const { store, buyer } = input;
  const checks: ServiceabilityCheck[] = [];

  const hasCoverage = typeof store.serviceRadiusKm === "number" && store.serviceRadiusKm > 0 && Number.isFinite(store.coordinates?.latitude);
  checks.push({ id: "coverage", passed: hasCoverage, detail: hasCoverage ? `Service radius ${store.serviceRadiusKm} km configured.` : "Store has no service radius configured." });

  const distance = buyer ? distanceKm(buyer, store.coordinates) : null;
  const hasDistance = distance !== null;
  checks.push({ id: "distance", passed: hasDistance, detail: hasDistance ? `${distance!.toFixed(1)} km from store.` : "Buyer location unknown." });

  const radius = store.serviceRadiusKm ?? null;
  const withinRadius = hasDistance && radius !== null && distance! <= radius;
  checks.push({ id: "radius", passed: Boolean(withinRadius), detail: hasDistance && radius !== null ? (withinRadius ? "Within delivery radius." : `Outside ${radius} km radius.`) : "Radius check pending." });

  const zoneKnown = !store.zones || store.zones.length === 0 || !input.buyerZone;
  const zoneOk = zoneKnown || (input.buyerZone ? store.zones!.includes(input.buyerZone) : true);
  checks.push({ id: "zone", passed: zoneOk, detail: store.zones && input.buyerZone ? (zoneOk ? `Zone ${input.buyerZone} served.` : `Zone ${input.buyerZone} not in store zones.`) : "No zone restriction." });

  const utilization = store.capacityPerDay ? Math.round(((store.ordersToday ?? 0) / store.capacityPerDay) * 100) : 0;
  const operationalOk = utilization < 100;
  checks.push({ id: "operational", passed: operationalOk, detail: store.capacityPerDay ? `Capacity ${utilization}% used.` : "Capacity not tracked." });

  const fulfillmentRate = store.fulfillmentRate ?? 95;
  const riskOk = fulfillmentRate >= 70 && utilization < 110;
  checks.push({ id: "risk", passed: riskOk, detail: riskOk ? "No elevated operational risk." : `Risk: fulfillment ${fulfillmentRate}%, utilization ${utilization}%.` });

  // status
  let status: ServiceabilityResult["status"];
  let reason: string;
  if (!hasDistance || !hasCoverage) {
    status = "unknown";
    reason = !hasCoverage ? "Store coverage not configured." : "Select a delivery location.";
  } else if (!withinRadius || !zoneOk) {
    status = "not_serviceable";
    reason = !zoneOk ? `Zone ${input.buyerZone} is not served.` : `Address is outside the ${radius} km delivery radius.`;
  } else if (!operationalOk || !riskOk || (radius !== null && distance! > radius * 0.85)) {
    status = "limited";
    reason = !operationalOk ? "Store is near capacity — limited delivery." : distance! > (radius ?? 0) * 0.85 ? "Edge-of-zone delivery — limited windows." : "Limited delivery due to operational risk.";
  } else {
    status = "serviceable";
    reason = "Delivery available to this address.";
  }

  const passed = checks.filter((c) => c.passed).length;
  const score = Math.round((passed / checks.length) * 100);

  // confidence higher when distance known and well within radius
  let confidence = score;
  if (hasDistance && radius !== null) {
    const proximity = Math.max(0, 1 - distance! / Math.max(1, radius));
    confidence = Math.round(score * 0.6 + proximity * 40);
  }

  return {
    status,
    canDeliver: status === "serviceable" || status === "limited",
    reason,
    distanceKm: distance,
    radiusKm: radius,
    checks,
    score,
    confidence: Math.max(0, Math.min(100, confidence)),
  };
}
