import { errorJson, okJson } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { nextStage, workflowProgress, type IntelligenceWorkflow } from "@/lib/intelligence-platform";

// Stateless orchestration helper: compute a workflow's progress and next stage.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.workflow || !Array.isArray(body.workflow.stages)) {
      throw new AppError("VALIDATION_ERROR", "Provide a `workflow` with a `stages` array.");
    }
    const workflow = body.workflow as IntelligenceWorkflow;
    const progress = workflowProgress(workflow);
    return okJson({ progress, nextStage: progress.currentStage ? nextStage(progress.currentStage) : null });
  } catch (error) {
    return errorJson(error);
  }
}
