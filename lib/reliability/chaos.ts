import { evaluateReliabilitySlo, type ReliabilitySignal } from "./slo";

export type ChaosScenarioName =
  | "worker_crash_loop"
  | "webhook_replay_storm"
  | "queue_saturation"
  | "provider_outage"
  | "db_latency_spike"
  | "realtime_reconnect_flood"
  | "cache_invalidation_storm"
  | "deployment_interruption"
  | "payment_desync"
  | "reconciliation_backlog"
  | "ai_retrieval_degradation"
  | "logistics_provider_outage";

export type ChaosScenarioInput = {
  name: ChaosScenarioName;
  intensity: number;
  seed: string;
};

function boundedIntensity(value: number) {
  return Math.max(0, Math.min(10, Math.round(value)));
}

function seedWeight(seed: string) {
  return [...seed].reduce((total, char) => total + char.charCodeAt(0), 0) % 7;
}

export function simulateChaosScenario(input: ChaosScenarioInput) {
  const intensity = boundedIntensity(input.intensity);
  const weight = seedWeight(input.seed);
  const base: ReliabilitySignal = {
    queueLatencySeconds: 30,
    queueDepth: 25,
    retryCount: 0,
    deadLetters: 0,
    realtimeReconnects: 0,
    activeRealtimeChannels: 12,
    reconciliationBacklog: 0,
    rollbackMinutes: 4,
    failedWrites: 0,
    aiFallbackRate: 0,
  };

  const signal = { ...base };
  if (input.name === "worker_crash_loop") {
    signal.retryCount += intensity * 6 + weight;
    signal.queueLatencySeconds += intensity * 45;
  }
  if (input.name === "webhook_replay_storm") {
    signal.retryCount += intensity * 8;
    signal.reconciliationBacklog += intensity * 5;
  }
  if (input.name === "queue_saturation") {
    signal.queueDepth += intensity * 90;
    signal.queueLatencySeconds += intensity * 70;
  }
  if (input.name === "provider_outage" || input.name === "logistics_provider_outage") {
    signal.retryCount += intensity * 5;
    signal.reconciliationBacklog += intensity * 4;
  }
  if (input.name === "db_latency_spike") {
    signal.queueLatencySeconds += intensity * 50;
    signal.failedWrites += intensity >= 8 ? 1 : 0;
  }
  if (input.name === "realtime_reconnect_flood") {
    signal.realtimeReconnects += intensity * 9 + weight;
    signal.activeRealtimeChannels += intensity * 8;
  }
  if (input.name === "cache_invalidation_storm") {
    signal.realtimeReconnects += intensity * 4;
    signal.activeRealtimeChannels += intensity * 6;
  }
  if (input.name === "deployment_interruption") {
    signal.rollbackMinutes += intensity * 2;
    signal.failedWrites += intensity >= 9 ? 1 : 0;
  }
  if (input.name === "payment_desync") {
    signal.reconciliationBacklog += intensity * 8;
    signal.deadLetters += intensity >= 9 ? 1 : 0;
  }
  if (input.name === "reconciliation_backlog") {
    signal.reconciliationBacklog += intensity * 10;
    signal.queueDepth += intensity * 20;
  }
  if (input.name === "ai_retrieval_degradation") {
    signal.aiFallbackRate = Math.min(1, intensity / 10);
  }

  const slo = evaluateReliabilitySlo(signal);
  return {
    scenario: input.name,
    seed: input.seed,
    intensity,
    signal,
    slo,
    survivable: slo.alertLevel !== "critical" || slo.recoveryPriority !== "restore_integrity",
    recoveryAction: recoveryActionFor(slo.recoveryPriority),
  };
}

function recoveryActionFor(priority: ReturnType<typeof evaluateReliabilitySlo>["recoveryPriority"]) {
  if (priority === "restore_integrity") return "Freeze risky writes, recover async infrastructure, run reconciliation, and verify rollback smoke.";
  if (priority === "drain_queues") return "Throttle producers, isolate retries, increase worker passes, and inspect dead-letter growth.";
  return "Continue monitoring and keep degraded-mode controls ready.";
}

export function runChaosSuite(scenarios: ChaosScenarioInput[]) {
  const results = scenarios.map(simulateChaosScenario);
  return {
    results,
    critical: results.filter((result) => result.slo.alertLevel === "critical").length,
    survivable: results.every((result) => result.survivable),
    maxBurnRate: Math.max(0, ...results.map((result) => result.slo.burnRate)),
  };
}
