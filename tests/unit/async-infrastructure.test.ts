import { describe, expect, it, vi } from "vitest";
import { computeIsolationDecision, queuePressureScore } from "@/lib/async/compute-isolation";
import { routeForDurableEvent } from "@/lib/async/event-processor";
import { idempotencyKeyFor } from "@/lib/async/orchestrator";
import { concurrencyLimitsForQueues, expandQueueNames, lockSecondsForQueues, policyForJob, priorityValue, retryDelayForAttempt, workerPoolForName } from "@/lib/async/policies";
import { planWorkerScaling } from "@/lib/async/worker";

describe("stabilization s1 async infrastructure", () => {
  it("keeps commerce-critical payment jobs ahead of background AI jobs", () => {
    expect(policyForJob("payment.webhook.reconcile").queueName).toBe("commerce.checkout");
    expect(policyForJob("payment.webhook.reconcile").priority).toBeGreaterThan(policyForJob("ai.embedding.refresh_stale").priority);
    expect(priorityValue("critical", policyForJob("payment.webhook.reconcile"))).toBe(95);
  });

  it("creates stable idempotency keys for replay-safe retries", () => {
    expect(idempotencyKeyFor(["razorpay", "evt_1", "payment.captured"])).toBe(idempotencyKeyFor(["razorpay", "evt_1", "payment.captured"]));
    expect(idempotencyKeyFor(["razorpay", "evt_2", "payment.captured"])).not.toBe(idempotencyKeyFor(["razorpay", "evt_1", "payment.captured"]));
  });

  it("caps exponential retry delay to avoid retry storms", () => {
    const policy = policyForJob("payment.webhook.reconcile");

    expect(retryDelayForAttempt(policy, 1)).toBeGreaterThanOrEqual(policy.baseRetryDelaySeconds);
    expect(retryDelayForAttempt(policy, 20)).toBe(policy.maxRetryDelaySeconds);
  });

  it("keeps retry spacing deterministic for replay-safe workers", () => {
    const policy = policyForJob("payment.webhook.reconcile");

    expect(retryDelayForAttempt(policy, 3)).toBe(retryDelayForAttempt(policy, 3));
    expect(vi.isMockFunction(Math.random)).toBe(false);
  });

  it("derives worker lock and concurrency controls from queue policy", () => {
    expect(expandQueueNames(["commerce-critical"])).toContain("commerce.checkout");
    expect(concurrencyLimitsForQueues(["commerce.checkout"])["commerce.checkout"]).toBe(policyForJob("payment.webhook.reconcile").concurrency);
    expect(lockSecondsForQueues(["commerce-critical"])).toBeGreaterThan(policyForJob("payment.reconciliation.run").timeoutSeconds);
  });

  it("keeps heavy AI compute in a dedicated worker pool away from financial reconciliation", () => {
    expect(policyForJob("ai.semantic.index").workerPool).toBe("ai-heavy-compute");
    expect(policyForJob("payment.reconciliation.run").workerPool).toBe("reconciliation-control");
    expect(workerPoolForName("ai-heavy-compute").queues).not.toContain(policyForJob("payment.reconciliation.run").queueName);
  });

  it("uses deterministic worker scaling for queue pressure", () => {
    expect(planWorkerScaling({ pool: "commerce-critical", queued: 120, running: 4 })).toMatchObject({
      desiredWorkers: 4,
      deterministic: true,
    });
    expect(planWorkerScaling({ pool: "ai-heavy-compute", queued: 0, running: 0, idleRuns: 10 }).desiredWorkers).toBe(1);
  });

  it("throttles heavy compute under queue pressure without throttling critical commerce", () => {
    const pressure = { queueName: "ai.semantic-index", queued: 420, running: 3, retrying: 80, deadLetters: 0, oldestReadySeconds: 800 };

    expect(queuePressureScore(pressure)).toBeGreaterThan(0.6);
    expect(computeIsolationDecision(policyForJob("ai.semantic.index"), pressure).shouldThrottle).toBe(true);
    expect(computeIsolationDecision(policyForJob("payment.webhook.reconcile"), { ...pressure, queueName: "commerce.checkout" }).shouldThrottle).toBe(false);
  });

  it("routes durable events into replay-safe isolated queues", () => {
    expect(routeForDurableEvent("payment.reconciliation.requested")?.jobName).toBe("payment.reconciliation.run");
    expect(routeForDurableEvent("ai.semantic.index_requested")?.jobName).toBe("ai.semantic.index");
    expect(routeForDurableEvent("unknown.event")).toBeNull();
  });
});
