import type { ObservabilityDomain, ObservabilityLevel, ObservabilityMetadata, OperationalEvent, TraceContext } from "./types";

const SENSITIVE_KEY_PATTERN = /(password|secret|token|signature|authorization|cookie|credential|kyc|document|pan|aadhaar|card|cvv|otp|key)/i;
const MAX_VALUE_LENGTH = 220;

function randomId() {
  return crypto.randomUUID();
}

function environment() {
  return process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";
}

function sanitizeValue(value: unknown): string | number | boolean | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value === "string") return value.length > MAX_VALUE_LENGTH ? `${value.slice(0, MAX_VALUE_LENGTH)}...` : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  return "[object]";
}

export function sanitizeMetadata(metadata?: Record<string, unknown>): ObservabilityMetadata | undefined {
  if (!metadata) return undefined;

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : sanitizeValue(value)]),
  );
}

function normalizeError(error: unknown): OperationalEvent["error"] | undefined {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message.slice(0, MAX_VALUE_LENGTH),
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    };
  }

  return {
    name: "UnknownError",
    message: String(error).slice(0, MAX_VALUE_LENGTH),
  };
}

async function forwardToMonitoring(event: OperationalEvent) {
  const endpoint = process.env.OBSERVABILITY_INGEST_URL ?? process.env.SENTRY_DSN;
  if (!endpoint || typeof fetch === "undefined") return;

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    });
  } catch {
    // Monitoring outages must never affect commerce execution.
  }
}

export function createTraceContext(seed?: Partial<TraceContext>): TraceContext {
  return {
    traceId: seed?.traceId ?? seed?.correlationId ?? randomId(),
    spanId: seed?.spanId ?? randomId(),
    parentSpanId: seed?.parentSpanId,
    correlationId: seed?.correlationId ?? seed?.traceId ?? randomId(),
    requestId: seed?.requestId,
    actorId: seed?.actorId,
    subjectId: seed?.subjectId,
  };
}

export function childTrace(parent?: Partial<TraceContext>): TraceContext {
  return createTraceContext({
    ...parent,
    spanId: randomId(),
    parentSpanId: parent?.spanId,
  });
}

export function recordOperationalEvent(
  level: ObservabilityLevel,
  event: string,
  metadata?: Record<string, unknown>,
  options?: {
    domain?: ObservabilityDomain;
    message?: string;
    trace?: Partial<TraceContext>;
    actorId?: string;
    subjectId?: string;
    durationMs?: number;
    error?: unknown;
  },
) {
  try {
    const trace = createTraceContext({
      ...options?.trace,
      actorId: options?.actorId ?? options?.trace?.actorId,
      subjectId: options?.subjectId ?? options?.trace?.subjectId,
    });
    const payload: OperationalEvent = {
      service: "vendorhub-web",
      environment: environment(),
      level,
      domain: options?.domain ?? "system",
      event,
      message: options?.message,
      traceId: trace.traceId,
      spanId: trace.spanId,
      correlationId: trace.correlationId,
      requestId: trace.requestId,
      actorId: trace.actorId,
      subjectId: trace.subjectId,
      organizationId: trace.organizationId,
      workspaceId: trace.workspaceId,
      vendorId: trace.vendorId,
      durationMs: options?.durationMs,
      metadata: sanitizeMetadata(metadata),
      error: normalizeError(options?.error),
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === "production" && level === "debug") return payload;

    const writer = level === "error" || level === "fatal" ? console.error : level === "warn" ? console.warn : console.info;
    writer(JSON.stringify(payload));

    if (level === "error" || level === "fatal") {
      void forwardToMonitoring(payload);
    }

    return payload;
  } catch {
    return undefined;
  }
}

export async function withTrace<T>(
  domain: ObservabilityDomain,
  event: string,
  operation: (trace: TraceContext) => Promise<T>,
  metadata?: Record<string, unknown>,
  seed?: Partial<TraceContext>,
) {
  const trace = createTraceContext(seed);
  const started = Date.now();
  recordOperationalEvent("info", `${event}.started`, metadata, { domain, trace });

  try {
    const result = await operation(trace);
    recordOperationalEvent("info", `${event}.completed`, metadata, {
      domain,
      trace,
      durationMs: Date.now() - started,
    });
    return result;
  } catch (error) {
    recordOperationalEvent("error", `${event}.failed`, metadata, {
      domain,
      trace,
      durationMs: Date.now() - started,
      error,
    });
    throw error;
  }
}

export function headersForTrace(trace: Partial<TraceContext>) {
  return {
    "x-correlation-id": trace.correlationId ?? trace.traceId ?? randomId(),
    "x-trace-id": trace.traceId ?? randomId(),
    "x-request-id": trace.requestId ?? randomId(),
  };
}
