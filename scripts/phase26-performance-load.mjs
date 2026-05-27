import { performance } from "node:perf_hooks";

const BASE_URL = process.env.VENDORHUB_LOAD_BASE_URL ?? "http://localhost:3000";
const CONCURRENCY = Number(process.env.VENDORHUB_LOAD_CONCURRENCY ?? 12);
const REQUESTS = Number(process.env.VENDORHUB_LOAD_REQUESTS ?? 60);

const targets = [
  { name: "health", path: "/api/health", method: "GET", budgetMs: 250 },
  { name: "seller-snapshot", path: "/api/seller/snapshot", method: "GET", budgetMs: 650 },
  { name: "ai-search", path: "/api/intelligence/search", method: "POST", budgetMs: 900, body: { query: "fresh rice", category: "all", availability: "available", sort: "intelligent", locale: "en" } },
];

function percentile(values, pct) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((pct / 100) * sorted.length))];
}

async function hit(target) {
  const started = performance.now();
  const response = await fetch(`${BASE_URL}${target.path}`, {
    method: target.method,
    headers: target.body ? { "Content-Type": "application/json" } : undefined,
    body: target.body ? JSON.stringify(target.body) : undefined,
  }).catch((error) => ({ ok: false, status: 0, error }));
  return {
    target: target.name,
    ok: Boolean(response.ok),
    status: response.status,
    latencyMs: Math.round(performance.now() - started),
  };
}

async function runTarget(target) {
  const results = [];
  let cursor = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < REQUESTS) {
      cursor += 1;
      results.push(await hit(target));
    }
  });

  await Promise.all(workers);

  const latencies = results.map((result) => result.latencyMs);
  const failures = results.filter((result) => !result.ok).length;
  return {
    target: target.name,
    requests: results.length,
    failures,
    p50Ms: percentile(latencies, 50),
    p95Ms: percentile(latencies, 95),
    maxMs: Math.max(...latencies),
    budgetMs: target.budgetMs,
    passed: failures === 0 && percentile(latencies, 95) <= target.budgetMs,
  };
}

const summary = [];
for (const target of targets) {
  summary.push(await runTarget(target));
}

console.table(summary);
if (summary.some((row) => !row.passed)) {
  process.exitCode = 1;
}
