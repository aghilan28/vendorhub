// KARTEX M3 — Insight & recommendation generation.
// Derives human-readable insights, opportunities, risks, warnings, and
// actionable recommendations from a simulation result. Pure + deterministic.

import type { InsightKind, ModelKey, SimulationResult } from "./types";

export interface DerivedInsight {
  kind: InsightKind;
  title: string;
  detail: string;
  confidence: number;
}

export interface DerivedRecommendation {
  title: string;
  action: string;
  rationale: string;
  expectedImpact: string;
  priority: "low" | "medium" | "high";
}

export interface DerivedOutput {
  insights: DerivedInsight[];
  recommendations: DerivedRecommendation[];
}

function kpiValue(result: SimulationResult, key: string): number {
  return result.kpis.find((k) => k.key === key)?.value ?? 0;
}

export function deriveInsights(modelKey: ModelKey, result: SimulationResult, scenarioName: string): DerivedOutput {
  const insights: DerivedInsight[] = [];
  const recommendations: DerivedRecommendation[] = [];

  // Headline outcome is always an insight.
  insights.push({
    kind: "insight",
    title: "Outcome summary",
    detail: result.outcomeSummary,
    confidence: 0.9,
  });

  // Risk is surfaced as a risk insight.
  insights.push({
    kind: "risk",
    title: `Risk level: ${result.risk.level.toUpperCase()} (${result.risk.score}/100)`,
    detail: result.risk.factors.map((f) => `${f.label}: ${f.detail}`).join(" "),
    confidence: 0.8,
  });

  // Constraint breaches become warnings + recommendations.
  for (const check of result.constraintChecks) {
    if (!check.satisfied) {
      insights.push({
        kind: "warning",
        title: `Constraint not met: ${check.label}`,
        detail: `Target ${check.metric} ${check.operator === "lte" ? "≤" : check.operator === "gte" ? "≥" : "="} ${check.threshold}, but the simulation produced ${check.actual}.`,
        confidence: 0.95,
      });
      recommendations.push({
        title: `Close the gap on "${check.label}"`,
        action: "Adjust the most sensitive parameter and re-run to bring this metric within bounds.",
        rationale: `The scenario "${scenarioName}" violates a defined constraint on ${check.metric}.`,
        expectedImpact: "Brings the scenario into a governed, approvable state.",
        priority: "high",
      });
    }
  }

  // Top sensitivity driver becomes an opportunity / decision support.
  const topDriver = [...result.sensitivity].sort((a, b) => Math.abs(b.outcomeDelta) - Math.abs(a.outcomeDelta))[0];
  if (topDriver) {
    insights.push({
      kind: "decision_support",
      title: `Most influential lever: ${topDriver.parameterLabel}`,
      detail: `Moving ${topDriver.parameterLabel} shifts the headline outcome by about ${topDriver.outcomeDelta}%. Prioritise certainty on this input.`,
      confidence: 0.75,
    });
  }

  // Model-specific opportunities & recommendations.
  switch (modelKey) {
    case "market_adoption": {
      const penetration = kpiValue(result, "penetration");
      insights.push({
        kind: penetration >= 50 ? "opportunity" : "warning",
        title: penetration >= 50 ? "Strong adoption ceiling" : "Adoption ceiling at risk",
        detail: `Projected penetration is ${penetration}%.`,
        confidence: 0.7,
      });
      recommendations.push({
        title: penetration >= 50 ? "Plan capacity for the adoption peak" : "Boost word-of-mouth before launch",
        action: penetration >= 50 ? "Align inventory and support staffing to the projected peak period." : "Invest in referral incentives to raise the imitation coefficient.",
        rationale: "Adoption is dominated by word-of-mouth dynamics in this model.",
        expectedImpact: penetration >= 50 ? "Avoids stockouts and service degradation at peak." : "Raises ceiling penetration and pulls the peak forward.",
        priority: penetration >= 50 ? "medium" : "high",
      });
      break;
    }
    case "revenue_projection": {
      const loss = kpiValue(result, "loss_probability");
      const margin = kpiValue(result, "margin");
      insights.push({
        kind: loss <= 10 ? "opportunity" : "risk",
        title: `Downside exposure ${loss}%`,
        detail: `${loss}% of Monte-Carlo runs end in a loss; mean margin is ${margin}%.`,
        confidence: 0.85,
      });
      recommendations.push({
        title: loss <= 10 ? "Proceed with monitored rollout" : "De-risk before committing",
        action: loss <= 10 ? "Adopt the plan with a monthly variance review." : "Reduce fixed cost or lift price; re-run to push loss probability below 20%.",
        rationale: "The distribution quantifies tail risk explicitly.",
        expectedImpact: loss <= 10 ? "Captures upside with controlled downside." : "Materially reduces probability of a loss-making outcome.",
        priority: loss <= 10 ? "medium" : "high",
      });
      break;
    }
    case "pricing_sensitivity": {
      const uplift = kpiValue(result, "uplift_vs_base");
      const optimal = result.kpis.find((k) => k.key === "optimal_price")?.display ?? "";
      insights.push({
        kind: uplift > 1 ? "opportunity" : "insight",
        title: uplift > 1 ? "Pricing headroom identified" : "Price is near-optimal",
        detail: `Profit-optimal price is ${optimal} (${uplift}% above base).`,
        confidence: 0.8,
      });
      if (uplift > 1) {
        recommendations.push({
          title: "Test a price move toward the optimum",
          action: `Run a controlled price experiment toward ${optimal}.`,
          rationale: "The elasticity curve shows unexploited profit headroom.",
          expectedImpact: `Up to ${uplift}% profit uplift if elasticity holds.`,
          priority: "high",
        });
      }
      break;
    }
    case "inventory_simulation": {
      const service = kpiValue(result, "service_level");
      const stockouts = kpiValue(result, "stockout_days");
      insights.push({
        kind: service >= 98 ? "opportunity" : "warning",
        title: `Service level ${service}%`,
        detail: `${stockouts} stockout day(s) under the current policy.`,
        confidence: 0.85,
      });
      recommendations.push({
        title: service >= 98 ? "Trim excess safety stock" : "Raise the reorder point",
        action: service >= 98 ? "Lower the reorder point modestly to reduce holding cost while preserving service." : "Increase the reorder point or quantity and re-run to lift service level above 95%.",
        rationale: "Service level is the binding operational metric here.",
        expectedImpact: service >= 98 ? "Reduces working capital tied up in stock." : "Reduces stockout days and protects revenue.",
        priority: service >= 98 ? "low" : "high",
      });
      break;
    }
    case "demand_forecast": {
      const growth = kpiValue(result, "growth");
      insights.push({
        kind: growth >= 0 ? "opportunity" : "risk",
        title: growth >= 0 ? "Positive demand trajectory" : "Contracting demand",
        detail: `Net change to horizon is ${growth}%.`,
        confidence: 0.75,
      });
      recommendations.push({
        title: growth >= 0 ? "Pre-position for growth" : "Mitigate demand decline",
        action: growth >= 0 ? "Secure supply and staffing ahead of the forecast peak." : "Investigate demand drivers and prepare a retention or promotion plan.",
        rationale: "The forecast band defines planning confidence.",
        expectedImpact: growth >= 0 ? "Captures upside demand without service gaps." : "Slows or reverses the decline.",
        priority: growth >= 0 ? "medium" : "high",
      });
      break;
    }
    case "competitive_dynamics": {
      const share = kpiValue(result, "final_share");
      insights.push({
        kind: share >= 50 ? "opportunity" : "risk",
        title: `Projected final share ${share}%`,
        detail: result.trendSummary,
        confidence: 0.7,
      });
      recommendations.push({
        title: share >= 50 ? "Defend the leading position" : "Invest in effectiveness",
        action: share >= 50 ? "Maintain effectiveness and watch for rival escalation." : "Increase 'our effectiveness' and re-run to test a path back above 50%.",
        rationale: "Effectiveness is the dominant lever in attrition models.",
        expectedImpact: share >= 50 ? "Sustains market leadership." : "Improves the competitive trajectory.",
        priority: share >= 50 ? "medium" : "high",
      });
      break;
    }
  }

  return { insights, recommendations };
}
