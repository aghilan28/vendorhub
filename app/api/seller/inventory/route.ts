import { errorJson, okJson } from "@/lib/api/response";
import { updateInventoryStockAction } from "@/lib/actions/products";
import { requireAnyRole } from "@/lib/security/authorization";
import { securityRateLimits } from "@/lib/security/rate-limit";
import { withSecurity } from "@/lib/security/request-guard";

export async function PATCH(request: Request) {
  try {
    const result = await withSecurity(request, { name: "seller.inventory.patch", requireAuth: true, rateLimit: securityRateLimits.sellerMutation, audit: true }, async (context) => {
      requireAnyRole(context, ["SELLER", "ADMIN", "SUPER_ADMIN"]);
      return updateInventoryStockAction(await request.json());
    });
    return okJson(result);
  } catch (error) {
    return errorJson(error);
  }
}
