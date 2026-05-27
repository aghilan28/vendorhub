import { describe, expect, it } from "vitest";
import {
  detectAutonomousIncidents,
  detectRemediationLoop,
  diagnoseAnomalyReplay,
  orchestrateAutonomousRecovery,
  planAutonomousFailover,
  planCascadingFailureContainment,
  planSelfHealing,
  simulateAutonomousFailure,
  validateAutonomousOperations,
  type AutonomousSignalInput,
} from "@/lib/autonomous-operations";
import { evaluateOperationalAlerts } from "@/lib/observability/alerts";
import type { RegionHealthSignal } from "@/lib/global-infrastructure";

const severeSignals: AutonomousSignalInput = {
  queueDepth: 1200,
  queueLatencySeconds: 900,
  retryCount: 160,
  deadLetters: 2,
  replayDuplicates: 340,
  regionalOutages: 1,
  failoverFlaps: 3,
  realtimeReconnects: 80,
  activeRealtimeChannels: 140,
  edgeInvalidationBacklog: 1500,
  aiFallbackRate: 0.5,
  financeReplayRate: 0.12,
  reconciliationBacklog: 180,
  logisticsProviderOutages: 2,
  governanceBacklog: 140,
  webhookRetryRate: 0.25,
  webhookDeadLetters: 12,
  observabilityLagSeconds: 500,
  tenantLeakageSignals: 0,
};

const health: RegionHealthSignal[] = [
  { region: "bom1", state: "OUTAGE", latencyMs: 1000, saturation: 1, queuePressure: 1, realtimePressure: 1, cacheInconsistency: 10, replayBacklog: 900, observabilityLagSeconds: 300, capabilities: ["commerce", "logistics", "ai", "finance", "governance", "analytics", "realtime", "edge"] },
  { region: "sin1", state: "HEALTHY", latencyMs: 120, saturation: 0.3, queuePressure: 0.2, realtimePressure: 0.2, cacheInconsistency: 0, replayBacklog: 10, observabilityLagSeconds: 8, capabilities: ["commerce", "logistics", "ai", "finance", "governance", "analytics", "realtime", "edge"] },
  { region: "fra1", state: "DEGRADED", latencyMs: 220, saturation: 0.7, queuePressure: 0.5, realtimePressure: 0.4, cacheInconsistency: 1, replayBacklog: 50, observabilityLagSeconds: 20, capabilities: ["commerce", "logistics", "ai", "finance", "governance", "analytics", "realtime", "edge"] },
  { region: "iad1", state: "HEALTHY", latencyMs: 260, saturation: 0.35, queuePressure: 0.3, realtimePressure: 0.2, cacheInconsistency: 0, replayBacklog: 20, observabilityLagSeconds: 10, capabilities: ["commerce", "logistics", "ai", "finance", "governance", "analytics", "realtime", "edge"] },
];

