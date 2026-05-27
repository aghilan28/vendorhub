export type InventoryMutation = {
  id: string;
  requested: number;
  idempotencyKey: string;
  failAfterLock?: boolean;
};

export type CheckoutSimulationResult = {
  id: string;
  ok: boolean;
  rolledBack: boolean;
  duplicate: boolean;
  stockAfter: number;
  error?: string;
};

export class InventoryContentionSimulator {
  private stock: number;
  private readonly processed = new Set<string>();

  constructor(initialStock: number) {
    this.stock = initialStock;
  }

  checkout(mutation: InventoryMutation): CheckoutSimulationResult {
    if (this.processed.has(mutation.idempotencyKey)) {
      return { id: mutation.id, ok: false, rolledBack: false, duplicate: true, stockAfter: this.stock, error: "DUPLICATE_IDEMPOTENCY_KEY" };
    }

    this.processed.add(mutation.idempotencyKey);

    if (this.stock < mutation.requested) {
      return { id: mutation.id, ok: false, rolledBack: false, duplicate: false, stockAfter: this.stock, error: "INSUFFICIENT_STOCK" };
    }

    this.stock -= mutation.requested;

    if (mutation.failAfterLock) {
      this.stock += mutation.requested;
      return { id: mutation.id, ok: false, rolledBack: true, duplicate: false, stockAfter: this.stock, error: "PAYMENT_TIMEOUT_AFTER_LOCK" };
    }

    return { id: mutation.id, ok: true, rolledBack: false, duplicate: false, stockAfter: this.stock };
  }

  getStock() {
    return this.stock;
  }
}

export function simulateWebhookReplayStorm(events: Array<{ eventId: string; providerOrderId: string; amount: number }>) {
  const seen = new Set<string>();
  const accepted: typeof events = [];
  const rejected: typeof events = [];

  for (const event of events) {
    if (seen.has(event.eventId)) {
      rejected.push(event);
      continue;
    }

    seen.add(event.eventId);
    accepted.push(event);
  }

  return { accepted, rejected, duplicateCount: rejected.length };
}

export function simulateRealtimeReconnectStorm(tabs: number, reconnectsPerTab: number, channelLimit: number) {
  const reconnects = tabs * reconnectsPerTab;
  const activeChannels = Math.min(tabs, channelLimit);
  const suppressedChannels = Math.max(0, tabs - activeChannels);
  return {
    reconnects,
    activeChannels,
    suppressedChannels,
    stable: activeChannels <= channelLimit && suppressedChannels >= 0,
  };
}

export function simulateTrackingReplay(events: Array<{ deliveryId: string; provider?: string; providerEventId?: string; status: string; body?: string }>) {
  const seen = new Set<string>();
  const accepted: typeof events = [];
  const rejected: typeof events = [];

  for (const event of events) {
    const key = [event.deliveryId, event.provider ?? "vendorhub", event.providerEventId ?? `${event.status}:${event.body ?? ""}`].join(":");
    if (seen.has(key)) {
      rejected.push(event);
      continue;
    }
    seen.add(key);
    accepted.push(event);
  }

  return { accepted, rejected, duplicateCount: rejected.length };
}

export function simulateDispatchBacklog(input: { pending: number; active: number; failedProviders: number; retryCount: number; maxConcurrentDispatches: number }) {
  const saturation = input.active / Math.max(1, input.maxConcurrentDispatches);
  const retryPressure = input.retryCount + input.failedProviders * 2;
  return {
    saturation,
    retryPressure,
    stable: input.pending <= 150 && saturation < 1 && retryPressure <= 30,
    shouldThrottle: input.pending > 60 || saturation >= 0.75 || retryPressure > 12,
  };
}

export function simulateGovernanceReplay(events: Array<{ fingerprint: string; vendorId?: string; eventType: string }>) {
  const seen = new Set<string>();
  const accepted: typeof events = [];
  const replayed: typeof events = [];

  for (const event of events) {
    if (seen.has(event.fingerprint)) {
      replayed.push(event);
      continue;
    }
    seen.add(event.fingerprint);
    accepted.push(event);
  }

  return { accepted, replayed, replayCount: replayed.length };
}

export function simulateModerationPressure(input: { openCases: number; disputes: number; escalations: number; reviewers: number }) {
  const workload = input.openCases + input.disputes * 2 + input.escalations * 3;
  const reviewerCapacity = Math.max(1, input.reviewers) * 12;
  return {
    workload,
    reviewerCapacity,
    overloaded: workload > reviewerCapacity,
    alertLevel: workload > reviewerCapacity * 2 ? "critical" : workload > reviewerCapacity ? "watch" : "healthy",
  } as const;
}

export function simulateQueueSaturation(input: { queued: number; running: number; retrying: number; deadLetters: number; workers: number }) {
  const workerCapacity = Math.max(1, input.workers) * 25;
  const pressure = input.queued + input.retrying * 2 + input.deadLetters * 8;
  return {
    pressure,
    workerCapacity,
    saturated: pressure > workerCapacity,
    shouldThrottleProducers: input.queued > 500 || input.retrying > 40 || input.deadLetters > 0,
    recoveryMode: input.deadLetters > 0 ? "dead_letter_replay" : pressure > workerCapacity ? "backpressure" : "normal",
  } as const;
}

export function simulateRollbackInterruption(input: { deploymentHealthy: boolean; migrationHealthy: boolean; smokePassed: boolean; backupVerified: boolean }) {
  const rollbackRequired = !input.deploymentHealthy || !input.migrationHealthy || !input.smokePassed;
  return {
    rollbackRequired,
    safeToContinue: !rollbackRequired && input.backupVerified,
    freezeWrites: rollbackRequired && !input.backupVerified,
  };
}

export async function injectFailure<T>(mode: "db-timeout" | "payment-timeout" | "ai-timeout" | "network-drop" | "none", operation: () => Promise<T>) {
  if (mode === "none") return operation();
  if (mode === "db-timeout") throw new Error("Injected database timeout");
  if (mode === "payment-timeout") throw new Error("Injected payment timeout");
  if (mode === "ai-timeout") throw new Error("Injected AI retrieval timeout");
  throw new Error("Injected network interruption");
}
