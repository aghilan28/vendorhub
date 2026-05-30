import { z } from "zod";
import { okJson, errorJson } from "@/lib/api/response";
import { withSecurity } from "@/lib/security/request-guard";
import { requireAnyRole } from "@/lib/security/authorization";
import { securityRateLimits } from "@/lib/security/rate-limit";
import { proposePrice, listPricingProposals } from "@/lib/commerce-intelligence/pricing/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ProposeSchema = z.object({
  productId: z.string().min(1),
  vendorId: z.string().optional(),
  currentPriceMinor: z.number().int().positive(),
  costMinor: z.number().int().positive().optional(),
  currency: z.string().default("INR"),
  strategy: z.enum(["static", "promotional", "inventory_based", "demand_based", "competitive", "distress"]).optional(),
  inventory: z
    .object({
      daysOfCover: z.number().optional(),
      spoilageRisk: z.number().min(0).max(1).optional(),
      state: z.enum(["healthy", "low_stock", "critical", "expiring", "distressed", "overstock"]).optional(),
    })
    .optional(),
  demand: z.object({ momentum: z.number().optional() }).optional(),
  promotion: z.object({ active: z.boolean().optional(), discountPct: z.number().optional() }).optional(),
  competitive: z.object({ competitorMedianMinor: z.number().optional() }).optional(),
  guardrailMaxChangePct: z.number().min(0).max(90).optional(),
});

// Propose a governed price change (never auto-applies high-risk changes).
export async function POST(request: Request) {
  try {
    const result = await withSecurity(
      request,
      { name: "intelligence.pricing.propose", requireAuth: true, rateLimit: securityRateLimits.sellerMutation, audit: true },
      async (context) => {
        const actor = requireAnyRole(context, ["SELLER", "ADMIN", "SUPER_ADMIN"]);
        const body = ProposeSchema.parse(await request.json());
        return proposePrice(body, { actorId: actor.id, traceId: context.requestId });
      },
    );
    return okJson(result);
  } catch (error) {
    return errorJson(error);
  }
}

// List recent pricing proposals (operator review).
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const result = await withSecurity(
      request,
      { name: "intelligence.pricing.list", requireAuth: true, rateLimit: securityRateLimits.sellerMutation },
      async (context) => {
        requireAnyRole(context, ["SELLER", "ADMIN", "SUPER_ADMIN"]);
        return listPricingProposals({
          vendorId: url.searchParams.get("vendorId") ?? undefined,
          status: url.searchParams.get("status") ?? undefined,
          limit: Number(url.searchParams.get("limit") ?? 50),
        });
      },
    );
    return okJson({ proposals: result });
  } catch (error) {
    return errorJson(error);
  }
}
