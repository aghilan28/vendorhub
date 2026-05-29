/**
 * Phase D — circuit breaker. Protects callers from a failing dependency by
 * failing fast once an error threshold is crossed, then probing for recovery.
 *
 * States: CLOSED (pass through) -> OPEN (fail fast for cooldownMs) -> HALF_OPEN
 * (allow a limited probe; success closes, failure re-opens). Breakers are keyed
 * and shared per process so all callers of a dependency observe the same state.
 *
 * Dependency-free; never used unless a caller wraps a call. A tripped breaker
 * is itself an OPERATIONAL EVENT (a failure becomes contained, not catastrophic).
 */
export type CircuitState = "closed" | "open" | "half_open";

export type CircuitBreakerOptions = {
  /** consecutive (or rolling) failures before opening */
  failureThreshold?: number;
  /** how long to stay open before allowing a probe (ms) */
  cooldownMs?: number;
  /** successes required in half-open to fully close */
  successThreshold?: number;
  /** rolling window for counting failures (ms) */
  rollingWindowMs?: number;
  /** called on every state transition (observability hook) */
  onStateChange?: (name: string, from: CircuitState, to: CircuitState) => void;
};

export class CircuitOpenError extends Error {
  readonly circuit: string;
  readonly retryAfterMs: number;
  constructor(circuit: string, retryAfterMs: number) {
    super(`Circuit "${circuit}" is open; failing fast`);
    this.name = "CircuitOpenError";
    this.circuit = circuit;
    this.retryAfterMs = retryAfterMs;
  }
}

type Window = { failures: number; windowStart: number };

class CircuitBreaker {
  readonly name: string;
  private readonly opts: Required<Omit<CircuitBreakerOptions, "onStateChange">>;
  private readonly onStateChange?: CircuitBreakerOptions["onStateChange"];
  private state: CircuitState = "closed";
  private openedAt = 0;
  private halfOpenSuccesses = 0;
  private win: Window = { failures: 0, windowStart: Date.now() };

  constructor(name: string, options: CircuitBreakerOptions = {}) {
    this.name = name;
    this.onStateChange = options.onStateChange;
    this.opts = {
      failureThreshold: options.failureThreshold ?? 5,
      cooldownMs: options.cooldownMs ?? 15000,
      successThreshold: options.successThreshold ?? 2,
      rollingWindowMs: options.rollingWindowMs ?? 30000,
    };
  }

  getState(): CircuitState {
    return this.state;
  }

  snapshot() {
    return { name: this.name, state: this.state, failures: this.win.failures, openedAt: this.openedAt };
  }

  private transition(to: CircuitState) {
    if (this.state === to) return;
    const from = this.state;
    this.state = to;
    if (to === "open") this.openedAt = Date.now();
    if (to === "half_open") this.halfOpenSuccesses = 0;
    if (to === "closed") this.win = { failures: 0, windowStart: Date.now() };
    try {
      this.onStateChange?.(this.name, from, to);
    } catch {
      /* observability hook must never throw */
    }
  }

  private recordFailure() {
    const now = Date.now();
    if (now - this.win.windowStart > this.opts.rollingWindowMs) {
      this.win = { failures: 0, windowStart: now };
    }
    this.win.failures += 1;
    if (this.state === "half_open") {
      this.transition("open");
      return;
    }
    if (this.state === "closed" && this.win.failures >= this.opts.failureThreshold) {
      this.transition("open");
    }
  }

  private recordSuccess() {
    if (this.state === "half_open") {
      this.halfOpenSuccesses += 1;
      if (this.halfOpenSuccesses >= this.opts.successThreshold) this.transition("closed");
      return;
    }
    if (this.state === "closed") this.win.failures = 0;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed < this.opts.cooldownMs) {
        throw new CircuitOpenError(this.name, this.opts.cooldownMs - elapsed);
      }
      this.transition("half_open");
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
}

const globalKey = "__kartex_circuit_breakers__";
const breakers: Map<string, CircuitBreaker> =
  (globalThis as any)[globalKey] ?? ((globalThis as any)[globalKey] = new Map<string, CircuitBreaker>());

export function getCircuitBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
  let b = breakers.get(name);
  if (!b) {
    b = new CircuitBreaker(name, options);
    breakers.set(name, b);
  }
  return b;
}

export function circuitSnapshots() {
  return Array.from(breakers.values(), (b) => b.snapshot());
}

export function resetCircuitsForTests() {
  breakers.clear();
}
