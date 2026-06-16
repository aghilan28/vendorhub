"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSecisStore } from "@/store/secis-store";
import { useHydrated } from "../hooks";
import { relativeTime, formatDateTime } from "../format";
import { SecisShell, SecisCard, StatTile } from "./primitives";
import { ListSkeleton } from "./skeletons";

const ACTION_LABELS: Record<string, string> = {
  entity_created: "Entity created",
  entity_updated: "Entity updated",
  entity_archived: "Entity archived",
  system_created: "System created",
  edge_created: "Dependency added",
  edge_removed: "Dependency removed",
  event_created: "Event created",
  event_updated: "Event updated",
  event_analyzed: "Event analyzed",
  event_archived: "Event archived",
  evolution_started: "Evolution started",
  evolution_completed: "Evolution completed",
  evolution_cancelled: "Evolution cancelled",
  recommendation_accepted: "Recommendation accepted",
  mitigation_applied: "Mitigation applied",
  decision_recorded: "Decision recorded",
  workflow_transition: "Workflow transition",
  approval_recorded: "Approval recorded",
  scenario_created: "Scenario created",
};

export function HistoryCenter() {
  const hydrated = useHydrated();
  const history = useSecisStore((s) => s.history);
  const changeEvents = useSecisStore((s) => s.changeEvents);
  const decisions = useSecisStore((s) => s.decisions);
  const mitigations = useSecisStore((s) => s.mitigations);
  const [eventFilter, setEventFilter] = useState("all");

  if (!hydrated) return <ListSkeleton />;

  const events = [...history].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const filtered = eventFilter === "all" ? events : events.filter((e) => e.changeEventId === eventFilter);

  return (
    <SecisShell title="History & Audit Center" description="A complete, timestamped audit trail of every event, run, change, recommendation, decision, and mitigation across the SECIS platform.">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label="Audit events" value={String(history.length)} icon={History} tone="info" />
        <StatTile label="Decisions" value={String(decisions.length)} tone="neutral" />
        <StatTile label="Mitigations" value={String(mitigations.length)} tone="neutral" />
        <StatTile label="Change events" value={String(changeEvents.length)} tone="neutral" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SecisCard title="Decisions" description="Decisions recorded from analyses.">
          {decisions.length === 0 ? <p className="text-sm text-secondary-text">No decisions recorded.</p> : (
            <div className="space-y-2">
              {[...decisions].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map((d) => (
                <div key={d.id} className="rounded-md border border-border p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-primary-text">{d.title}</p><Badge variant={d.outcome === "adopt" ? "default" : d.outcome === "reject" ? "danger" : "warning"}>{d.outcome}</Badge></div><p className="mt-1 text-xs text-secondary-text">{d.rationale}</p><p className="mt-1 text-[11px] text-secondary-text">impact {d.impact} · {relativeTime(d.createdAt)}</p></div>
              ))}
            </div>
          )}
        </SecisCard>
        <SecisCard title="Mitigations" description="Applied mitigation actions.">
          {mitigations.length === 0 ? <p className="text-sm text-secondary-text">No mitigations applied.</p> : (
            <div className="space-y-2">
              {[...mitigations].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map((m) => (
                <div key={m.id} className="rounded-md border border-border p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-primary-text">{m.name}</p><Badge variant="ai">{m.status}</Badge></div><p className="mt-1 text-xs text-secondary-text">{m.note} · {relativeTime(m.createdAt)}</p></div>
              ))}
            </div>
          )}
        </SecisCard>
      </div>

      <SecisCard title="Audit timeline" description="Every action across the platform." action={
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="h-9 min-h-9 w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All change events</SelectItem>
            {changeEvents.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
      }>
        <ol className="relative space-y-4 border-l border-border pl-5">
          {filtered.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[1.42rem] top-1 size-2.5 rounded-full bg-brand" aria-hidden />
              <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{ACTION_LABELS[e.action] ?? e.action}</Badge><span className="text-xs text-secondary-text">{formatDateTime(e.at)}</span></div>
              <p className="mt-1 text-sm text-primary-text">{e.summary}</p>
              <p className="text-[11px] text-secondary-text">by {e.actorName} · {relativeTime(e.at)}</p>
            </li>
          ))}
          {filtered.length === 0 ? <li className="text-sm text-secondary-text">No history for this filter.</li> : null}
        </ol>
      </SecisCard>
    </SecisShell>
  );
}
