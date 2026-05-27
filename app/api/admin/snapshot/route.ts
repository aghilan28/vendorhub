import { errorJson, okJson } from "@/lib/api/response";
import { getAdminOperationalSnapshot } from "@/lib/api/queries/admin";
import { performanceServerTiming, withCacheHeaders } from "@/lib/performance/api";
import { requireAnyRole } from "@/lib/security/authorization";
import { securityRateLimits } from "@/lib/security/rate-limit";
import { withSecurity } from "@/lib/security/request-guard";

export async function GET(request: Request) {
  const startedAt = Date.now();
  try {
    const snapshot = await withSecurity(request, { name: "admin.snapshot.get", requireAuth: true, rateLimit: securityRateLimits.adminMutation }, async (context) => {
      requireAnyRole(context, ["ADMIN", "SUPER_ADMIN"]);
      return getAdminOperationalSnapshot();
    });
    const response = withCacheHeaders(okJson(snapshot), "privateDashboard");
    response.headers.set("Server-Timing", performanceServerTiming("admin-snapshot", startedAt));
    return response;
  } catch (error) {
    return errorJson(error);
  }
}
