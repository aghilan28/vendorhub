import { NextResponse } from "next/server";
import { AppError, toAppError } from "@/lib/errors";
import { createTraceContext, headersForTrace, recordOperationalEvent } from "@/lib/production/observability";
import { M } from "@/lib/observability/metrics";

export function okJson<T>(data: T) {
  const trace = createTraceContext();
  return NextResponse.json({ data, correlationId: trace.correlationId }, { headers: headersForTrace(trace) });
}

export function errorJson(error: unknown) {
  const trace = createTraceContext();
  const appError = error instanceof AppError ? error : toAppError(error);
  const status =
    appError.code === "AUTH_REQUIRED" ? 401 : appError.code === "FORBIDDEN" ? 403 : appError.code === "NOT_FOUND" ? 404 : appError.code === "VALIDATION_ERROR" ? 400 : 500;

  recordOperationalEvent(status >= 500 ? "error" : "warn", "api.request.failed", {
    code: appError.code,
    status,
  }, {
    domain: appError.code === "AUTH_REQUIRED" || appError.code === "FORBIDDEN" ? "auth" : "api",
    trace,
    error,
  });

  try {
    M.apiErrors.inc({ code: appError.code, status: `${Math.floor(status / 100)}xx` });
  } catch {
    /* telemetry must never break the error response */
  }

  return NextResponse.json(
    {
      code: appError.code,
      message: appError.message,
      details: appError.details,
      correlationId: trace.correlationId,
    },
    { status, headers: headersForTrace(trace) },
  );
}
