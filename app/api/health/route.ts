import { NextResponse } from "next/server";
import { getEnvironmentReadiness } from "@/lib/env";
import { getOperationalHealthSnapshot } from "@/lib/observability/operational-health";

export async function GET() {
  const readiness = getEnvironmentReadiness();
  const operational = await getOperationalHealthSnapshot().catch(() => null);

  return NextResponse.json({
    service: "vendorhub-web",
    phase: "30-production-operations-hardening",
    status: operational?.overall.tone === "critical" ? "critical" : "ok",
    mode: readiness.mode,
    operational: operational
      ? {
          tone: operational.overall.tone,
          alerts: operational.alerts.filter((alert) => alert.severity !== "info").length,
          latencyMs: operational.latencyMs,
        }
      : { tone: "degraded", alerts: 1 },
    timestamp: new Date().toISOString(),
  });
}
