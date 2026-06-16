"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { useSimulationStore } from "@/store/simulation-store";
import { useHydrated } from "../hooks";
import { priorityVariant, relativeTime } from "../format";
import { SimShell, SimCard, StatTile } from "./primitives";
import { ListSkeleton } from "./skeletons";

export function RecommendationsScreen() {
  const hydrated = useHydrated();
  const recommendations = useSimulationStore((s) => s.recommendations);
  const runs = useSimulationStore((s) => s.runs);
  const acceptRecommendation = useSimulationStore((s) => s.acceptRecommendation);
  const [filter, setFilter] = useState<"all" | "open" | "accepted">("all");

  if (!hydrated) return <ListSkeleton />;

  const sorted = [...recommendations].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const filtered = filter === "all" ? sorted : filter === "open" ? sorted.filter((r) => !r.accepted) : sorted.filter((r) => r.accepted);
  const accepted = recommendations.filter((r) => r.accepted).length;
  const acceptance = recommendations.length ? Math.round((accepted / recommendations.length) * 100) : 0;

  return (
    <SimShell
      title="Recommendations"
      description="Actionable recommendations generated from simulation outcomes. Review, accept, and track adoption."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Total recommendations" value={String(recommendations.length)} icon={Sparkles} tone="info" />
        <StatTile label="Accepted" value={String(accepted)} tone="success" />
        <StatTile label="Acceptance rate" value={`${acceptance}%`} tone={acceptance >= 50 ? "success" : "warning"} />
      </div>

      <SimCard title="Recommendations" description="Sorted by recency." action={
        <div className="flex gap-1.5">
          {(["all", "open", "accepted"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={`min-h-9 rounded-full border px-3 text-xs font-medium focus-ring ${filter === f ? "border-brand bg-emerald-50 text-brand" : "border-border text-secondary-text hover:bg-slate-50"}`}>
              {f}
            </button>
          ))}
        </div>
      }>
        {filtered.length === 0 ? (
          <EmptyState icon={Sparkles} title="No recommendations" description="Complete a run to generate recommendations, or change the filter." />
        ) : (
          <div className="space-y-3">
            {filtered.map((rec) => {
              const run = runs.find((r) => r.id === rec.runId);
              return (
                <div key={rec.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-primary-text">{rec.title}</p>
                    <Badge variant={priorityVariant(rec.priority)}>{rec.priority} priority</Badge>
                  </div>
                  <p className="mt-2 text-sm text-primary-text">{rec.action}</p>
                  <p className="mt-1 text-xs text-secondary-text">Why: {rec.rationale}</p>
                  <p className="mt-1 text-xs text-secondary-text">Expected impact: {rec.expectedImpact}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[11px] text-secondary-text">{relativeTime(rec.createdAt)}{run ? ` · ${run.scenarioName}` : ""}</p>
                    <div className="flex items-center gap-2">
                      {run ? <Link href={`/simulations/results?run=${run.id}` as Route} className="text-xs font-medium text-ai hover:underline">View run</Link> : null}
                      {rec.accepted ? <Badge variant="default">Accepted</Badge> : <Button size="sm" variant="secondary" onClick={() => acceptRecommendation(rec.id)}>Accept</Button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SimCard>
    </SimShell>
  );
}
