"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Gavel, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DECISION_TYPE_META, SOURCE_SYSTEMS, SOURCE_SYSTEM_META, type DecisionType, type SourceSystem } from "@/lib/governance-os";
import { useGovernanceStore } from "@/store/governance-store";
import { useHydrated, usePermission } from "../hooks";
import { relativeTime } from "../format";
import { GovShell, GovCard, DecisionStatusBadge } from "./primitives";
import { ListSkeleton } from "./skeletons";

function DecisionForm({ onSaved, onCancel }: { onSaved: (id: string) => void; onCancel: () => void }) {
  const params = useSearchParams();
  const users = useGovernanceStore((s) => s.users);
  const policies = useGovernanceStore((s) => s.policies.filter((p) => p.status === "published"));
  const createDecision = useGovernanceStore((s) => s.createDecision);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<DecisionType>("operational");
  const [sourceSystem, setSourceSystem] = useState<SourceSystem>((params.get("source") as SourceSystem) ?? "internal");
  const [sourceRef, setSourceRef] = useState("");
  const [accountableId, setAccountableId] = useState(users[0]?.id ?? "");
  const [impact, setImpact] = useState<"low" | "medium" | "high">("medium");
  const [reviewerIds, setReviewerIds] = useState<string[]>([]);
  const [approverIds, setApproverIds] = useState<string[]>([]);
  const [relatedPolicyIds, setRelatedPolicyIds] = useState<string[]>([]);

  function toggle(list: string[], v: string, set: (l: string[]) => void) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  return (
    <div className="space-y-4">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Decision title" />
      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is being decided and why?" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-primary-text">Type</label>
          <Select value={type} onValueChange={(v) => setType(v as DecisionType)}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(DECISION_TYPE_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-primary-text">Source system</label>
          <Select value={sourceSystem} onValueChange={(v) => setSourceSystem(v as SourceSystem)}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>{SOURCE_SYSTEMS.map((s) => <SelectItem key={s} value={s}>{SOURCE_SYSTEM_META[s].label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-primary-text">Source reference (optional)</label>
          <Input className="mt-1.5" value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} placeholder="e.g. secis:ce-supplier" />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary-text">Impact</label>
          <Select value={impact} onValueChange={(v) => setImpact(v as "low" | "medium" | "high")}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-primary-text">Accountable</label>
          <Select value={accountableId} onValueChange={setAccountableId}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-primary-text">Reviewers</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">{users.map((u) => <button key={u.id} type="button" onClick={() => toggle(reviewerIds, u.id, setReviewerIds)} className={`min-h-8 rounded-full border px-2.5 text-xs focus-ring ${reviewerIds.includes(u.id) ? "border-ai bg-blue-50 text-ai" : "border-border text-secondary-text hover:bg-slate-50"}`}>{u.name}</button>)}</div>
      </div>
      <div>
        <p className="text-sm font-medium text-primary-text">Approvers</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">{users.map((u) => <button key={u.id} type="button" onClick={() => toggle(approverIds, u.id, setApproverIds)} className={`min-h-8 rounded-full border px-2.5 text-xs focus-ring ${approverIds.includes(u.id) ? "border-brand bg-emerald-50 text-brand" : "border-border text-secondary-text hover:bg-slate-50"}`}>{u.name}</button>)}</div>
      </div>
      {policies.length > 0 ? (
        <div>
          <p className="text-sm font-medium text-primary-text">Related policies</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{policies.map((p) => <button key={p.id} type="button" onClick={() => toggle(relatedPolicyIds, p.id, setRelatedPolicyIds)} className={`min-h-8 rounded-full border px-2.5 text-xs focus-ring ${relatedPolicyIds.includes(p.id) ? "border-brand bg-emerald-50 text-brand" : "border-border text-secondary-text hover:bg-slate-50"}`}>{p.title}</button>)}</div>
        </div>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSaved(createDecision({ title: title || "Untitled decision", description, type, sourceSystem, sourceRef: sourceRef || undefined, accountableId, impact, reviewerIds, approverIds, relatedPolicyIds }))}>Create decision</Button>
      </div>
    </div>
  );
}

export function DecisionCenter() {
  const hydrated = useHydrated();
  const router = useRouter();
  const params = useSearchParams();
  const decisions = useGovernanceStore((s) => s.decisions);
  const canCreate = usePermission("decision.create");
  const [open, setOpen] = useState(params.get("new") === "1" || Boolean(params.get("source")));
  const [statusFilter, setStatusFilter] = useState("all");

  if (!hydrated) return <ListSkeleton />;
  const filtered = statusFilter === "all" ? decisions : decisions.filter((d) => d.status === statusFilter);

  return (
    <GovShell
      title="Decision Center"
      description="Create, review, approve, reject, and escalate decisions — with clear ownership, accountability, and outcomes — sourced from across the operating systems."
      actions={<Button onClick={() => setOpen(true)} disabled={!canCreate}><Plus className="size-4" /> New decision</Button>}
    >
      <GovCard title="Decisions" description={`${filtered.length} shown`} action={
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 min-h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="review">Review</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem><SelectItem value="exception">Exception</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
        </Select>
      }>
        {filtered.length === 0 ? <p className="text-sm text-secondary-text">No decisions match.</p> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((d) => (
              <Link key={d.id} href={`/governance/decisions/${d.id}` as Route} className="operational-surface flex flex-col rounded-lg p-4 focus-ring hover:bg-slate-50">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex size-9 items-center justify-center rounded-md bg-emerald-50 text-brand"><Gavel className="size-4" /></span>
                  <DecisionStatusBadge status={d.status} />
                </div>
                <p className="mt-3 font-medium text-primary-text">{d.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-secondary-text">{d.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="secondary">{DECISION_TYPE_META[d.type].label}</Badge>
                  <Badge variant="ai">{SOURCE_SYSTEM_META[d.sourceSystem].label}</Badge>
                  <Badge variant={d.impact === "high" ? "danger" : d.impact === "medium" ? "warning" : "secondary"}>{d.impact} impact</Badge>
                </div>
                <p className="mt-auto pt-3 text-[11px] text-secondary-text">Owner {d.ownerName} · accountable {d.accountableName} · {relativeTime(d.updatedAt)}</p>
              </Link>
            ))}
          </div>
        )}
      </GovCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Create decision</DialogTitle></DialogHeader>
          <div className="mt-2"><DecisionForm onSaved={(id) => { setOpen(false); router.push(`/governance/decisions/${id}`); }} onCancel={() => setOpen(false)} /></div>
        </DialogContent>
      </Dialog>
    </GovShell>
  );
}
