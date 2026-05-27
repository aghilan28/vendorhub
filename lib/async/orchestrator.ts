import { createHash } from "crypto";
import { AppError } from "@/lib/errors";
import { recordOperationalEvent } from "@/lib/production/observability";
import type { Json } from "@/types/database";
import { createTenantEnvelope, tenantScopedQueuePartition } from "@/lib/enterprise-governance/tenant-isolation";
import { resolveGlobalRegion, routeAsyncJobToRegion } from "@/lib/global-infrastructure";
import { domainForAsyncCategory } from "./observability-domain";
import { concurrencyLimitsForQueues, expandQueueNames, lockSecondsForQueues, policyForJob, priorityValue, retryDelayForAttempt } from "./policies";
import { createAsyncSupabaseClient } from "./supabase-unsafe";
import type { AsyncJobName, AsyncJobRow, DurableEventRow, EnqueueJobInput, WorkerPoolName } from "./types";

type RpcJsonResult = Record<string, unknown> | null;

function hashJson(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value ?? {})).digest("hex");
}

function sanitizeTrace(trace?: Record<string, Json | undefined>) {
  return Object.fromEntries(Object.entries(trace ?? {}).filter(([, value]) => value !== undefined)) as Record<string, Json>;
}

export function idempotencyKeyFor(parts: Array<string | number | boolean | null | undefined>) {
  return createHash("sha256").update(parts.map((part) => String(part ?? "unknown")).join(":")).digest("hex");
}

export async function enqueueAsyncJob(input: EnqueueJobInput) {
  const policy = policyForJob(input.name);
  const supabase = createAsyncSupabaseClient();
  const tenant = input.tenant
    ? createTenantEnvelope({
        organizationId: input.tenant.organizationId,
        workspaceId: input.tenant.workspaceId,
        vendorId: input.tenant.vendorId,
      })
    : null;
  const region = routeAsyncJobToRegion({
    jobName: input.name,
    tenantId: tenant?.organizationId,
    preferredRegion: input.region?.preferredRegion,
  });
  const { data, error } = await supabase.rpc("enqueue_async_job", {
    target_queue: policy.queueName,
    target_category: policy.category,
    target_job_name: input.name,
    job_payload: input.payload,
    job_priority: priorityValue(input.priority, policy),
    job_idempotency_key: input.idempotencyKey,
    run_after: input.runAfter?.toISOString() ?? new Date().toISOString(),
    job_max_attempts: policy.maxAttempts,
    job_trace: sanitizeTrace(input.trace),
    job_metadata: {
      queueDomain: policy.domain,
      workerPool: policy.workerPool,
      computeClass: policy.computeClass,
      deadLetterQueue: policy.deadLetterQueue,
      replayQueue: policy.replayQueue,
      organizationId: tenant?.organizationId,
      workspaceId: tenant?.workspaceId,
      vendorId: tenant?.vendorId,
      tenantIsolationKey: tenant?.isolationKey,
      globalRegion: region.region,
      globalFallbackRegions: region.fallbackRegions.join(","),
      globalConsistencyMode: region.consistencyMode,
      globalQueueRegionKey: region.queueRegionKey,
      globalRoutingDegraded: region.degraded,
      partitionKey: tenant
        ? `${region.region}:${tenantScopedQueuePartition(tenant, policy.partitionKey ? String((input.payload as Record<string, unknown> | null)?.[policy.partitionKey] ?? "default") : "default")}`
        : policy.partitionKey
          ? `${region.region}:${String((input.payload as Record<string, unknown> | null)?.[policy.partitionKey] ?? "default")}`
          : `${region.region}:default`,
      timeoutSeconds: policy.timeoutSeconds,
      requestHash: hashJson(input.payload),
      ...(input.metadata ?? {}),
    },
  });

  if (error) {
    recordOperationalEvent("error", "async.job.enqueue_failed", {
      jobName: input.name,
      queueName: policy.queueName,
    }, { domain: "system", error });
    throw new AppError("DATABASE_ERROR", "Async job could not be enqueued.", error);
  }

  recordOperationalEvent("info", "async.job.enqueued", {
    jobName: input.name,
    queueName: policy.queueName,
    category: policy.category,
    organizationId: tenant?.organizationId,
    globalRegion: region.region,
    result: "[object]",
  }, { domain: domainForAsyncCategory(policy.category) });

  return data as RpcJsonResult;
}

