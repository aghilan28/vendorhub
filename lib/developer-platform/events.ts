import { globalReplayKey, resolveGlobalRegion } from "@/lib/global-infrastructure";
import type { EventStreamPlan, EventStreamSubscription, PlatformWebhookEvent } from "./types";

export function planDeveloperEventStream(input: {
  subscription: EventStreamSubscription;
  lastEvent?: PlatformWebhookEvent | null;
  replayRequested?: boolean;
}) {
  const routing = resolveGlobalRegion({
    request: {
      preferredRegion: input.subscription.region,
      tenantId: input.subscription.organizationId,
      domain: "realtime",
      latencySensitive: true,
      consistencyRequired: Boolean(input.replayRequested),
    },
  });
  const cursorSeed = input.lastEvent?.replayKey ?? input.subscription.cursor ?? "begin";

  return {
    partition: `${routing.region}:${input.subscription.organizationId}:${input.subscription.integrationId}`,
    cursor: globalReplayKey(["developer-event-cursor", input.subscription.organizationId, input.subscription.integrationId, cursorSeed]).slice(0, 32),
    replaySafe: routing.replaySafe,
    retentionHours: 72,
    actions: input.replayRequested
      ? ["serve event replay from durable cursor", "dedupe subscription replay keys", "record developer replay audit"]
      : ["stream subscribed platform events", "advance durable developer cursor"],
  } satisfies EventStreamPlan;
}

export function filterEventsForSubscription(events: PlatformWebhookEvent[], subscription: EventStreamSubscription) {
  return events.filter((event) => event.organizationId === subscription.organizationId && subscription.topics.includes(event.topic));
}
