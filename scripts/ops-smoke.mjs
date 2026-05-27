const baseUrl = process.env.VENDORHUB_BASE_URL ?? "http://localhost:3000";
const checks = [
  { name: "health", path: "/api/health", maxMs: 1500, requiredKeys: ["service", "status", "timestamp"] },
  { name: "readiness", path: "/api/readiness", maxMs: 2500, requiredKeys: ["service", "productionOperations", "environment"] },
];

let failures = 0;
for (const check of checks) {
  const started = Date.now();
  try {
    const response = await fetch(new URL(check.path, baseUrl));
    const latencyMs = Date.now() - started;
    const body = await response.json().catch(() => null);
    const missingKeys = check.requiredKeys.filter((key) => !body || !(key in body));
    if (!response.ok || latencyMs > check.maxMs || missingKeys.length) {
      failures += 1;
      console.error(`${check.name} failed: status=${response.status} latencyMs=${latencyMs} missingKeys=${missingKeys.join(",") || "none"}`);
    } else {
      console.log(`${check.name} ok: status=${response.status} latencyMs=${latencyMs}`);
    }
  } catch (error) {
    failures += 1;
    console.error(`${check.name} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures) process.exit(1);
