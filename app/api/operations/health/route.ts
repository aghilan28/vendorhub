import { errorJson, okJson } from "@/lib/api/response";
import { requireRole } from "@/lib/api/auth";
import { getOperationalHealthSnapshot } from "@/lib/observability/operational-health";

export async function GET() {
  try {
    await requireRole(["ADMIN", "SUPER_ADMIN"]);
    return okJson(await getOperationalHealthSnapshot());
  } catch (error) {
    return errorJson(error);
  }
}
