import { describe, expect, it } from "vitest";
import { runChaosSuite, simulateChaosScenario } from "@/lib/reliability/chaos";
import { rehearseRollback } from "@/lib/reliability/rollback";
import { evaluateReliabilitySlo } from "@/lib/reliability/slo";
import { evaluateOperationalAlerts } from "@/lib/observability/alerts";
import { simulateQueueSaturation, simulateRollbackInterruption } from "../utils/failure-simulator";

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

describe("stabilization s5 reliability survivability", () => {
  it("makes chaos scenarios deterministic and recovery-oriented", () => {
    const first = simulateChaosScenario({ name: "queue_saturation", intensity: 7, seed: "s5" });
    const second = simulateChaosScenario({ name: "queue_saturation", intensity: 7, seed: "s5" });

    expect(first).toEqual(second);
    expect(first.slo.breaches).toContain("queue_latency");
    expect(first.recoveryAction).toContain("Throttle producers");
  });

  it("evaluates SLO breaches without hiding integrity failures", () => {
    const result = evaluateReliabilitySlo({
      queueLatencySeconds: 600,
      queueDepth: 800,
      retryCount: 55,
      deadLetters: 1,
      realtimeReconnects: 30,
      activeRealtimeChannels: 100,
      reconciliationBacklog: 80,
      rollbackMinutes: 16,
      failedWrites: 1,
      aiFallbackRate: 0.5,
    });

    expect(result.alertLevel).toBe("critical");
    expect(result.recoveryPriority).toBe("restore_integrity");
    expect(result.breaches).toEqual(expect.arrayContaining(["dead_letters", "failed_writes", "rollback_duration"]));
  });

  it("keeps rollback rehearsals gated on backup, smoke, and reconciliation evidence", () => {
    const rehearsal = rehearseRollback({
      deploymentHealthy: false,
      migrationHealthy: true,
      smokePassed: false,
      backupVerified: false,
      reconciliationClean: false,
      estimatedMinutes: 22,
    });
    const interruption = simulateRollbackInterruption({ deploymentHealthy: false, migrationHealthy: true, smokePassed: false, backupVerified: false });

    expect(rehearsal.rollbackRequired).toBe(true);
    expect(rehearsal.safeToPromote).toBe(false);
    expect(rehearsal.blockers).toEqual(expect.arrayContaining(["backup_not_verified", "smoke_failed", "reconciliation_not_clean", "rollback_slo_breached"]));
    expect(interruption.freezeWrites).toBe(true);
  });

  it("surfaces queue and reconciliation saturation through alerts", () => {
    const queue = simulateQueueSaturation({ queued: 700, running: 20, retrying: 45, deadLetters: 2, workers: 4 });
    const alerts = evaluateOperationalAlerts({
      ...quietSignals,
      queueSaturationPressure: queue.pressure,
      deadLetterCount: 2,
      reconciliationBacklog: 90,
      rollbackSloBreaches: 1,
    });

    expect(queue.shouldThrottleProducers).toBe(true);
    expect(alerts.map((alert) => alert.id)).toEqual(expect.arrayContaining(["queue-saturation-risk", "reconciliation-backlog-risk", "rollback-slo-breach"]));
  });

  it("runs a deterministic cross-domain chaos suite", () => {
    const suite = runChaosSuite([
      { name: "webhook_replay_storm", intensity: 5, seed: "payments" },
      { name: "realtime_reconnect_flood", intensity: 4, seed: "rt" },
      { name: "ai_retrieval_degradation", intensity: 3, seed: "ai" },
      { name: "logistics_provider_outage", intensity: 5, seed: "delivery" },
    ]);

    expect(suite.results).toHaveLength(4);
    expect(suite.survivable).toBe(true);
    expect(suite.maxBurnRate).toBeGreaterThanOrEqual(0);
  });
});
