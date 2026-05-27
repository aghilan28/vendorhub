import { errorJson, okJson } from "@/lib/api/response";
import { getAsyncInfrastructureHealth } from "@/lib/async/observability";
import { requireAnyRole } from "@/lib/security/authorization";
import { securityRateLimits } from "@/lib/security/rate-limit";
import { withSecurity } from "@/lib/security/request-guard";

export async function GET(request: Request) {
  try {
    const snapshot = await withSecurity(request, { name: "ops.async.health", requireAuth: true, rateLimit: securityRateLimits.adminMutation }, async (context) => {
      requireAnyRole(context, ["ADMIN", "SUPER_ADMIN"]);
      return getAsyncInfrastructureHealth();
    });
    return okJson(snapshot);
  } catch (error) {
    return errorJson(error);
  }
}

