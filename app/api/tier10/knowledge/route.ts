import { errorJson, okJson } from "@/lib/api/response";
import { reconcileEvidence, reviseBelief, scorePreservation } from "@/lib/tier10";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.kind === "reconcile_evidence") return okJson(reconcileEvidence(body));
    if (body.kind === "revise_belief") return okJson(reviseBelief(body.claim, body.newEvidence));
    if (body.kind === "score_preservation") return okJson(scorePreservation(body));

    return okJson({ acceptedKinds: ["reconcile_evidence", "revise_belief", "score_preservation"] });
  } catch (error) {
    return errorJson(error);
  }
}
