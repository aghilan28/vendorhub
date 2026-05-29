import { errorJson, okJson } from "@/lib/api/response";
import { compileGovernanceRule, validateAmendment } from "@/lib/tier10";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.kind === "compile_rule") {
      return okJson(compileGovernanceRule(body.ruleKey, body.expression));
    }

    if (body.kind === "validate_amendment") {
      return okJson(validateAmendment(body));
    }

    return okJson({ acceptedKinds: ["compile_rule", "validate_amendment"] });
  } catch (error) {
    return errorJson(error);
  }
}
