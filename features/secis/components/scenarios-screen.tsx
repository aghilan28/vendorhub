"use client";

import { useRouter } from "next/navigation";
import { GitBranch, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { getIntervention } from "@/lib/secis";
import { useSecisStore } from "@/store/secis-store";
import { useHydrated, usePermission } from "../hooks";
import { relativeTime } from "../format";
import { SecisShell } from "./primitives";
import { ListSkeleton } from "./skeletons";

export function ScenariosScreen() {
  const hydrated = useHydrated();
  const router = useRouter();
  const scenarios = useSecisStore((s) => s.scenarios);
  const changeEvents = useSecisStore((s) => s.changeEvents);
  const startEvolutionRun = useSecisStore((s) => s.startEvolutionRun);
  const deleteScenario = useSecisStore((s) => s.deleteScenario);
  const canRun = usePermission("event.run");

  if (!hydrated) return <ListSkeleton />;

  const eventName = (id: string) => changeEvents.find((e) => e.id === id)?.name ?? "event";

  return (
    <SecisShell title="Scenarios" description="Saved combinations of a change event and a set of interventions. Run a scenario to evaluate its recovery path, or compare scenarios in the Comparison Engine.">
      {scenarios.length === 0 ? (
        <EmptyState icon={GitBranch} title="No scenarios yet" description="Save a scenario from the Evolution Studio after selecting interventions for a change event." action={<Button onClick={() => router.push("/secis/evolution")}>Open Evolution Studio</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {scenarios.map((sc) => (
            <div key={sc.id} className="operational-surface flex flex-col rounded-lg p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-primary-text">{sc.name}</p>
                  <p className="text-xs text-secondary-text">{eventName(sc.changeEventId)} · {relativeTime(sc.createdAt)}</p>
                </div>
                <Badge variant="ai">{sc.interventionIds.length} interventions</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {sc.interventionIds.length === 0 ? <Badge variant="secondary">baseline</Badge> : sc.interventionIds.map((id) => <span key={id} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-secondary-text">{getIntervention(id)?.name ?? id}</span>)}
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-secondary-text">{sc.description}</p>
              <div className="mt-auto flex gap-1.5 pt-3">
                <Button size="sm" disabled={!canRun} onClick={() => { startEvolutionRun(sc.changeEventId, sc.interventionIds, sc.name, sc.id); router.push(`/secis/evolution?event=${sc.changeEventId}`); }}><Play className="size-4" /> Run</Button>
                <Button size="sm" variant="ghost" className="text-danger" onClick={() => deleteScenario(sc.id)} aria-label="Delete"><Trash2 className="size-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SecisShell>
  );
}
