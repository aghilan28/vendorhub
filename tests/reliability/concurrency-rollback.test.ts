import { describe, expect, it } from "vitest";
import { InventoryContentionSimulator, injectFailure, simulateRealtimeReconnectStorm, simulateWebhookReplayStorm } from "../utils/failure-simulator";

describe("checkout concurrency and rollback reliability", () => {
  it("prevents stock corruption during simultaneous checkout contention", () => {
    const simulator = new InventoryContentionSimulator(3);
    const attempts = Array.from({ length: 8 }, (_, index) =>
      simulator.checkout({
        id: `attempt-${index}`,
        requested: 1,
        idempotencyKey: `checkout-${index}`,
      }),
    );

    expect(attempts.filter((attempt) => attempt.ok)).toHaveLength(3);
    expect(attempts.filter((attempt) => attempt.error === "INSUFFICIENT_STOCK")).toHaveLength(5);
    expect(simulator.getStock()).toBe(0);
  });

  it("rolls inventory back when payment fails after lock acquisition", () => {
    const simulator = new InventoryContentionSimulator(2);
    const failed = simulator.checkout({ id: "payment-timeout", requested: 2, idempotencyKey: "idem-1", failAfterLock: true });
    const recovered = simulator.checkout({ id: "retry", requested: 2, idempotencyKey: "idem-2" });

    expect(failed).toMatchObject({ ok: false, rolledBack: true, stockAfter: 2 });
    expect(recovered).toMatchObject({ ok: true, stockAfter: 0 });
  });

  it("deduplicates repeated idempotency keys before creating duplicate orders", () => {
    const simulator = new InventoryContentionSimulator(5);
    const first = simulator.checkout({ id: "first", requested: 1, idempotencyKey: "same-key" });
    const duplicate = simulator.checkout({ id: "duplicate", requested: 1, idempotencyKey: "same-key" });

    expect(first.ok).toBe(true);
    expect(duplicate).toMatchObject({ ok: false, duplicate: true });
    expect(simulator.getStock()).toBe(4);
  });
});

describe("payment, realtime, and failure-injection reliability", () => {
  it("accepts only one payment webhook from a replay storm", () => {
    const storm = simulateWebhookReplayStorm([
      { eventId: "evt-1", providerOrderId: "order-1", amount: 500 },
      { eventId: "evt-1", providerOrderId: "order-1", amount: 500 },
      { eventId: "evt-2", providerOrderId: "order-1", amount: 500 },
    ]);

    expect(storm.accepted).toHaveLength(2);
    expect(storm.duplicateCount).toBe(1);
  });

  it("keeps realtime channel growth bounded during reconnect floods", () => {
    const storm = simulateRealtimeReconnectStorm(120, 4, 80);

    expect(storm.reconnects).toBe(480);
    expect(storm.activeChannels).toBe(80);
    expect(storm.suppressedChannels).toBe(40);
    expect(storm.stable).toBe(true);
  });

  it("makes injected failures reproducible for reliability tests", async () => {
    await expect(injectFailure("payment-timeout", async () => "ok")).rejects.toThrow("Injected payment timeout");
    await expect(injectFailure("none", async () => "ok")).resolves.toBe("ok");
  });
});
