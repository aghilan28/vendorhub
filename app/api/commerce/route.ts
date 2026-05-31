// MCP-0F.9 / 0F.11 — Commerce Transaction API.
// GET -> admin-gated commerce-governance snapshot (orders/payments/deliveries/
//        post-purchase + transaction intelligence), with the detected risks
//        ACTIVATED through the existing MCP-0E connectors (execution /
//        governance / simulation) so intelligence operates on commerce activity.

import { requireRole } from "@/lib/api/auth";
import { errorJson, okJson } from "@/lib/api/response";
import { getCommerceGovernanceSnapshot } from "@/lib/commerce-transaction/queries";
import { risksToRecommendations } from "@/lib/commerce-transaction";
import { activateRecommendations, buildMarketplaceFabric } from "@/lib/marketplace-intelligence";
import { SAMPLE_MARKETPLACE_INPUT } from "@/lib/marketplace-intelligence";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole(["ADMIN", "SUPER_ADMIN"]);
    const result = await getCommerceGovernanceSnapshot();
    const recommendations = risksToRecommendations(result.snapshot.intelligence.risks);
    // Activate the top transaction risks through the MCP-0E connectors.
    const fabric = buildMarketplaceFabric(SAMPLE_MARKETPLACE_INPUT);
    const activations = activateRecommendations(recommendations, { fabric, limit: 6 });

    return okJson({
      configured: result.configured,
      sampled: result.sampled,
      generatedAt: result.generatedAt,
      snapshot: result.snapshot,
      recommendations,
      activations,
    });
  } catch (error) {
    return errorJson(error);
  }
}
