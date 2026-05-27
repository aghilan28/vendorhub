import type { AsyncJobRow, QueueDomain, QueuePolicy } from "./types";

export type QueuePressureSignal = {
  queueName: string;
  queued: number;
  running: number;
  retrying: number;
  deadLetters: number;
  oldestReadySeconds: number;
};

export type ComputeIsolationDecision = {
  queueName: string;
  pressure: number;
  allowedConcurrency: number;
  shouldThrottle: boolean;
  throttleReason?: string;
  retryPressure: number;
};

const criticalDomains: QueueDomain[] = ["commerce", "realtime"];

export function queuePressureScore(signal: QueuePressureSignal) {
  const backlogPressure = Math.min(1, signal.queued / 500);
  const retryPressure = Math.min(1, signal.retrying / 80);
  const agePressure = Math.min(1, signal.oldestReadySeconds / 900);
  const deadLetterPressure = Math.min(1, signal.deadLetters / 10);
  return Number(Math.max(backlogPressure, retryPressure, agePressure, deadLetterPressure).toFixed(3));
}

export function computeIsolationDecision(policy: QueuePolicy, signal?: QueuePressureSignal): ComputeIsolationDecision {
  const pressure = signal ? queuePressureScore(signal) : 0;
  const retryPressure = signal ? Math.min(1, signal.retrying / Math.max(1, signal.queued + signal.retrying)) : 0;
  const critical = criticalDomains.includes(policy.domain);
  const heavy = policy.computeClass === "heavy" || policy.computeClass === "bulk";
  const allowedConcurrency = pressure > 0.75 && !heavy ? policy.maxElasticConcurrency : policy.concurrency;
  const shouldThrottle = heavy && pressure > 0.6;

  return {
    queueName: policy.queueName,
    pressure,
    allowedConcurrency: Math.max(policy.minReservedConcurrency, allowedConcurrency),
    shouldThrottle,
    throttleReason: shouldThrottle ? "heavy_compute_backpressure" : critical && pressure > 0.85 ? "critical_queue_elasticity" : undefined,
    retryPressure: Number(retryPressure.toFixed(3)),
  };
}

export function shouldDeferHeavyJob(job: AsyncJobRow, policy: QueuePolicy, signal?: QueuePressureSignal) {
  const decision = computeIsolationDecision(policy, signal);
  const metadata = typeof job.metadata === "object" && job.metadata !== null ? (job.metadata as Record<string, unknown>) : {};
  const manuallyPromoted = metadata.computeOverride === "critical";
  return decision.shouldThrottle && !manuallyPromoted;
}

export function fairShareWeight(policy: QueuePolicy) {
  if (policy.computeClass === "critical") return 100;
  if (policy.computeClass === "interactive") return 70;
  if (policy.computeClass === "standard") return 45;
  if (policy.computeClass === "heavy") return 25;
  return 15;
}
