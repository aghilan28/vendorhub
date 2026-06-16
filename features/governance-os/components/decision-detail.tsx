"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Gavel, Check, X, ChevronRight, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/feedback/empty-state";
import { DECISION_ORDER, DECISION_TRANSITIONS, DECISION_TYPE_META, SOURCE_SYSTEM_META, evaluateDecision, type DecisionStatus, type ReviewVerdict } from "@/lib/governance-os";
import { useGovernanceStore } from "@/store/governance-store";
import { useHydrated, usePermission } from "../hooks";
import { DECISION_STATUS_META, relativeTime, verdictVariant } from "../format";
import { GovShell, GovCard, StatTile, DecisionStatusBadge } from "./primitives";
import { DetailSkeleton } from "./skeletons";

export function DecisionDetail({ decisionId }: { decisionId: string }) {
  const hydrated = useHydrated();
  const decision = useGovernanceStore((s) => s.decisions.find((d) => d.id === decisionId));
  const policies = useGovernanceStore((s) => s.policies);
  const reviews = useGovernanceStore((s) => s.decisionReviews.filter((r) => r.decisionId === decisionId));
  const approvals = useGovernanceStore((s) => s.decisionApprovals.filter((a) => a.decisionId === decisionId));
  const allApprovals = useGovernanceStore((s) => s.decisionApprovals);
  const settings = useGovernanceStore((s) => s.settings);
  const audit = useGovernanceStore((s) => s.audit.filter((a) => a.objectId === decisionId));
  const transitionDecision = useGovernanceStore((s) => s.transitionDecision);
  const submitReview = useGovernanceStore((s) => s.submitReview);
  const recordApproval = useGovernanceStore((s) => s.recordApproval);
  const escalateDecision = useGovernanceStore((s) => s.escalateDecision);
  const setDecisionOutcome = useGovernanceStore((s) => s.setDecisionOutcome);
  const canReview = usePermission("decision.review");
  const canApprove = usePermission("decision.approve");

  const [reviewVerdict, setReviewVerdict] = useState<ReviewVerdict>("approve");
  const [reviewComment, setReviewComment] = useState("");
  const [approvalNote, setApprovalNote] = useState("");

  const evaluation = useMemo(
    () => (decision ? evaluateDecision(decision, policies, allApprovals, settings.requireTwoApprovals ? 2 : 1) : null),
    [decision, policies, allApprovals, settings.requireTwoApprovals],
  );

  if (!hydrated) return <DetailSkeleton />;
  if (!decision || !evaluation) {
    return <GovShell title="Decision" description="Decision detail."><EmptyState icon={Gavel} title="Decision not found" description="It may have been archived or removed." /></GovShell>;
  }

  return (
    <GovShell
      title={decision.title}
      description={decision.description}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" disabled={!canReview} onClick={() => escalateDecision(decision.id)}><AlertTriangle className="size-4" /> Escalate</Button>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <DecisionStatusBadge status={decision.status} />
        <Badge variant="secondary">{DECISION_TYPE_META[decision.type].label}</Badge>
        <Badge variant="ai">{SOURCE_SYSTEM_META[decision.sourceSystem].label}</Badge>
        {decision.sourceRef ? <Badge variant="secondary">{decision.sourceRef}</Badge> : null}
        <Badge variant={decision.impact === "high" ? "danger" : decision.impact === "medium" ? "warning" : "secondary"}>{decision.impact} impact</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Owner" value={decision.ownerName} tone="neutral" />
        <StatTile label="Accountable" value={decision.accountableName} tone="info" />
        <StatTile label="Governance readiness" value={`${evaluation.readinessScore}%`} tone={evaluation.readyToApprove ? "success" : "warning"} />
        <StatTile label="Outcome" value={decision.outcome} tone={decision.outcome === "adopted" ? "success" : decision.outcome === "rejected" ? "danger" : "neutral"} />
      </div>

      <GovCard title="Approval workflow" description="Governed lifecycle for this decision.">
        <div className="flex flex-wrap items-center gap-2">
          {DECISION_ORDER.map((st, i) => (
            <span key={st} className="flex items-center gap-2">
              <Badge variant={st === decision.status ? DECISION_STATUS_META[st].variant : "secondary"}>{DECISION_STATUS_META[st].label}</Badge>
              {i < DECISION_ORDER.length - 1 ? <ChevronRight className="size-3.5 text-secondary-text" /> : null}
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-secondary-text">Move to:</span>
          {DECISION_TRANSITIONS[decision.status].map((to) => (
            <Button key={to} size="sm" variant="secondary" disabled={!canReview && !canApprove} onClick={() => transitionDecision(decision.id, to as DecisionStatus)}>{DECISION_STATUS_META[to].label}</Button>
          ))}
        </div>
      </GovCard>

      <GovCard title="Governance readiness" description="Checks that must pass before this decision can be approved.">
        <div className="space-y-2">
          {evaluation.checks.map((c) => (
            <div key={c.label} className={`flex items-center gap-2 rounded-md border p-3 ${c.passed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              {c.passed ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-warning" />}
              <span className="text-sm text-primary-text">{c.label}</span>
            </div>
          ))}
        </div>
        {evaluation.applicablePolicies.length > 0 ? (
          <p className="mt-3 text-xs text-secondary-text">Applicable published policies: {evaluation.applicablePolicies.map((p) => p.title).join(", ")} ({evaluation.mandatoryRuleCount} mandatory rules).</p>
        ) : <p className="mt-3 text-xs text-secondary-text">No published policies apply to this source system.</p>}
      </GovCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <GovCard title="Reviews" description={`${reviews.length} review(s)`}>
          <div className="space-y-2">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-primary-text">{r.reviewerName}</p><Badge variant={verdictVariant(r.verdict)}>{r.verdict.replace(/_/g, " ")}</Badge></div>
                <p className="mt-1 text-xs text-secondary-text">{r.comment}</p>
              </div>
            ))}
            {reviews.length === 0 ? <p className="text-sm text-secondary-text">No reviews yet.</p> : null}
          </div>
          <div className="mt-3 space-y-2 rounded-md border border-border bg-slate-50 p-3">
            <Select value={reviewVerdict} onValueChange={(v) => setReviewVerdict(v as ReviewVerdict)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="approve">Approve</SelectItem><SelectItem value="request_changes">Request changes</SelectItem><SelectItem value="reject">Reject</SelectItem><SelectItem value="comment">Comment</SelectItem></SelectContent>
            </Select>
            <Textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Review comment" />
            <Button size="sm" disabled={!canReview} onClick={() => { submitReview(decision.id, reviewVerdict, reviewComment || "Reviewed."); setReviewComment(""); }}>Submit review</Button>
            {!canReview ? <p className="text-xs text-danger">Your role cannot review decisions.</p> : null}
          </div>
        </GovCard>

        <GovCard title="Approvals & rejections" description={`${approvals.filter((a) => a.approved).length} approval(s), ${approvals.filter((a) => !a.approved).length} rejection(s)`}>
          <div className="space-y-2">
            {approvals.map((a) => (
              <div key={a.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-primary-text">{a.approverName}</p><Badge variant={a.approved ? "default" : "danger"}>{a.approved ? "approved" : "rejected"}</Badge></div>
                <p className="mt-1 text-xs text-secondary-text">{a.note}</p>
              </div>
            ))}
            {approvals.length === 0 ? <p className="text-sm text-secondary-text">No approvals recorded.</p> : null}
          </div>
          <div className="mt-3 space-y-2 rounded-md border border-border bg-slate-50 p-3">
            <Textarea value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} placeholder="Approval / rejection note" />
            <div className="flex gap-2">
              <Button size="sm" disabled={!canApprove} onClick={() => { recordApproval(decision.id, true, approvalNote || "Approved."); setApprovalNote(""); }}><Check className="size-4" /> Approve</Button>
              <Button size="sm" variant="destructive" disabled={!canApprove} onClick={() => { recordApproval(decision.id, false, approvalNote || "Rejected."); setApprovalNote(""); }}><X className="size-4" /> Reject</Button>
            </div>
            {!canApprove ? <p className="text-xs text-danger">Your role cannot approve decisions.</p> : null}
          </div>
        </GovCard>
      </div>

      {decision.status === "approved" || decision.status === "rejected" ? (
        <GovCard title="Outcome" description="Track the realised outcome of this decision.">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={decision.outcome} onValueChange={(v) => setDecisionOutcome(decision.id, v as typeof decision.outcome, "Outcome updated")}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="adopted">Adopted</SelectItem><SelectItem value="rejected">Rejected</SelectItem><SelectItem value="deferred">Deferred</SelectItem></SelectContent>
            </Select>
            {decision.outcomeNote ? <span className="text-xs text-secondary-text">{decision.outcomeNote}</span> : null}
          </div>
        </GovCard>
      ) : null}

      <GovCard title="Decision audit trail">
        {audit.length === 0 ? <p className="text-sm text-secondary-text">No history.</p> : (
          <div className="space-y-2">
            {[...audit].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"><div className="min-w-0"><p className="truncate text-sm text-primary-text">{a.summary}</p>{a.reason ? <p className="text-[11px] text-secondary-text">{a.reason}</p> : null}</div><span className="shrink-0 text-xs text-secondary-text">{a.actorName} · {relativeTime(a.at)}</span></div>
            ))}
          </div>
        )}
      </GovCard>

      {decision.relatedPolicyIds.length > 0 ? (
        <GovCard title="Related policies">
          <div className="flex flex-wrap gap-2">
            {decision.relatedPolicyIds.map((id) => { const p = policies.find((x) => x.id === id); return p ? <Link key={id} href={`/governance/policies/${id}` as Route} className="rounded-full border border-border px-3 py-1 text-xs text-primary-text focus-ring hover:bg-slate-50">{p.title}</Link> : null; })}
          </div>
        </GovCard>
      ) : null}
    </GovShell>
  );
}
