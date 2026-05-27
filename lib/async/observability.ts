import { evaluateOperationalAlerts } from "@/lib/observability/alerts";
import { createAsyncSupabaseClient } from "./supabase-unsafe";

type QueueHealthRow = {
  queue_name: string;
  category: string;
  domain?: string;
  worker_pool?: string;
  compute_class?: string;
  queued_count: number;
  running_count: number;
  retry_waiting_count: number;
  dead_letter_count: number;
  stuck_count: number;
  retry_exhausted_count: number;
  backlog_age_seconds: number;
  ready_latency_seconds: number;
  max_attempts_seen: number;
  last_activity_at: string | null;
};

type WorkerPoolHealthRow = {
  worker_pool: string;
  domain: string;
  active_workers: number;
  draining_workers: number;
  stale_workers: number;
  queued_count: number;
  running_count: number;
  retry_waiting_count: number;
  dead_letter_count: number;
  oldest_backlog_seconds: number;
  max_elastic_concurrency: number;
  reserved_concurrency: number;
  generated_at: string;
};

type DurableEventHealthRow = {
  event_type: string;
  subject_type: string | null;
  pending_count: number;
  processing_count: number;
  failed_count: number;
  dead_letter_count: number;
  oldest_pending_seconds: number;
  max_attempts_seen: number;
  generated_at: string;
};

type RecoveryHealthRow = {
  stuck_jobs: number;
  orphaned_idempotency_leases: number;
  webhook_recovery_backlog: number;
  durable_event_recovery_backlog: number;
  unreplayed_dead_letters: number;
  generated_at: string;
};

