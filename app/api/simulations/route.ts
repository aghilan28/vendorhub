import { errorJson, okJson } from "@/lib/api/response";
import { BUILT_IN_TEMPLATES, SIMULATION_CATEGORIES } from "@/lib/simulation";

// Simulation OS catalog: templates, models, and categories available to users.
export async function GET() {
  try {
    return okJson({
      categories: SIMULATION_CATEGORIES,
      templates: BUILT_IN_TEMPLATES.map((t) => ({
        id: t.id,
        modelKey: t.modelKey,
        name: t.name,
        summary: t.summary,
        category: t.category,
        tags: t.tags,
        parameterCount: t.parameters.length,
        variables: t.variables.map((v) => v.key),
      })),
    });
  } catch (error) {
    return errorJson(error);
  }
}
