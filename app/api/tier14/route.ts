import { NextResponse } from "next/server";
import { auditTier14PackageCoverage, auditTier14Traceability, tier14PackageManifests, tier14TraceabilityMatrix } from "@/lib/tier14";

export function GET() {
  return NextResponse.json({
    tier: 14,
    traceability: auditTier14Traceability(),
    packages: auditTier14PackageCoverage(),
    matrix: tier14TraceabilityMatrix,
    packageManifests: tier14PackageManifests,
  });
}
