import { performance } from "node:perf_hooks";

const BASE_URL = process.env.VENDORHUB_LOAD_BASE_URL ?? "http://localhost:3000";
const REQUESTS = Number(process.env.VENDORHUB_MERCHANT_INTEL_REQUESTS ?? 40);
const CONCURRENCY = Number(process.env.VENDORHUB_MERCHANT_INTEL_CONCURRENCY ?? 8);
const BUDGET_MS = Number(process.env.VENDORHUB_MERCHANT_INTEL_P95_BUDGET_MS ?? 650);

function percentile(values, pct) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((pct / 100) * sorted.length))] ?? 0;
}

async function hit() {
  const started = performance.now();
  const response = await fetch(`${BASE_URL}/api/seller/intelligence`).catch((error) => ({ ok: false, status: 0, error }));
  return {
    ok: Boolean(response.ok),
    status: response.status,
    latencyMs: Math.round(performance.now() - started),
  };
}

const results = [];
let cursor = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < REQUESTS) {
      cursor += 1;
      results.push(await hit());
    }
  }),
);

const latencies = results.map((result) => result.latencyMs);
const summary = {
  endpoint: "/api/seller/intelligence",
  requests: results.length,
  failures: results.filter((result) => !result.ok).length,
  p50Ms: percentile(latencies, 50),
  p95Ms: percentile(latencies, 95),
  maxMs: Math.max(...latencies),
  budgetMs: BUDGET_MS,
};

console.table([summary]);
if (summary.failures > 0 || summary.p95Ms > BUDGET_MS) process.exitCode = 1;
