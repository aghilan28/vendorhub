/**
 * Phase C — vendor-neutral OTLP/HTTP span exporter (dependency-free).
 *
 * Trace context already exists (lib/observability/core.ts) but was never
 * EXPORTED to a tracing backend. This module bridges that gap: it emits W3C
 * `traceparent` for cross-service propagation and pushes spans as OTLP-JSON to
 * any OTLP collector (OTel Collector -> Jaeger/Tempo). Push-based by design so it
 * works on serverless. Fully gated by OTEL_EXPORTER_OTLP_ENDPOINT + flag; a no-op
 * (and never throws) when disabled or unreachable.
 */

function enabled(): boolean {
  return (
    (process.env.RUNTIME_OTEL_ENABLED ?? "").toLowerCase() === "true" &&
    Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT)
  );
}

function hex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function newTraceId(): string {
  return hex(16);
}
export function newSpanId(): string {
  return hex(8);
}

/** Build a W3C traceparent header (version-traceid-spanid-flags). */
export function toTraceparent(traceId: string, spanId: string, sampled = true): string {
  const tid = /^[0-9a-f]{32}$/.test(traceId) ? traceId : hex(16);
  const sid = /^[0-9a-f]{16}$/.test(spanId) ? spanId : hex(8);
  return `00-${tid}-${sid}-${sampled ? "01" : "00"}`;
}

/** Parse an inbound traceparent so we continue an upstream trace. */
export function parseTraceparent(header: string | null): { traceId: string; spanId: string } | null {
  if (!header) return null;
  const m = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/.exec(header.trim());
  return m ? { traceId: m[1], spanId: m[2] } : null;
}

type SpanInput = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind?: number; // 1 internal, 2 server, 3 client, 4 producer, 5 consumer
  startTimeMs: number;
  endTimeMs: number;
  attributes?: Record<string, string | number | boolean>;
  error?: boolean;
};

function attrList(attributes?: Record<string, string | number | boolean>) {
  if (!attributes) return [];
  return Object.entries(attributes).map(([key, value]) => ({
    key,
    value:
      typeof value === "number"
        ? Number.isInteger(value)
          ? { intValue: value }
          : { doubleValue: value }
        : typeof value === "boolean"
          ? { boolValue: value }
          : { stringValue: String(value) },
  }));
}

export async function exportSpan(span: SpanInput): Promise<void> {
  if (!enabled()) return;
  const endpoint = `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT!.replace(/\/$/, "")}/v1/traces`;
  const payload = {
    resourceSpans: [
      {
        resource: {
          attributes: attrList({
            "service.name": process.env.OTEL_SERVICE_NAME ?? "vendorhub-web",
            "deployment.environment": process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
          }),
        },
        scopeSpans: [
          {
            scope: { name: "kartex" },
            spans: [
              {
                traceId: span.traceId,
                spanId: span.spanId,
                parentSpanId: span.parentSpanId,
                name: span.name,
                kind: span.kind ?? 1,
                startTimeUnixNano: `${Math.round(span.startTimeMs * 1e6)}`,
                endTimeUnixNano: `${Math.round(span.endTimeMs * 1e6)}`,
                attributes: attrList(span.attributes),
                status: { code: span.error ? 2 : 1 },
              },
            ],
          },
        ],
      },
    ],
  };

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.OTEL_EXPORTER_OTLP_HEADERS) {
      for (const pair of process.env.OTEL_EXPORTER_OTLP_HEADERS.split(",")) {
        const [k, v] = pair.split("=");
        if (k && v) headers[k.trim()] = v.trim();
      }
    }
    await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      keepalive: true,
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // Tracing outages must never affect request execution.
  }
}

export function otelEnabled(): boolean {
  return enabled();
}
