import { NextResponse } from "next/server";
import { AppError, toAppError } from "@/lib/errors";
import { recordOperationalEvent } from "@/lib/production/observability";
import { getSecurityContext, type RequestSecurityContext } from "./authorization";
import { checkRateLimit, type RateLimitPolicy } from "./rate-limit";
import { recordSecurityAudit } from "./audit";

type GuardOptions = {
  name: string;
  rateLimit?: RateLimitPolicy;
  requireAuth?: boolean;
  audit?: boolean;
};

export async function withSecurity<T>(
  request: Request,
  options: GuardOptions,
  handler: (context: RequestSecurityContext) => Promise<T>,
) {
  const context = await getSecurityContext(request);
  const actorKey = context.actor?.id ?? context.ip;

  if (options.requireAuth && !context.actor) {
    await recordDenied(options.name, context, "AUTH_REQUIRED");
    throw new AppError("AUTH_REQUIRED", "Authentication is required.");
  }

  if (options.rateLimit) {
    const rate = checkRateLimit(`${options.name}:${actorKey}`, options.rateLimit);
    if (!rate.allowed) {
      recordOperationalEvent("warn", "security.rate_limit_triggered", { route: options.name, resetAt: rate.resetAt }, { domain: "security" });
      await recordDenied(options.name, context, "RATE_LIMITED");
      throw new AppError("VALIDATION_ERROR", "Too many requests. Try again shortly.", { resetAt: rate.resetAt });
    }
  }

  const result = await handler(context);

  if (options.audit) {
    await recordSecurityAudit({
      actorId: context.actor?.id,
      action: `api.${options.name}.allowed`,
      entityTable: "api_route",
      entityId: options.name,
      metadata: { requestId: context.requestId, ip: context.ip },
    });
  }

  return result;
}

export function securityErrorJson(error: unknown) {
  const appError = error instanceof AppError ? error : toAppError(error);
  const status =
    appError.code === "AUTH_REQUIRED"
      ? 401
      : appError.code === "FORBIDDEN"
        ? 403
        : appError.code === "NOT_FOUND"
          ? 404
          : appError.code === "VALIDATION_ERROR"
            ? 400
            : 500;

  return NextResponse.json(
    {
      code: appError.code,
      message: safeSecurityMessage(appError),
    },
    { status },
  );
}

function safeSecurityMessage(error: AppError) {
  if (error.code === "DATABASE_ERROR") return "The request could not be completed.";
  return error.message;
}

async function recordDenied(route: string, context: RequestSecurityContext, reason: string) {
  recordOperationalEvent("warn", "security.request_denied", { route, reason }, { domain: "security" });
  await recordSecurityAudit({
    actorId: context.actor?.id,
    action: `api.${route}.denied`,
    entityTable: "api_route",
    entityId: route,
    metadata: { reason, requestId: context.requestId, ip: context.ip },
  });
}
