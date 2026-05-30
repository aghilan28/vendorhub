import { describe, it, expect, beforeEach } from "vitest";
import {
  getCircuitBreaker,
  resetCircuitsForTests,
  CircuitOpenError,
} from "@/lib/reliability/circuit-breaker";
import { withRetry, isTransientError } from "@/lib/reliability/retry";
import { withTimeout, TimeoutError } from "@/lib/reliability/timeout";
import { faultInjector, InjectedFaultError } from "@/lib/reliability/fault-injection";
import { instrumentDependency } from "@/lib/observability/instrument";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fail = async () => {
  throw Object.assign(new Error("boom"), { status: 500 });
};

beforeEach(() => {
  resetCircuitsForTests();
  faultInjector.configure({ enabled: false, rules: [] });
});

describe("circuit breaker", () => {
  it("opens after the failure threshold and then fails fast", async () => {
    const cb = getCircuitBreaker("test-open", { failureThreshold: 3, cooldownMs: 10000 });
    for (let i = 0; i < 3; i += 1) {
      await expect(cb.execute(fail)).rejects.toThrow("boom");
    }
    expect(cb.getState()).toBe("open");
    await expect(cb.execute(async () => "should-not-run")).rejects.toBeInstanceOf(CircuitOpenError);
  });

  it("recovers through half-open to closed after cooldown", async () => {
    const cb = getCircuitBreaker("test-recover", { failureThreshold: 2, cooldownMs: 20, successThreshold: 1 });
    await expect(cb.execute(fail)).rejects.toThrow();
    await expect(cb.execute(fail)).rejects.toThrow();
    expect(cb.getState()).toBe("open");
    await sleep(30);
    const result = await cb.execute(async () => "ok");
    expect(result).toBe("ok");
    expect(cb.getState()).toBe("closed");
  });
});

describe("retry", () => {
  it("retries transient failures then succeeds", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw Object.assign(new Error("temporary"), { status: 503 });
        return "done";
      },
      { attempts: 5, sleep: async () => {}, retryable: isTransientError },
    );
    expect(result).toBe("done");
    expect(calls).toBe(3);
  });

  it("does not retry non-transient (4xx) errors", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw Object.assign(new Error("bad request"), { status: 400 });
        },
        { attempts: 5, sleep: async () => {}, retryable: isTransientError },
      ),
    ).rejects.toThrow("bad request");
    expect(calls).toBe(1);
  });

  it("never retries an open circuit", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new CircuitOpenError("dep", 1000);
        },
        { attempts: 5, sleep: async () => {} },
      ),
    ).rejects.toBeInstanceOf(CircuitOpenError);
    expect(calls).toBe(1);
  });
});

describe("timeout", () => {
  it("rejects when the operation exceeds the budget", async () => {
    await expect(withTimeout("slow", 20, () => sleep(200).then(() => "late"))).rejects.toBeInstanceOf(TimeoutError);
  });
  it("resolves when the operation is fast enough", async () => {
    await expect(withTimeout("fast", 100, async () => "quick")).resolves.toBe("quick");
  });
});

describe("fault injection + instrumentDependency", () => {
  it("is inert by default (no chaos, no breaker interference)", async () => {
    const result = await instrumentDependency("redis", "get", async () => "value");
    expect(result).toBe("value");
  });

  it("injects errors when enabled, and the breaker contains repeated failures", async () => {
    faultInjector.configure({ enabled: true, rules: [{ target: "kafka", probability: 1, mode: "error" }] });
    // First failures surface the injected fault...
    await expect(
      instrumentDependency("kafka", "publish", async () => "ok", undefined, { breaker: { failureThreshold: 2, cooldownMs: 5000 } }),
    ).rejects.toBeInstanceOf(InjectedFaultError);
    await expect(
      instrumentDependency("kafka", "publish", async () => "ok", undefined, { breaker: { failureThreshold: 2, cooldownMs: 5000 } }),
    ).rejects.toBeInstanceOf(InjectedFaultError);
    // ...then the breaker is open and fails fast without invoking the dependency.
    await expect(
      instrumentDependency("kafka", "publish", async () => "ok", undefined, { breaker: { failureThreshold: 2, cooldownMs: 5000 } }),
    ).rejects.toBeInstanceOf(CircuitOpenError);
  });
});
