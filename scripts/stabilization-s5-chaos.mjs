const scenarios = [
  { name: "worker_crash_loop", intensity: 5, seed: "worker" },
  { name: "webhook_replay_storm", intensity: 6, seed: "payments" },
  { name: "queue_saturation", intensity: 6, seed: "queue" },
  { name: "realtime_reconnect_flood", intensity: 5, seed: "realtime" },
  { name: "deployment_interruption", intensity: 4, seed: "deploy" },
  { name: "reconciliation_backlog", intensity: 5, seed: "reconcile" },
  { name: "ai_retrieval_degradation", intensity: 4, seed: "ai" },
  { name: "logistics_provider_outage", intensity: 5, seed: "delivery" },
];

function seedWeight(seed) {
  return [...seed].reduce((total, char) => total + char.charCodeAt(0), 0) % 7;
}

function evaluate(signal) {
  const breaches = [
    signal.queueLatencySeconds > 300 && "queue_latency",
    signal.queueDepth > 500 && "queue_depth",
    signal.retryCount > 40 && "retry_storm",
    signal.deadLetters > 0 && "dead_letters",
    signal.realtimeReconnects > 25 && "realtime_reconnects",
    signal.activeRealtimeChannels > 80 && "realtime_channels",
    signal.reconciliationBacklog > 50 && "reconciliation_backlog",
    signal.rollbackMinutes > 15 && "rollback_duration",
    signal.failedWrites > 0 && "failed_writes",
    signal.aiFallbackRate >= 0.4 && "ai_degradation",
  ].filter(Boolean);
  const burnRate = Math.min(100, breaches.length * 12 + Math.round(signal.retryCount / 5) + signal.deadLetters * 10);
  return { breaches, burnRate, alertLevel: breaches.length >= 4 || burnRate >= 80 ? "critical" : breaches.length ? "watch" : "healthy" };
}

function simulate(input) {
  const weight = seedWeight(input.seed);
  const signal = {
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

  if (input.name === "worker_crash_loop") {
    signal.retryCount += input.intensity * 6 + weight;
    signal.queueLatencySeconds += input.intensity * 45;
  }
  if (input.name === "webhook_replay_storm") {
    signal.retryCount += input.intensity * 8;
    signal.reconciliationBacklog += input.intensity * 5;
  }
  if (input.name === "queue_saturation") {
    signal.queueDepth += input.intensity * 90;
    signal.queueLatencySeconds += input.intensity * 70;
  }
  if (input.name === "realtime_reconnect_flood") {
    signal.realtimeReconnects += input.intensity * 9 + weight;
    signal.activeRealtimeChannels += input.intensity * 8;
  }
  if (input.name === "deployment_interruption") {
    signal.rollbackMinutes += input.intensity * 2;
  }
  if (input.name === "reconciliation_backlog") {
    signal.reconciliationBacklog += input.intensity * 10;
    signal.queueDepth += input.intensity * 20;
  }
  if (input.name === "ai_retrieval_degradation") {
    signal.aiFallbackRate = Math.min(1, input.intensity / 10);
  }
  if (input.name === "logistics_provider_outage") {
    signal.retryCount += input.intensity * 5;
    signal.reconciliationBacklog += input.intensity * 4;
  }

  const slo = evaluate(signal);
  return { ...input, signal, slo };
}

const results = scenarios.map(simulate);
const summary = {
  generatedAt: new Date().toISOString(),
  scenarios: results.length,
  critical: results.filter((result) => result.slo.alertLevel === "critical").length,
  maxBurnRate: Math.max(...results.map((result) => result.slo.burnRate)),
  results,
};

console.log(JSON.stringify(summary, null, 2));

if (summary.critical > 2) {
  throw new Error(`Chaos suite found ${summary.critical} critical survivability scenarios.`);
}
