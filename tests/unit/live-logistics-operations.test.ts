import { describe, expect, it, vi } from "vitest";
import { evaluateDeliveryDensity, rankZonesByPressure } from "@/features/logistics/density";
import { scoreDispatchCandidate, prioritizeDispatch } from "@/features/logistics/dispatch-intelligence";
import { estimateAdaptiveDeliveryEta } from "@/features/logistics/eta";
import { planProviderFailover } from "@/features/logistics/providers";
import type { DispatchCandidate, LogisticsProviderHealth, LogisticsZoneSignal } from "@/features/logistics/types";

const healthyProviders: LogisticsProviderHealth[] = [
  { provider: "seller_self", state: "HEALTHY", priority: 90, averageLatencyMs: 100, failureCount: 0 },
  { provider: "shiprocket", state: "OUTAGE", priority: 70, averageLatencyMs: 3400, failureCount: 7 },
  { provider: "porter", state: "HEALTHY", priority: 65, averageLatencyMs: 700, failureCount: 1 },
  { provider: "dunzo", state: "COOLDOWN", priority: 45, averageLatencyMs: 900, failureCount: 2 },
];

const pressuredZone: LogisticsZoneSignal = {
  zoneId: "chennai-central",
  city: "Chennai",
  activeDeliveries: 58,
  pendingDispatches: 44,
  availableCapacity: 45,
  sellerCount: 32,
  averageEtaMinutes: 68,
  providerFailureCount: 2,
  slaBreachCount: 6,
};

function candidate(id: string, zone = pressuredZone): DispatchCandidate {
  return {
    delivery: {
      id,
      vendorId: "vendor-1",
      mode: "shiprocket",
      status: "DELIVERY_PENDING",
      distanceKm: 4.2,
      prepMinutes: 18,
      etaMinutes: 32,
      etaConfidence: "medium",
      createdAt: "2026-05-27T09:00:00.000Z",
      updatedAt: "2026-05-27T09:10:00.000Z",
    },
    sellerPriority: 82,
    zone,
    providerHealth: healthyProviders,
    paymentReady: true,
    sellerReady: true,
  };
}

describe("phase 32 live logistics operations", () => {
  it("detects zone density pressure and hotspot actions", () => {
    const density = evaluateDeliveryDensity(pressuredZone);

    expect(density.hotspot).toBe(true);
    expect(density.congestion).toMatch(/high|critical/);
    expect(density.recommendedAction).toMatch(/rebalance_capacity|ops_intervention/);
  });

  it("ranks zones deterministically by delivery pressure", () => {
    const ranked = rankZonesByPressure([
      { ...pressuredZone, zoneId: "zone-b", activeDeliveries: 30, pendingDispatches: 10 },
      { ...pressuredZone, zoneId: "zone-a", activeDeliveries: 80, pendingDispatches: 70 },
    ]);

    expect(ranked[0].zoneId).toBe("zone-a");
  });

  it("scores dispatch with provider failover and density-aware ETA", () => {
    vi.setSystemTime(new Date("2026-05-27T10:00:00.000Z"));
    const decision = scoreDispatchCandidate(candidate("delivery-1"));

    expect(decision.provider).not.toBe("shiprocket");
    expect(decision.failoverProvider).toBeDefined();
    expect(decision.degraded).toBe(true);
    expect(decision.etaMinutes).toBeGreaterThan(32);
  });

  it("prioritizes delayed assignable deliveries ahead of newer work", () => {
    vi.setSystemTime(new Date("2026-05-27T10:00:00.000Z"));
    const decisions = prioritizeDispatch([
      candidate("newer", { ...pressuredZone, activeDeliveries: 10, pendingDispatches: 4, averageEtaMinutes: 25, providerFailureCount: 0, slaBreachCount: 0 }),
      candidate("older", { ...pressuredZone, activeDeliveries: 10, pendingDispatches: 4, averageEtaMinutes: 25, providerFailureCount: 0, slaBreachCount: 0 }),
    ]);

    expect(decisions[0].score).toBeGreaterThanOrEqual(decisions[1].score);
  });

  it("plans deterministic provider failover with retry isolation", () => {
    const failover = planProviderFailover({
      requestedProvider: "shiprocket",
      health: healthyProviders,
      delivery: { mode: "shiprocket", distanceKm: 4, etaConfidence: "medium" },
      reason: "timeout",
      now: new Date("2026-05-27T10:00:00.000Z"),
    });

    expect(failover.failedOverTo).not.toBe("shiprocket");
    expect(failover.deterministic).toBe(true);
    expect(failover.retryIsolated).toBe(true);
    expect(failover.cooldownMinutes).toBe(15);
  });

  it("keeps ETA realistic under city load, provider latency, and SLA pressure", () => {
    const eta = estimateAdaptiveDeliveryEta({
      distanceKm: 5,
      prepMinutes: 20,
      mode: "seller_self",
      densityPressure: 0.82,
      providerLatencyMs: 2600,
      historicalSlaScore: 58,
      dispatchBacklog: 160,
      cityLoad: 0.88,
      lastEtaMinutes: 35,
      lastUpdatedAt: "2026-05-27T09:20:00.000Z",
    });

    expect(eta.confidence).toBe("low");
    expect(eta.estimatedMinutes).toBeGreaterThan(50);
    expect(eta.pressure).toBeGreaterThan(0.8);
  });
});
