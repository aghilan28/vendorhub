"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import type { RecommendationCategory } from "@/lib/secis";
import { useSecisStore } from "@/store/secis-store";
import { useHydrated } from "../hooks";
import { priorityVariant, relativeTime } from "../format";
import { SecisShell, SecisCard, StatTile } from "./primitives";
import { ListSkeleton } from "./skeletons";

const CATEGORIES: Array<RecommendationCategory | "all"> = ["all", "mitigation", "intervention", "recovery", "optimization", "strategic", "operational"];

export function RecommendationCenter() {
  const hydrated = useHydrated();
  const recommendations = useSecisStore((s) => s.recommendations);
  const changeEvents = useSecisStore((s) => s.changeEvents);
  const acceptRecommendation = useSecisStore((s) => s.acceptRecommendation);
  const [filter, setFilter] = useState<RecommendationCategory | "all">("all");

  if (!hydrated) return <ListSkeleton />;

  const sorted = [...recommendations].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const filtered = filter === "all" ? sorted : sorted.filter((r) => r.category === filter);
  const accepted = recommendations.filter((r) => r.accepted).length;
  const eventName = (id: string) => changeEvents.find((e) => e.id === id)?.name ?? "event";

  return (
    <SecisShell title="Recommendation Center" description="Mitigations, interventions, recovery actions, and strategic / operational recommendations generated from change-impact analysis.">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Recommendations" value={String(recommendations.length)} icon={Lightbulb} tone="info" />
        <StatTile label="Accepted" value={String(accepted)} tone="success" />
        <StatTile label="Acceptance" value={`${recommendations.length ? Math.round((accepted / recommendations.length) * 100) : 0}%`} tone="neutral" />
      </div>

      <SecisCard title="Recommendations" description={`${filtered.length} shown`} action={
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => <button key={c} type="button" onClick={() => setFilter(c)} className={`min-h-8 rounded-full border px-2.5 text-xs font-medium focus-ring ${filter === c ? "border-brand bg-emerald-50 text-brand" : "border-border text-secondary-text hover:bg-slate-50"}`}>{c}</button>)}
        </div>
      }>
        {filtered.length === 0 ? (
          <EmptyState icon={Lightbulb} title="No recommendations" description="Analyse a change event to generate recommendations, or change the filter." />
        ) : (
          <div className="space-y-3">
            {filtered.map((rec) => (
              <div key={rec.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-primary-text">{rec.title}</p>
                  <div className="flex gap-1.5"><Badge variant="secondary">{rec.category}</Badge><Badge variant={priorityVariant(rec.priority)}>{rec.priority}</Badge></div>
                </div>
                <p className="mt-2 text-sm text-primary-text">{rec.action}</p>
                <p className="mt-1 text-xs text-secondary-text">Why: {rec.rationale}</p>
                <p className="mt-1 text-xs text-secondary-text">Expected impact: {rec.expectedImpact}</p>
                <div className="mt-3 flex items-center justify-between">
                  <Link href={`/secis/${rec.changeEventId}` as Route} className="text-xs font-medium text-ai hover:underline">{eventName(rec.changeEventId)} · {relativeTime(rec.createdAt)}</Link>
                  {rec.accepted ? <Badge variant="default">Accepted</Badge> : <Button size="sm" variant="secondary" onClick={() => acceptRecommendation(rec.id)}>Accept</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </SecisCard>
    </SecisShell>
  );
}
