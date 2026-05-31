// MCP-1D Phase 10/11 — Growth Operations API.
// GET -> admin-gated growth snapshot (customers / retention / loyalty / referral
//        / campaigns / engagement) + growth intelligence (retention & churn
//        risks, growth/campaign/referral opportunities, demand forecast).

import { requireRole } from "@/lib/api/auth";
import { errorJson, okJson } from "@/lib/api/response";
import { getAdminGrowthSnapshot } from "@/lib/customer-growth/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole(["ADMIN", "SUPER_ADMIN"]);
    const result = await getAdminGrowthSnapshot();
    return okJson({
      configured: result.configured,
      sampled: result.sampled,
      snapshot: result.snapshot,
    });
  } catch (error) {
    return errorJson(error);
  }
}
