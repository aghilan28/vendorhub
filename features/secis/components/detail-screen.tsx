"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Gauge, Gavel, Wrench, Network, ShieldAlert, Waypoints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/feedback/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  INTERVENTIONS,
  WORKFLOW_TRANSITIONS,
  formatCurrency,
  formatCurrencyCompact,
  interventionsFor,
  type DecisionOutcome,
  type WorkflowState,
} from "@/lib/secis";
import { useSecisStore } from "@/store/secis-store";
import { useChangeAnalysis, useHydrated, usePermission } from "../hooks";
import { EVENT_TYPE_ICON, WORKFLOW_META, relativeTime, riskVariant } from "../format";
import { SecisShell, SecisCard, StatTile, WorkflowBadge, RiskBadge } from "./primitives";
import { PropagationGraph } from "./propagation-graph";
import { SecisLineChart } from "./charts";
import { DimensionGrid, RiskFactors, AffectedTable, PathsList } from "./impact-view";
import { DetailSkeleton } from "./skeletons";

export function SecisChangeDetail({ eventId }: { eventId: string }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const analysis = useChangeAnalysis(eventId);
  const entities = useSecisStore((s) => s.entities);
  const recommendations = useSecisStore((s) => s.recommendations.filter((r) => r.changeEventId === eventId));
  const decisions = useSecisStore((s) => s.decisions.filter((d) => d.changeEventId === eventId));
  const mitigations = useSecisStore((s) => s.mitigations.filter((m) => m.changeEventId === eventId));
  const analyzeEvent = useSecisStore((s) => s.analyzeEvent);
  const transitionWorkflow = useSecisStore((s) => s.transitionWorkflow);
  const recordApproval = useSecisStore((s) => s.recordApproval);
  const acceptRecommendation = useSecisStore((s) => s.acceptRecommendation);
  const applyMitigation = useSecisStore((s) => s.applyMitigation);
  const recordDecision = useSecisStore((s) => s.recordDecision);
  const canRun = usePermission("event.run");
  const canDecide = usePermission("decision.record");
  const canMitigate = usePermission("mitigation.apply");
  const canApprove = usePermission("approval.record");

  const [selectedNode, setSelectedNode] = useState<string | undefined>(undefined);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [mitigationOpen, setMitigationOpen] = useState(false);
  const [decisionTitle, setDecisionTitle] = useState("");
  const [decisionOutcome, setDecisionOutcome] = useState<DecisionOutcome>("adopt");
  const [decisionImpact, setDecisionImpact] = useState<"low" | "medium" | "high">("medium");
  const [decisionRationale, setDecisionRationale] = useState("");
  const [mitigationId, setMitigationId] = useState("");
  const [mitigationNote, setMitigationNote] = useState("");

  if (!hydrated) return <DetailSkeleton />;

  if (!analysis) {
    return (
      <SecisShell title="Change event" description="Detailed propagation and impact analysis.">
        <EmptyState icon={Network} title="Event not found" description="This change event may have been removed." />
      </SecisShell>
    );
  }

  const { event, propagation, impact, risk } = analysis;
  const Icon = EVENT_TYPE_ICON[event.type];
  const originName = entities.find((e) => e.id === event.originEntityId)?.name ?? event.originEntityId;
  const selected = selectedNode ? propagation.affected.find((a) => a.entityId === selectedNode) : undefined;
  const mitigationOptions = [...interventionsFor(event.type), ...INTERVENTIONS.filter((i) => !interventionsFor(event.type).some((x) => x.id === i.id))];

  return (
    <SecisShell
      title={event.name}
      description={event.description}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" disabled={!canRun} onClick={() => analyzeEvent(event.id)}><Gauge className="size-4" /> Re-analyze</Button>
          <Button size="sm" variant="secondary" onClick={() => router.push(`/secis/evolution?event=${event.id}`)}><Activity className="size-4" /> Run evolution</Button>
          <Button size="sm" disabled={!canDecide} onClick={() => { setDecisionTitle(`Decision on ${event.name}`); setDecisionOpen(true); }}><Gavel className="size-4" /> Decision</Button>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="ai"><Icon className="size-3" /> {event.type.replace(/_/g, " ")}</Badge>
        <WorkflowBadge state={event.workflowState} />
        <RiskBadge level={risk.level} score={risk.score} />
        <Badge variant="secondary">origin: {originName}</Badge>
        <Badge variant="secondary">magnitude {Math.round(event.magnitude * 100)}%</Badge>
      </div>

      <SecisCard title="Workflow" description="Advance this change event through its governed lifecycle.">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-secondary-text">Current:</span>
          <WorkflowBadge state={event.workflowState} />
          <span className="mx-1 text-secondary-text">→</span>
          {WORKFLOW_TRANSITIONS[event.workflowState].map((next) => (
            <Button key={next} size="sm" variant="secondary" disabled={!canRun} onClick={() => transitionWorkflow(event.id, next as WorkflowState)}>{WORKFLOW_META[next].label}</Button>
          ))}
          {event.workflowState === "review" ? (
            <Button size="sm" disabled={!canApprove} onClick={() => recordApproval(event.id, true, "Approved from detail")}>Approve</Button>
          ) : null}
        </div>
      </SecisCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Affected entities" value={String(propagation.affected.length)} icon={Network} tone="info" />
        <StatTile label="Affected systems" value={String(propagation.affectedSystemIds.length)} icon={Waypoints} tone="info" />
        <StatTile label="Max depth" value={`${propagation.maxDepth} hops`} tone="neutral" />
        <StatTile label="Revenue at risk" value={formatCurrencyCompact(propagation.totalRevenueAtRisk)} icon={Gauge} tone="warning" />
        <StatTile label="Risk score" value={`${risk.score}/100`} icon={ShieldAlert} tone={risk.score >= 55 ? "danger" : risk.score >= 30 ? "warning" : "success"} />
      </div>

      <SecisCard title="Propagation engine" description={impact.outcomeSummary}>
        <PropagationGraph affected={propagation.affected} paths={propagation.paths} originId={propagation.originEntityId} selectedId={selectedNode} onSelect={setSelectedNode} />
        {selected ? (
          <div className="mt-3 rounded-md border border-border bg-slate-50 p-3">
            <p className="text-sm font-medium text-primary-text">{selected.entityName}</p>
            <p className="mt-1 text-xs text-secondary-text">Severity {Math.round(selected.severity * 100)}% · depth {selected.depth} · arrives period {selected.arrivalPeriod} · {formatCurrency(selected.revenueAtRisk)} at risk</p>
          </div>
        ) : null}
      </SecisCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SecisCard title="Impact timeline" description="Cumulative severity reaching the network over time.">
          <SecisLineChart
            series={[
              { key: "sev", label: "Cumulative severity", color: "danger", points: propagation.timeline.map((t) => ({ x: t.period, y: t.cumulativeSeverity })) },
              { key: "new", label: "Newly affected", color: "ai", points: propagation.timeline.map((t) => ({ x: t.period, y: t.newlyAffected })) },
            ]}
            yFormatter={(v) => v.toFixed(1)}
          />
        </SecisCard>
        <SecisCard title="Risk analysis" action={<RiskBadge level={risk.level} score={risk.score} />}>
          <RiskFactors risk={risk} />
        </SecisCard>
      </div>

      <SecisCard title="Impact by dimension" description="Multi-dimensional impact assessment.">
        <DimensionGrid impact={impact} />
      </SecisCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SecisCard title="Propagation paths" description="How the change reaches each node.">
          <PathsList paths={propagation.paths} />
        </SecisCard>
        <SecisCard title="Risk register" description="Per-entity risk events.">
          {risk.events.length === 0 ? <p className="text-sm text-secondary-text">No notable per-entity risks.</p> : (
            <div className="responsive-table-shell max-h-80 overflow-y-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Entity</TableHead><TableHead>Category</TableHead><TableHead>Level</TableHead><TableHead>Score</TableHead></TableRow></TableHeader>
                <TableBody>
                  {risk.events.map((r) => (
                    <TableRow key={r.id}><TableCell className="font-medium text-primary-text">{r.entityName}</TableCell><TableCell>{r.category}</TableCell><TableCell><Badge variant={riskVariant(r.level)}>{r.level}</Badge></TableCell><TableCell>{r.score}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SecisCard>
      </div>

      <SecisCard title="Affected entities" description="Every node in the blast radius.">
        <AffectedTable affected={propagation.affected} />
      </SecisCard>

      <SecisCard
        title="Recommendations"
        description="Mitigations, interventions, and recovery actions."
        action={<Button size="sm" variant="secondary" disabled={!canMitigate} onClick={() => { setMitigationId(mitigationOptions[0]?.id ?? ""); setMitigationOpen(true); }}><Wrench className="size-4" /> Apply mitigation</Button>}
      >
        {recommendations.length === 0 ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-secondary-text">No recommendations yet.</p>
            <Button size="sm" disabled={!canRun} onClick={() => analyzeEvent(event.id)}>Generate recommendations</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <div key={rec.id} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-primary-text">{rec.title}</p>
                  <Badge variant={rec.priority === "high" ? "danger" : rec.priority === "medium" ? "warning" : "secondary"}>{rec.category}</Badge>
                </div>
                <p className="mt-1 text-sm text-primary-text">{rec.action}</p>
                <p className="mt-1 text-xs text-secondary-text">{rec.expectedImpact}</p>
                <div className="mt-2">
                  {rec.accepted ? <Badge variant="default">Accepted</Badge> : <Button size="sm" variant="secondary" onClick={() => acceptRecommendation(rec.id)}>Accept</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </SecisCard>

      {(decisions.length > 0 || mitigations.length > 0) && (
        <div className="grid gap-6 xl:grid-cols-2">
          <SecisCard title="Decisions">
            {decisions.length === 0 ? <p className="text-sm text-secondary-text">No decisions recorded.</p> : (
              <div className="space-y-2">{decisions.map((d) => (
                <div key={d.id} className="rounded-md border border-border p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-primary-text">{d.title}</p><Badge variant={d.outcome === "adopt" ? "default" : d.outcome === "reject" ? "danger" : "warning"}>{d.outcome}</Badge></div><p className="mt-1 text-xs text-secondary-text">{d.rationale}</p></div>
              ))}</div>
            )}
          </SecisCard>
          <SecisCard title="Applied mitigations">
            {mitigations.length === 0 ? <p className="text-sm text-secondary-text">No mitigations applied.</p> : (
              <div className="space-y-2">{mitigations.map((m) => (
                <div key={m.id} className="rounded-md border border-border p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-primary-text">{m.name}</p><Badge variant="ai">{m.status}</Badge></div><p className="mt-1 text-xs text-secondary-text">{m.note} · {relativeTime(m.createdAt)}</p></div>
              ))}</div>
            )}
          </SecisCard>
        </div>
      )}

      <Dialog open={decisionOpen} onOpenChange={setDecisionOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record a decision</DialogTitle><DialogDescription>Capture the decision this analysis supports.</DialogDescription></DialogHeader>
          <div className="mt-4 space-y-3">
            <Input value={decisionTitle} onChange={(e) => setDecisionTitle(e.target.value)} placeholder="Decision title" />
            <div className="grid grid-cols-2 gap-3">
              <Select value={decisionOutcome} onValueChange={(v) => setDecisionOutcome(v as DecisionOutcome)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="adopt">Adopt</SelectItem><SelectItem value="reject">Reject</SelectItem><SelectItem value="defer">Defer</SelectItem><SelectItem value="escalate">Escalate</SelectItem></SelectContent>
              </Select>
              <Select value={decisionImpact} onValueChange={(v) => setDecisionImpact(v as "low" | "medium" | "high")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="low">Low impact</SelectItem><SelectItem value="medium">Medium impact</SelectItem><SelectItem value="high">High impact</SelectItem></SelectContent>
              </Select>
            </div>
            <Textarea value={decisionRationale} onChange={(e) => setDecisionRationale(e.target.value)} placeholder="Rationale" />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDecisionOpen(false)}>Cancel</Button>
            <Button onClick={() => { recordDecision({ changeEventId: event.id, title: decisionTitle || `Decision on ${event.name}`, outcome: decisionOutcome, impact: decisionImpact, rationale: decisionRationale || "Recorded from detail." }); setDecisionOpen(false); setDecisionRationale(""); }}>Record</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={mitigationOpen} onOpenChange={setMitigationOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Apply a mitigation</DialogTitle><DialogDescription>Track a mitigation action against this event.</DialogDescription></DialogHeader>
          <div className="mt-4 space-y-3">
            <Select value={mitigationId} onValueChange={setMitigationId}>
              <SelectTrigger><SelectValue placeholder="Choose an intervention" /></SelectTrigger>
              <SelectContent>{mitigationOptions.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
            </Select>
            <Textarea value={mitigationNote} onChange={(e) => setMitigationNote(e.target.value)} placeholder="Note" />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setMitigationOpen(false)}>Cancel</Button>
            <Button disabled={!mitigationId} onClick={() => { applyMitigation(event.id, mitigationId, mitigationNote || "Applied from detail."); setMitigationOpen(false); setMitigationNote(""); }}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>
    </SecisShell>
  );
}
