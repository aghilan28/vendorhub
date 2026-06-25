import { NextResponse } from "next/server";
import { getEnvironmentReadiness } from "@/lib/env";
import { getOperationalHealthSnapshot } from "@/lib/observability/operational-health";
import { getProductionOperationsReadiness } from "@/lib/operations/production-readiness";
import { checkSupabaseConnectivity, overallReadiness } from "@/lib/observability/readiness-checks";

export const dynamic = "force-dynamic";

export async function GET() {
  // Readiness is DERIVED from real runtime checks. It must never self-certify.
  const envReadiness = getEnvironmentReadiness();
  const checks = [await checkSupabaseConnectivity()];
  const operational = await getOperationalHealthSnapshot().catch(() => null);
  const overall = overallReadiness(checks);

  const body = {
    service: "vendorhub-web",
    ready: overall.ready,
    status: overall.status,
    environmentMode: envReadiness.mode,
    checks,
    productionOperations: getProductionOperationsReadiness(),
    environment: envReadiness,
    operational,
    checkedAt: new Date().toISOString(),
  };

  // Return 503 when not ready so external monitors/load balancers receive a truthful signal.
  return NextResponse.json(body, { status: overall.ready ? 200 : 503 });
}
