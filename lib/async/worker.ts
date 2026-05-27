import { AppError } from "@/lib/errors";
import { recordOperationalEvent } from "@/lib/production/observability";
import { computeIsolationDecision, shouldDeferHeavyJob } from "./compute-isolation";
import { domainForAsyncCategory } from "./observability-domain";
import { allDistributedQueueNames, expandQueueNames, policyForJob, queueNamesForPool, retryDelayForAttempt, workerPoolForName } from "./policies";
import { claimAsyncJobs, completeAsyncJob, failAsyncJob, heartbeatWorker, isAsyncJobName, recoverAsyncInfrastructure } from "./orchestrator";
import { runAsyncJobHandler } from "./handlers";
import type { AsyncJobRow, WorkerPoolName } from "./types";

export type WorkerRunInput = {
  queues?: string[];
  pool?: WorkerPoolName;
  limit?: number;
  workerId?: string;
  gracefulShutdown?: boolean;
};

const defaultQueues = allDistributedQueueNames();

export async function runAsyncWorkerOnce(input: WorkerRunInput = {}) {
  const pool = input.pool;
  const poolPolicy = pool ? workerPoolForName(pool) : null;
  const queues = expandQueueNames(input.queues ?? (pool ? queueNamesForPool(pool) : defaultQueues));
  const workerId = input.workerId ?? `vendorhub-${pool ?? "distributed"}-worker-${crypto.randomUUID()}`;
  const limit = input.limit ?? poolPolicy?.maxJobsPerRun ?? 10;

  if (poolPolicy) {
    await heartbeatWorker({
      workerId,
      workerPool: poolPolicy.name,
      queues,
      state: input.gracefulShutdown ? "DRAINING" : "RUNNING",
      metadata: { maxJobsPerRun: poolPolicy.maxJobsPerRun },
    });
  }

  const recovery = await recoverAsyncInfrastructure();
  const jobs = input.gracefulShutdown ? [] : await claimAsyncJobs(queues, workerId, limit);
  const results = [];

  for (const job of jobs) {
    results.push(await runClaimedJob(job));
  }

  return {
    workerId,
    pool: pool ?? "ad-hoc",
    queues,
    recovery,
    claimed: jobs.length,
    results,
  };
}

export async function runWorkerPoolOnce(pool: WorkerPoolName, input: Omit<WorkerRunInput, "pool" | "queues"> = {}) {
  const poolPolicy = workerPoolForName(pool);
  return runAsyncWorkerOnce({
    ...input,
    pool,
    queues: poolPolicy.queues,
    limit: input.limit ?? poolPolicy.maxJobsPerRun,
  });
}

export function planWorkerScaling(input: {
  pool: WorkerPoolName;
  queued: number;
  running: number;
  idleRuns?: number;
}) {
  const policy = workerPoolForName(input.pool);
  const desiredFromBacklog = Math.ceil(input.queued / Math.max(1, policy.scaleUpBacklogPerWorker));
  const desired = Math.max(policy.minWorkers, Math.min(policy.maxWorkers, desiredFromBacklog + (input.running > 0 ? 1 : 0)));
  const shouldScaleDown = (input.idleRuns ?? 0) >= policy.scaleDownIdleRuns && input.queued === 0 && input.running === 0;

  return {
    pool: input.pool,
    desiredWorkers: shouldScaleDown ? policy.minWorkers : desired,
    minWorkers: policy.minWorkers,
    maxWorkers: policy.maxWorkers,
    deterministic: true,
  };
}

async function runClaimedJob(job: AsyncJobRow) {
  if (!isAsyncJobName(job.job_name)) {
    await failAsyncJob(job, `Unknown async job name: ${job.job_name}`, 0, true, { reason: "unknown_job_name" });
    return { jobId: job.id, state: "DEAD_LETTER", jobName: job.job_name };
  }

  const policy = policyForJob(job.job_name);
  const isolation = computeIsolationDecision(policy);
  if (shouldDeferHeavyJob(job, policy)) {
    await failAsyncJob(job, "Heavy compute deferred by queue pressure isolation.", policy.saturationBackoffSeconds, false, {
      isolation: isolation as any,
    });
    return { jobId: job.id, state: "DEFERRED", jobName: job.job_name, retryDelay: policy.saturationBackoffSeconds };
  }

  const startedAt = Date.now();
  recordOperationalEvent("info", "async.job.started", {
    jobId: job.id,
    jobName: job.job_name,
    queueName: job.queue_name,
    attempt: job.attempts,
  }, { domain: domainForAsyncCategory(job.category), subjectId: job.id });

  try {
    const result = await runAsyncJobHandler(job);
    if (!result.ok) {
      const retryDelay = result.retryDelaySeconds ?? retryDelayForAttempt(policy, job.attempts);
      await failAsyncJob(job, "Async job handler returned failure.", retryDelay, result.poison, result.metadata);
      return { jobId: job.id, state: result.poison ? "DEAD_LETTER" : "FAILED", jobName: job.job_name };
    }

    await completeAsyncJob(job.id, {
      durationMs: Date.now() - startedAt,
      ...(result.metadata ?? {}),
    });
    return { jobId: job.id, state: "SUCCEEDED", jobName: job.job_name };
  } catch (error) {
    const retryDelay = retryDelayForAttempt(policy, job.attempts);
    await failAsyncJob(job, error instanceof Error ? error.message : "Async job failed.", retryDelay, false, {
      durationMs: Date.now() - startedAt,
    });
    recordOperationalEvent("error", "async.job.failed", {
      jobId: job.id,
      jobName: job.job_name,
      retryDelay,
    }, { domain: domainForAsyncCategory(job.category), subjectId: job.id, error });

    if (error instanceof AppError && error.code === "VALIDATION_ERROR") {
      return { jobId: job.id, state: "FAILED", jobName: job.job_name, retryDelay };
    }

    return { jobId: job.id, state: "FAILED", jobName: job.job_name, retryDelay };
  }
}
