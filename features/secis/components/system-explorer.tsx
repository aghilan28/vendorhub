"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { analyzeChange } from "@/lib/secis";
import { useSecisStore } from "@/store/secis-store";
import { useHydrated, usePermission } from "../hooks";
import { ENTITY_KIND_META } from "../format";
import { SecisShell, SecisCard, StatTile } from "./primitives";
import { ListSkeleton } from "./skeletons";

export function SystemExplorer() {
  const hydrated = useHydrated();
  const systems = useSecisStore((s) => s.systems);
  const entities = useSecisStore((s) => s.entities);
  const edges = useSecisStore((s) => s.edges);
  const subsystems = useSecisStore((s) => s.subsystems);
  const changeEvents = useSecisStore((s) => s.changeEvents);
  const settings = useSecisStore((s) => s.settings);
  const createSystem = useSecisStore((s) => s.createSystem);
  const updateSystem = useSecisStore((s) => s.updateSystem);
  const canManage = usePermission("system.manage");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<{ id?: string; name: string; description: string; domain: string; criticality: number }>({ name: "", description: "", domain: "", criticality: 0.6 });

  const affectedByEvent = useMemo(() => {
    const map = new Map<string, string[]>(); // systemId → event names
    for (const ev of changeEvents.filter((e) => e.status === "active")) {
      const { propagation } = analyzeChange(ev, entities, edges, { severityThreshold: settings.severityThreshold, maxDepth: settings.maxDepth });
      for (const sysId of propagation.affectedSystemIds) {
        if (!map.has(sysId)) map.set(sysId, []);
        map.get(sysId)!.push(ev.name);
      }
    }
    return map;
  }, [changeEvents, entities, edges, settings]);

  if (!hydrated) return <ListSkeleton />;

  const active = systems.filter((s) => s.status === "active");
  const selected = selectedId ? systems.find((s) => s.id === selectedId) : undefined;
  const systemEntities = selected ? entities.filter((e) => e.systemId === selected.id && e.status === "active") : [];
  const entityIds = new Set(systemEntities.map((e) => e.id));
  const internalEdges = selected ? edges.filter((e) => entityIds.has(e.sourceId) && entityIds.has(e.targetId)) : [];
  const inboundEdges = selected ? edges.filter((e) => !entityIds.has(e.sourceId) && entityIds.has(e.targetId)) : [];
  const outboundEdges = selected ? edges.filter((e) => entityIds.has(e.sourceId) && !entityIds.has(e.targetId)) : [];
  const sysSubsystems = selected ? subsystems.filter((s) => s.systemId === selected.id) : [];

  function openCreate() {
    setForm({ name: "", description: "", domain: "", criticality: 0.6 });
    setFormOpen(true);
  }
  function openEdit(id: string) {
    const s = systems.find((x) => x.id === id);
    if (!s) return;
    setForm({ id: s.id, name: s.name, description: s.description, domain: s.domain, criticality: s.criticality });
    setFormOpen(true);
  }
  function save() {
    if (form.id) updateSystem(form.id, { name: form.name, description: form.description, domain: form.domain, criticality: form.criticality });
    else {
      const id = createSystem({ name: form.name || "New system", description: form.description, domain: form.domain || "General", criticality: form.criticality });
      setSelectedId(id);
    }
    setFormOpen(false);
  }

  return (
    <SecisShell
      title="System Explorer"
      description="Map systems and their components, inspect structure and topology, and see how change events ripple through each system."
      actions={<Button onClick={openCreate} disabled={!canManage}><Plus className="size-4" /> New system</Button>}
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_460px]">
        <SecisCard title="Systems" description={`${active.length} systems`}>
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map((s) => {
              const count = entities.filter((e) => e.systemId === s.id && e.status === "active").length;
              const isSel = s.id === selectedId;
              return (
                <button key={s.id} type="button" onClick={() => setSelectedId(s.id)} className={`rounded-lg border p-3 text-left focus-ring ${isSel ? "border-brand bg-emerald-50" : "border-border bg-surface hover:bg-slate-50"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 items-center justify-center rounded-md bg-slate-100"><Layers className="size-4 text-secondary-text" /></span>
                      <p className="text-sm font-medium text-primary-text">{s.name}</p>
                    </div>
                    <Badge variant={s.criticality >= 0.8 ? "danger" : s.criticality >= 0.6 ? "warning" : "secondary"}>crit {Math.round(s.criticality * 100)}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-secondary-text">{count} components · {s.domain}</p>
                </button>
              );
            })}
          </div>
        </SecisCard>

        <div className="space-y-6">
          {selected ? (
            <>
              <SecisCard title={selected.name} description={selected.description} action={<Button size="sm" variant="secondary" disabled={!canManage} onClick={() => openEdit(selected.id)}>Edit</Button>}>
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="Components" value={String(systemEntities.length)} tone="info" />
                  <StatTile label="Internal links" value={String(internalEdges.length)} />
                  <StatTile label="Inbound deps" value={String(inboundEdges.length)} tone="warning" />
                  <StatTile label="Outbound deps" value={String(outboundEdges.length)} />
                </div>
              </SecisCard>

              <SecisCard title="Structure" description="Components, grouped by subsystem.">
                {sysSubsystems.length > 0 ? (
                  <div className="space-y-3">
                    {sysSubsystems.map((sub) => (
                      <div key={sub.id}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-secondary-text">{sub.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {systemEntities.filter((e) => e.subsystemId === sub.id).map((e) => <Badge key={e.id} variant="secondary">{e.name}</Badge>)}
                        </div>
                      </div>
                    ))}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-secondary-text">Other</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {systemEntities.filter((e) => !e.subsystemId).map((e) => <Badge key={e.id} variant="secondary">{e.name}</Badge>)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {systemEntities.map((e) => {
                      const Icon = ENTITY_KIND_META[e.kind].icon;
                      return <span key={e.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-1 text-xs text-primary-text"><Icon className="size-3 text-secondary-text" /> {e.name}</span>;
                    })}
                    {systemEntities.length === 0 ? <p className="text-sm text-secondary-text">No components yet.</p> : null}
                  </div>
                )}
              </SecisCard>

              <SecisCard title="Evolution exposure" description="Change events that reach this system.">
                {(affectedByEvent.get(selected.id) ?? []).length === 0 ? (
                  <p className="text-sm text-secondary-text">No active change events reach this system.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {[...new Set(affectedByEvent.get(selected.id) ?? [])].map((name) => <Badge key={name} variant="warning">{name}</Badge>)}
                  </div>
                )}
                <div className="mt-3">
                  <Link href={"/secis/dependencies" as Route} className="text-xs font-medium text-ai hover:underline">View full dependency graph →</Link>
                </div>
              </SecisCard>
            </>
          ) : (
            <SecisCard title="Select a system"><p className="text-sm text-secondary-text">Choose a system to inspect its structure, topology, and change-event exposure.</p></SecisCard>
          )}
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit system" : "Create system"}</DialogTitle>
            <DialogDescription>Systems group entities into a domain.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="System name" />
            <Input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="Domain (e.g. Supply)" />
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" />
            <div>
              <div className="flex items-center justify-between text-sm"><span className="text-primary-text">Criticality</span><span className="text-secondary-text">{Math.round(form.criticality * 100)}%</span></div>
              <input type="range" min={0} max={1} step={0.05} value={form.criticality} onChange={(e) => setForm({ ...form, criticality: Number(e.target.value) })} className="mt-1 w-full accent-brand" aria-label="Criticality" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={save}>{form.id ? "Save" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </SecisShell>
  );
}
