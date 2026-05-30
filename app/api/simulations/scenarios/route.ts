import { errorJson, okJson } from "@/lib/api/response";
import { AppError } from "@/lib/errors";
import { BUILT_IN_TEMPLATES, defaultParameters, getTemplate } from "@/lib/simulation";

// Returns starter scenario definitions (default parameters, assumptions,
// constraints) for a template, so a client can scaffold a new scenario.
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const templateId = url.searchParams.get("templateId");

    if (!templateId) {
      return okJson({
        templates: BUILT_IN_TEMPLATES.map((t) => ({ id: t.id, name: t.name, modelKey: t.modelKey })),
      });
    }

    const template = getTemplate(templateId);
    if (!template) {
      throw new AppError("NOT_FOUND", `Template ${templateId} not found`);
    }

    return okJson({
      templateId: template.id,
      modelKey: template.modelKey,
      parameters: defaultParameters(template),
      parameterSchema: template.parameters,
      assumptions: template.defaultAssumptions,
      constraints: template.defaultConstraints,
    });
  } catch (error) {
    return errorJson(error);
  }
}
