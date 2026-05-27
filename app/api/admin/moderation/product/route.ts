import { moderateProductAction } from "@/lib/actions/admin";
import { errorJson, okJson } from "@/lib/api/response";
import { requireAnyRole } from "@/lib/security/authorization";
import { securityRateLimits } from "@/lib/security/rate-limit";
import { withSecurity } from "@/lib/security/request-guard";

export async function PATCH(request: Request) {
  try {
    const result = await withSecurity(request, { name: "admin.moderation.product.patch", requireAuth: true, rateLimit: securityRateLimits.adminMutation, audit: true }, async (context) => {
      requireAnyRole(context, ["ADMIN", "SUPER_ADMIN"]);
      return moderateProductAction(await request.json());
    });
    return okJson(result);
  } catch (error) {
    return errorJson(error);
  }
}
