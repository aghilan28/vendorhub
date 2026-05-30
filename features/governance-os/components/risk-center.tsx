"use client";

import { useState } from "react";
import { ShieldAlert, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RISK_CATEGORIES, type Likelihood, type RiskStatus, type Severity } from "@/lib/governance-os";
import { useGovernanceStore } from "@/store/governance-store";
import { useHydrated, usePermission } from "../hooks";
import { relativeTime, riskScoreVariant, severityVariant } from "../format";
import { GovShell, GovCard, StatTile } from "./primitives";
import { HBars } from "./charts";
import { ListSkeleton } from "./skeletons";

export function RiskCenter() {
  const hydrated = useHydrated();
  const risks = useGovernanceStore((s) => s.risks);
  const createRisk = useGovernanceStore((s) => s.createRisk);
  const setRiskStatus = useGovernanceStore((s) => s.setRiskStatus);
  const assignMitigation = useGovernanceStore((s) => s.assignMitigation);
  const canManage = usePermission("risk.manage");

  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [mitigateFor, setMitigateFor] = useState<string | null>(null);
  const [mitigationText, setMitigationText] = useState("");
  const [form, setForm] = useState({ title: "", description: "", category: RISK_CATEGORIES[0], severity: "medium" as Severity, likelihood: "possible" as Likelihood });

  if (!hydrated) return <ListSkeleton />;

  const filtered = statusFilter === "all" ? risks : risks.filter((r) => r.status === statusFilter);
  const bySeverity = (["critical", "high", "medium", "low"] as const).map((sev) => ({ label: sev, value: risks.filter((r) => r.severity === sev).length, display: String(risks.filter((r) => r.severity === sev).length), tone: (sev === "critical" || sev === "high" ? "danger" : sev === "medium" ? "warning" : "brand") as "danger" | "warning" | "brand" }));
  const byStatus = (["open", "mitigating", "resolved", "accepted"] as const).map((st) => ({ label: st, value: risks.filter((r) => r.status === st).length, display: String(risks.filter((r) => r.status === st).length), tone: "ai" as const }));

  return (
    <GovShell
      title="Risk Governance Center"
      description="The governance risk registry: classify, score, own, mitigate, and track risks over time."
      actions={<Button onClick={() => setOpen(true)} disabled={!canManage}><Plus className="size-4" /> Register risk</Button>}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total risks" value={String(risks.length)} icon={ShieldAlert} tone="info" />
        <StatTile label="Open" value={String(risks.filter((r) => r.status === "open").length)} tone="warning" />
        <StatTile label="Critical" value={String(risks.filter((r) => r.severity === "critical").length)} tone="danger" />
        <StatTile label="Resolved" value={String(risks.filter((r) => r.status === "resolved").length)} tone="success" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <GovCard title="By severity"><HBars rows={bySeverity} /></GovCard>
        <GovCard title="By status"><HBars rows={byStatus} /></GovCard>
      </div>

      <GovCard title="Risk registry" description={`${filtered.length} risks`} action={
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 min-h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="mitigating">Mitigating</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="accepted">Accepted</SelectItem></SelectContent>
        </Select>
      }>
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary-text">{r.title}</p>
                  <p className="mt-0.5 text-xs text-secondary-text">{r.description}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <Badge variant="secondary">{r.category}</Badge>
                  <Badge variant={severityVariant(r.severity)}>{r.severity}</Badge>
                  <Badge variant={riskScoreVariant(r.score)}>score {r.score}</Badge>
                  <Badge variant="secondary">{r.status}</Badge>
                </div>
              </div>
              <p className="mt-2 text-xs text-secondary-text">Owner {r.ownerName} · likelihood {r.likelihood} · {relativeTime(r.updatedAt)}</p>
              {r.mitigationPlan ? <p className="mt-1 text-xs text-primary-text"><span className="text-secondary-text">Mitigation:</span> {r.mitigationPlan}</p> : <p className="mt-1 text-xs text-warning">No mitigation plan</p>}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Button size="sm" variant="secondary" disabled={!canManage} onClick={() => { setMitigateFor(r.id); setMitigationText(r.mitigationPlan); }}>Assign mitigation</Button>
                <Select value={r.status} onValueChange={(v) => setRiskStatus(r.id, v as RiskStatus, `Status set to ${v}`)}>
                  <SelectTrigger className="h-9 min-h-9 w-36" disabled={!canManage}><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="mitigating">Mitigating</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="accepted">Accepted</SelectItem></SelectContent>
                </Select>
              </div>
              {r.history.length > 0 ? <p className="mt-2 text-[11px] text-secondary-text">Latest: {r.history[0].note} ({r.history[0].actorName})</p> : null}
            </div>
          ))}
          {filtered.length === 0 ? <p className="text-sm text-secondary-text">No risks match.</p> : null}
        </div>
      </GovCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Register a risk</DialogTitle></DialogHeader>
          <div className="mt-4 space-y-3">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Risk title" />
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" />
            <div className="grid grid-cols-3 gap-2">
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RISK_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v as Severity })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
              </Select>
              <Select value={form.likelihood} onValueChange={(v) => setForm({ ...form, likelihood: v as Likelihood })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="rare">Rare</SelectItem><SelectItem value="unlikely">Unlikely</SelectItem><SelectItem value="possible">Possible</SelectItem><SelectItem value="likely">Likely</SelectItem><SelectItem value="almost_certain">Almost certain</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { createRisk({ title: form.title || "Untitled risk", description: form.description, category: form.category, severity: form.severity, likelihood: form.likelihood }); setOpen(false); setForm({ title: "", description: "", category: RISK_CATEGORIES[0], severity: "medium", likelihood: "possible" }); }}>Register</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(mitigateFor)} onOpenChange={(o) => !o && setMitigateFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign mitigation</DialogTitle><DialogDescription>Document the plan to reduce this risk.</DialogDescription></DialogHeader>
          <Textarea className="mt-4" value={mitigationText} onChange={(e) => setMitigationText(e.target.value)} placeholder="Mitigation plan" />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMitigateFor(null)}>Cancel</Button>
            <Button onClick={() => { if (mitigateFor) assignMitigation(mitigateFor, mitigationText); setMitigateFor(null); }}>Save plan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </GovShell>
  );
}
