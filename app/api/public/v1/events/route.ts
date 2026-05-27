import { NextResponse } from "next/server";
import {
  authenticateDeveloperToken,
  buildPlatformWebhookEvent,
  contractForPublicApi,
  filterEventsForSubscription,
  negotiatePublicApiVersion,
  planDeveloperEventStream,
  planPublicApiRequest,
} from "@/lib/developer-platform";
import type { PlatformWebhookTopic } from "@/lib/developer-platform";
import { AppError, toAppError } from "@/lib/errors";
import { createTraceContext, headersForTrace, recordOperationalEvent } from "@/lib/production/observability";

const demoToken = "vh_20260527_org-demo_int-demo_public-demo-token";
const allowedTopics: readonly PlatformWebhookTopic[] = ["order.created", "logistics.delivery.updated"];
const demoIntegrations = [
  {
    id: "int-demo",
    organizationId: "org-demo",
    workspaceId: "workspace-demo",
    name: "Demo public integration",
    scopes: ["events:read"],
    tokenHash: "85007342e3fd5c388b7736e82500eff6293a1dee5dfea1088105689ff61b5f4c",
    tokenPrefix: "vh_20260527",
    rateLimitPerMinute: 120,
  },
] as const;

export async function GET(request: Request) {
  const trace = createTraceContext();

  try {
    const url = new URL(request.url);
    const version = negotiatePublicApiVersion(request.headers.get("vendorhub-api-version"));
    const contract = contractForPublicApi({ method: "GET", path: "/api/public/v1/events", version });
    const auth = authenticateDeveloperToken({
      authorizationHeader: request.headers.get("authorization") ?? `Bearer ${demoToken}`,
      integrations: [...demoIntegrations],
      requiredScopes: contract.requiredScopes,
    });
    const decision = planPublicApiRequest({
      contract,
      auth,
      idempotencyKey: request.headers.get("idempotency-key"),
      requestHash: url.searchParams.toString(),
    });
    const events = [
      buildPlatformWebhookEvent({
        id: "evt-demo-order",
        topic: "order.created",
        organizationId: auth.organizationId,
        payload: { orderId: "order-demo", state: "CREATED" },
        occurredAt: "2026-05-27T00:00:00.000Z",
      }),
      buildPlatformWebhookEvent({
        id: "evt-demo-logistics",
        topic: "logistics.delivery.updated",
        organizationId: auth.organizationId,
        payload: { deliveryId: "delivery-demo", state: "IN_TRANSIT" },
        occurredAt: "2026-05-27T00:01:00.000Z",
      }),
    ];
    const requestedTopics = url.searchParams.getAll("topic").filter((topic): topic is PlatformWebhookTopic => allowedTopics.includes(topic as PlatformWebhookTopic));
    const topics: readonly PlatformWebhookTopic[] = requestedTopics.length ? requestedTopics : ["order.created", "logistics.delivery.updated"];
    const subscription = {
      integrationId: auth.integrationId,
      organizationId: auth.organizationId,
      topics,
      cursor: url.searchParams.get("cursor"),
    } as const;
    const stream = planDeveloperEventStream({ subscription, lastEvent: events.at(-1), replayRequested: Boolean(subscription.cursor) });
    const data = filterEventsForSubscription(events, subscription);

    recordOperationalEvent("info", "developer_platform.public_events.requested", {
      integrationId: auth.integrationId,
      organizationId: auth.organizationId,
      eventCount: data.length,
    }, { domain: "api", trace });

    return NextResponse.json(
      { data, cursor: stream.cursor, correlationId: trace.correlationId },
      { headers: { ...headersForTrace(trace), ...decision.headers } },
    );
  } catch (error) {
    const appError = error instanceof AppError ? error : toAppError(error);
    const status = appError.code === "AUTH_REQUIRED" ? 401 : appError.code === "FORBIDDEN" ? 403 : appError.code === "NOT_FOUND" ? 404 : appError.code === "VALIDATION_ERROR" ? 400 : 500;

    recordOperationalEvent(status >= 500 ? "error" : "warn", "developer_platform.public_events.failed", {
      code: appError.code,
      status,
    }, { domain: "api", trace, error });

    return NextResponse.json(
      { code: appError.code, message: appError.message, correlationId: trace.correlationId },
      { status, headers: headersForTrace(trace) },
    );
  }
}
