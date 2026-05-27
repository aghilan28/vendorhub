import { describe, expect, it } from "vitest";
import {
  buildEdgeCachePolicy,
  buildEdgeInvalidation,
  diagnoseEdgeInvalidationReplay,
  diagnoseGlobalReplay,
  dedupeEdgeInvalidations,
  evaluateGlobalLoad,
  geoRealtimeBackoff,
  planCacheRepair,
  planGlobalRealtime,
  planRealtimeReconnectRecovery,
  planRegionalFailover,
  planRegionalRecovery,
  resolveGlobalRegion,
  routeAsyncJobToRegion,
  simulateGlobalFailure,
  validateGlobalCompatibility,
  validateGlobalInfrastructure,
  type RegionHealthSignal,
} from "@/lib/global-infrastructure";
import { evaluateOperationalAlerts } from "@/lib/observability/alerts";

const quietSignals = {
  checkoutFailureRate: 0,
  paymentMismatchCount: 0,
  webhookRetryCount: 0,
  openIntegrityAlerts: 0,
  realtimeReconnects: 0,
  activeRealtimeChannels: 0,
  aiFallbackRate: 0,
  staleEmbeddingCount: 0,
  dbFailedWrites: 0,
  authFailureCount: 0,
  refundOpenCount: 0,
  deliveryDelayedCount: 0,
  moderationBacklog: 0,
};

const health: RegionHealthSignal[] = [
  { region: "bom1", state: "OUTAGE", latencyMs: 80, saturation: 1, queuePressure: 1, realtimePressure: 1, cacheInconsistency: 9, replayBacklog: 900, observabilityLagSeconds: 400, capabilities: ["commerce", "logistics", "ai", "finance", "governance", "analytics", "realtime", "edge"] },
  { region: "sin1", state: "HEALTHY", latencyMs: 120, saturation: 0.35, queuePressure: 0.2, realtimePressure: 0.2, cacheInconsistency: 0, replayBacklog: 10, observabilityLagSeconds: 8, capabilities: ["commerce", "logistics", "ai", "finance", "governance", "analytics", "realtime", "edge"] },
  { region: "fra1", state: "DEGRADED", latencyMs: 200, saturation: 0.75, queuePressure: 0.7, realtimePressure: 0.6, cacheInconsistency: 1, replayBacklog: 80, observabilityLagSeconds: 30, capabilities: ["commerce", "logistics", "ai", "finance", "governance", "analytics", "realtime", "edge"] },
  { region: "iad1", state: "HEALTHY", latencyMs: 260, saturation: 0.3, queuePressure: 0.25, realtimePressure: 0.25, cacheInconsistency: 0, replayBacklog: 20, observabilityLagSeconds: 10, capabilities: ["commerce", "logistics", "ai", "finance", "governance", "analytics", "realtime", "edge"] },
];

