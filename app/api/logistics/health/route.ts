import { errorJson, okJson } from "@/lib/api/response";
import { getLogisticsOperationalHealth } from "@/lib/logistics/observability";
import { requireAnyRole } from "@/lib/security/authorization";
import { securityRateLimits } from "@/lib/security/rate-limit";
import { withSecurity } from "@/lib/security/request-guard";

export async function GET(request: Request) {
  try {
    const snapshot = await withSecurity(request, { name: "logistics.health.get", requireAuth: true, rateLimit: securityRateLimits.adminMutation }, async (context) => {
      requireAnyRole(context, ["SELLER", "ADMIN", "SUPER_ADMIN"]);
      return getLogisticsOperationalHealth();
    });
    return okJson(snapshot);
  } catch (error) {
    return errorJson(error);
  }
}
