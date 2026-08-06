import { NextResponse } from "next/server";
import { getRuntimeHealth } from "@/lib/runtime/health";

// Phase B runtime health: reports enabled/reachable/degraded for Redis, Kafka,
// Neo4j, Qdrant, Flink. "degraded" means an enabled runtime is unreachable and
// the app is running on its Postgres/in-process fallback. Status 200 when ok or
// fully disabled; 503 only when an enabled runtime is degraded.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const report = await getRuntimeHealth();
  const httpStatus = report.status === "degraded" ? 503 : 200;
  return NextResponse.json(report, { status: httpStatus });
}