describe("phase 38 autonomous operations", () => {
  it("detects and suppresses correlated autonomous incidents", () => {
    const incidents = detectAutonomousIncidents(severeSignals, new Date("2026-05-27T00:00:00.000Z"));

    expect(incidents.length).toBeGreaterThan(6);
    expect(incidents.some((incident) => incident.title === "Replay amplification risk")).toBe(true);
    expect(new Set(incidents.map((incident) => incident.suppressionKey)).size).toBe(incidents.length);
    expect(incidents.every((incident) => incident.anomalyScore > 0)).toBe(true);
    expect(incidents.every((incident) => incident.explainability.evidence.length > 1)).toBe(true);
  });

  it("plans bounded replay-safe remediation for critical incidents", () => {
    const incident = detectAutonomousIncidents(severeSignals, new Date("2026-05-27T00:00:00.000Z"))[0];
    const plan = planSelfHealing(incident);

    expect(plan.replayTraceKey).toHaveLength(64);
    expect(plan.actions.every((item) => item.boundedRetries <= 5)).toBe(true);
    expect(plan.actions.every((item) => item.replaySafe)).toBe(true);
    expect(plan.actions.every((item) => item.cooldownEnforced)).toBe(true);
    expect(plan.boundedRetryBudget).toBeLessThanOrEqual(2);
    expect(plan.explainability.some((item) => item.includes("cooldown enforced"))).toBe(true);
    expect(plan.rollbackActions).toContain("stop autonomous remediation loop");
  });

  it("contains cascading failures without amplifying recovery loops", () => {
    const incidents = detectAutonomousIncidents(severeSignals, new Date("2026-05-27T00:00:00.000Z"));
    const containment = planCascadingFailureContainment({ incidents, signals: severeSignals });
    const loop = detectRemediationLoop({ plansInWindow: 12, repeatedSuppressionKeys: 4, failedHealingAttempts: 3 });

    expect(containment.active).toBe(true);
    expect(containment.quarantinedDomains).toEqual(expect.arrayContaining(["async", "finance", "developer_platform"]));
    expect(containment.maxRetryBudget).toBeLessThanOrEqual(2);
    expect(containment.replayDiagnostics.length).toBeGreaterThan(1);
    expect(containment.recoveryValidation).toContain("accepted replay cursors are drained only after quarantine clears");
    expect(containment.adaptiveThrottlePercent).toBeGreaterThan(0);
    expect(loop.safeToContinue).toBe(false);
  });

  it("coordinates autonomous failover with cooldown against oscillation", () => {
    const stable = planAutonomousFailover({ failedRegion: "bom1", health, recentFailoverFlaps: 1 });
    const unstable = planAutonomousFailover({ failedRegion: "bom1", health, recentFailoverFlaps: 4 });

    expect(stable.stable).toBe(true);
    expect(stable.targetRegion).toBe("sin1");
    expect(stable.replayTraceKey).toHaveLength(64);
    expect(stable.recoveryValidation).toContain("replay cursor validated before failback");
    expect(unstable.stable).toBe(false);
    expect(unstable.oscillationPrevented).toBe(true);
    expect(unstable.actions).toContain("freeze failover automation");
  });

  it("orchestrates autonomous recovery across domains and validates safety", () => {
    const result = orchestrateAutonomousRecovery({
      signals: severeSignals,
      failedHealingAttempts: 1,
      remediationLatencyMs: 1400,
      now: new Date("2026-05-27T00:00:00.000Z"),
    });
    const validation = validateAutonomousOperations({
      incidents: result.incidents,
      healingPlans: result.healingPlans,
      signals: severeSignals,
      failedHealingAttempts: 1,
    }, new Date("2026-05-27T00:00:00.000Z"));

    expect(result.autonomous).toBe(true);
    expect(Object.keys(result.incidentGroups).length).toBeGreaterThan(1);
    expect(result.containment.active).toBe(true);
    expect(result.telemetry.unsafeActions).toBe(0);
    expect(result.validation.metrics.replayContainmentFrequency).toBeGreaterThan(0);
    expect(result.validation.explainability.length).toBeGreaterThan(1);
    expect(validation.replaySafe).toBe(false);
    expect(validation.risks).toContain("replay_amplification");
  });

  it("diagnoses replay pressure and exposes suppression-safe alerts", () => {
    const diagnostics = diagnoseAnomalyReplay(severeSignals);
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
      replayAmplificationCount: 3,
      containmentInstabilityCount: 2,
      failoverOscillationCount: 1,
      alertSuppressionFailureCount: 1,
      remediationCooldownViolationCount: 1,
    });

    expect(diagnostics.severe).toBe(true);
    expect(alerts.map((alert) => alert.id)).toEqual(expect.arrayContaining(["autonomous-replay-remediation-guardrail-risk", "autonomous-resilience-stability-risk"]));
  });

  it("simulates deadlocks and emits autonomous operational alerts", () => {
    const failure = simulateAutonomousFailure("remediation_loop");
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
      failedSelfHealingCount: 3,
      remediationLoopCount: 1,
      cascadingFailureRiskCount: 2,
      anomalySaturationCount: 4,
      recoveryDeadlockCount: 1,
      operationalOverloadCount: 1,
    });

    expect(failure.autonomousLoopBounded).toBe(true);
    expect(alerts.map((alert) => alert.id)).toEqual(expect.arrayContaining(["autonomous-remediation-risk", "autonomous-cascading-failure-risk"]));
  });
});
