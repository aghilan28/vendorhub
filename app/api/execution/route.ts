// KARTEX M8 — Execution API (Sections M8.3, M8.7, M8.11)
// GET  -> full execution dataset + computed snapshot.
// POST -> deterministic, audited operation router (transitions, decision
//         activation, KPI/outcome measurement, escalation handling).

import { z } from "zod";
import { requireRole } from "@/lib/api/auth";
import { errorJson, okJson } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import {
  applyActivateDecision,
  applyAddIntervention,
  applyAssignOwner,
  applyCreateActionPlan,
  applyCreateInitiative,
  applyEscalationStatus,
  applyMeasureKpi,
  applyRecordOutcome,
  applyTransition,
  buildExecutionSnapshot,
  buildSeedDataset,
  getExecutionState,
  type Actor,
  type ExecutionDataset,
  type MutationResult,
} from "@/lib/execution";

const actorSchema = z
  .object({ id: z.string().min(1), name: z.string().min(1) })
  .default({ id: "system", name: "System" });

const entityTypeSchema = z.enum(["program", "initiative", "project", "actionPlan", "task"]);
const statusSchema = z.enum([
  "draft",
  "planned",
  "approved",
  "executing",
  "blocked",
  "completed",
  "archived",
]);

const bodySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("snapshot") }),
  z.object({
    kind: z.literal("transition"),
    entityType: entityTypeSchema,
    entityId: z.string().min(1),
    to: statusSchema,
    actor: actorSchema.optional(),
    note: z.string().optional(),
  }),
  z.object({
    kind: z.literal("create_action_plan"),
    input: z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      ownerId: z.string().nullable().optional(),
      initiativeId: z.string().nullable().optional(),
      deadline: z.string().optional(),
    }),
    actor: actorSchema.optional(),
  }),
  z.object({
    kind: z.literal("create_initiative"),
    input: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      programId: z.string().nullable().optional(),
      ownerId: z.string().nullable().optional(),
    }),
    actor: actorSchema.optional(),
  }),
  z.object({
    kind: z.literal("assign_owner"),
    entityType: z.enum(["actionPlan", "initiative", "program"]),
    entityId: z.string().min(1),
    ownerId: z.string().min(1),
    actor: actorSchema.optional(),
  }),
  z.object({
    kind: z.literal("activate_decision"),
    decisionId: z.string().min(1),
    ownerId: z.string().nullable().optional(),
    actor: actorSchema.optional(),
  }),
  z.object({
    kind: z.literal("escalation_status"),
    escalationId: z.string().min(1),
    status: z.enum(["acknowledged", "resolved"]),
    actor: actorSchema.optional(),
  }),
  z.object({
    kind: z.literal("add_intervention"),
    escalationId: z.string().min(1),
    action: z.string().min(1),
    ownerId: z.string().nullable().optional(),
    actor: actorSchema.optional(),
  }),
  z.object({
    kind: z.literal("measure_kpi"),
    kpiId: z.string().min(1),
    value: z.number(),
    actor: actorSchema.optional(),
  }),
  z.object({
    kind: z.literal("record_outcome"),
    outcomeId: z.string().min(1),
    actual: z.number(),
    actor: actorSchema.optional(),
  }),
]);

function withSnapshot(result: MutationResult) {
  return {
    ok: result.ok,
    error: result.error ?? null,
    event: result.event,
    snapshot: buildExecutionSnapshot(result.data),
    dataset: result.data,
  };
}

export async function GET() {
  try {
    await requireRole(["ADMIN", "SUPER_ADMIN"]);
    const { data, snapshot } = getExecutionState();
    return okJson({ snapshot, dataset: data });
  } catch (error) {
    return errorJson(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["ADMIN", "SUPER_ADMIN"]);
    const json = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid execution operation.", parsed.error.flatten());
    }

    const body = parsed.data;
    const data: ExecutionDataset = buildSeedDataset();
    const actor: Actor = "actor" in body && body.actor ? body.actor : { id: "system", name: "System" };

    switch (body.kind) {
      case "snapshot":
        return okJson({ snapshot: buildExecutionSnapshot(data), dataset: data });
      case "transition":
        return okJson(
          withSnapshot(
            applyTransition(data, {
              entityType: body.entityType,
              entityId: body.entityId,
              to: body.to,
              actor,
              note: body.note,
            }),
          ),
        );
      case "create_action_plan":
        return okJson(withSnapshot(applyCreateActionPlan(data, body.input, actor)));
      case "create_initiative":
        return okJson(withSnapshot(applyCreateInitiative(data, body.input, actor)));
      case "assign_owner":
        return okJson(
          withSnapshot(
            applyAssignOwner(
              data,
              { entityType: body.entityType, entityId: body.entityId, ownerId: body.ownerId },
              actor,
            ),
          ),
        );
      case "activate_decision":
        return okJson(
          withSnapshot(
            applyActivateDecision(data, { decisionId: body.decisionId, ownerId: body.ownerId }, actor),
          ),
        );
      case "escalation_status":
        return okJson(
          withSnapshot(
            applyEscalationStatus(data, { escalationId: body.escalationId, status: body.status }, actor),
          ),
        );
      case "add_intervention":
        return okJson(
          withSnapshot(
            applyAddIntervention(
              data,
              { escalationId: body.escalationId, action: body.action, ownerId: body.ownerId },
              actor,
            ),
          ),
        );
      case "measure_kpi":
        return okJson(withSnapshot(applyMeasureKpi(data, { kpiId: body.kpiId, value: body.value }, actor)));
      case "record_outcome":
        return okJson(
          withSnapshot(applyRecordOutcome(data, { outcomeId: body.outcomeId, actual: body.actual }, actor)),
        );
      default:
        throw new AppError("VALIDATION_ERROR", "Unsupported execution operation.");
    }
  } catch (error) {
    return errorJson(error);
  }
}
