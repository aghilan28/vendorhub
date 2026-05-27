import { okJson, errorJson } from "@/lib/api/response";
import { listLiveDeliveries } from "@/lib/api/queries/logistics";
import { requireAuthenticated } from "@/lib/security/authorization";
import { securityRateLimits } from "@/lib/security/rate-limit";
import { withSecurity } from "@/lib/security/request-guard";

export async function GET(request: Request) {
  try {
    return okJson(
      await withSecurity(request, { name: "logistics.deliveries.get", requireAuth: true, rateLimit: securityRateLimits.logistics }, async (context) => {
        requireAuthenticated(context);
        return listLiveDeliveries();
      }),
    );
  } catch (error) {
    return errorJson(error);
  }
}
