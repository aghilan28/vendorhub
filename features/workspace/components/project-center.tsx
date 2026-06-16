"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { FolderKanban, Plus, Link2, X, ExternalLink, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useSimulationStore } from "@/store/simulation-store";
import { useSecisStore } from "@/store/secis-store";
import { useGovernanceStore } from "@/store/governance-store";
import { useIntelligenceStore } from "@/store/intelligence-platform-store";
import type { CrossRef, RefSystem } from "@/lib/workspace";
import { useHydrated, usePermission } from "../hooks";
import { SYSTEM_META, projectStatusVariant } from "../format";
import { WorkspaceShell, WSCard, SystemPill } from "./primitives";
import { ListSkeleton } from "./skeletons";

const LINK_SYSTEMS: RefSystem[] = ["simulation", "secis", "governance", "intelligence"];

function useLinkOptions(system: RefSystem): CrossRef[] {
  const sims = useSimulationStore((s) => s.simulations);
  const events = useSecisStore((s) => s.changeEvents);
  const decisions = useGovernanceStore((s) => s.decisions);
  const policies = useGovernanceStore((s) => s.policies);
  const workflows = useIntelligenceStore((s) => s.workflows);
  if (system === "simulation") return sims.map((x) => ({ system, refId: x.id, refRoute: `/simulations/${x.id}`, label: x.name }));
  if (system === "secis") return events.map((x) => ({ system, refId: x.id, refRoute: `/secis/${x.id}`, label: x.name }));
  if (system === "governance") return [...decisions.map((x) => ({ system, refId: x.id, refRoute: `/governance/decisions/${x.id}`, label: `Decision: ${x.title}` })), ...policies.map((x) => ({ system, refId: x.id, refRoute: `/governance/policies/${x.id}`, label: `Policy: ${x.title}` }))];
  if (system === "intelligence") return workflows.map((x) => ({ system, refId: x.id, refRoute: `/intelligence/lineage?workflow=${x.id}`, label: x.name }));
  return [];
}

function AddLinkDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const addProjectLink = useWorkspaceStore((s) => s.addProjectLink);
  const [system, setSystem] = useState<RefSystem>("simulation");
  const [refId, setRefId] = useState("");
  const options = useLinkOptions(system);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Link an item to this project</DialogTitle></DialogHeader>
        <div className="mt-4 space-y-3">
          <Select value={system} onValueChange={(v) => { setSystem(v as RefSystem); setRefId(""); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LINK_SYSTEMS.map((s) => <SelectItem key={s} value={s}>{SYSTEM_META[s].label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={refId} onValueChange={setRefId}>
            <SelectTrigger><SelectValue placeholder="Choose an item" /></SelectTrigger>
            <SelectContent>{options.map((o) => <SelectItem key={o.refId} value={o.refId}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!refId} onClick={() => { const opt = options.find((o) => o.refId === refId); if (opt) addProjectLink(projectId, opt); onClose(); }}><Link2 className="size-4" /> Link</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectCenter() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const projects = useWorkspaceStore((s) => s.projects);
  const tasks = useWorkspaceStore((s) => s.tasks);
  const createProject = useWorkspaceStore((s) => s.createProject);
  const updateProject = useWorkspaceStore((s) => s.updateProject);
  const archiveProject = useWorkspaceStore((s) => s.archiveProject);
  const removeProjectLink = useWorkspaceStore((s) => s.removeProjectLink);
  const canManage = usePermission("project.manage");

  const [selectedId, setSelectedId] = useState<string | null>(params.get("project"));
  const [createOpen, setCreateOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", tags: "" });

  if (!hydrated) return <ListSkeleton />;

  const active = projects.filter((p) => p.status !== "archived");
  const selected = selectedId ? projects.find((p) => p.id === selectedId) : null;

  return (
    <WorkspaceShell
      title="Project Center"
      description="Group an initiative's work across Research, Knowledge, Simulation, SECIS, and Governance into one project — and track progress, status, and outcomes."
      actions={<Button onClick={() => setCreateOpen(true)} disabled={!canManage}><Plus className="size-4" /> New project</Button>}
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_460px]">
        <WSCard title="Projects" description={`${active.length} active`}>
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map((p) => {
              const isSel = p.id === selectedId;
              return (
                <button key={p.id} type="button" onClick={() => setSelectedId(p.id)} className={`rounded-lg border p-3 text-left focus-ring ${isSel ? "border-brand bg-emerald-50" : "border-border bg-surface hover:bg-slate-50"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex size-8 items-center justify-center rounded-md bg-slate-100"><FolderKanban className="size-4 text-secondary-text" /></span>
                    <Badge variant={projectStatusVariant(p.status)}>{p.status}</Badge>
                  </div>
                  <p className="mt-2 truncate text-sm font-medium text-primary-text">{p.name}</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand" style={{ width: `${p.progress}%` }} /></div>
                  <p className="mt-1 text-[11px] text-secondary-text">{p.links.length} links · {p.progress}%</p>
                </button>
              );
            })}
          </div>
        </WSCard>

        <div className="space-y-6">
          {selected ? (
            <>
              <WSCard title={selected.name} description={selected.description} action={
                <div className="flex gap-1.5">
                  <Button size="sm" variant="secondary" disabled={!canManage} onClick={() => setLinkOpen(true)}><Link2 className="size-4" /> Link</Button>
                  {selected.status !== "archived" ? <Button size="sm" variant="ghost" disabled={!canManage} onClick={() => archiveProject(selected.id)} aria-label="Archive"><Archive className="size-4" /></Button> : null}
                </div>
              }>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={projectStatusVariant(selected.status)}>{selected.status}</Badge>
                  <Badge variant="secondary">Owner {selected.ownerName}</Badge>
                  {selected.tags.map((t) => <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-secondary-text">{t}</span>)}
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs"><span className="text-secondary-text">Progress</span><span className="text-primary-text">{selected.progress}%</span></div>
                  <input type="range" min={0} max={100} step={5} value={selected.progress} disabled={!canManage} onChange={(e) => updateProject(selected.id, { progress: Number(e.target.value) })} className="mt-1 w-full accent-brand" aria-label="Project progress" />
                </div>
                <div className="mt-3">
                  <Select value={selected.status} onValueChange={(v) => updateProject(selected.id, { status: v as typeof selected.status })} disabled={!canManage}>
                    <SelectTrigger className="h-9 min-h-9 w-44"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="on_hold">On hold</SelectItem><SelectItem value="complete">Complete</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
                  </Select>
                </div>
              </WSCard>

              <WSCard title="Linked items" description="Cross-system work for this project.">
                {selected.links.length === 0 ? <p className="text-sm text-secondary-text">No links yet. Use Link to connect simulations, change events, decisions, or workflows.</p> : (
                  <div className="space-y-2">
                    {selected.links.map((l) => (
                      <div key={l.refId} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                        <Link href={l.refRoute as Route} className="flex min-w-0 items-center gap-2 text-sm text-primary-text hover:underline"><ExternalLink className="size-3.5 text-secondary-text" /> <span className="truncate">{l.label}</span></Link>
                        <div className="flex items-center gap-1.5">
                          <SystemPill system={l.system} />
                          <Button size="icon" variant="ghost" className="size-7" disabled={!canManage} onClick={() => removeProjectLink(selected.id, l.refId)} aria-label="Remove link"><X className="size-3.5" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </WSCard>

              <WSCard title="Project tasks">
                {tasks.filter((t) => t.projectId === selected.id).length === 0 ? <p className="text-sm text-secondary-text">No tasks linked to this project.</p> : (
                  <div className="space-y-1.5">
                    {tasks.filter((t) => t.projectId === selected.id).map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5">
                        <span className="truncate text-sm text-primary-text">{t.title}</span>
                        <Badge variant={t.status === "done" ? "default" : t.status === "blocked" ? "danger" : "secondary"}>{t.status.replace("_", " ")}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </WSCard>
            </>
          ) : (
            <WSCard title="Select a project"><p className="text-sm text-secondary-text">Choose a project to view its cross-system links, progress, and tasks.</p></WSCard>
          )}
        </div>
      </div>

      {linkOpen && selected ? <AddLinkDialog projectId={selected.id} onClose={() => setLinkOpen(false)} /> : null}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create project</DialogTitle></DialogHeader>
          <div className="mt-4 space-y-3">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Project name" />
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this initiative about?" />
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags (comma separated)" />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => { const id = createProject({ name: form.name || "New project", description: form.description, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) }); setSelectedId(id); setForm({ name: "", description: "", tags: "" }); setCreateOpen(false); }}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </WorkspaceShell>
  );
}
