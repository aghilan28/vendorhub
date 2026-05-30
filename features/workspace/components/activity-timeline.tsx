"use client";

import { Activity } from "lucide-react";
import { useHydrated, useActivity } from "../hooks";
import { relativeTime, SYSTEM_META } from "../format";
import { WorkspaceShell, WSCard, StatTile, SystemPill } from "./primitives";
import { ListSkeleton } from "./skeletons";

export function ActivityTimeline() {
  const hydrated = useHydrated();
  const activity = useActivity(60);
  if (!hydrated) return <ListSkeleton />;

  const byDay = new Map<string, typeof activity>();
  for (const a of activity) {
    const day = new Date(a.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(a);
  }

  return (
    <WorkspaceShell title="Activity Timeline" description="A unified, chronological feed of recent Research, Knowledge, Simulation, SECIS, and Governance activity — decisions, approvals, runs, and more.">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Recent events" value={String(activity.length)} icon={Activity} tone="info" />
        <StatTile label="Active days" value={String(byDay.size)} tone="neutral" />
        <StatTile label="Systems active" value={String(new Set(activity.map((a) => a.system)).size)} tone="neutral" />
      </div>

      {[...byDay.entries()].map(([day, events]) => (
        <WSCard key={day} title={day} description={`${events.length} event(s)`}>
          <ol className="relative space-y-4 border-l border-border pl-5">
            {events.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute -left-[1.42rem] top-1 size-2.5 rounded-full" style={{ backgroundColor: SYSTEM_META[a.system]?.color ?? "#94a3b8" }} aria-hidden />
                <div className="flex flex-wrap items-center gap-2"><SystemPill system={a.system} /><span className="text-xs text-secondary-text">{relativeTime(a.at)}</span></div>
                <p className="mt-1 text-sm text-primary-text">{a.summary}</p>
                <p className="text-[11px] text-secondary-text">by {a.actor}</p>
              </li>
            ))}
          </ol>
        </WSCard>
      ))}
    </WorkspaceShell>
  );
}
