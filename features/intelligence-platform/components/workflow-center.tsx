"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Plus, ChevronRight, GitBranch, ScrollText, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { workflowProgress } from "@/lib/intelligence-platform";
import { useIntelligenceStore } from "@/store/intelligence-platform-store";
import { useHydrated, usePermission } from "../hooks";
import { relativeTime, workflowStatusVariant } from "../format";
import { IntelShell, IntelCard, StatTile } from "./primitives";
import { StageFlow } from "./stage-flow";
import { ListSkeleton } from "./skeletons";

export function WorkflowCenter() {
  const hydrated = useHydrated();
  const workflows = useIntelligenceStore((s) => s.workflows);
  const createWorkflow = useIntelligenceStore((s) => s.createWorkflow);
  const advanceWorkflow = useIntelligenceStore((s) => s.advanceWorkflow);
  const archiveWorkflow = useIntelligenceStore((s) => s.archiveWorkflow);
  const canManage = usePermission("workflow.manage");
  const canAdvance = usePermission("workflow.advance");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", tags: "" });

  if (!hydrated) return <ListSkeleton />;

  const active = workflows.filter((w) => w.status === "active" || w.status === "blocked");
  const complete = workflows.filter((w) => w.status === "complete");

  function renderWorkflow(w: (typeof workflows)[number]) {
    const progress = workflowProgress(w);
    return (
      <IntelCard key={w.id} title={w.name} description={w.description} action={
        <div className="flex items-center gap-2">
          <Badge variant={workflowStatusVariant(w.status)}>{w.status}</Badge>
          <span className="text-xs text-secondary-text">{progress.pct}%</span>
        </div>
      }>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.max(progress.pct, 3)}%` }} />
        </div>
        <StageFlow workflow={w} />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {w.status === "active" || w.status === "blocked" ? (
            <Button size="sm" disabled={!canAdvance} onClick={() => advanceWorkflow(w.id)}>
              <ChevronRight className="size-4" /> Advance {progress.currentStage ? `(${progress.currentStage})` : ""}
            </Button>
          ) : null}
          <Button asChild size="sm" variant="secondary"><Link href={`/intelligence/lineage?workflow=${w.id}` as Route}><GitBranch className="size-4" /> Lineage</Link></Button>
          <Button asChild size="sm" variant="secondary"><Link href={`/intelligence/provenance?workflow=${w.id}` as Route}><ScrollText className="size-4" /> Provenance</Link></Button>
          {w.status !== "archived" && w.status !== "complete" ? <Button size="sm" variant="ghost" disabled={!canManage} onClick={() => archiveWorkflow(w.id)}><Archive className="size-4" /> Archive</Button> : null}
          <span className="ml-auto text-[11px] text-secondary-text">{w.ownerName} · {relativeTime(w.updatedAt)}</span>
        </div>
      </IntelCard>
    );
  }

  return (
    <IntelShell
      title="Intelligence Workflow Center"
      description="Create and drive continuous Research to Governance workflows. Advance a workflow stage by stage; each stage opens the relevant operating system."
      actions={<Button onClick={() => setOpen(true)} disabled={!canManage}><Plus className="size-4" /> New workflow</Button>}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Active workflows" value={String(active.length)} tone="info" />
        <StatTile label="Complete" value={String(complete.length)} tone="success" />
        <StatTile label="Total" value={String(workflows.length)} tone="neutral" />
      </div>

      {active.length > 0 ? <div className="space-y-4">{active.map(renderWorkflow)}</div> : null}
      {complete.length > 0 ? (
        <>
          <h2 className="text-sm font-semibold text-secondary-text">Completed</h2>
          <div className="space-y-4">{complete.map(renderWorkflow)}</div>
        </>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create intelligence workflow</DialogTitle></DialogHeader>
          <div className="mt-4 space-y-3">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Workflow name" />
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What question does this initiative answer?" />
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags (comma separated)" />
            <p className="text-xs text-secondary-text">A new workflow starts at the Research stage. Advance it to flow through Knowledge, Simulation, Impact, and Governance.</p>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { createWorkflow({ name: form.name || "New workflow", description: form.description, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) }); setForm({ name: "", description: "", tags: "" }); setOpen(false); }}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </IntelShell>
  );
}
