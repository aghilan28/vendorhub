import { okJson, errorJson } from "@/lib/api/response";
import { withSecurity } from "@/lib/security/request-guard";
import { requireAnyRole } from "@/lib/security/authorization";
import { securityRateLimits } from "@/lib/security/rate-limit";
import { buildAdvancedOperationsSnapshot } from "@/lib/advanced-intelligence/operations";

// Phase G — advanced-systems operationalization status: per-domain posture +
// live decision freshness. Answers "can operators run each advanced system?".
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const result = await withSecurity(
      request,
      { name: "advanced.operations.snapshot", requireAuth: true, rateLimit: securityRateLimits.adminMutation },
      async (context) => {
        requireAnyRole(context, ["ADMIN", "SUPER_ADMIN"]);
        return buildAdvancedOperationsSnapshot();
      },
    );
    return okJson(result);
  } catch (error) {
    return errorJson(error);
  }
}
