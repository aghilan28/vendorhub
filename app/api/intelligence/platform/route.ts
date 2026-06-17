import { errorJson, okJson } from "@/lib/api/response";
import { ROLE_PERMISSION_MATRIX, STAGE_META, STAGE_ORDER } from "@/lib/intelligence-platform";

// Intelligence Platform catalog: the canonical lifecycle stages and roles.
export async function GET() {
  try {
    return okJson({
      stages: STAGE_ORDER.map((stage) => STAGE_META[stage]),
      roles: Object.entries(ROLE_PERMISSION_MATRIX).map(([role, permissions]) => ({ role, permissions })),
    });
  } catch (error) {
    return errorJson(error);
  }
}
