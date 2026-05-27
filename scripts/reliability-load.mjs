const target = process.env.RELIABILITY_TARGET_URL ?? "http://127.0.0.1:3000";
const concurrency = Number(process.env.RELIABILITY_CONCURRENCY ?? 8);
const iterations = Number(process.env.RELIABILITY_ITERATIONS ?? 24);
const maxP95Ms = Number(process.env.RELIABILITY_MAX_P95_MS ?? 1500);

const scenarios = [
  { name: "health", path: "/api/health", method: "GET" },
  {
    name: "ai-search",
    path: "/api/intelligence/search",
    method: "POST",
    body: {
      query: "mobile cover",
      category: "all",
      availability: "available",
      sort: "intelligent",
      radiusKm: 6,
      nearbyOnly: false,
      locale: "en",
      recentQueries: ["phone case"],
      exploredCategories: ["mobile-accessories"],
    },
  },
];

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
}

async function runScenario(scenario, index) {
  const started = performance.now();
  const response = await fetch(`${target}${scenario.path}`, {
    method: scenario.method,
    headers: { "Content-Type": "application/json", "x-reliability-run": `phase23-${Date.now()}-${index}` },
    body: scenario.body ? JSON.stringify(scenario.body) : undefined,
  });
  const latencyMs = Math.round(performance.now() - started);
  await response.text().catch(() => "");
  return { scenario: scenario.name, ok: response.ok, status: response.status, latencyMs };
}

const work = Array.from({ length: iterations }, (_, index) => scenarios[index % scenarios.length]);
const results = [];

for (let index = 0; index < work.length; index += concurrency) {
  results.push(...(await Promise.all(work.slice(index, index + concurrency).map((scenario, offset) => runScenario(scenario, index + offset)))));
}

const latencies = results.map((result) => result.latencyMs);
const failures = results.filter((result) => !result.ok);
const summary = {
  target,
  iterations,
  concurrency,
  failures: failures.length,
  p50Ms: percentile(latencies, 0.5),
  p95Ms: percentile(latencies, 0.95),
  maxMs: Math.max(...latencies),
};

console.table(results);
console.log(JSON.stringify(summary, null, 2));

if (summary.p95Ms > maxP95Ms) {
  throw new Error(`Reliability p95 latency ${summary.p95Ms}ms exceeded threshold ${maxP95Ms}ms.`);
}

if (failures.length === iterations) {
  throw new Error("All reliability load checks failed.");
}
