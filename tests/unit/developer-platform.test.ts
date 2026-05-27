import { describe, expect, it } from "vitest";
import {
  authenticateDeveloperToken,
  buildPlatformWebhookEvent,
  buildTypeScriptSdkContract,
  contractForPublicApi,
  createDeveloperToken,
  diagnoseWebhookReplayStorm,
  filterEventsForSubscription,
  hashDeveloperToken,
  negotiatePublicApiVersion,
  planDeveloperEventStream,
  planPublicApiRequest,
  planTokenRotation,
  planWebhookDelivery,
  publicApiContracts,
  simulatePlatformFailure,
  validateContractCompatibility,
  validateDeveloperPlatform,
  validateSdkCompatibility,
  verifyPlatformWebhookSignature,
  type DeveloperIntegration,
} from "@/lib/developer-platform";
import { evaluateOperationalAlerts } from "@/lib/observability/alerts";

const token = "vh_20260527_org-1_int-1_test-token";
const integration: DeveloperIntegration = {
  id: "int-1",
  organizationId: "org-1",
  workspaceId: "workspace-1",
  name: "Partner OMS",
  scopes: ["events:read", "orders:read", "webhooks:write"],
  tokenHash: hashDeveloperToken(token),
  tokenPrefix: "vh_20260527",
  rateLimitPerMinute: 100,
  rotatedAt: "2026-01-01T00:00:00.000Z",
};

describe("phase 37 developer platform", () => {
  it("negotiates versioned public API contracts with tenant-scoped developer auth", () => {
    const version = negotiatePublicApiVersion("2026-05-27");
    const contract = contractForPublicApi({ method: "GET", path: "/api/public/v1/events", version });
    const auth = authenticateDeveloperToken({ authorizationHeader: `Bearer ${token}`, integrations: [integration], requiredScopes: contract.requiredScopes });
    const decision = planPublicApiRequest({ contract, auth, idempotencyKey: "idem-1" });

    expect(auth.organizationId).toBe("org-1");
    expect(decision.compatible).toBe(true);
    expect(decision.headers["VendorHub-API-Version"]).toBe("2026-05-27");
    expect(decision.replayKey).toHaveLength(64);
  });

  it("detects breaking API and SDK contract drift before release", () => {
    const previous = publicApiContracts[0];
    const next = { ...previous, responseShape: ["data"], requiredScopes: ["orders:read", "orders:write"] as const };
    const compatibility = validateContractCompatibility({ previous, next });
    const sdk = buildTypeScriptSdkContract("2026-05-27");
    const sdkCompatibility = validateSdkCompatibility({ expected: sdk, observed: { ...sdk, exports: sdk.exports.filter((item) => item !== "VendorHubClient") } });

    expect(compatibility.compatible).toBe(false);
    expect(compatibility.actions).toContain("create new API version before release");
    expect(sdkCompatibility.compatible).toBe(false);
    expect(sdkCompatibility.actions).toContain("block SDK release");
  });

  it("plans replay-safe webhook delivery with signatures and dead-letter recovery", () => {
    const event = buildPlatformWebhookEvent({ id: "evt-1", topic: "order.created", organizationId: "org-1", payload: { orderId: "order-1" }, occurredAt: "2026-05-27T00:00:00.000Z" });
    const endpoint = { id: "wh-1", integrationId: "int-1", organizationId: "org-1", url: "https://partner.example/webhooks", topics: ["order.created"], secret: "secret" } as const;
    const plan = planWebhookDelivery({ endpoint, event, attempt: 1, recentFailureRate: 0, deadLetterCount: 0, now: new Date("2026-05-27T00:00:00.000Z") });
    const duplicate = planWebhookDelivery({ endpoint, event, attempt: 2, recentFailureRate: 0.5, deadLetterCount: 0, now: new Date("2026-05-27T00:00:00.000Z") });
    const storm = diagnoseWebhookReplayStorm([plan, plan, duplicate]);

    expect(plan.state).toBe("deliver");
    expect(verifyPlatformWebhookSignature({ secret: endpoint.secret, signature: plan.signature, event, timestamp: "2026-05-27T00:00:00.000Z" })).toBe(true);
    expect(storm.stormDetected).toBe(true);
    expect(storm.actions).toContain("dedupe webhook deliveries by replay key");
  });

  it("creates durable event stream cursors and filters tenant-safe subscriptions", () => {
    const ownEvent = buildPlatformWebhookEvent({ id: "evt-1", topic: "logistics.delivery.updated", organizationId: "org-1", payload: { deliveryId: "d1" } });
    const otherEvent = buildPlatformWebhookEvent({ id: "evt-2", topic: "logistics.delivery.updated", organizationId: "org-2", payload: { deliveryId: "d2" } });
    const subscription = { integrationId: "int-1", organizationId: "org-1", topics: ["logistics.delivery.updated"], cursor: "cursor-1" } as const;
    const stream = planDeveloperEventStream({ subscription, lastEvent: ownEvent, replayRequested: true });
    const events = filterEventsForSubscription([ownEvent, otherEvent], subscription);

    expect(stream.replaySafe).toBe(true);
    expect(stream.actions).toContain("serve event replay from durable cursor");
    expect(events).toEqual([ownEvent]);
  });

  it("validates developer observability, auth rotation, and failure recovery", () => {
    const newToken = createDeveloperToken({ integrationId: integration.id, organizationId: integration.organizationId, now: new Date("2026-05-27T00:00:00.000Z") });
    const rotation = planTokenRotation({ integration, now: new Date("2026-05-27T00:00:00.000Z") });
    const report = validateDeveloperPlatform({
      apiLatencyMs: 1200,
      apiErrorRate: 0.08,
      webhookRetryRate: 0.2,
      webhookDeadLetters: 4,
      integrationFailureRate: 0.1,
      sdkContractDrift: 1,
      replayFrequency: 0.18,
      rateLimitSaturation: 0.99,
      externalAuthFailures: 25,
      tenantLeakageSignals: 0,
      externalQueuePressure: 0.95,
    }, new Date("2026-05-27T00:00:00.000Z"));
    const failure = simulatePlatformFailure("replay_duplication");
    const alerts = evaluateOperationalAlerts({
      checkoutFailureRate: 0,
      paymentMismatchCount: 0,
      webhookRetryCount: 0,
      openIntegrityAlerts: 0,
      realtimeReconnects: 0,
      activeRealtimeChannels: 0,
      aiFallbackRate: 0,
      staleEmbeddingCount: 0,
      dbFailedWrites: 0,
      authFailureCount: 0,
      refundOpenCount: 0,
      deliveryDelayedCount: 0,
      moderationBacklog: 0,
      publicApiErrorRate: 0.08,
      webhookReplayStormCount: 1,
      sdkContractDriftCount: 1,
      externalAuthFailureCount: 25,
    });

    expect(newToken).toMatch(/^vh_20260527_org-1_int-1_/);
    expect(rotation.rotationRequired).toBe(true);
    expect(report.productionSafe).toBe(false);
    expect(report.risks).toContain("sdk-compatibility-drift");
    expect(failure.platformTruthProtected).toBe(true);
    expect(alerts.map((alert) => alert.id)).toEqual(expect.arrayContaining(["public-api-platform-saturation", "developer-webhook-reliability-risk", "sdk-contract-drift-risk"]));
  });
});
