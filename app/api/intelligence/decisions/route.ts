import { okJson, errorJson } from "@/lib/api/response";
import { withSecurity } from "@/lib/security/request-guard";
import { requireAnyRole } from "@/lib/security/authorization";
import { securityRateLimits } from "@/lib/security/rate-limit";
import { listIntelligenceDecisions } from "@/lib/commerce-intelligence/decision-log";

// Phase F — operator audit trail: query the unified commerce-intelligence
// decision ledger (admin-only). Every domain's decisions are auditable here.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const result = await withSecurity(
      request,
      { name: "intelligence.decisions.list", requireAuth: true, rateLimit: securityRateLimits.adminMutation },
      async (context) => {
        requireAnyRole(context, ["ADMIN", "SUPER_ADMIN"]);
        return listIntelligenceDecisions({
          domain: url.searchParams.get("domain") ?? undefined,
          limit: Number(url.searchParams.get("limit") ?? 50),
        });
      },
    );
    return okJson({ decisions: result });
  } catch (error) {
    return errorJson(error);
  }
}
