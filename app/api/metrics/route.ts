import { renderPrometheus, setRuntimeUp } from "@/lib/observability/metrics";
import { getRuntimeHealth } from "@/lib/runtime/health";

// Phase C — Prometheus scrape endpoint (text exposition format).
// Pull works for persistent deployments (worker/containers/`next start`) and is
// scraped by infra/observability/prometheus.yml. On ephemeral serverless the
// authoritative path is push (OTLP + forwarded business events) — see the
// Phase C report "Operational Truth" section.
//
// Optional protection: set METRICS_AUTH_TOKEN to require `Authorization: Bearer <token>`.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = process.env.METRICS_AUTH_TOKEN;
  if (token && request.headers.get("authorization") !== `Bearer ${token}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Refresh runtime reachability gauges on scrape (cheap, degrade-safe).
  try {
    const health = await getRuntimeHealth();
    for (const r of health.runtimes) {
      if (r.enabled) setRuntimeUp(r.runtime, r.reachable);
    }
  } catch {
    /* never block the scrape */
  }

  return new Response(renderPrometheus(), {
    status: 200,
    headers: { "Content-Type": "text/plain; version=0.0.4; charset=utf-8", "Cache-Control": "no-store" },
  });
}