function sum(
  rows: QueueHealthRow[],
  key: keyof Pick<QueueHealthRow, "queued_count" | "running_count" | "retry_waiting_count" | "dead_letter_count" | "stuck_count" | "retry_exhausted_count">,
) {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

export async function getAsyncInfrastructureHealth() {
  const supabase = createAsyncSupabaseClient();
  const [{ data, error }, { data: recoveryData, error: recoveryError }, { data: workerData }, { data: eventData }] = await Promise.all([
    supabase.from("async_queue_health").select("*"),
    supabase.from("async_recovery_health").select("*").maybeSingle(),
    supabase.from("async_worker_pool_health").select("*"),
    supabase.from("durable_event_health").select("*"),
  ]);
  const rows = ((data ?? []) as unknown as QueueHealthRow[]).map((row) => ({
    ...row,
    queued_count: Number(row.queued_count ?? 0),
    running_count: Number(row.running_count ?? 0),
    retry_waiting_count: Number(row.retry_waiting_count ?? 0),
    dead_letter_count: Number(row.dead_letter_count ?? 0),
    stuck_count: Number(row.stuck_count ?? 0),
    retry_exhausted_count: Number(row.retry_exhausted_count ?? 0),
    backlog_age_seconds: Number(row.backlog_age_seconds ?? 0),
    ready_latency_seconds: Number(row.ready_latency_seconds ?? 0),
    max_attempts_seen: Number(row.max_attempts_seen ?? 0),
  }));
  const workerPools = ((workerData ?? []) as unknown as WorkerPoolHealthRow[]).map((row) => ({
    ...row,
    active_workers: Number(row.active_workers ?? 0),
    draining_workers: Number(row.draining_workers ?? 0),
    stale_workers: Number(row.stale_workers ?? 0),
    queued_count: Number(row.queued_count ?? 0),
    running_count: Number(row.running_count ?? 0),
    retry_waiting_count: Number(row.retry_waiting_count ?? 0),
    dead_letter_count: Number(row.dead_letter_count ?? 0),
    oldest_backlog_seconds: Number(row.oldest_backlog_seconds ?? 0),
    max_elastic_concurrency: Number(row.max_elastic_concurrency ?? 1),
    reserved_concurrency: Number(row.reserved_concurrency ?? 1),
  }));
  const durableEvents = ((eventData ?? []) as unknown as DurableEventHealthRow[]).map((row) => ({
    ...row,
    pending_count: Number(row.pending_count ?? 0),
    processing_count: Number(row.processing_count ?? 0),
    failed_count: Number(row.failed_count ?? 0),
    dead_letter_count: Number(row.dead_letter_count ?? 0),
    oldest_pending_seconds: Number(row.oldest_pending_seconds ?? 0),
    max_attempts_seen: Number(row.max_attempts_seen ?? 0),
  }));

  const recovery = recoveryData as RecoveryHealthRow | null;
  const deadLetters = sum(rows, "dead_letter_count");
  const retrying = sum(rows, "retry_waiting_count");
  const queued = sum(rows, "queued_count");
  const running = sum(rows, "running_count");
  const stuck = sum(rows, "stuck_count");
  const retryExhausted = sum(rows, "retry_exhausted_count");
  const staleWorkers = workerPools.reduce((total, row) => total + row.stale_workers, 0);
  const activeWorkers = workerPools.reduce((total, row) => total + row.active_workers, 0);
  const durableEventBacklog = durableEvents.reduce((total, row) => total + row.pending_count + row.failed_count, 0);
  const durableEventDeadLetters = durableEvents.reduce((total, row) => total + row.dead_letter_count, 0);
  const maxBacklogAgeSeconds = rows.reduce((max, row) => Math.max(max, row.backlog_age_seconds), 0);
  const maxReadyLatencySeconds = rows.reduce((max, row) => Math.max(max, row.ready_latency_seconds), 0);
  const maxDurableEventAgeSeconds = durableEvents.reduce((max, row) => Math.max(max, row.oldest_pending_seconds), 0);
  const retryAmplificationRatio = queued > 0 ? Number((retrying / queued).toFixed(3)) : retrying > 0 ? 1 : 0;
  const workerStarvation = workerPools.some((row) => row.queued_count > 0 && row.active_workers === 0);
  const computeImbalance = workerPools.some((row) => row.queued_count > row.max_elastic_concurrency * 100 && row.active_workers < row.max_elastic_concurrency);

  const alerts = evaluateOperationalAlerts({
    checkoutFailureRate: 0,
    paymentMismatchCount: 0,
    webhookRetryCount: retrying,
    openIntegrityAlerts: deadLetters,
    realtimeReconnects: 0,
    activeRealtimeChannels: 0,
    aiFallbackRate: 0,
    staleEmbeddingCount: 0,
    dbFailedWrites: error || recoveryError ? 1 : 0,
    authFailureCount: 0,
    refundOpenCount: 0,
    deliveryDelayedCount: 0,
    moderationBacklog: 0,
    queueSaturationPressure: queued + retrying + Math.round(maxReadyLatencySeconds / 10),
    deadLetterCount: deadLetters + durableEventDeadLetters,
    reconciliationBacklog: rows.filter((row) => row.category === "reconciliation" || row.queue_name.includes("reconciliation")).reduce((total, row) => total + row.queued_count + row.retry_waiting_count, 0),
    workerStarvationCount: workerPools.filter((row) => row.queued_count > 0 && row.active_workers === 0).length,
    retryAmplificationRatio,
    durableEventBacklog,
  });

  return {
    generatedAt: new Date().toISOString(),
    queues: rows,
    workerPools,
    durableEvents,
    totals: {
      queued,
      running,
      retrying,
      deadLetters,
      stuck,
      retryExhausted,
      activeWorkers,
      staleWorkers,
      durableEventBacklog,
      durableEventDeadLetters,
      maxBacklogAgeSeconds,
      maxReadyLatencySeconds,
      maxDurableEventAgeSeconds,
      retryAmplificationRatio,
    },
    saturation: {
      congested: queued > 500 || maxBacklogAgeSeconds > 900 || maxReadyLatencySeconds > 600,
      deadLetterPressure: deadLetters > 0,
      retryPressure: retrying > 20,
      stuckWorkerPressure: stuck > 0,
      workerStarvation,
      computeImbalance,
      retryAmplification: retryAmplificationRatio > 0.35,
      durableEventPressure: durableEventBacklog > 100 || maxDurableEventAgeSeconds > 900,
      orphanedLeasePressure: Number(recovery?.orphaned_idempotency_leases ?? 0) > 0,
      replayPressure: Number(recovery?.unreplayed_dead_letters ?? 0) > 0,
    },
    recovery: {
      stuckJobs: Number(recovery?.stuck_jobs ?? stuck),
      orphanedIdempotencyLeases: Number(recovery?.orphaned_idempotency_leases ?? 0),
      webhookRecoveryBacklog: Number(recovery?.webhook_recovery_backlog ?? 0),
      durableEventRecoveryBacklog: Number(recovery?.durable_event_recovery_backlog ?? 0),
      unreplayedDeadLetters: Number(recovery?.unreplayed_dead_letters ?? deadLetters),
    },
    alerts,
  };
}
