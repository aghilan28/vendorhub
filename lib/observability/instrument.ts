/**
 * Phase C — instrumentation wrappers. Compose these around API route handlers,
 * server actions, and dependency calls to get, for free: latency + error +
 * throughput metrics, an exported span, W3C trace propagation, and a correlated
 * structured log line. Build-safe and total (never throws telemetry errors into
 * the request path).
 */
import { recordApiRequest, recordDependency } from "./metrics";
import { exportSpan, newSpanId, newTraceId, parseTraceparent, toTraceparent } from "./otlp";
import { recordOperationalEvent } from "./core";
import type { ObservabilityDomain } from "./types";
import { faultInjector } from "@/lib/reliability/fault-injection";
import { getCircuitBreaker, type CircuitBreakerOptions } from "@/lib/reliability/circuit-breaker";

function statusFromResponse(res: unknown): number {
  if (res && typeof res === "object" && "status" in res && typeof (res as any).status === "number") {
    return (res as any).status;
  }
  return 200;
}

/**
 * Wrap an API route handler. `route` should be a low-cardinality template
 * (e.g. "/api/seller/orders/:id/status"), never a raw URL with ids.
 */
export async function withApiObservability(
  route: string,
  request: Request,
  handler: () => Promise<Response>,
): Promise<Response> {
  const inbound = parseTraceparent(request.headers.get("traceparent"));
  const traceId = inbound?.traceId ?? newTraceId();
  const spanId = newSpanId();
  const method = request.method ?? "GET";
  const startedAt = Date.now();
  let status = 500;
  let threw = false;

  try {
    const response = await handler();
    status = statusFromResponse(response);
    try {
      response.headers.set("traceparent", toTraceparent(traceId, spanId));
      response.headers.set("x-trace-id", traceId);
    } catch {
      /* headers may be immutable in rare cases */
    }
    return response;
  } catch (error) {
    threw = true;
    recordOperationalEvent("error", "api.handler.unhandled", { route, method }, {
      domain: "api",
      trace: { traceId, spanId },
      error,
    });
    throw error;
  } finally {
    const durationMs = Date.now() - startedAt;
    recordApiRequest(route, method, status, durationMs);
    void exportSpan({
      traceId,
      spanId,
      parentSpanId: inbound?.spanId,
      name: `${method} ${route}`,
      kind: 2,
      startTimeMs: startedAt,
      endTimeMs: startedAt + durationMs,
      attributes: { "http.route": route, "http.method": method, "http.status_code": status },
      error: threw || status >= 500,
    });
  }
}

/**
 * Wrap a dependency call (redis/kafka/neo4j/qdrant/flink/supabase/provider).
 * Records dependency latency + error metrics and a client span, and applies
 * Phase D resilience: optional fault injection (chaos) + a shared circuit
 * breaker per dependency (fail fast when the dependency is unhealthy). Pass
 * `{ breaker: false }` to opt out (e.g. for already-degrade-safe adapters).
 */
export async function instrumentDependency<T>(
  dependency: string,
  operation: string,
  fn: () => Promise<T>,
  parent?: { traceId?: string; spanId?: string },
  options?: { breaker?: CircuitBreakerOptions | false },
): Promise<T> {
  const traceId = parent?.traceId ?? newTraceId();
  const spanId = newSpanId();
  const startedAt = Date.now();
  let ok = true;

  const guarded = async () => {
    await faultInjector.maybeInject(dependency);
    return fn();
  };
  const run =
    options?.breaker === false
      ? guarded
      : () =>
          getCircuitBreaker(`dep:${dependency}`, {
            ...(typeof options?.breaker === "object" ? options.breaker : {}),
            onStateChange: (name, from, to) =>
              recordOperationalEvent(to === "open" ? "error" : "warn", "reliability.circuit.transition", { name, from, to }, {
                domain: "system",
                trace: { traceId, spanId },
              }),
          }).execute(guarded);

  try {
    return await run();
  } catch (error) {
    ok = false;
    throw error;
  } finally {
    const durationMs = Date.now() - startedAt;
    recordDependency(dependency, operation, durationMs, ok);
    void exportSpan({
      traceId,
      spanId,
      parentSpanId: parent?.spanId,
      name: `${dependency}.${operation}`,
      kind: 3,
      startTimeMs: startedAt,
      endTimeMs: startedAt + durationMs,
      attributes: { "db.system": dependency, operation },
      error: !ok,
    });
  }
}

/** Generic internal span for server actions / workflow steps. */
export async function withSpan<T>(
  domain: ObservabilityDomain,
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>,
): Promise<T> {
  const traceId = newTraceId();
  const spanId = newSpanId();
  const startedAt = Date.now();
  let threw = false;
  try {
    return await fn();
  } catch (error) {
    threw = true;
    recordOperationalEvent("error", `${name}.failed`, attributes, { domain, trace: { traceId, spanId }, error });
    throw error;
  } finally {
    void exportSpan({
      traceId,
      spanId,
      name,
      kind: 1,
      startTimeMs: startedAt,
      endTimeMs: Date.now(),
      attributes,
      error: threw,
    });
  }
}