export async function persistDurableEvent(input: {
  source: string;
  eventKey: string;
  eventType: string;
  payload: Json;
  tenant?: {
    organizationId: string;
    workspaceId?: string | null;
    vendorId?: string | null;
  };
  subjectType?: string;
  subjectId?: string;
  trace?: Record<string, Json | undefined>;
  metadata?: Record<string, Json | undefined>;
  region?: {
    preferredRegion?: "bom1" | "sin1" | "fra1" | "iad1";
    userRegionHint?: string | null;
  };
}) {
  const supabase = createAsyncSupabaseClient();
  const tenant = input.tenant
    ? createTenantEnvelope({
        organizationId: input.tenant.organizationId,
        workspaceId: input.tenant.workspaceId,
        vendorId: input.tenant.vendorId,
      })
    : null;
  const region = resolveGlobalRegion({
    request: {
      preferredRegion: input.region?.preferredRegion,
      userRegionHint: input.region?.userRegionHint,
      tenantId: tenant?.organizationId,
      domain: "commerce",
      consistencyRequired: true,
    },
  });
  const { data, error } = await supabase.rpc("persist_durable_event", {
    event_source: input.source,
    durable_event_key: tenant ? idempotencyKeyFor([tenant.organizationId, tenant.workspaceId, tenant.vendorId, input.eventKey]) : input.eventKey,
    durable_event_type: input.eventType,
    event_payload: input.payload,
    event_subject_type: input.subjectType ?? null,
    event_subject_id: input.subjectId ?? null,
    event_trace: sanitizeTrace({
      ...input.trace,
      organizationId: tenant?.organizationId,
      workspaceId: tenant?.workspaceId,
      vendorId: tenant?.vendorId,
      tenantIsolationKey: tenant?.isolationKey,
      globalRegion: region.region,
      globalConsistencyMode: region.consistencyMode,
    }),
    event_metadata: {
      organizationId: tenant?.organizationId,
      workspaceId: tenant?.workspaceId,
      vendorId: tenant?.vendorId,
      tenantIsolationKey: tenant?.isolationKey,
      globalRegion: region.region,
      globalFallbackRegions: region.fallbackRegions.join(","),
      globalConsistencyMode: region.consistencyMode,
      globalRoutingDegraded: region.degraded,
      partitionKey: tenant ? `${region.region}:${tenantScopedQueuePartition(tenant, "durable-event")}` : `${region.region}:global`,
      ...(input.metadata ?? {}),
    },
  });

  if (error) {
    recordOperationalEvent("error", "durable_event.persist_failed", {
      source: input.source,
      eventType: input.eventType,
      organizationId: tenant?.organizationId,
    }, { domain: "system", error });
    throw new AppError("DATABASE_ERROR", "Durable event could not be persisted.", error);
  }

  return data as RpcJsonResult;
}

export async function acquireIdempotency(scope: string, key: string, payload?: Json, lockSeconds = 300) {
  const supabase = createAsyncSupabaseClient();
  const { data, error } = await supabase.rpc("acquire_idempotency_record", {
    target_scope: scope,
    target_idempotency_key: key,
    target_request_hash: hashJson(payload),
    lock_seconds: lockSeconds,
    record_metadata: {},
  });

  if (error) {
    throw new AppError("DATABASE_ERROR", "Idempotency record could not be acquired.", error);
  }

  return data as { acquired?: boolean; completed?: boolean; response?: Json; state?: string };
}

export async function completeIdempotency(scope: string, key: string, response: Json) {
  const supabase = createAsyncSupabaseClient();
  const { error } = await supabase.rpc("complete_idempotency_record", {
    target_scope: scope,
    target_idempotency_key: key,
    response,
  });

  if (error) {
    throw new AppError("DATABASE_ERROR", "Idempotency record could not be completed.", error);
  }
}

export async function claimAsyncJobs(queueNames: string[], workerId: string, limit = 10) {
  const expandedQueueNames = expandQueueNames(queueNames);
  const supabase = createAsyncSupabaseClient();
  const { data, error } = await supabase.rpc("claim_async_jobs", {
    queue_names: expandedQueueNames,
    claimant_worker_id: workerId,
    job_limit: limit,
    lock_seconds: lockSecondsForQueues(expandedQueueNames),
    queue_concurrency: concurrencyLimitsForQueues(expandedQueueNames),
  });

  if (error) {
    throw new AppError("DATABASE_ERROR", "Async jobs could not be claimed.", error);
  }

  return (data ?? []) as AsyncJobRow[];
}

export async function recoverAsyncInfrastructure() {
  const supabase = createAsyncSupabaseClient();
  const { data, error } = await supabase.rpc("recover_async_infrastructure", {
    stale_running_seconds: 300,
    stale_idempotency_seconds: 900,
    webhook_queue_grace_seconds: 300,
  });

  if (error) {
    recordOperationalEvent("error", "async.recovery.failed", {}, { domain: "system", error });
    throw new AppError("DATABASE_ERROR", "Async recovery sweep could not be completed.", error);
  }

  recordOperationalEvent("info", "async.recovery.completed", {
    result: "[object]",
  }, { domain: "system" });

  return data as RpcJsonResult;
}

