import { errorJson, okJson } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { evaluateDecision, scoreRisk, type Decision, type DecisionApproval, type Likelihood, type Policy, type Severity } from "@/lib/governance-os";

// Stateless governance evaluation:
//  - risk scoring from severity + likelihood
//  - decision governance-readiness against supplied published policies
export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.severity && body.likelihood) {
      return okJson({ riskScore: scoreRisk(body.severity as Severity, body.likelihood as Likelihood) });
    }

    if (!body.decision) {
      throw new AppError("VALIDATION_ERROR", "Provide either { severity, likelihood } for risk scoring, or { decision, policies } for decision evaluation.");
    }

    const decision = body.decision as Decision;
    const policies = (Array.isArray(body.policies) ? body.policies : []) as Policy[];
    const approvals = (Array.isArray(body.approvals) ? body.approvals : []) as DecisionApproval[];
    const requiredApprovals = typeof body.requiredApprovals === "number" ? body.requiredApprovals : 1;

    const evaluation = evaluateDecision(decision, policies, approvals, requiredApprovals);
    return okJson({ evaluation });
  } catch (error) {
    return errorJson(error);
  }
}
