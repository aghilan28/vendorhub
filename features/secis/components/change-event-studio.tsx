"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Plus, Play, Archive, X, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CHANGE_EVENT_TYPES,
  analyzeChange,
  getEventTypeMeta,
  type ChangeEvent,
  type ChangeEventType,
} from "@/lib/secis";
import { useSecisStore } from "@/store/secis-store";
import { useHydrated, usePermission } from "../hooks";
import { EVENT_TYPE_ICON, riskVariant } from "../format";
import { SecisShell, SecisCard, WorkflowBadge } from "./primitives";
import { ListSkeleton } from "./skeletons";

function EventForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const entities = useSecisStore((s) => s.entities);
  const edges = useSecisStore((s) => s.edges);
  const settings = useSecisStore((s) => s.settings);
  const createEvent = useSecisStore((s) => s.createEvent);
  const analyzeEvent = useSecisStore((s) => s.analyzeEvent);
  const canCreate = usePermission("event.create");

  const initialType = (params.get("type") as ChangeEventType) ?? "supplier_failure";
  const [type, setType] = useState<ChangeEventType>(CHANGE_EVENT_TYPES.some((t) => t.type === initialType) ? initialType : "supplier_failure");
  const meta = getEventTypeMeta(type);
  const originOptions = entities.filter((e) => e.status === "active" && (meta.originKinds.length === 0 || meta.originKinds.includes(e.kind)));

  const [name, setName] = useState("");
  const [originEntityId, setOriginEntityId] = useState(originOptions[0]?.id ?? "");
  const [description, setDescription] = useState(meta.description);
  const [horizon, setHorizon] = useState(settings.defaultHorizon);
  const [tags, setTags] = useState("");
  const [paramValues, setParamValues] = useState<Record<string, number | string>>(() => {
    const v: Record<string, number | string> = {};
    for (const p of meta.params) v[p.key] = p.defaultValue;
    return v;
  });

  function applyType(t: ChangeEventType) {
    const m = getEventTypeMeta(t);
    setType(t);
    setDescription(m.description);
    const v: Record<string, number | string> = {};
    for (const p of m.params) v[p.key] = p.defaultValue;
    setParamValues(v);
    const opts = entities.filter((e) => e.status === "active" && (m.originKinds.length === 0 || m.originKinds.includes(e.kind)));
    setOriginEntityId(opts[0]?.id ?? "");
  }

  const magnitude = Math.min(1, Math.max(0, Number(paramValues.magnitude ?? 70) / 100));

  const preview = useMemo(() => {
    const origin = entities.find((e) => e.id === originEntityId);
    if (!origin) return null;
    const draft: ChangeEvent = {
      id: "preview",
      name: name || "Preview",
      type,
      description,
      originEntityId,
      magnitude,
      horizonPeriods: horizon,
      parameters: paramValues,
      tags: [],
      ownerId: "preview",
      ownerName: "preview",
      visibility: "team",
      workflowState: "draft",
      version: 1,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return analyzeChange(draft, entities, edges, { severityThreshold: settings.severityThreshold, maxDepth: settings.maxDepth });
  }, [entities, edges, settings, originEntityId, type, description, name, magnitude, horizon, paramValues]);

  function save(thenAnalyze: boolean) {
    const id = createEvent({
      name: name || `${meta.label} event`,
      type,
      description,
      originEntityId,
      magnitude,
      horizonPeriods: horizon,
      parameters: paramValues,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    if (thenAnalyze) {
      analyzeEvent(id);
      router.push(`/secis/${id}`);
      return;
    }
    onClose();
  }

  return (
    <SecisCard title="Create a change event" description="Pick a change type, choose where it starts, set its magnitude — the preview shows the blast radius instantly." action={<Button variant="ghost" size="sm" onClick={onClose}><X className="size-4" /> Close</Button>}>
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-primary-text">Change type</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CHANGE_EVENT_TYPES.map((t) => {
                const Icon = EVENT_TYPE_ICON[t.type];
                const isSel = t.type === type;
                return (
                  <button key={t.type} type="button" onClick={() => applyType(t.type)} className={`flex items-center gap-2 rounded-md border p-2 text-left text-xs focus-ring ${isSel ? "border-brand bg-emerald-50" : "border-border bg-surface hover:bg-slate-50"}`}>
                    <Icon className="size-4 shrink-0 text-secondary-text" />
                    <span className="font-medium text-primary-text">{t.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-secondary-text">{meta.description}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-primary-text">Event name</label>
              <Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} placeholder={`${meta.label} event`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-text">Horizon (periods)</label>
              <Input className="mt-1.5" type="number" value={horizon} onChange={(e) => setHorizon(Math.max(2, Number(e.target.value)))} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-text">Origin entity</label>
            <Select value={originEntityId} onValueChange={setOriginEntityId}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Where does the change start?" /></SelectTrigger>
              <SelectContent>{originOptions.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-border p-4">
            <p className="mb-3 text-sm font-semibold text-primary-text">Parameters</p>
            <div className="space-y-4">
              {meta.params.map((p) => {
                const val = Number(paramValues[p.key] ?? p.defaultValue);
                const hasRange = typeof p.min === "number" && typeof p.max === "number";
                return (
                  <div key={p.key}>
                    <div className="flex items-center justify-between text-sm">
                      <label className="text-primary-text">{p.label}</label>
                      <span className="text-secondary-text">{val}{p.unit ? ` ${p.unit}` : ""}</span>
                    </div>
                    {hasRange ? (
                      <input type="range" min={p.min} max={p.max} step={p.step} value={val} onChange={(e) => setParamValues((prev) => ({ ...prev, [p.key]: Number(e.target.value) }))} className="mt-1 w-full accent-brand" aria-label={p.label} />
                    ) : (
                      <Input className="mt-1" type="number" value={val} onChange={(e) => setParamValues((prev) => ({ ...prev, [p.key]: Number(e.target.value) }))} />
                    )}
                    <p className="mt-0.5 text-xs text-secondary-text">{p.help}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-text">Description</label>
            <Textarea className="mt-1.5" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma separated)" />
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-slate-50 p-4">
            <p className="text-sm font-semibold text-primary-text">Live blast-radius preview</p>
            {preview ? (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-surface p-2"><p className="text-[11px] text-secondary-text">Affected entities</p><p className="text-lg font-semibold text-primary-text">{preview.propagation.affected.length}</p></div>
                  <div className="rounded-md bg-surface p-2"><p className="text-[11px] text-secondary-text">Affected systems</p><p className="text-lg font-semibold text-primary-text">{preview.propagation.affectedSystemIds.length}</p></div>
                  <div className="rounded-md bg-surface p-2"><p className="text-[11px] text-secondary-text">Revenue at risk</p><p className="text-lg font-semibold text-primary-text">{preview.impact.headlineValue}</p></div>
                  <div className="rounded-md bg-surface p-2"><p className="text-[11px] text-secondary-text">Risk</p><p className="text-lg font-semibold text-primary-text"><Badge variant={riskVariant(preview.risk.level)}>{preview.risk.level} · {preview.risk.score}</Badge></p></div>
                </div>
                <p className="mt-3 text-xs text-secondary-text">{preview.impact.outcomeSummary}</p>
                <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-secondary-text">Top dimensions</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {preview.impact.dimensions.slice(0, 4).map((d) => <Badge key={d.dimension} variant="secondary">{d.label} {d.score}</Badge>)}
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-secondary-text">Select an origin entity to preview.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => save(false)} disabled={!canCreate || !originEntityId}><Plus className="size-4" /> Save event</Button>
            <Button variant="secondary" onClick={() => save(true)} disabled={!canCreate || !originEntityId}><Gauge className="size-4" /> Save &amp; analyze</Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
          {!canCreate ? <p className="text-xs text-danger">Your role cannot create change events. Switch to Analyst or Admin in the header.</p> : null}
        </div>
      </div>
    </SecisCard>
  );
}

export function ChangeEventStudio() {
  const hydrated = useHydrated();
  const router = useRouter();
  const params = useSearchParams();
  const changeEvents = useSecisStore((s) => s.changeEvents);
  const entities = useSecisStore((s) => s.entities);
  const archiveEvent = useSecisStore((s) => s.archiveEvent);
  const analyzeEvent = useSecisStore((s) => s.analyzeEvent);
  const canCreate = usePermission("event.create");
  const [creating, setCreating] = useState(false);

  if (!hydrated) return <ListSkeleton />;

  const showForm = creating || params.get("new") === "1" || Boolean(params.get("type"));
  const entityName = (id: string) => entities.find((e) => e.id === id)?.name ?? id;
  const active = changeEvents.filter((e) => e.status === "active");
  const archived = changeEvents.filter((e) => e.status === "archived");

  function renderCard(e: (typeof changeEvents)[number]) {
    const Icon = EVENT_TYPE_ICON[e.type];
    return (
      <div key={e.id} className="operational-surface flex flex-col rounded-lg p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-md bg-emerald-50 text-brand"><Icon className="size-4" /></span>
            <div className="min-w-0">
              <Link href={`/secis/${e.id}` as Route} className="truncate text-sm font-medium text-primary-text hover:underline">{e.name}</Link>
              <p className="text-xs text-secondary-text">origin: {entityName(e.originEntityId)}</p>
            </div>
          </div>
          <WorkflowBadge state={e.workflowState} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <Badge variant="secondary">magnitude {Math.round(e.magnitude * 100)}%</Badge>
          {e.lastAnalyzedAt ? <Badge variant="ai">analyzed</Badge> : null}
          {e.tags.map((t) => <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-secondary-text">{t}</span>)}
        </div>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
          {e.status === "active" ? (
            <>
              <Button size="sm" onClick={() => { analyzeEvent(e.id); router.push(`/secis/${e.id}`); }}><Gauge className="size-4" /> Analyze</Button>
              <Button size="sm" variant="secondary" onClick={() => router.push(`/secis/evolution?event=${e.id}`)}><Play className="size-4" /> Evolution</Button>
              <Button size="sm" variant="ghost" disabled={!canCreate} onClick={() => archiveEvent(e.id)}><Archive className="size-4" /> Archive</Button>
            </>
          ) : <Badge variant="secondary">Archived</Badge>}
        </div>
      </div>
    );
  }

  return (
    <SecisShell
      title="Change Event Studio"
      description="Author change events visually — supplier failures, demand surges, inventory shocks, price changes, delivery failures, closures, competitor entry, policy changes, or anything custom. No JSON required."
      actions={!showForm ? <Button onClick={() => setCreating(true)} disabled={!canCreate}><Plus className="size-4" /> New change event</Button> : null}
    >
      {showForm ? <EventForm onClose={() => { setCreating(false); router.push("/secis/change-events"); }} /> : null}

      <SecisCard title="Change events" description={`${active.length} active · ${archived.length} archived`}>
        {active.length === 0 ? <p className="text-sm text-secondary-text">No events yet. Create one above.</p> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{active.map(renderCard)}</div>
        )}
      </SecisCard>

      {archived.length > 0 ? (
        <SecisCard title="Archived"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{archived.map(renderCard)}</div></SecisCard>
      ) : null}
    </SecisShell>
  );
}
