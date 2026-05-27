import { errorJson, okJson } from "@/lib/api/response";
import { updateOrderStatusAction } from "@/lib/actions/orders";
import { requireAnyRole } from "@/lib/security/authorization";
import { securityRateLimits } from "@/lib/security/rate-limit";
import { withSecurity } from "@/lib/security/request-guard";

export async function PATCH(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    const result = await withSecurity(request, { name: "seller.order.status.patch", requireAuth: true, rateLimit: securityRateLimits.sellerMutation, audit: true }, async (context) => {
      requireAnyRole(context, ["SELLER", "ADMIN", "SUPER_ADMIN"]);
      return updateOrderStatusAction(orderId, await request.json());
    });
    return okJson(result);
  } catch (error) {
    return errorJson(error);
  }
}
