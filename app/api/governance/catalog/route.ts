import { errorJson, okJson } from "@/lib/api/response";
import { DECISION_TYPE_META, POLICY_CATEGORIES, RISK_CATEGORIES, SOURCE_SYSTEM_META, WORKFLOW_DEFINITIONS } from "@/lib/governance-os";

// Governance OS catalog: policy categories, decision types, source systems
// (M1–M4 integration), risk categories, and governed workflow definitions.
export async function GET() {
  try {
    return okJson({
      policyCategories: POLICY_CATEGORIES,
      decisionTypes: Object.entries(DECISION_TYPE_META).map(([type, meta]) => ({ type, ...meta })),
      sourceSystems: Object.entries(SOURCE_SYSTEM_META).map(([system, meta]) => ({ system, ...meta })),
      riskCategories: RISK_CATEGORIES,
      workflows: WORKFLOW_DEFINITIONS,
    });
  } catch (error) {
    return errorJson(error);
  }
}
