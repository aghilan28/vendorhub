import { recordOperationalEvent } from "@/lib/production/observability";
import type { Json } from "@/types/database";
import { enqueueAsyncJob, idempotencyKeyFor, claimDurableEvents, completeDurableEvent, failDurableEvent } from "./orchestrator";
import type { AsyncJobName, DurableEventName, DurableEventRow } from "./types";

type EventRoute = {
  jobName: AsyncJobName;
  priority?: "critical" | "high" | "normal" | "low";
  payload: (event: DurableEventRow) => Json;
};

function eventPayload(event: DurableEventRow) {
  return (typeof event.payload === "object" && event.payload !== null ? event.payload : {}) as Record<string, unknown>;
}

const eventRoutes: Partial<Record<DurableEventName, EventRoute>> = {
  "payment.webhook.received": {
    jobName: "payment.webhook.reconcile",
    priority: "critical",
    payload: (event) => event.payload,
  },
  "payment.reconciliation.requested": {
    jobName: "payment.reconciliation.run",
    priority: "critical",
    payload: (event) => ({ batchSize: Number(eventPayload(event).batchSize ?? 100) }),
  },
  "payment.refund.requested": {
    jobName: "payment.refund.sync",
    priority: "high",
    payload: (event) => event.payload,
  },
  "payment.payout.verification_requested": {
    jobName: "payment.payout.verify",
    priority: "high",
    payload: (event) => event.payload,
  },
  "payment.ledger.repair_requested": {
    jobName: "payment.reconciliation.run",
    priority: "critical",
    payload: (event) => ({ ...eventPayload(event), ledgerRepair: true }),
  },
  "payment.settlement.reconciliation_requested": {
    jobName: "payment.reconciliation.run",
    priority: "critical",
    payload: (event) => ({ ...eventPayload(event), settlementReconciliation: true }),
  },
  "delivery.eta.refresh_requested": {
    jobName: "delivery.eta.refresh",
    priority: "high",
    payload: (event) => event.payload,
  },
  "delivery.dispatch.recalculation_requested": {
    jobName: "delivery.dispatch.recalculate",
    priority: "high",
    payload: (event) => event.payload,
  },
  "delivery.reconciliation.requested": {
    jobName: "delivery.reconciliation.run",
    priority: "high",
    payload: (event) => event.payload,
  },
  "delivery.tracking.replay_requested": {
    jobName: "delivery.failed.recover",
    priority: "high",
    payload: (event) => event.payload,
  },
  "delivery.provider.failover_requested": {
    jobName: "delivery.provider.failover",
    priority: "critical",
    payload: (event) => event.payload,
  },
  "delivery.routing.refresh_requested": {
    jobName: "delivery.routing.refresh",
    priority: "normal",
    payload: (event) => event.payload,
  },
  "delivery.sla.recalculation_requested": {
    jobName: "delivery.sla.recalculate",
    priority: "high",
    payload: (event) => event.payload,
  },
  "delivery.congestion.analysis_requested": {
    jobName: "delivery.congestion.analyze",
    priority: "normal",
    payload: (event) => event.payload,
  },
  "realtime.invalidation.requested": {
    jobName: "realtime.invalidation.flush",
    priority: "high",
    payload: (event) => event.payload,
  },
  "governance.trust.recalculation_requested": {
    jobName: "governance.trust.recalculate",
    priority: "high",
    payload: (event) => event.payload,
  },
  "governance.dispute.analysis_requested": {
    jobName: "governance.dispute.analyze",
    priority: "high",
    payload: (event) => event.payload,
  },
  "ai.embedding.refresh_requested": {
    jobName: "ai.embedding.refresh",
    priority: "normal",
    payload: (event) => event.payload,
  },
  "ai.semantic.index_requested": {
    jobName: "ai.semantic.index",
    priority: "normal",
    payload: (event) => event.payload,
  },
  "ai.recommendations.recalculation_requested": {
    jobName: "ai.recommendations.recalculate",
    priority: "low",
    payload: (event) => event.payload,
  },
  "ai.ranking.recalculation_requested": {
    jobName: "ai.ranking.recalculate",
    priority: "low",
    payload: (event) => event.payload,
  },
  "analytics.seller.aggregate_requested": {
    jobName: "analytics.seller.aggregate",
    priority: "low",
    payload: (event) => event.payload,
  },
  "analytics.forecast.requested": {
    jobName: "analytics.forecast.run",
    priority: "low",
    payload: (event) => event.payload,
  },
  "analytics.operational_metrics.requested": {
    jobName: "analytics.operational.metrics",
    priority: "normal",
    payload: (event) => event.payload,
  },
  "notification.dispatch_requested": {
    jobName: "notification.dispatch",
    priority: "normal",
    payload: (event) => event.payload,
  },
  "notification.digest.requested": {
    jobName: "notification.digest.batch",
    priority: "low",
    payload: (event) => event.payload,
  },
};

export function routeForDurableEvent(eventType: string) {
  return eventRoutes[eventType as DurableEventName] ?? null;
}

export async function processDurableEvent(event: DurableEventRow) {
  const route = routeForDurableEvent(event.event_type);
  if (!route) {
    await completeDurableEvent(event.id, { routed: false, reason: "no_async_route" });
    return { eventId: event.id, routed: false };
  }

  const result = await enqueueAsyncJob({
    name: route.jobName,
    payload: route.payload(event),
    priority: route.priority,
    idempotencyKey: idempotencyKeyFor(["durable-event", event.source, event.event_key, route.jobName]),
    trace: {
      durableEventId: event.id,
      durableSequenceId: event.sequence_id,
      source: event.source,
    },
    metadata: {
      durableEventId: event.id,
      durableEventType: event.event_type,
      replaySafe: true,
    },
  });

  await completeDurableEvent(event.id, { routed: true, routeJobName: route.jobName, enqueueResult: result as Json });
  return { eventId: event.id, routed: true, jobName: route.jobName };
}

export async function runDurableEventProcessorOnce(input: { workerId?: string; limit?: number } = {}) {
  const workerId = input.workerId ?? `vendorhub-event-worker-${crypto.randomUUID()}`;
  const events = await claimDurableEvents(workerId, input.limit ?? 20);
  const results = [];

  for (const event of events) {
    try {
      results.push(await processDurableEvent(event));
    } catch (error) {
      const retryDelaySeconds = Math.min(3600, 30 * 2 ** Math.max(0, event.attempts - 1));
      await failDurableEvent(event, error instanceof Error ? error.message : "Durable event processing failed.", retryDelaySeconds, false, {
        workerId,
      });
      recordOperationalEvent("error", "durable_event.processing_failed", {
        eventId: event.id,
        eventType: event.event_type,
        retryDelaySeconds,
      }, { domain: "system", subjectId: event.id, error });
      results.push({ eventId: event.id, routed: false, state: "FAILED", retryDelaySeconds });
    }
  }

  return {
    workerId,
    claimed: events.length,
    results,
  };
}
