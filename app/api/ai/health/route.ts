import { NextResponse } from "next/server";
import { registrySummary, listModels, validateGovernance } from "@/lib/ai-platform/registry";
import { circuitSnapshots } from "@/lib/reliability/circuit-breaker";
import { AI_EMBEDDING_MODEL, AI_EMBEDDING_DIMENSIONS } from "@/lib/ai/embedding-config";

// Phase E — AI platform health: registry posture, governance violations, model
// inference circuit states, and the known embedding model/dimension consistency
// check vs the vector runtime. Returns 503 if any governance violation exists.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const violations = validateGovernance();
  const modelBreakers = circuitSnapshots().filter((b) => b.name.startsWith("model:"));

  // Vector runtime declared bge-small-en-v1.5 (384d) in infra; app uses a 1536d
  // model. Surface the mismatch as an explicit consistency signal.
  const declaredVectorDim = 384;
  const embeddingConsistent = (AI_EMBEDDING_DIMENSIONS as number) === declaredVectorDim;

  const body = {
    status: violations.length === 0 ? "ok" : "governance_violation",
    checkedAt: new Date().toISOString(),
    registry: registrySummary(),
    governanceViolations: violations,
    models: listModels().map((m) => ({ key: m.key, state: m.state, risk: m.risk, version: m.version, owner: m.owner, evaluated: Boolean(m.evaluation.lastEvaluatedAt) })),
    inferenceBreakers: modelBreakers,
    embeddingConsistency: {
      appModel: AI_EMBEDDING_MODEL,
      appDimensions: AI_EMBEDDING_DIMENSIONS,
      vectorRuntimeDimensions: declaredVectorDim,
      consistent: embeddingConsistent,
      note: embeddingConsistent ? "ok" : "App embedding dim != vector runtime collection dim (Phase E remediation E-C1)",
    },
  };

  return NextResponse.json(body, { status: violations.length === 0 ? 200 : 503 });
}
