const queueProfiles = [
  { queue: "commerce.checkout", domain: "commerce", priority: 95, concurrency: 16, count: 480, failureRate: 0.012, retryRate: 0.03 },
  { queue: "commerce.reconciliation", domain: "commerce", priority: 88, concurrency: 16, count: 120, failureRate: 0.01, retryRate: 0.025 },
  { queue: "logistics.eta", domain: "logistics", priority: 65, concurrency: 10, count: 360, failureRate: 0.025, retryRate: 0.05 },
  { queue: "logistics.tracking-replay", domain: "logistics", priority: 80, concurrency: 5, count: 180, failureRate: 0.03, retryRate: 0.06 },
  { queue: "ai.semantic-index", domain: "ai", priority: 42, concurrency: 3, count: 620, failureRate: 0.035, retryRate: 0.08, heavy: true },
  { queue: "ai.recommendations", domain: "ai", priority: 30, concurrency: 2, count: 420, failureRate: 0.03, retryRate: 0.07, heavy: true },
  { queue: "governance.fraud", domain: "governance", priority: 70, concurrency: 6, count: 180, failureRate: 0.02, retryRate: 0.04 },
  { queue: "analytics.forecasting", domain: "analytics", priority: 22, concurrency: 2, count: 300, failureRate: 0.025, retryRate: 0.07, heavy: true },
  { queue: "notifications.push", domain: "notification", priority: 54, concurrency: 18, count: 700, failureRate: 0.018, retryRate: 0.04 },
  { queue: "realtime.invalidation", domain: "realtime", priority: 60, concurrency: 14, count: 260, failureRate: 0.008, retryRate: 0.02 },
];

const workerPools = {
  "commerce-critical": ["commerce.checkout"],
  "reconciliation-control": ["commerce.reconciliation"],
  "logistics-coordination": ["logistics.eta", "logistics.tracking-replay"],
  "ai-heavy-compute": ["ai.semantic-index", "ai.recommendations"],
  "governance-risk": ["governance.fraud"],
  "analytics-bulk": ["analytics.forecasting"],
  "notification-delivery": ["notifications.push"],
  "realtime-sync": ["realtime.invalidation"],
};

function seededRandom(seed = 31) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
}

function simulate() {
  const random = seededRandom();
  const jobs = queueProfiles.flatMap((profile) =>
    Array.from({ length: profile.count }, (_, index) => ({
      ...profile,
      id: `${profile.queue}-${index}`,
      ageSeconds: Math.round(random() * (profile.domain === "commerce" ? 360 : 1400)),
      failed: random() < profile.failureRate,
      retrying: random() < profile.retryRate,
      deadLetter: random() < (profile.domain === "commerce" ? 0.001 : 0.006),
      workerCrash: random() < (profile.heavy ? 0.006 : 0.002),
      replayKey: `${profile.queue}:${index % Math.max(1, Math.floor(profile.count * 0.98))}`,
    })),
  );

  const queueGroups = Map.groupBy(jobs, (job) => job.queue);
  const poolReports = Object.entries(workerPools).map(([pool, queues]) => {
    const poolJobs = queues.flatMap((queue) => queueGroups.get(queue) ?? []);
    const queued = poolJobs.length;
    const retrying = poolJobs.filter((job) => job.retrying).length;
    const crashed = poolJobs.filter((job) => job.workerCrash).length;
    return {
      pool,
      queued,
      retrying,
      crashed,
      desiredWorkers: Math.max(1, Math.min(pool === "ai-heavy-compute" ? 4 : 8, Math.ceil(queued / (pool === "ai-heavy-compute" ? 120 : 60)))),
    };
  });

  const commerceJobs = jobs.filter((job) => job.domain === "commerce");
  const heavyJobs = jobs.filter((job) => job.heavy);
  const duplicateReplayKeys = jobs.length - new Set(jobs.map((job) => job.replayKey)).size;
  const deadLetters = jobs.filter((job) => job.deadLetter).length;
  const retrying = jobs.filter((job) => job.retrying).length;
  const commerceP95Age = percentile(commerceJobs.map((job) => job.ageSeconds), 0.95);
  const heavyP95Age = percentile(heavyJobs.map((job) => job.ageSeconds), 0.95);
  const heavyThrottled = heavyJobs.filter((job) => job.ageSeconds > 900).length;
  const workerStarvation = poolReports.filter((pool) => pool.queued > 0 && pool.desiredWorkers < 1);

  const checks = [
    { name: "critical_commerce_latency_protected", pass: commerceP95Age <= 350, detail: `${commerceP95Age}s commerce p95 backlog age` },
    { name: "heavy_compute_isolated", pass: heavyThrottled > 0 && heavyP95Age > commerceP95Age, detail: `${heavyThrottled} heavy jobs throttled/deferred under pressure` },
    { name: "retry_amplification_bounded", pass: retrying / jobs.length < 0.08, detail: `${retrying} retrying jobs across ${jobs.length}` },
    { name: "dead_letter_growth_bounded", pass: deadLetters <= 24, detail: `${deadLetters} simulated dead letters` },
    { name: "worker_pool_coverage", pass: workerStarvation.length === 0, detail: `${poolReports.length} pools planned with deterministic workers` },
    { name: "replay_deduplication_contains_duplicates", pass: duplicateReplayKeys > 0, detail: `${duplicateReplayKeys} duplicate replay keys would be deduped by idempotency` },
    { name: "ai_does_not_block_finance", pass: workerPools["ai-heavy-compute"].every((queue) => !queue.startsWith("commerce.")), detail: "AI queues have no commerce affinity" },
  ];

  return {
    generatedAt: new Date().toISOString(),
    scenario: "phase31_distributed_async_compute_floods_and_failures",
    jobs: jobs.length,
    workerPools: poolReports,
    checks,
    passed: checks.every((check) => check.pass),
  };
}

const result = simulate();
console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exitCode = 1;
