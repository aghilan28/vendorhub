import { okJson, errorJson } from "@/lib/api/response";
import { getLiveDelivery, transitionLiveDelivery } from "@/lib/api/queries/logistics";
import { requireAnyRole, requireAuthenticated } from "@/lib/security/authorization";
import { securityRateLimits } from "@/lib/security/rate-limit";
import { withSecurity } from "@/lib/security/request-guard";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return okJson(
      await withSecurity(_request, { name: "logistics.delivery.get", requireAuth: true, rateLimit: securityRateLimits.logistics }, async (context) => {
        requireAuthenticated(context);
        return getLiveDelivery(id);
      }),
    );
  } catch (error) {
    return errorJson(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { toStatus: never; note?: string; etaMinutes?: number; failureReason?: string; proofPlaceholder?: string };
    const result = await withSecurity(request, { name: "logistics.delivery.patch", requireAuth: true, rateLimit: securityRateLimits.logistics, audit: true }, async (context) => {
      requireAnyRole(context, ["SELLER", "ADMIN", "SUPER_ADMIN"]);
      return transitionLiveDelivery({
        deliveryId: id,
        toStatus: body.toStatus,
        note: body.note ?? "Delivery state advanced by fulfillment operation.",
        etaMinutes: body.etaMinutes,
        failureReason: body.failureReason,
        proofPlaceholder: body.proofPlaceholder,
      });
    });
    return okJson(result);
  } catch (error) {
    return errorJson(error);
  }
}