describe("phase 36 global infrastructure", () => {
  it("routes around regional outages with deterministic fallbacks", () => {
    const decision = resolveGlobalRegion({
      request: { preferredRegion: "bom1", domain: "commerce", consistencyRequired: true, latencySensitive: true, tenantId: "org-1" },
      health,
    });
    const asyncRoute = routeAsyncJobToRegion({ jobName: "payment.webhook.reconcile", preferredRegion: "bom1", tenantId: "org-1", health });

    expect(decision.region).toBe("sin1");
    expect(decision.consistencyMode).toBe("regional_strong");
    expect(decision.routingKey).toHaveLength(64);
    expect(decision.observabilityTags).toContain("geo.region.sin1");
    expect(asyncRoute.queueRegionKey).toBe("sin1:commerce.checkout");
  });

  it("plans regional failover without corrupting critical consistency", () => {
    const plan = planRegionalFailover({ failedRegion: "bom1", health, affectedCapabilities: ["commerce", "finance", "governance"] });

    expect(plan.targetRegion).toBe("sin1");
    expect(plan.trafficMode).toBe("read_only");
    expect(plan.replayStrategy).toBe("freeze_then_reconcile");
    expect(plan.actions).toContain("freeze critical writes until regional truth is reconciled");
    expect(plan.recoveryCursor).toHaveLength(64);
  });

  it("dedupes edge invalidation storms and repairs stale regional cache versions", () => {
    const policy = buildEdgeCachePolicy({ keyParts: ["marketplace", "home"], region: "bom1", version: "v2" });
    const invalidation = buildEdgeInvalidation({ policy, reason: "catalog_update", now: new Date("2026-05-27T00:00:00.000Z") });
    const dedupe = dedupeEdgeInvalidations([invalidation, invalidation]);
    const diagnostics = diagnoseEdgeInvalidationReplay([invalidation, invalidation, invalidation]);
    const repair = planCacheRepair({
      expectedVersion: "v2",
      versionsByRegion: { bom1: "v1", sin1: "v2", fra1: "v2", iad1: "v2" },
      invalidations: [invalidation, invalidation],
    });

    expect(dedupe.replayedCount).toBe(1);
    expect(repair.safe).toBe(false);
    expect(repair.staleRegions).toEqual(["bom1"]);
    expect(repair.actions).toContain("repair regional cache version cursor");
    expect(repair.diagnostics.consistencyGuaranteed).toBe(false);
    expect(diagnostics.stormDetected).toBe(true);
  });

  it("throttles geo realtime floods while preserving replay recovery", () => {
    const plan = planGlobalRealtime({ tenantId: "org-1", channel: "orders", preferredRegion: "bom1", health, eventRatePerSecond: 900, duplicateRate: 0.2 });
    const backoff = geoRealtimeBackoff({ eventRatePerSecond: 900, regionalPressure: 0.9, duplicateRate: 0.2 });

    expect(plan.primaryRegion).toBe("sin1");
    expect(plan.throttleInvalidations).toBe(true);
    expect(plan.replayRecovery).toBe(true);
    expect(plan.floodProtection).toBe("shed_low_priority");
    expect(backoff.batchWindowMs).toBeGreaterThanOrEqual(1500);
  });

  it("stabilizes regional recovery and realtime reconnects before failback", () => {
    const recoveringHealth: RegionHealthSignal[] = health.map((signal) =>
      signal.region === "bom1"
        ? { ...signal, state: "RECOVERY", saturation: 0.4, queuePressure: 0.2, realtimePressure: 0.2, cacheInconsistency: 0, replayBacklog: 20, observabilityLagSeconds: 20 }
        : signal,
    );
    const recovery = planRegionalRecovery({ region: "bom1", health: recoveringHealth, observedStableSeconds: 700 });
    const reconnect = planRealtimeReconnectRecovery({ region: "sin1", reconnects: 400, activeSubscriptions: 12000, duplicateRate: 0.12 });

    expect(recovery.canFailback).toBe(true);
    expect(recovery.writeMode).toBe("active");
    expect(reconnect.stable).toBe(false);
    expect(reconnect.recoveryActions).toContain("pin reconnects to primary region");
  });

  it("diagnoses cross-region replay skew without accepting corrupt cursors", () => {
    const diagnostics = diagnoseGlobalReplay({
      events: [
        { replayKey: "r1", region: "bom1", sequence: 1 },
        { replayKey: "r1", region: "sin1", sequence: 2 },
        { replayKey: "r2", region: "fra1", sequence: 900 },
        { replayKey: "r3", region: "fra1", sequence: 1 },
      ],
      maxRegionalSkew: 100,
    });

    expect(diagnostics.replaySafe).toBe(false);
    expect(diagnostics.quarantineKeys).toEqual(["r1"]);
    expect(diagnostics.actions).toContain("resume regional queues from accepted cursors");
  });

  it("validates global load and failure simulation with graceful degradation", () => {
    const report = validateGlobalInfrastructure(
      {
        regions: health,
        replayAnomalies: 2,
        edgeBacklog: 900,
        crossRegionDesync: 1,
        load: {
          regionalOutages: 1,
          crossRegionTraffic: 5000,
          edgeInvalidations: 3000,
          realtimeEvents: 6000,
          queueBacklog: 4000,
          aiRegionalLoad: 2200,
          financeReconciliationEvents: 1200,
          activeRegions: 4,
        },
      },
      new Date("2026-05-27T00:00:00.000Z"),
    );
    const failure = simulateGlobalFailure("cross_region_replay_storm");

    expect(report.productionSafe).toBe(false);
    expect(report.risks).toEqual(expect.arrayContaining(["regional_outage", "edge_cache_consistency", "cross_region_replay_or_desync", "global_saturation"]));
    expect(report.regionalObservabilityReady).toBe(false);
    expect(report.recoveryDeterministic).toBe(true);
    expect(evaluateGlobalLoad({ regionalOutages: 0, crossRegionTraffic: 100, edgeInvalidations: 100, realtimeEvents: 100, queueBacklog: 100, aiRegionalLoad: 100, financeReconciliationEvents: 50, activeRegions: 4 }).safe).toBe(true);
    expect(failure.globalTruthProtected).toBe(true);
  });

  it("verifies AI, finance, governance, and logistics remain geo-compatible", () => {
    const report = validateGlobalCompatibility({
      aiReplayAnomalies: 0,
      financeReplayFrequency: 0.02,
      governanceReplayAnomalies: 0,
      logisticsFailovers: 4,
      regionalCoverage: {
        ai: ["bom1", "sin1"],
        finance: ["bom1", "sin1"],
        governance: ["bom1", "fra1"],
        logistics: ["bom1", "sin1", "iad1"],
      },
    });

    expect(report.compatible).toBe(true);
    expect(report.domains.finance.regionAware).toBe(true);
  });

  it("surfaces geo-distributed operational alerts", () => {
    const alerts = evaluateOperationalAlerts({
      ...quietSignals,
      regionalOutageCount: 1,
      crossRegionDesyncCount: 1,
      failoverInstabilityCount: 1,
      edgeCacheCorruptionCount: 1,
      realtimeGeoInstabilityCount: 1,
      regionalQueueSaturationCount: 1,
      observabilityFragmentationCount: 1,
      globalReplayAnomalyCount: 1,
    });

    expect(alerts.map((alert) => alert.id)).toEqual(
      expect.arrayContaining(["global-regional-failover-risk", "cross-region-consistency-risk", "edge-cache-corruption-risk", "geo-operational-fragmentation-risk"]),
    );
  });
});
