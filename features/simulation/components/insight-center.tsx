"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import type { InsightKind } from "@/lib/simulation";
import { useSimulationStore } from "@/store/simulation-store";
import { useHydrated } from "../hooks";
import { INSIGHT_META, confidencePct, relativeTime } from "../format";
import { SimShell, SimCard } from "./primitives";
import { ListSkeleton } from "./skeletons";

const KINDS: Array<{ value: InsightKind | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "opportunity", label: "Opportunities" },
  { value: "risk", label: "Risks" },
  { value: "warning", label: "Warnings" },
  { value: "insight", label: "Insights" },
  { value: "decision_support", label: "Decision support" },
];

export function InsightCenter() {
  const hydrated = useHydrated();
  const insights = useSimulationStore((s) => s.insights);
  const runs = useSimulationStore((s) => s.runs);
  const [filter, setFilter] = useState<InsightKind | "all">("all");

  if (!hydrated) return <ListSkeleton />;

  const sorted = [...insights].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const filtered = filter === "all" ? sorted : sorted.filter((i) => i.kind === filter);
  const counts = KINDS.map((k) => ({ ...k, count: k.value === "all" ? insights.length : insights.filter((i) => i.kind === k.value).length }));

  return (
    <SimShell
      title="Insight Generation Center"
      description="Insights, opportunities, risks, warnings, and decision support generated automatically from every simulation run."
    >
      <SimCard title="Filter by type">
        <div className="flex flex-wrap gap-2">
          {counts.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setFilter(k.value)}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium focus-ring ${filter === k.value ? "border-brand bg-emerald-50 text-brand" : "border-border bg-surface text-secondary-text hover:bg-slate-50"}`}
            >
              {k.label} <span className="rounded-full bg-slate-100 px-1.5">{k.count}</span>
            </button>
          ))}
        </div>
      </SimCard>

      {filtered.length === 0 ? (
        <EmptyState icon={Lightbulb} title="No insights to show" description="Run a scenario to generate insights, or change the filter." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((insight) => {
            const meta = INSIGHT_META[insight.kind];
            const Icon = meta.icon;
            const run = runs.find((r) => r.id === insight.runId);
            return (
              <div key={insight.id} className="operational-surface rounded-lg p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-md bg-slate-100">
                      <Icon className="size-4 text-secondary-text" />
                    </span>
                    <p className="text-sm font-semibold text-primary-text">{insight.title}</p>
                  </div>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
                <p className="mt-2 text-sm text-secondary-text">{insight.detail}</p>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[11px] text-secondary-text">Confidence {confidencePct(insight.confidence)} · {relativeTime(insight.createdAt)}</p>
                  {run ? (
                    <Link href={`/simulations/results?run=${run.id}` as Route} className="text-xs font-medium text-ai hover:underline">
                      View run
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SimShell>
  );
}
