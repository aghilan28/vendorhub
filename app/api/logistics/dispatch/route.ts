import { okJson, errorJson } from "@/lib/api/response";
import { getLiveDispatchQueue } from "@/lib/api/queries/logistics";
import { requireAnyRole } from "@/lib/security/authorization";
import { securityRateLimits } from "@/lib/security/rate-limit";
import { withSecurity } from "@/lib/security/request-guard";

export async function GET(request: Request) {
  try {
    return okJson(
      await withSecurity(request, { name: "logistics.dispatch.get", requireAuth: true, rateLimit: securityRateLimits.logistics }, async (context) => {
        requireAnyRole(context, ["SELLER", "ADMIN", "SUPER_ADMIN"]);
        return getLiveDispatchQueue();
      }),
    );
  } catch (error) {
    return errorJson(error);
  }
}
