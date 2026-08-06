/**
 * Typed mirror of infra/kafka/topics.json so application producers/consumers
 * reference topics + partition keys type-safely. Source of truth for topic
 * provisioning remains infra/kafka/topics.json (used by register-topics.sh).
 */
export type RuntimeDomain =
  | "orders"
  | "payments"
  | "inventory"
  | "logistics"
  | "notifications"
  | "search"
  | "ai"
  | "governance"
  | "analytics"
  | "knowledge"
  | "realtime";

export type TopicSpec = {
  name: string;
  domain: RuntimeDomain;
  owner: string;
  partitionKey: string;
  dlq: string;
  replay: string;
};

export const TOPICS = {
  orderLifecycle: { name: "kartex.orders.order.lifecycle", domain: "orders", owner: "commerce-platform", partitionKey: "orderId", dlq: "kartex.orders.order.lifecycle.dlq", replay: "kartex.orders.order.lifecycle.replay" },
  paymentEvents: { name: "kartex.payments.transaction.events", domain: "payments", owner: "payments-platform", partitionKey: "paymentId", dlq: "kartex.payments.transaction.events.dlq", replay: "kartex.payments.transaction.events.replay" },
  inventoryChanged: { name: "kartex.inventory.stock.changed", domain: "inventory", owner: "catalog-platform", partitionKey: "productId", dlq: "kartex.inventory.stock.changed.dlq", replay: "kartex.inventory.stock.changed.replay" },
  deliveryTracking: { name: "kartex.logistics.delivery.tracking", domain: "logistics", owner: "logistics-platform", partitionKey: "deliveryId", dlq: "kartex.logistics.delivery.tracking.dlq", replay: "kartex.logistics.delivery.tracking.replay" },
  notificationDispatch: { name: "kartex.notifications.dispatch.requested", domain: "notifications", owner: "engagement-platform", partitionKey: "recipientId", dlq: "kartex.notifications.dispatch.requested.dlq", replay: "kartex.notifications.dispatch.requested.replay" },
  catalogIndexing: { name: "kartex.search.catalog.indexing", domain: "search", owner: "discovery-platform", partitionKey: "productId", dlq: "kartex.search.catalog.indexing.dlq", replay: "kartex.search.catalog.indexing.replay" },
  embeddingRequested: { name: "kartex.ai.embedding.requested", domain: "ai", owner: "intelligence-platform", partitionKey: "productId", dlq: "kartex.ai.embedding.requested.dlq", replay: "kartex.ai.embedding.requested.replay" },
  riskSignals: { name: "kartex.governance.risk.signals", domain: "governance", owner: "trust-platform", partitionKey: "subjectId", dlq: "kartex.governance.risk.signals.dlq", replay: "kartex.governance.risk.signals.replay" },
  telemetry: { name: "kartex.analytics.telemetry.stream", domain: "analytics", owner: "data-platform", partitionKey: "sessionId", dlq: "kartex.analytics.telemetry.stream.dlq", replay: "kartex.analytics.telemetry.stream.replay" },
  graphMutations: { name: "kartex.knowledge.graph.mutations", domain: "knowledge", owner: "knowledge-platform", partitionKey: "entityId", dlq: "kartex.knowledge.graph.mutations.dlq", replay: "kartex.knowledge.graph.mutations.replay" },
  realtimeInvalidation: { name: "kartex.realtime.invalidation", domain: "realtime", owner: "experience-platform", partitionKey: "channel", dlq: "kartex.realtime.invalidation.dlq", replay: "kartex.realtime.invalidation.replay" },
} as const satisfies Record<string, TopicSpec>;

export type TopicKey = keyof typeof TOPICS;

export function allTopicSpecs(): TopicSpec[] {
  return Object.values(TOPICS);
}
