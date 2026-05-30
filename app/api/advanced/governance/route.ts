import { z } from "zod";
import { okJson, errorJson } from "@/lib/api/response";
import { withSecurity } from "@/lib/security/request-guard";
import { requireAnyRole } from "@/lib/security/authorization";
import { securityRateLimits } from "@/lib/security/rate-limit";
import { decideWithGovernance, registerConstitution } from "@/lib/advanced-intelligence/governance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DecisionSchema = z.object({
  kind: z.literal("policy_decision"),
  subjectType: z.string().min(1),
  subjectId: z.string().optional(),
  proposal: z.record(z.string(), z.unknown()),
});
const ConstitutionSchema = z.object({
  kind: z.literal("register_constitution"),
  version: z.string().min(1),
  title: z.string().min(1),
  documentHash: z.string().min(1),
  summary: z.string().optional(),
  supersedes: z.string().optional(),
});

// Phase G — Governance & Constitution runtime (admin/governance only).
export async function POST(request: Request) {
  try {
    const result = await withSecurity(
      request,
      { name: "advanced.governance.decide", requireAuth: true, rateLimit: securityRateLimits.adminMutation, audit: true },
      async (context) => {
        const actor = requireAnyRole(context, ["ADMIN", "SUPER_ADMIN"]);
        const body = await request.json();
        if (body?.kind === "register_constitution") {
          const c = ConstitutionSchema.parse(body);
          return registerConstitution(c, { actorId: actor.id });
        }
        const d = DecisionSchema.parse(body);
        return decideWithGovernance(d.subjectType, d.subjectId, d.proposal, { actorId: actor.id, traceId: context.requestId });
      },
    );
    return okJson(result);
  } catch (error) {
    return errorJson(error);
  }
}
