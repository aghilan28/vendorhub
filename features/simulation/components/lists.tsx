"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import type { SimulationInsight, SimulationRecommendation } from "@/lib/simulation";
import { INSIGHT_META, confidencePct, priorityVariant, relativeTime } from "../format";

export function InsightList({ insights }: { insights: SimulationInsight[] }) {
  if (insights.length === 0) return <p className="text-sm text-secondary-text">No insights generated yet.</p>;
  return (
    <div className="space-y-3">
      {insights.map((insight) => {
        const meta = INSIGHT_META[insight.kind];
        const Icon = meta.icon;
        return (
          <div key={insight.id} className="rounded-md border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-slate-100">
                  <Icon className="size-4 text-secondary-text" />
                </span>
                <p className="text-sm font-medium text-primary-text">{insight.title}</p>
              </div>
              <Badge variant={meta.variant}>{meta.label}</Badge>
            </div>
            <p className="mt-2 text-xs text-secondary-text">{insight.detail}</p>
            <p className="mt-2 text-[11px] text-secondary-text">Confidence {confidencePct(insight.confidence)} · {relativeTime(insight.createdAt)}</p>
          </div>
        );
      })}
    </div>
  );
}

export function RecommendationList({
  recommendations,
  onAccept,
}: {
  recommendations: SimulationRecommendation[];
  onAccept?: (id: string) => void;
}) {
  if (recommendations.length === 0) return <p className="text-sm text-secondary-text">No recommendations generated yet.</p>;
  return (
    <div className="space-y-3">
      {recommendations.map((rec) => (
        <div key={rec.id} className="rounded-md border border-border p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-primary-text">{rec.title}</p>
            <Badge variant={priorityVariant(rec.priority)}>{rec.priority} priority</Badge>
          </div>
          <p className="mt-2 text-sm text-primary-text">{rec.action}</p>
          <p className="mt-1 text-xs text-secondary-text">Why: {rec.rationale}</p>
          <p className="mt-1 text-xs text-secondary-text">Expected impact: {rec.expectedImpact}</p>
          {onAccept ? (
            <div className="mt-3">
              {rec.accepted ? (
                <Badge variant="default">
                  <Check className="size-3" /> Accepted
                </Badge>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => onAccept(rec.id)}>
                  Accept recommendation
                </Button>
              )}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
