import { errorJson, okJson } from "@/lib/api/response";
import { CHANGE_EVENT_TYPES, INTERVENTIONS } from "@/lib/secis";

// SECIS catalog: change-event types, interventions, and impact dimensions.
export async function GET() {
  try {
    return okJson({
      eventTypes: CHANGE_EVENT_TYPES.map((t) => ({ type: t.type, label: t.label, description: t.description, category: t.category, defaultMagnitude: t.defaultMagnitude, originKinds: t.originKinds, params: t.params })),
      interventions: INTERVENTIONS,
      impactDimensions: ["operational", "financial", "inventory", "demand", "supply", "delivery", "customer", "marketplace"],
    });
  } catch (error) {
    return errorJson(error);
  }
}
