"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Activity, Play, Pause, Square, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/feedback/empty-state";
import { INTERVENTIONS, formatCurrencyCompact, interventionsFor, type EvolutionResult } from "@/lib/secis";
import { useSecisStore } from "@/store/secis-store";
import { useHydrated, usePermission } from "../hooks";
import { relativeTime } from "../format";
import { SecisShell, SecisCard, RunStatusBadge } from "./primitives";
import { SecisLineChart } from "./charts";
import { DetailSkeleton } from "./skeletons";

function ResultView({ result }: { result: EvolutionResult }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-primary-text">{result.outcomeSummary}</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {result.kpis.map((k) => (
          <div key={k.key} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-secondary-text">{k.label}</p>
              <Badge variant={k.tone === "success" ? "default" : k.tone === "danger" ? "danger" : k.tone === "warning" ? "warning" : k.tone === "info" ? "ai" : "secondary"}>{k.tone === "success" ? "good" : k.tone === "danger" ? "watch" : "info"}</Badge>
            </div>
            <p className="mt-1 text-lg font-semibold text-primary-text">{k.display}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-primary-text">Recovery comparison</p>
        <SecisLineChart
          series={[
            { key: "intv", label: "Health (with interventions)", color: "brand", points: result.interventionSeries },
            { key: "base", label: "Health (no action)", color: "neutral", points: result.baselineSeries },
            { key: "sev", label: "Shock severity", color: "danger", points: result.severitySeries.map((p) => ({ x: p.x, y: p.y * 100 })) },
          ]}
          yFormatter={(v) => v.toFixed(0)}
        />
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-primary-text">Evolution timeline</p>
        <div className="space-y-1.5">
          {result.evolutionEvents.map((e, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm">
              <Badge variant={e.kind === "shock" ? "danger" : e.kind === "intervention" ? "ai" : e.kind === "recovery" ? "default" : "secondary"}>P{e.period}</Badge>
              <span className="text-primary-text">{e.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EvolutionStudio() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const changeEvents = useSecisStore((s) => s.changeEvents);
  const runs = useSecisStore((s) => s.evolutionRuns);
  const startEvolutionRun = useSecisStore((s) => s.startEvolutionRun);
  const pauseRun = useSecisStore((s) => s.pauseRun);
  const resumeRun = useSecisStore((s) => s.resumeRun);
  const cancelRun = useSecisStore((s) => s.cancelRun);
  const createScenario = useSecisStore((s) => s.createScenario);
  const canRun = usePermission("event.run");

  const active = changeEvents.filter((e) => e.status === "active");
  const [eventId, setEventId] = useState(params.get("event") ?? active[0]?.id ?? "");
  const [selectedInterventions, setSelectedInterventions] = useState<string[]>([]);
  const [runName, setRunName] = useState("");
  const [viewRunId, setViewRunId] = useState<string | null>(null);

  useEffect(() => {
    const q = params.get("event");
    if (q) setEventId(q);
  }, [params]);

  const event = active.find((e) => e.id === eventId);
  const recommended = useMemo(() => (event ? interventionsFor(event.type) : []), [event]);
  const eventRuns = runs.filter((r) => r.changeEventId === eventId);
  const liveRuns = eventRuns.filter((r) => r.status === "running" || r.status === "paused");
  const completed = eventRuns.filter((r) => r.status === "completed" && r.result);
  const viewing = (viewRunId ? eventRuns.find((r) => r.id === viewRunId) : completed[0]) ?? completed[0];

  if (!hydrated) return <DetailSkeleton />;

  if (active.length === 0) {
    return (
      <SecisShell title="Evolution Studio" description="Simulate how systems recover from change, compare interventions, and analyse resilience.">
        <EmptyState icon={Activity} title="No change events" description="Create a change event first, then run an evolution analysis here." />
      </SecisShell>
    );
  }

  function toggle(id: string) {
    setSelectedInterventions((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <SecisShell
      title="Evolution Studio"
      description="Run evolution analysis to see how the system adapts and recovers, compare interventions and recovery paths, and select the best resilience strategy."
      actions={
        <Select value={eventId} onValueChange={setEventId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select change event" /></SelectTrigger>
          <SelectContent>{active.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
        </Select>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-6">
          <SecisCard title="Interventions" description="Select interventions to apply, then run the evolution.">
            <div className="space-y-2">
              {INTERVENTIONS.map((i) => {
                const isRec = recommended.some((r) => r.id === i.id);
                const checked = selectedInterventions.includes(i.id);
                return (
                  <button key={i.id} type="button" onClick={() => toggle(i.id)} className={`w-full rounded-md border p-2.5 text-left focus-ring ${checked ? "border-brand bg-emerald-50" : "border-border bg-surface hover:bg-slate-50"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-primary-text">{i.name}</p>
                      {isRec ? <Badge variant="ai">recommended</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-xs text-secondary-text">−{Math.round(i.severityReduction * 100)}% severity · +{Math.round(i.recoveryBoost * 100)}% recovery · {formatCurrencyCompact(i.cost)}</p>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 space-y-2">
              <Input value={runName} onChange={(e) => setRunName(e.target.value)} placeholder="Run name (optional)" />
              <div className="flex gap-2">
                <Button className="flex-1" disabled={!canRun || !eventId} onClick={() => startEvolutionRun(eventId, selectedInterventions, runName || `${event?.name} · ${selectedInterventions.length} interventions`)}>
                  <Play className="size-4" /> Run evolution
                </Button>
                <Button variant="secondary" disabled={!eventId} onClick={() => { if (event) createScenario({ name: runName || `${event.name} scenario`, description: `${selectedInterventions.length} interventions`, changeEventId: eventId, interventionIds: selectedInterventions }); }}>
                  <Save className="size-4" /> Save scenario
                </Button>
              </div>
              {!canRun ? <p className="text-xs text-danger">Your role cannot run evolutions.</p> : null}
            </div>
          </SecisCard>

          {liveRuns.length > 0 ? (
            <SecisCard title="Live runs">
              <div className="space-y-3">
                {liveRuns.map((r) => (
                  <div key={r.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-medium text-primary-text">{r.name}</p><RunStatusBadge status={r.status} /></div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.max(2, r.progress)}%` }} /></div>
                      <span className="w-10 text-right text-xs font-semibold text-primary-text">{Math.round(r.progress)}%</span>
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      {r.status === "running" ? <Button size="sm" variant="secondary" onClick={() => pauseRun(r.id)}><Pause className="size-4" /></Button> : <Button size="sm" onClick={() => resumeRun(r.id)}><Play className="size-4" /></Button>}
                      <Button size="sm" variant="destructive" onClick={() => cancelRun(r.id)}><Square className="size-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </SecisCard>
          ) : null}

          {completed.length > 0 ? (
            <SecisCard title="Completed runs" description="Select a run to view its result.">
              <div className="space-y-1.5">
                {completed.map((r) => (
                  <button key={r.id} type="button" onClick={() => setViewRunId(r.id)} className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left focus-ring ${(viewing?.id === r.id) ? "border-brand bg-emerald-50" : "border-border hover:bg-slate-50"}`}>
                    <div className="min-w-0"><p className="truncate text-sm font-medium text-primary-text">{r.name}</p><p className="text-xs text-secondary-text">{relativeTime(r.startedAt)} · {r.interventionIds.length} interventions</p></div>
                    <Badge variant="ai">{r.result?.resilienceScore ?? 0}</Badge>
                  </button>
                ))}
              </div>
            </SecisCard>
          ) : null}
        </div>

        <SecisCard title="Evolution result" description={viewing ? viewing.name : "Run an evolution to see recovery analysis."}>
          {viewing?.result ? <ResultView result={viewing.result} /> : (
            <div className="py-8 text-center text-sm text-secondary-text">No completed run yet. Select interventions and run an evolution — it will progress live and appear here.</div>
          )}
        </SecisCard>
      </div>
    </SecisShell>
  );
}
