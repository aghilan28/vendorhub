import { NextResponse } from "next/server";
import {
  auditTier15PackageCoverage,
  auditTier15Traceability,
  createUMKOGraph,
  tier15PackageManifests,
  tier15TraceabilityMatrix,
} from "@/lib/tier15";

export function GET() {
  return NextResponse.json({
    tier: 15,
    traceability: auditTier15Traceability(),
    packages: auditTier15PackageCoverage(),
    umko: createUMKOGraph(),
    matrix: tier15TraceabilityMatrix,
    packageManifests: tier15PackageManifests,
  });
}
