export type ReliabilitySignal = {
  queueLatencySeconds: number;
  queueDepth: number;
  retryCount: number;
  deadLetters: number;
  realtimeReconnects: number;
  activeRealtimeChannels: number;
  reconciliationBacklog: number;
  rollbackMinutes: number;
  failedWrites: number;
  aiFallbackRate: number;
};

export const reliabilitySloThresholds = {
  queueLatencySeconds: 300,
  queueDepth: 500,
  retryCount: 40,
  deadLetters: 0,
  realtimeReconnects: 25,
  activeRealtimeChannels: 80,
  reconciliationBacklog: 50,
  rollbackMinutes: 15,
  failedWrites: 0,
  aiFallbackRate: 0.4,
};

export function evaluateReliabilitySlo(signal: ReliabilitySignal) {
  const breaches = [
    signal.queueLatencySeconds > reliabilitySloThresholds.queueLatencySeconds && "queue_latency",
    signal.queueDepth > reliabilitySloThresholds.queueDepth && "queue_depth",
    signal.retryCount > reliabilitySloThresholds.retryCount && "retry_storm",
    signal.deadLetters > reliabilitySloThresholds.deadLetters && "dead_letters",
    signal.realtimeReconnects > reliabilitySloThresholds.realtimeReconnects && "realtime_reconnects",
    signal.activeRealtimeChannels > reliabilitySloThresholds.activeRealtimeChannels && "realtime_channels",
    signal.reconciliationBacklog > reliabilitySloThresholds.reconciliationBacklog && "reconciliation_backlog",
    signal.rollbackMinutes > reliabilitySloThresholds.rollbackMinutes && "rollback_duration",
    signal.failedWrites > reliabilitySloThresholds.failedWrites && "failed_writes",
    signal.aiFallbackRate >= reliabilitySloThresholds.aiFallbackRate && "ai_degradation",
  ].filter((item): item is string => Boolean(item));

  const burnRate = Math.min(100, breaches.length * 12 + Math.round(signal.retryCount / 5) + signal.deadLetters * 10);
  return {
    healthy: breaches.length === 0,
    alertLevel: breaches.length >= 4 || burnRate >= 80 ? "critical" : breaches.length ? "watch" : "healthy",
    burnRate,
    breaches,
    recoveryPriority: breaches.includes("failed_writes") || breaches.includes("dead_letters") ? "restore_integrity" : breaches.includes("queue_latency") ? "drain_queues" : "monitor",
  } as const;
}
