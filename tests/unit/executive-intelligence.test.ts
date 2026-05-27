import { describe, expect, it } from "vitest";
import {
  buildExecutiveCommandCenter,
  detectForecastDrift,
  generateDecisionSupport,
  generateExecutiveForecasts,
  simulateExecutiveIntelligenceFailure,
  validateExecutiveCommandCenter,
  type ExecutiveCommerceSignals,
} from "@/lib/executive-intelligence";
import { evaluateOperationalAlerts } from "@/lib/observability/alerts";

const stressedSignals: ExecutiveCommerceSignals = {
  orders24h: 420,
  orders7d: 1800,
  revenue24h: 480_000,
  revenue7d: 2_900_000,
  activeSellers: 240,
  sellerHealthScore: 68,
  inventoryStockoutRate: 0.28,
  inventoryDaysOfCoverMedian: 3.5,
  fulfillmentDelayRate: 0.18,
  logisticsDispatchBacklog: 180,
  logisticsZonePressure: 0.86,
  payoutLatencyHours: 72,
  financeReplayFrequency: 0.12,
  reconciliationBacklog: 220,
  aiFallbackRate: 0.32,
  aiRankingDrift: 0.42,
  governanceBacklog: 180,
  governanceHighRiskSignals: 14,
  regionalOutages: 1,
  regionalQueuePressure: 0.78,
  platformApiErrorRate: 0.09,
  webhookRetryRate: 0.22,
  autonomousCriticalIncidents: 5,
  remediationLoopSignals: 1,
  observabilityLagSeconds: 260,
  realtimeReconnects: 80,
  replayAnomalyRate: 0.06,
  tenantLeakageSignals: 0,
};

describe("phase 39 executive commerce intelligence", () => {
  it("builds explainable replay-safe executive forecasts", () => {
    const forecasts = generateExecutiveForecasts(stressedSignals, new Date("2026-05-27T02:00:00.000Z"));
    const drift = detectForecastDrift(forecasts);

    expect(forecasts.length).toBeGreaterThanOrEqual(7);
    expect(forecasts.every((forecast) => forecast.assumptions.length > 0)).toBe(true);
    expect(forecasts.every((forecast) => forecast.replaySnapshotKey)).toBe(true);
    expect(forecasts.some((forecast) => forecast.metric === "order_demand")).toBe(true);
    expect(drift.driftRate).toBeGreaterThan(0);
  });

  it("aggregates executive command center intelligence across domains", () => {
    const snapshot = buildExecutiveCommandCenter({
      signals: stressedSignals,
      now: new Date("2026-05-27T02:00:00.000Z"),
    });
    const validation = validateExecutiveCommandCenter(snapshot, stressedSignals, new Date("2026-05-27T02:00:00.000Z"));

    expect(snapshot.executiveSummary).toContain("strategic score");
    expect(snapshot.anomalies.length).toBeGreaterThan(3);
    expect(snapshot.recommendations.length).toBeGreaterThan(3);
    expect(snapshot.timeline.every((event) => event.replayTraceKey.length === 64)).toBe(true);
    expect(snapshot.observability.explainability).toContain("Recommendations are advisory decision support and never replace human executives or governance approval.");
    expect(validation.forecastObservable).toBe(true);
    expect(validation.metrics.financeVolatilityIndicator).toBeGreaterThan(0.5);
  });

  it("keeps recommendations advisory and governance-aware", () => {
    const forecasts = generateExecutiveForecasts(stressedSignals, new Date("2026-05-27T02:00:00.000Z"));
    const snapshot = buildExecutiveCommandCenter({
      signals: { ...stressedSignals, tenantLeakageSignals: 1 },
      now: new Date("2026-05-27T02:00:00.000Z"),
    });
    const recommendations = generateDecisionSupport({
      signals: { ...stressedSignals, tenantLeakageSignals: 1 },
      forecasts,
      anomalies: snapshot.anomalies,
    });

    expect(recommendations.some((item) => item.domain === "governance" && item.requiresHumanApproval)).toBe(true);
    expect(recommendations.every((item) => item.replayTraceKey.length === 64)).toBe(true);
    expect(recommendations.every((item) => !item.recommendation.toLowerCase().includes("automatically approve"))).toBe(true);
  });

  it("survives executive intelligence failure simulations", () => {
    const failure = simulateExecutiveIntelligenceFailure("executive_alert_overload");
    const replay = simulateExecutiveIntelligenceFailure("replay_inconsistency");

    expect(failure.executiveTruthProtected).toBe(true);
    expect(failure.autonomousReplacement).toBe(false);
    expect(replay.recoveryActions).toContain("recompute replay-safe timeline");
  });

  it("emits executive intelligence alert guardrails", () => {
    const alerts = evaluateOperationalAlerts({
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
      executiveForecastDriftCount: 3,
      executiveAlertOverloadCount: 1,
      strategicAnomalySpikeCount: 4,
      marketplaceGrowthSaturation: 0.9,
      financeVolatilityIndicator: 1.1,
      logisticsOverloadPrediction: 0.95,
    });

    expect(alerts.map((alert) => alert.id)).toEqual(expect.arrayContaining(["executive-intelligence-stability-risk", "executive-business-pressure-risk"]));
  });
});
