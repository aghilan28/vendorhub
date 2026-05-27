import { estimateAdaptiveDeliveryEta } from "./eta";
import { evaluateDeliveryDensity } from "./density";
import { chooseLogisticsProvider } from "./providers";
import type { DispatchCandidate, DispatchDecision } from "./types";

export function scoreDispatchCandidate(candidate: DispatchCandidate): DispatchDecision {
  const density = evaluateDeliveryDensity(candidate.zone);
  const providerPlan = chooseLogisticsProvider({
    delivery: candidate.delivery,
    health: candidate.providerHealth,
    sellerSelfAvailable: true,
  });
  const ageMinutes = minutesSince(candidate.delivery.createdAt);
  const staleMinutes = minutesSince(candidate.delivery.updatedAt);
  const sellerPriority = candidate.sellerPriority ?? 50;
  const paymentPenalty = candidate.paymentReady === false ? 100 : 0;
  const sellerPenalty = candidate.sellerReady === false ? 35 : 0;
  const densityPenalty = Math.round(density.pressure * 28);
  const staleBoost = Math.min(30, Math.round(staleMinutes / 3));
  const ageBoost = Math.min(25, Math.round(ageMinutes / 4));
  const providerPenalty = providerPlan.degraded ? 12 : 0;
  const score = Math.max(0, Math.min(100, sellerPriority + staleBoost + ageBoost - densityPenalty - providerPenalty - sellerPenalty - paymentPenalty));
  const eta = estimateAdaptiveDeliveryEta({
    distanceKm: candidate.delivery.distanceKm,
    prepMinutes: candidate.delivery.prepMinutes,
    mode: providerPlan.primary,
    status: candidate.delivery.status,
    densityPressure: density.pressure,
    providerLatencyMs: candidate.providerHealth?.find((item) => item.provider === providerPlan.primary)?.averageLatencyMs ?? 0,
    historicalSlaScore: Math.max(30, 100 - candidate.zone.slaBreachCount * 6),
    dispatchBacklog: candidate.zone.pendingDispatches,
    cityLoad: density.pressure,
    lastEtaMinutes: candidate.delivery.etaMinutes,
    lastUpdatedAt: candidate.delivery.updatedAt,
  });
  const assignable = candidate.paymentReady !== false && score >= 35 && density.congestion !== "critical";

  return {
    deliveryId: candidate.delivery.id,
    assignable,
    score,
    provider: providerPlan.primary,
    failoverProvider: providerPlan.failover,
    priority: !assignable ? "deferred" : score >= 82 || staleMinutes > 30 ? "critical" : score >= 65 ? "high" : "normal",
    reason: assignable
      ? `${providerPlan.primary} selected; ${density.congestion} zone pressure; score ${score}.`
      : `Dispatch deferred by ${candidate.paymentReady === false ? "payment readiness" : density.congestion === "critical" ? "critical zone congestion" : "seller/provider pressure"}.`,
    etaMinutes: eta.estimatedMinutes,
    density,
    degraded: providerPlan.degraded || density.hotspot,
  };
}

export function prioritizeDispatch(candidates: DispatchCandidate[]) {
  return candidates
    .map(scoreDispatchCandidate)
    .sort((left, right) => Number(right.assignable) - Number(left.assignable) || right.score - left.score || left.deliveryId.localeCompare(right.deliveryId));
}

function minutesSince(value: string) {
  return Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
}
