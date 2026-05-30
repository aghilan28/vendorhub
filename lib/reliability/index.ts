/**
 * Phase D — reliability primitives. Compose these at dependency boundaries so a
 * failure becomes a contained operational event: timeout (bound hangs) -> retry
 * (transient recovery, jittered) -> circuit breaker (fail fast, protect callers)
 * -> fault injection (prove degradation). All dependency-free and inert by default.
 */
export { getCircuitBreaker, circuitSnapshots, CircuitOpenError, resetCircuitsForTests } from "./circuit-breaker";
export type { CircuitState, CircuitBreakerOptions } from "./circuit-breaker";
export { withTimeout, TimeoutError } from "./timeout";
export { withRetry, isTransientError } from "./retry";
export type { RetryOptions } from "./retry";
export { faultInjector, InjectedFaultError } from "./fault-injection";
export type { FaultMode, FaultRule } from "./fault-injection";
