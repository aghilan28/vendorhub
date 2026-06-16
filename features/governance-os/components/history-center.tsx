"use client";

import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useGovernanceStore } from "@/store/governance-store";
import { useHydrated } from "../hooks";
import { AUDIT_ACTION_LABELS, formatDateTime, relativeTime } from "../format";
import { GovShell, GovCard, StatTile } from "./primitives";
import { ListSkeleton } from "./skeletons";

export function HistoryCenter() {
  const hydrated = useHydrated();
  const audit = useGovernanceStore((s) => s.audit);
  if (!hydrated) return <ListSkeleton />;

  const sorted = [...audit].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const byDay = new Map<string, typeof sorted>();
  for (const a of sorted) {
    const day = new Date(a.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(a);
  }

  return (
    <GovShell title="Governance History" description="A complete chronological record of all governance activity, grouped by day.">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Total events" value={String(audit.length)} icon={History} tone="info" />
        <StatTile label="Active days" value={String(byDay.size)} tone="neutral" />
        <StatTile label="Latest" value={sorted[0] ? relativeTime(sorted[0].at) : "—"} tone="neutral" />
      </div>

      {[...byDay.entries()].map(([day, events]) => (
        <GovCard key={day} title={day} description={`${events.length} event(s)`}>
          <div className="space-y-2">
            {events.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <div className="min-w-0"><p className="truncate text-sm text-primary-text">{a.summary}{a.objectLabel ? ` — ${a.objectLabel}` : ""}</p><p className="text-[11px] text-secondary-text">{a.actorName} · {formatDateTime(a.at)}</p></div>
                <Badge variant="secondary">{AUDIT_ACTION_LABELS[a.action]}</Badge>
              </div>
            ))}
          </div>
        </GovCard>
      ))}
    </GovShell>
  );
}
