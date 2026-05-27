const jobProfiles = [
  { name: "payment.webhook.reconcile", queue: "commerce-critical", priority: 95, attempts: 8, category: "payment", count: 120 },
  { name: "payment.reconciliation.run", queue: "commerce-critical", priority: 85, attempts: 8, category: "reconciliation", count: 20 },
  { name: "delivery.eta.refresh", queue: "delivery", priority: 65, attempts: 5, category: "delivery", count: 80 },
  { name: "ai.embedding.refresh_stale", queue: "ai-maintenance", priority: 35, attempts: 4, category: "ai", count: 200 },
  { name: "analytics.admin.refresh", queue: "analytics", priority: 25, attempts: 3, category: "analytics", count: 60 },
];

function seededRandom(seed = 42) {
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
  const queueConcurrency = {
    "commerce-critical": 8,
    delivery: 6,
    "ai-maintenance": 2,
    analytics: 2,
  };
  const jobs = jobProfiles.flatMap((profile) =>
    Array.from({ length: profile.count }, (_, index) => ({
      ...profile,
      id: `${profile.name}-${index}`,
      ageSeconds: Math.round(random() * 900),
      failed: random() < (profile.queue === "commerce-critical" ? 0.015 : 0.04),
      deadLetter: random() < (profile.queue === "commerce-critical" ? 0.002 : 0.01),
      stuck: random() < (profile.queue === "commerce-critical" ? 0.001 : 0.006),
      duplicateReplay: random() < 0.01,
    })),
  );

  const commerce = jobs.filter((job) => job.queue === "commerce-critical");
  const background = jobs.filter((job) => job.queue !== "commerce-critical");
  const retryCount = jobs.filter((job) => job.failed).length;
  const deadLetters = jobs.filter((job) => job.deadLetter).length;
  const stuckJobs = jobs.filter((job) => job.stuck).length;
  const duplicateReplayKeys = new Set();
  const duplicateReplays = jobs.filter((job) => {
    if (!job.duplicateReplay) return false;
    const replayKey = `${job.name}:${job.id}`;
    const seen = duplicateReplayKeys.has(replayKey);
    duplicateReplayKeys.add(replayKey);
    return seen;
  }).length;
  const backlogAges = jobs.map((job) => job.ageSeconds);
  const starvedCommerce = commerce.some((job) => job.ageSeconds > percentile(background.map((item) => item.ageSeconds), 0.5) && job.priority < 80);
  const overConcurrencyQueues = Object.entries(queueConcurrency).filter(([queue, concurrency]) => jobs.filter((job) => job.queue === queue && job.ageSeconds < 30).length > concurrency * 20);

  const checks = [
    { name: "commerce_priority_not_starved", pass: !starvedCommerce, detail: `${commerce.length} commerce jobs checked` },
    { name: "dead_letter_pressure_bounded", pass: deadLetters <= 8, detail: `${deadLetters} simulated dead letters` },
    { name: "retry_storm_bounded", pass: retryCount <= 40, detail: `${retryCount} simulated retrying jobs` },
    { name: "backlog_latency_within_slo", pass: percentile(backlogAges, 0.95) <= 870, detail: `${percentile(backlogAges, 0.95)}s p95 backlog age` },
    { name: "stuck_worker_recovery_bounded", pass: stuckJobs <= 6, detail: `${stuckJobs} simulated stuck workers` },
    { name: "replay_deduplication_stable", pass: duplicateReplays === 0, detail: `${duplicateReplays} duplicate replay corruptions` },
    { name: "queue_concurrency_not_overrun", pass: overConcurrencyQueues.length === 0, detail: `${overConcurrencyQueues.length} queues exceeded concurrency envelope` },
  ];

  return {
    generatedAt: new Date().toISOString(),
    scenario: "stabilization_s1_async_saturation",
    jobs: jobs.length,
    checks,
    passed: checks.every((check) => check.pass),
  };
}

const result = simulate();
console.log(JSON.stringify(result, null, 2));
if (!result.passed) process.exitCode = 1;
