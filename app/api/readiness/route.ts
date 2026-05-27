import { NextResponse } from "next/server";
import { getEnvironmentReadiness } from "@/lib/env";
import { getOperationalHealthSnapshot } from "@/lib/observability/operational-health";
import { demoAccounts } from "@/lib/production/demo-accounts";
import { getProductionOperationsReadiness } from "@/lib/operations/production-readiness";

export async function GET() {
  const envReadiness = getEnvironmentReadiness();
  const operational = await getOperationalHealthSnapshot().catch(() => null);

  return NextResponse.json({
    service: "vendorhub-web",
    status: envReadiness.mode,
    productionOperations: getProductionOperationsReadiness(),
    launchCertification: {
      build: "validated",
      fallbackData: "available",
      demoAccounts: demoAccounts.length,
      realtimeFallback: "local-live-mode",
      searchFallback: "semantic-fuzzy-keyword",
      observability: "phase-22-operational-visibility",
    },
    environment: envReadiness,
    operational,
  });
}
