import { createHmac } from "crypto";
import { globalReplayKey } from "@/lib/global-infrastructure";
import type { PlatformWebhookEvent, WebhookDeliveryPlan, WebhookEndpoint } from "./types";

export function signPlatformWebhook(input: { secret: string; event: PlatformWebhookEvent; timestamp: string }) {
  return createHmac("sha256", input.secret)
    .update(`${input.timestamp}.${input.event.id}.${input.event.topic}.${JSON.stringify(input.event.payload)}`)
    .digest("hex");
}

export function verifyPlatformWebhookSignature(input: {
  secret: string;
  signature: string;
  event: PlatformWebhookEvent;
  timestamp: string;
}) {
  const expected = signPlatformWebhook({ secret: input.secret, event: input.event, timestamp: input.timestamp });
  return expected === input.signature;
}

export function buildPlatformWebhookEvent(input: {
  id: string;
  topic: PlatformWebhookEvent["topic"];
  organizationId: string;
  payload: Record<string, unknown>;
  occurredAt?: string;
}) {
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  return {
    id: input.id,
    topic: input.topic,
    organizationId: input.organizationId,
    payload: input.payload,
    occurredAt,
    replayKey: globalReplayKey(["platform-webhook-event", input.organizationId, input.topic, input.id]),
  } satisfies PlatformWebhookEvent;
}

export function planWebhookDelivery(input: {
  endpoint: WebhookEndpoint;
  event: PlatformWebhookEvent;
  attempt: number;
  recentFailureRate: number;
  deadLetterCount: number;
  now?: Date;
}): WebhookDeliveryPlan {
  const now = input.now ?? new Date();
  const signature = signPlatformWebhook({ secret: input.endpoint.secret, event: input.event, timestamp: now.toISOString() });
  const disabled = Boolean(input.endpoint.disabledAt);
  const subscribed = input.endpoint.topics.includes(input.event.topic);
  const backpressure = input.recentFailureRate > 0.35 || input.attempt > 5;
  const deadLetter = input.deadLetterCount > 20 || input.attempt > 10;
  const retryDelayMs = Math.min(3_600_000, 30_000 * 2 ** Math.max(0, input.attempt - 1));

  return {
    endpointId: input.endpoint.id,
    eventId: input.event.id,
    topic: input.event.topic,
    signature,
    replayKey: globalReplayKey(["webhook-delivery", input.endpoint.id, input.event.replayKey]),
    attempt: input.attempt,
    nextAttemptAt: new Date(now.getTime() + retryDelayMs).toISOString(),
    state: disabled || !subscribed ? "disabled" : deadLetter ? "dead_letter" : backpressure ? "backpressure" : "deliver",
    actions:
      disabled || !subscribed
        ? ["skip disabled or unsubscribed endpoint"]
        : deadLetter
          ? ["move webhook delivery to dead-letter queue", "notify integration owner", "preserve replay cursor"]
          : backpressure
            ? ["pause low-priority webhook fanout", "retry with exponential backoff", "record webhook backpressure metric"]
            : ["deliver webhook with signature", "record delivery attempt"],
  };
}

export function diagnoseWebhookReplayStorm(deliveries: WebhookDeliveryPlan[]) {
  const duplicateCount = deliveries.length - new Set(deliveries.map((delivery) => delivery.replayKey)).size;
  const deadLetters = deliveries.filter((delivery) => delivery.state === "dead_letter").length;
  const backpressure = deliveries.filter((delivery) => delivery.state === "backpressure").length;

  return {
    replaySafe: duplicateCount === 0,
    duplicateCount,
    deadLetters,
    backpressure,
    stormDetected: duplicateCount > 0 || deadLetters > 5 || backpressure > 10,
    actions:
      duplicateCount > 0 || deadLetters > 5 || backpressure > 10
        ? ["dedupe webhook deliveries by replay key", "throttle endpoint fanout", "run webhook dead-letter recovery"]
        : ["continue webhook delivery"],
  };
}
