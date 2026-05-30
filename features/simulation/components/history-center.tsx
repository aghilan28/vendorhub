"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { History, GitCompare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSimulationStore } from "@/store/simulation-store";
import { useHydrated } from "../hooks";
import { relativeTime, formatDateTime } from "../format";
import { SimShell, SimCard, StatTile } from "./primitives";
import { ListSkeleton } from "./skeletons";

const ACTION_LABELS: Record<string, string> = {
  simulation_created: "Simulation created",
  simulation_updated: "Simulation updated",
  simulation_archived: "Simulation archived",
  scenario_created: "Scenario created",
  scenario_updated: "Scenario updated",
  scenario_cloned: "Scenario cloned",
  scenario_archived: "Scenario archived",
  scenario_deleted: "Scenario deleted",
  run_started: "Run started",
  run_paused: "Run paused",
  run_resumed: "Run resumed",
  run_cancelled: "Run cancelled",
  run_completed: "Run completed",
  comparison_created: "Comparison created",
  workflow_transition: "Workflow transition",
  review_submitted: "Review submitted",
  approval_recorded: "Approval recorded",
  decision_recorded: "Decision recorded",
  recommendation_accepted: "Recommendation accepted",
  version_saved: "Version saved",
  template_saved: "Template saved",
};

export function HistoryCenter() {
  const hydrated = useHydrated();
  const history = useSimulationStore((s) => s.history);
  const simulations = useSimulationStore((s) => s.simulations);
  const decisions = useSimulationStore((s) => s.decisions);
  const [simFilter, setSimFilter] = useState("all");

  if (!hydrated) return <ListSkeleton />;

  const events = [...history].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const filtered = simFilter === "all" ? events : events.filter((e) => e.simulationId === simFilter);

  return (
    <SimShell
      title="Simulation History Center"
      description="A complete, timestamped audit trail of every run, result, parameter change, decision, and workflow transition — plus quick links to compare past runs."
      actions={
        <Link href={"/simulations/compare" as Route} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-primary-text focus-ring hover:bg-slate-50">
          <GitCompare className="size-4" /> Compare past runs
        </Link>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="History events" value={String(history.length)} icon={History} tone="info" />
        <StatTile label="Decisions tracked" value={String(decisions.length)} tone="neutral" />
        <StatTile label="Simulations" value={String(simulations.length)} tone="neutral" />
      </div>

      <SimCard title="Decisions" description="Decisions recorded from simulation outcomes.">
        {decisions.length === 0 ? (
          <p className="text-sm text-secondary-text">No decisions recorded yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {[...decisions].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map((d) => (
              <div key={d.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-primary-text">{d.title}</p>
                  <Badge variant={d.outcome === "adopt" ? "default" : d.outcome === "reject" ? "danger" : "warning"}>{d.outcome}</Badge>
                </div>
                <p className="mt-1 text-xs text-secondary-text">{d.rationale}</p>
                <p className="mt-2 text-[11px] text-secondary-text">Impact {d.impact} · {relativeTime(d.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </SimCard>

      <SimCard
        title="Audit timeline"
        description="Every action across the Simulation OS."
        action={
          <Select value={simFilter} onValueChange={setSimFilter}>
            <SelectTrigger className="h-9 min-h-9 w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All simulations</SelectItem>
              {simulations.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        <ol className="relative space-y-4 border-l border-border pl-5">
          {filtered.map((event) => (
            <li key={event.id} className="relative">
              <span className="absolute -left-[1.42rem] top-1 size-2.5 rounded-full bg-brand" aria-hidden />
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{ACTION_LABELS[event.action] ?? event.action}</Badge>
                <span className="text-xs text-secondary-text">{formatDateTime(event.at)}</span>
              </div>
              <p className="mt-1 text-sm text-primary-text">{event.summary}</p>
              <p className="text-[11px] text-secondary-text">by {event.actorName} · {relativeTime(event.at)}</p>
            </li>
          ))}
          {filtered.length === 0 ? <li className="text-sm text-secondary-text">No history for this filter.</li> : null}
        </ol>
      </SimCard>
    </SimShell>
  );
}