export async function heartbeatWorker(input: {
  workerId: string;
  workerPool: WorkerPoolName;
  queues: string[];
  state?: "STARTING" | "RUNNING" | "DRAINING" | "STOPPED" | "CRASHED";
  metadata?: Record<string, Json | undefined>;
}) {
  const supabase = createAsyncSupabaseClient();
  const { data, error } = await supabase.rpc("heartbeat_async_worker", {
    target_worker_id: input.workerId,
    target_worker_pool: input.workerPool,
    target_queues: expandQueueNames(input.queues),
    worker_state: input.state ?? "RUNNING",
    heartbeat_metadata: sanitizeTrace(input.metadata),
  });

  if (error) {
    recordOperationalEvent("error", "async.worker.heartbeat_failed", {
      workerId: input.workerId,
      workerPool: input.workerPool,
    }, { domain: "system", error });
    throw new AppError("DATABASE_ERROR", "Async worker heartbeat could not be recorded.", error);
  }

  return data as RpcJsonResult;
}

export async function claimDurableEvents(workerId: string, limit = 20) {
  const supabase = createAsyncSupabaseClient();
  const { data, error } = await supabase.rpc("claim_durable_events", {
    claimant_worker_id: workerId,
    event_limit: limit,
    lock_seconds: 120,
  });

  if (error) {
    throw new AppError("DATABASE_ERROR", "Durable events could not be claimed.", error);
  }

  return (data ?? []) as DurableEventRow[];
}

export async function completeDurableEvent(eventId: string, metadata?: Record<string, Json | undefined>) {
  const supabase = createAsyncSupabaseClient();
  const { error } = await supabase.rpc("complete_durable_event", {
    target_event_id: eventId,
    result_metadata: metadata ?? {},
  });

  if (error) throw new AppError("DATABASE_ERROR", "Durable event could not be completed.", error);
}

export async function failDurableEvent(event: DurableEventRow, message: string, retryDelaySeconds = 60, poison = false, metadata?: Record<string, Json | undefined>) {
  const supabase = createAsyncSupabaseClient();
  const { error } = await supabase.rpc("fail_durable_event", {
    target_event_id: event.id,
    failure_message: message,
    retry_delay_seconds: retryDelaySeconds,
    poison_dead_letter: poison,
    failure_metadata: metadata ?? {},
  });

  if (error) throw new AppError("DATABASE_ERROR", "Durable event failure could not be recorded.", error);
}

export async function completeAsyncJob(jobId: string, metadata?: Record<string, Json | undefined>) {
  const supabase = createAsyncSupabaseClient();
  const { error } = await supabase.rpc("complete_async_job", {
    target_job_id: jobId,
    result_metadata: metadata ?? {},
  });

  if (error) throw new AppError("DATABASE_ERROR", "Async job could not be completed.", error);
}

export async function failAsyncJob(job: AsyncJobRow, message: string, retryDelaySeconds: number, poison = false, metadata?: Record<string, Json | undefined>) {
  const supabase = createAsyncSupabaseClient();
  const { error } = await supabase.rpc("fail_async_job", {
    target_job_id: job.id,
    failure_message: message,
    retry_delay_seconds: retryDelaySeconds,
    poison_dead_letter: poison,
    failure_metadata: metadata ?? {},
  });

  if (error) throw new AppError("DATABASE_ERROR", "Async job failure could not be recorded.", error);
}

export function retryDelayForJob(job: AsyncJobRow, pressure = 0) {
  return retryDelayForAttempt(policyForJob(job.job_name), job.attempts, pressure);
}

export function isAsyncJobName(value: string): value is AsyncJobName {
  return value in policyForJobMap;
}

const policyForJobMap: Record<AsyncJobName, true> = {
  "payment.webhook.reconcile": true,
  "payment.reconciliation.run": true,
  "payment.refund.sync": true,
  "payment.payout.verify": true,
  "delivery.eta.refresh": true,
  "delivery.dispatch.recalculate": true,
  "delivery.reconciliation.run": true,
  "delivery.failed.recover": true,
  "delivery.provider.failover": true,
  "delivery.routing.refresh": true,
  "delivery.sla.recalculate": true,
  "delivery.congestion.analyze": true,
  "ai.embedding.refresh": true,
  "ai.embedding.refresh_stale": true,
  "ai.semantic.index": true,
  "ai.recommendations.recalculate": true,
  "ai.ranking.recalculate": true,
  "ai.diagnostics.run": true,
  "ai.feedback.aggregate": true,
  "ai.personalization.refresh": true,
  "ai.retrieval.observe": true,
  "governance.fraud.scan": true,
  "governance.moderation.scan": true,
  "governance.trust.recalculate": true,
  "governance.dispute.analyze": true,
  "india.upi.recover": true,
  "localization.audit": true,
  "notification.dispatch": true,
  "notification.email.deliver": true,
  "notification.push.deliver": true,
  "notification.sms.placeholder": true,
  "notification.digest.batch": true,
  "analytics.seller.aggregate": true,
  "analytics.forecast.run": true,
  "analytics.operational.metrics": true,
  "analytics.admin.refresh": true,
  "realtime.invalidation.flush": true,
};
