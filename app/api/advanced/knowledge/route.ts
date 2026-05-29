import { z } from "zod";
import { okJson, errorJson } from "@/lib/api/response";
import { withSecurity } from "@/lib/security/request-guard";
import { requireAnyRole } from "@/lib/security/authorization";
import { securityRateLimits } from "@/lib/security/rate-limit";
import { createKnowledgeUnit, validateKnowledgeUnit, listKnowledgeUnits } from "@/lib/advanced-intelligence/knowledge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CreateSchema = z.object({
  kind: z.enum(["claim", "evidence", "asset", "artifact"]),
  title: z.string().min(1),
  content: z.record(z.string(), z.unknown()).optional(),
  provenance: z.record(z.string(), z.unknown()).optional(),
  derivedFrom: z.array(z.string()).optional(),
  owner: z.string().optional(),
});
const ValidateSchema = z.object({
  kind: z.literal("validate"),
  unitId: z.string().min(1),
  unitKind: z.enum(["claim", "evidence", "asset", "artifact"]),
  derivedFrom: z.array(z.string()).optional(),
  qualityScore: z.number().optional(),
});

// Phase G — Knowledge runtime (admin/governance only).
export async function POST(request: Request) {
  try {
    const result = await withSecurity(
      request,
      { name: "advanced.knowledge.write", requireAuth: true, rateLimit: securityRateLimits.adminMutation, audit: true },
      async (context) => {
        const actor = requireAnyRole(context, ["ADMIN", "SUPER_ADMIN"]);
        const body = await request.json();
        if (body?.kind === "validate") {
          const v = ValidateSchema.parse(body);
          return validateKnowledgeUnit(v.unitId, { kind: v.unitKind, derivedFrom: v.derivedFrom, qualityScore: v.qualityScore }, { actorId: actor.id, traceId: context.requestId });
        }
        const c = CreateSchema.parse(body);
        return createKnowledgeUnit(c, { actorId: actor.id, traceId: context.requestId });
      },
    );
    return okJson(result);
  } catch (error) {
    return errorJson(error);
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const result = await withSecurity(
      request,
      { name: "advanced.knowledge.list", requireAuth: true, rateLimit: securityRateLimits.adminMutation },
      async (context) => {
        requireAnyRole(context, ["ADMIN", "SUPER_ADMIN"]);
        return listKnowledgeUnits({ kind: url.searchParams.get("kind") ?? undefined, limit: Number(url.searchParams.get("limit") ?? 50) });
      },
    );
    return okJson({ units: result });
  } catch (error) {
    return errorJson(error);
  }
}
