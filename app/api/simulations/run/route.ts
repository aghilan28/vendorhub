import { errorJson, okJson } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import {
  deriveInsights,
  deterministicSeed,
  getTemplate,
  runSimulationModel,
  type ModelKey,
  type SimulationConstraint,
} from "@/lib/simulation";

const VALID_MODELS: ModelKey[] = [
  "market_adoption",
  "demand_forecast",
  "revenue_projection",
  "pricing_sensitivity",
  "inventory_simulation",
  "competitive_dynamics",
];

// Execute a simulation model server-side. Deterministic given the same seed.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    let modelKey: ModelKey | undefined = body.modelKey;

    if (!modelKey && body.templateId) {
      modelKey = getTemplate(body.templateId)?.modelKey;
    }

    if (!modelKey || !VALID_MODELS.includes(modelKey)) {
      throw new AppError("VALIDATION_ERROR", `Unknown or missing modelKey. Valid models: ${VALID_MODELS.join(", ")}`);
    }

    const parameters = body.parameters ?? {};
    const seed = typeof body.seed === "number" ? body.seed : deterministicSeed(JSON.stringify(parameters));
    const constraints: SimulationConstraint[] = Array.isArray(body.constraints) ? body.constraints : [];

    const result = runSimulationModel(modelKey, parameters, seed, constraints);
    const derived = deriveInsights(modelKey, result, body.scenarioName ?? "ad-hoc scenario");

    return okJson({
      modelKey,
      seed,
      result,
      insights: derived.insights,
      recommendations: derived.recommendations,
    });
  } catch (error) {
    return errorJson(error);
  }
}
