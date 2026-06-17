"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/feedback/empty-state";
import { STAGE_META } from "@/lib/intelligence-platform";
import { useIntelligenceStore } from "@/store/intelligence-platform-store";
import { useHydrated, useWorkflowProvenance } from "../hooks";
import { PROVENANCE_LABELS, formatDateTime, relativeTime } from "../format";
import { IntelShell, IntelCard, StatTile } from "./primitives";
import { ListSkeleton } from "./skeletons";

export function ProvenanceCenter() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const workflows = useIntelligenceStore((s) => s.workflows);
  const [selected, setSelected] = useState(params.get("workflow") ?? workflows[0]?.id ?? "");
  const events = useWorkflowProvenance(selected);

  if (!hydrated) return <ListSkeleton />;

  const workflow = workflows.find((w) => w.id === selected);
  const actors = new Set(events.map((e) => e.actor));

  return (
    <IntelShell
      title="Provenance System"
      description="Across every system: who created, who modified, who approved, who governed, and who executed — for any initiative."
      actions={
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select a workflow" /></SelectTrigger>
          <SelectContent>{workflows.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
        </Select>
      }
    >
      {!workflow ? (
        <EmptyState icon={ScrollText} title="No workflows yet" description="Create a workflow to see its cross-system provenance." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Provenance events" value={String(events.length)} icon={ScrollText} tone="info" />
            <StatTile label="Contributors" value={String(actors.size)} tone="neutral" />
            <StatTile label="Systems involved" value={String(new Set(events.map((e) => e.stage)).size)} tone="neutral" />
          </div>

          <IntelCard title={`Provenance — ${workflow.name}`} description="Merged from the platform spine and the underlying operating systems.">
            <ol className="relative space-y-4 border-l border-border pl-5">
              {events.map((e) => {
                const meta = STAGE_META[e.stage as keyof typeof STAGE_META] ?? STAGE_META.research;
                return (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[1.42rem] top-1 size-2.5 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{meta.label}</Badge>
                      <Badge variant="ai">{PROVENANCE_LABELS[e.action as keyof typeof PROVENANCE_LABELS] ?? e.action}</Badge>
                      <span className="text-xs text-secondary-text">{formatDateTime(e.at)}</span>
                    </div>
                    <p className="mt-1 text-sm text-primary-text">{e.summary}</p>
                    <p className="text-[11px] text-secondary-text">by {e.actor} · {relativeTime(e.at)}</p>
                  </li>
                );
              })}
              {events.length === 0 ? <li className="text-sm text-secondary-text">No provenance recorded.</li> : null}
            </ol>
          </IntelCard>
        </>
      )}
    </IntelShell>
  );
}
