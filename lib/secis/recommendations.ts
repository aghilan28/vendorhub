// KARTEX M4 — Recommendation generation. Derives mitigations, interventions,
// recovery, optimization, strategic, and operational recommendations from a
// change event's propagation, impact, and risk. Pure + deterministic.

import { interventionsFor } from "./interventions";
import type {
  ChangeEvent,
  ImpactAssessment,
  PropagationResult,
  RecommendationCategory,
  RiskAssessment,
} from "./types";

export interface DerivedRecommendation {
  category: RecommendationCategory;
  title: string;
  action: string;
  rationale: string;
  expectedImpact: string;
  priority: "low" | "medium" | "high";
  interventionId?: string;
}

export function generateRecommendations(
  changeEvent: ChangeEvent,
  propagation: PropagationResult,
  impact: ImpactAssessment,
  risk: RiskAssessment,
): DerivedRecommendation[] {
  const recs: DerivedRecommendation[] = [];

  // 1. Intervention recommendations from the catalog for this event type.
  const relevant = interventionsFor(changeEvent.type);
  for (const intervention of relevant.slice(0, 3)) {
    recs.push({
      category: intervention.category,
      title: intervention.name,
      action: intervention.description,
      rationale: `Directly relevant to a ${changeEvent.type.replace(/_/g, " ")} affecting ${propagation.affected.length} entities.`,
      expectedImpact: `Reduces arriving severity by ~${Math.round(intervention.severityReduction * 100)}% and speeds recovery by ~${Math.round(intervention.recoveryBoost * 100)}%.`,
      priority: risk.level === "critical" || risk.level === "high" ? "high" : "medium",
      interventionId: intervention.id,
    });
  }

  // 2. Mitigation for the single most-exposed downstream entity.
  const topAffected = propagation.affected.find((a) => a.depth > 0) ?? propagation.affected[0];
  if (topAffected) {
    recs.push({
      category: "mitigation",
      title: `Protect ${topAffected.entityName}`,
      action: `Stand up contingency capacity for ${topAffected.entityName} before the shock arrives (period ${topAffected.arrivalPeriod}).`,
      rationale: `It is the most exposed node (severity ${Math.round(topAffected.severity * 100)}%, ${formatInr(topAffected.revenueAtRisk)} at risk).`,
      expectedImpact: "Limits the largest single point of loss in the blast radius.",
      priority: topAffected.severity >= 0.5 ? "high" : "medium",
    });
  }

  // 3. Dimension-driven recommendation.
  const topDim = impact.dimensions[0];
  if (topDim && topDim.score >= 40) {
    recs.push({
      category: topDim.dimension === "financial" ? "strategic" : "operational",
      title: `Address ${topDim.label.toLowerCase()} impact`,
      action: `Prioritise ${topDim.label.toLowerCase()} controls; it is the dominant impact dimension (${topDim.score}/100).`,
      rationale: topDim.detail,
      expectedImpact: `Targets the largest share of total impact.`,
      priority: topDim.score >= 70 ? "high" : "medium",
    });
  }

  // 4. Recovery recommendation when blast radius is wide.
  if (propagation.maxDepth >= 3 || propagation.affectedSystemIds.length >= 3) {
    recs.push({
      category: "recovery",
      title: "Sequence a multi-system recovery",
      action: "Coordinate recovery across the affected systems, starting upstream and working toward the customer.",
      rationale: `The event spans ${propagation.affectedSystemIds.length} systems to depth ${propagation.maxDepth}.`,
      expectedImpact: "Shortens end-to-end recovery time and avoids re-shock.",
      priority: "medium",
    });
  }

  return recs;
}

function formatInr(v: number): string {
  return `₹${new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(v)}`;
}
