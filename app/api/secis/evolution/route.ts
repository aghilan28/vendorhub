import { errorJson, okJson } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { analyzeChange, getIntervention, runEvolution, type ChangeEvent, type ChangeEventType, type Intervention, type SecisEdge, type SecisEntity } from "@/lib/secis";

// Stateless evolution / recovery simulation with interventions.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const entities: SecisEntity[] = Array.isArray(body.entities) ? body.entities : [];
    const edges: SecisEdge[] = Array.isArray(body.edges) ? body.edges : [];
    const interventionIds: string[] = Array.isArray(body.interventionIds) ? body.interventionIds : [];

    if (entities.length === 0) throw new AppError("VALIDATION_ERROR", "Provide a non-empty `entities` array.");
    if (!body.originEntityId || !entities.some((e) => e.id === body.originEntityId)) {
      throw new AppError("VALIDATION_ERROR", "`originEntityId` must reference an entity in `entities`.");
    }

    const changeEvent: ChangeEvent = {
      id: body.id ?? "adhoc",
      name: body.name ?? "Ad-hoc change",
      type: (body.type as ChangeEventType) ?? "custom",
      description: body.description ?? "",
      originEntityId: body.originEntityId,
      magnitude: typeof body.magnitude === "number" ? Math.min(1, Math.max(0, body.magnitude)) : 0.7,
      horizonPeriods: typeof body.horizonPeriods === "number" ? body.horizonPeriods : 12,
      parameters: body.parameters ?? {},
      tags: [],
      ownerId: "api",
      ownerName: "API",
      visibility: "team",
      workflowState: "draft",
      version: 1,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const settings = {
      severityThreshold: typeof body.severityThreshold === "number" ? body.severityThreshold : 0.06,
      maxDepth: typeof body.maxDepth === "number" ? body.maxDepth : 6,
    };

    const { propagation, impact } = analyzeChange(changeEvent, entities, edges, settings);
    const interventions = interventionIds.map(getIntervention).filter(Boolean) as Intervention[];
    const evolution = runEvolution(changeEvent, propagation, impact, interventions, entities);

    return okJson({ evolution, affectedEntities: propagation.affected.length, totalRevenueAtRisk: propagation.totalRevenueAtRisk });
  } catch (error) {
    return errorJson(error);
  }
}
