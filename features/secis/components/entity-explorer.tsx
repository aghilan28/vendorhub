"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Archive, X, ArrowRight, ArrowLeft, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildAdjacency, influenceProfile, type EdgeCategory, type EdgeType, type EntityKind } from "@/lib/secis";
import { formatCurrencyCompact } from "@/lib/secis";
import { useSecisStore } from "@/store/secis-store";
import { useHydrated, usePermission } from "../hooks";
import { ENTITY_KIND_META } from "../format";
import { SecisShell, SecisCard, StatTile } from "./primitives";
import { ListSkeleton } from "./skeletons";

const KINDS = Object.keys(ENTITY_KIND_META) as EntityKind[];
const EDGE_TYPES: EdgeType[] = ["supplies", "stocks", "fulfils", "delivers_to", "lists_in", "prices", "pays_via", "promotes", "depends_on", "serves"];

interface EntityFormState {
  id?: string;
  name: string;
  kind: EntityKind;
  systemId: string;
  criticality: number;
  vulnerability: number;
  resilience: number;
  monthlyRevenueExposure: number;
  tags: string;
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-primary-text">{label}</span>
        <span className="text-secondary-text">{Math.round(value * 100)}%</span>
      </div>
      <input type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-brand" aria-label={label} />
    </div>
  );
}

