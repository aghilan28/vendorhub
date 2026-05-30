import { okJson, errorJson } from "@/lib/api/response";
import { withSecurity } from "@/lib/security/request-guard";
import { requireAnyRole } from "@/lib/security/authorization";
import { securityRateLimits } from "@/lib/security/rate-limit";
import { buildOperationsSnapshot } from "@/lib/commerce-intelligence/operations";

// Phase F — operations status: per-domain operationalization posture + live
// decision freshness from the ledger. Answers "can operators run each domain?".
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const result = await withSecurity(
      request,
      { name: "intelligence.operations.snapshot", requireAuth: true, rateLimit: securityRateLimits.adminMutation },
      async (context) => {
        requireAnyRole(context, ["ADMIN", "SUPER_ADMIN"]);
        return buildOperationsSnapshot();
      },
    );
    return okJson(result);
  } catch (error) {
    return errorJson(error);
  }
}
