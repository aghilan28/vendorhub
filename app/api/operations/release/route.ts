import { errorJson, okJson } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { getProductionOperationsReadiness } from "@/lib/operations/production-readiness";

export async function GET() {
  try {
    await requireRole(["ADMIN", "SUPER_ADMIN"]);
    return okJson(getProductionOperationsReadiness());
  } catch (error) {
    return errorJson(error);
  }
}