export function EntityExplorer() {
  const hydrated = useHydrated();
  const entities = useSecisStore((s) => s.entities);
  const edges = useSecisStore((s) => s.edges);
  const systems = useSecisStore((s) => s.systems);
  const createEntity = useSecisStore((s) => s.createEntity);
  const updateEntity = useSecisStore((s) => s.updateEntity);
  const archiveEntity = useSecisStore((s) => s.archiveEntity);
  const deleteEntity = useSecisStore((s) => s.deleteEntity);
  const createEdge = useSecisStore((s) => s.createEdge);
  const removeEdge = useSecisStore((s) => s.removeEdge);
  const canManage = usePermission("entity.manage");

  const [systemFilter, setSystemFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<EntityFormState | null>(null);
  const [linkTarget, setLinkTarget] = useState("");
  const [linkType, setLinkType] = useState<EdgeType>("depends_on");
  const [linkWeight, setLinkWeight] = useState(0.6);
  const [linkCategory, setLinkCategory] = useState<EdgeCategory>("dependency");

  const adj = useMemo(() => buildAdjacency(edges), [edges]);
  const entityMap = useMemo(() => new Map(entities.map((e) => [e.id, e])), [entities]);

  if (!hydrated) return <ListSkeleton />;

  const active = entities.filter((e) => e.status === "active");
  const filtered = systemFilter === "all" ? active : active.filter((e) => e.systemId === systemFilter);
  const selected = selectedId ? entityMap.get(selectedId) : undefined;

  function openCreate() {
    setForm({ name: "", kind: "supplier", systemId: systems[0]?.id ?? "", criticality: 0.6, vulnerability: 0.5, resilience: 0.5, monthlyRevenueExposure: 500000, tags: "" });
    setFormOpen(true);
  }
  function openEdit(id: string) {
    const e = entityMap.get(id);
    if (!e) return;
    setForm({ id: e.id, name: e.name, kind: e.kind, systemId: e.systemId, criticality: e.criticality, vulnerability: e.vulnerability, resilience: e.resilience, monthlyRevenueExposure: e.monthlyRevenueExposure, tags: e.tags.join(", ") });
    setFormOpen(true);
  }
  function saveForm() {
    if (!form) return;
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    if (form.id) {
      updateEntity(form.id, { name: form.name, kind: form.kind, systemId: form.systemId, criticality: form.criticality, vulnerability: form.vulnerability, resilience: form.resilience, monthlyRevenueExposure: form.monthlyRevenueExposure, tags });
    } else {
      const id = createEntity({ name: form.name || "New entity", kind: form.kind, systemId: form.systemId, criticality: form.criticality, vulnerability: form.vulnerability, resilience: form.resilience, monthlyRevenueExposure: form.monthlyRevenueExposure, tags });
      setSelectedId(id);
    }
    setFormOpen(false);
  }

  const profile = selected ? influenceProfile(selected, adj, active.length) : null;
  const producers = selected ? adj.upstream.get(selected.id) ?? [] : [];
  const dependents = selected ? adj.downstream.get(selected.id) ?? [] : [];

  return (
    <SecisShell
      title="Entity Explorer"
      description="Model the entities in your system graph — suppliers, warehouses, couriers, products, segments — and their dependencies, relationships, influence, and consumers."
      actions={<Button onClick={openCreate} disabled={!canManage}><Plus className="size-4" /> New entity</Button>}
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <SecisCard
          title="Entities"
          description={`${filtered.length} shown`}
          action={
            <Select value={systemFilter} onValueChange={setSystemFilter}>
              <SelectTrigger className="h-9 min-h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All systems</SelectItem>
                {systems.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((e) => {
              const Icon = ENTITY_KIND_META[e.kind].icon;
              const isSel = e.id === selectedId;
              return (
                <button key={e.id} type="button" onClick={() => setSelectedId(e.id)} className={`rounded-lg border p-3 text-left focus-ring ${isSel ? "border-brand bg-emerald-50" : "border-border bg-surface hover:bg-slate-50"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex size-8 items-center justify-center rounded-md bg-slate-100"><Icon className="size-4 text-secondary-text" /></span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-primary-text">{e.name}</p>
                        <p className="text-xs text-secondary-text">{ENTITY_KIND_META[e.kind].label}</p>
                      </div>
                    </div>
                    <Badge variant={e.criticality >= 0.8 ? "danger" : e.criticality >= 0.6 ? "warning" : "secondary"}>crit {Math.round(e.criticality * 100)}</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </SecisCard>

        <div className="space-y-6">
          {selected && profile ? (
            <>
              <SecisCard
                title={selected.name}
                description={ENTITY_KIND_META[selected.kind].label}
                action={
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="secondary" disabled={!canManage} onClick={() => openEdit(selected.id)}>Edit</Button>
                    <Button size="sm" variant="ghost" disabled={!canManage} onClick={() => archiveEntity(selected.id)} aria-label="Archive"><Archive className="size-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-danger" disabled={!canManage} onClick={() => { deleteEntity(selected.id); setSelectedId(null); }} aria-label="Delete"><Trash2 className="size-4" /></Button>
                  </div>
                }
              >
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="Influence score" value={`${profile.influenceScore}/100`} tone="info" />
                  <StatTile label="Revenue exposure" value={formatCurrencyCompact(selected.monthlyRevenueExposure)} tone="warning" />
                  <StatTile label="Influence reach" value={String(profile.influenceReach)} helper="downstream nodes" />
                  <StatTile label="Dependency reach" value={String(profile.dependencyReach)} helper="upstream nodes" />
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  <Badge variant="secondary">vuln {Math.round(selected.vulnerability * 100)}</Badge>
                  <Badge variant="secondary">resilience {Math.round(selected.resilience * 100)}</Badge>
                  {selected.tags.map((t) => <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-secondary-text">{t}</span>)}
                </div>
              </SecisCard>

              <SecisCard title="Producers (upstream)" description="What this entity depends on.">
                {producers.length === 0 ? <p className="text-sm text-secondary-text">No upstream producers.</p> : (
                  <div className="space-y-1.5">
                    {producers.map((edge) => (
                      <div key={edge.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5">
                        <span className="flex min-w-0 items-center gap-1.5 text-sm text-primary-text"><ArrowLeft className="size-3.5 text-secondary-text" /> {entityMap.get(edge.sourceId)?.name ?? edge.sourceId}</span>
                        <span className="flex items-center gap-1.5"><Badge variant="secondary">{edge.type}</Badge><Button size="icon" variant="ghost" className="size-7" disabled={!canManage} onClick={() => removeEdge(edge.id)} aria-label="Remove"><X className="size-3.5" /></Button></span>
                      </div>
                    ))}
                  </div>
                )}
              </SecisCard>

              <SecisCard title="Dependents (downstream)" description="What depends on this entity.">
                {dependents.length === 0 ? <p className="text-sm text-secondary-text">No downstream dependents.</p> : (
                  <div className="space-y-1.5">
                    {dependents.map((edge) => (
                      <div key={edge.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5">
                        <span className="flex min-w-0 items-center gap-1.5 text-sm text-primary-text"><ArrowRight className="size-3.5 text-secondary-text" /> {entityMap.get(edge.targetId)?.name ?? edge.targetId}</span>
                        <span className="flex items-center gap-1.5"><Badge variant="secondary">{edge.type}</Badge><Button size="icon" variant="ghost" className="size-7" disabled={!canManage} onClick={() => removeEdge(edge.id)} aria-label="Remove"><X className="size-3.5" /></Button></span>
                      </div>
                    ))}
                  </div>
                )}
              </SecisCard>

              <SecisCard title="Add dependency / relationship" description="Link this entity to another.">
                <div className="space-y-2">
                  <Select value={linkTarget} onValueChange={setLinkTarget}>
                    <SelectTrigger><SelectValue placeholder="Target entity (downstream)" /></SelectTrigger>
                    <SelectContent>
                      {active.filter((e) => e.id !== selected.id).map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={linkType} onValueChange={(v) => setLinkType(v as EdgeType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{EDGE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={linkCategory} onValueChange={(v) => setLinkCategory(v as EdgeCategory)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="dependency">Dependency</SelectItem><SelectItem value="relationship">Relationship</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <Slider label="Coupling weight" value={linkWeight} onChange={setLinkWeight} />
                  <Button size="sm" disabled={!canManage || !linkTarget} onClick={() => { createEdge(selected.id, linkTarget, linkType, linkWeight, linkCategory); setLinkTarget(""); }}>
                    <Link2 className="size-4" /> Link {selected.name} → target
                  </Button>
                </div>
              </SecisCard>
            </>
          ) : (
            <SecisCard title="Select an entity"><p className="text-sm text-secondary-text">Choose an entity to inspect its influence, producers, dependents, and to add dependencies.</p></SecisCard>
          )}
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit entity" : "Create entity"}</DialogTitle>
            <DialogDescription>Entities are nodes in the dependency graph.</DialogDescription>
          </DialogHeader>
          {form ? (
            <div className="mt-4 space-y-3">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Entity name" />
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as EntityKind })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{ENTITY_KIND_META[k].label}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.systemId} onValueChange={(v) => setForm({ ...form, systemId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{systems.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Slider label="Criticality" value={form.criticality} onChange={(v) => setForm({ ...form, criticality: v })} />
              <Slider label="Vulnerability" value={form.vulnerability} onChange={(v) => setForm({ ...form, vulnerability: v })} />
              <Slider label="Resilience" value={form.resilience} onChange={(v) => setForm({ ...form, resilience: v })} />
              <div>
                <label className="text-sm text-primary-text">Monthly revenue exposure (₹)</label>
                <Input type="number" value={form.monthlyRevenueExposure} onChange={(e) => setForm({ ...form, monthlyRevenueExposure: Number(e.target.value) })} />
              </div>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags (comma separated)" />
            </div>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={saveForm}>{form?.id ? "Save" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </SecisShell>
  );
}
