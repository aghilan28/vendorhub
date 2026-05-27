import type { Json } from "@/types/database";

export type AsyncJobCategory = "payment" | "delivery" | "ai" | "governance" | "notification" | "analytics" | "realtime" | "reconciliation";
export type AsyncJobState = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "DEAD_LETTER" | "CANCELLED";
export type DurableEventState = "PENDING" | "PROCESSING" | "PROCESSED" | "FAILED" | "DEAD_LETTER";
export type QueueDomain = "commerce" | "logistics" | "ai" | "governance" | "analytics" | "notification" | "realtime";
export type ComputeClass = "critical" | "interactive" | "standard" | "heavy" | "bulk";
export type WorkerPoolName =
  | "commerce-critical"
  | "logistics-coordination"
  | "ai-heavy-compute"
  | "governance-risk"
  | "analytics-bulk"
  | "notification-delivery"
  | "realtime-sync"
  | "reconciliation-control";

export type AsyncRegionHint = "bom1" | "sin1" | "fra1" | "iad1";

export type AsyncJobName =
  | "payment.webhook.reconcile"
  | "payment.reconciliation.run"
  | "payment.refund.sync"
  | "payment.payout.verify"
  | "delivery.eta.refresh"
  | "delivery.dispatch.recalculate"
  | "delivery.reconciliation.run"
  | "delivery.failed.recover"
  | "delivery.provider.failover"
  | "delivery.routing.refresh"
  | "delivery.sla.recalculate"
  | "delivery.congestion.analyze"
  | "ai.embedding.refresh"
  | "ai.embedding.refresh_stale"
  | "ai.semantic.index"
  | "ai.recommendations.recalculate"
  | "ai.ranking.recalculate"
  | "ai.diagnostics.run"
  | "ai.feedback.aggregate"
  | "ai.personalization.refresh"
  | "ai.retrieval.observe"
  | "governance.fraud.scan"
  | "governance.moderation.scan"
  | "governance.trust.recalculate"
  | "governance.dispute.analyze"
  | "india.upi.recover"
  | "localization.audit"
  | "notification.dispatch"
  | "notification.email.deliver"
  | "notification.push.deliver"
  | "notification.sms.placeholder"
  | "notification.digest.batch"
  | "analytics.seller.aggregate"
  | "analytics.forecast.run"
  | "analytics.operational.metrics"
  | "analytics.admin.refresh"
  | "realtime.invalidation.flush";

export type AsyncJobPriority = "critical" | "high" | "normal" | "low" | number;

export type QueuePolicy = {
  queueName: string;
  category: AsyncJobCategory;
  domain: QueueDomain;
  workerPool: WorkerPoolName;
  computeClass: ComputeClass;
  maxAttempts: number;
  baseRetryDelaySeconds: number;
  maxRetryDelaySeconds: number;
  concurrency: number;
  minReservedConcurrency: number;
  maxElasticConcurrency: number;
  timeoutSeconds: number;
  priority: number;
  rateLimitPerMinute: number;
  saturationBackoffSeconds: number;
  deadLetterQueue: string;
  replayQueue: string;
  partitionKey?: string;
  allowBurst?: boolean;
};

export type EnqueueJobInput = {
  name: AsyncJobName;
  payload: Json;
  idempotencyKey: string;
  tenant?: {
    organizationId: string;
    workspaceId?: string | null;
    vendorId?: string | null;
  };
  region?: {
    preferredRegion?: AsyncRegionHint;
    userRegionHint?: string | null;
  };
  priority?: AsyncJobPriority;
  runAfter?: Date;
  trace?: Record<string, Json | undefined>;
  metadata?: Record<string, Json | undefined>;
};

export type DurableEventName =
  | "payment.webhook.received"
  | "payment.webhook.reconciled"
  | "payment.reconciliation.requested"
  | "payment.refund.requested"
  | "payment.payout.verification_requested"
  | "payment.ledger.repair_requested"
  | "payment.settlement.reconciliation_requested"
  | "delivery.eta.refresh_requested"
  | "delivery.dispatch.recalculation_requested"
  | "delivery.reconciliation.requested"
  | "delivery.tracking.replay_requested"
  | "delivery.provider.failover_requested"
  | "delivery.routing.refresh_requested"
  | "delivery.sla.recalculation_requested"
  | "delivery.congestion.analysis_requested"
  | "realtime.invalidation.requested"
  | "governance.fraud.scan.completed"
  | "governance.moderation.scan.completed"
  | "governance.trust.recalculation_requested"
  | "governance.dispute.analysis_requested"
  | "ai.embedding.refresh_requested"
  | "ai.semantic.index_requested"
  | "ai.recommendations.recalculation_requested"
  | "ai.ranking.recalculation_requested"
  | "ai.feedback.aggregate_requested"
  | "ai.personalization.refresh_requested"
  | "ai.retrieval.observation_requested"
  | "analytics.seller.aggregate_requested"
  | "analytics.forecast.requested"
  | "analytics.operational_metrics.requested"
  | "notification.dispatch_requested"
  | "notification.digest.requested"
  | "india.upi.recover.completed";

export type DurableEventRow = {
  id: string;
  source: string;
  event_key: string;
  event_type: DurableEventName | string;
  subject_type: string | null;
  subject_id: string | null;
  sequence_id: number;
  state: DurableEventState;
  payload: Json;
  trace: Json;
  attempts: number;
  available_at: string;
  processed_at: string | null;
  last_error: string | null;
  metadata: Json;
  organization_id?: string | null;
  workspace_id?: string | null;
  vendor_id?: string | null;
};

export type AsyncJobRow = {
  id: string;
  queue_name: string;
  category: AsyncJobCategory;
  job_name: AsyncJobName;
  priority: number;
  state: AsyncJobState;
  payload: Json;
  trace: Json;
  idempotency_key: string;
  attempts: number;
  max_attempts: number;
  scheduled_at: string;
  locked_until: string | null;
  last_error: string | null;
  metadata: Json;
};

export type AsyncWorkerResult = {
  ok: boolean;
  metadata?: Record<string, Json | undefined>;
  retryDelaySeconds?: number;
  poison?: boolean;
};

export type WorkerPoolPolicy = {
  name: WorkerPoolName;
  queues: string[];
  minWorkers: number;
  maxWorkers: number;
  maxJobsPerRun: number;
  heartbeatTtlSeconds: number;
  gracefulShutdownSeconds: number;
  scaleUpBacklogPerWorker: number;
  scaleDownIdleRuns: number;
  reservedForDomains: QueueDomain[];
};
