"use client";

import Link from "next/link";
import type { Route } from "next";
import { ClipboardCheck, Stamp, XCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { useGovernanceStore } from "@/store/governance-store";
import { useHydrated, usePermission } from "../hooks";
import { relativeTime, verdictVariant } from "../format";
import { GovShell, GovCard, StatTile, DecisionStatusBadge, PolicyStatusBadge } from "./primitives";
import { ListSkeleton } from "./skeletons";

export function ReviewsScreen() {
  const hydrated = useHydrated();
  const decisions = useGovernanceStore((s) => s.decisions);
  const reviews = useGovernanceStore((s) => s.decisionReviews);
  if (!hydrated) return <ListSkeleton />;

  const needsReview = decisions.filter((d) => d.status === "review");
  return (
    <GovShell title="Reviews" description="Decisions awaiting review. Open a decision to leave a structured verdict and comment.">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Awaiting review" value={String(needsReview.length)} icon={ClipboardCheck} tone={needsReview.length ? "warning" : "neutral"} />
        <StatTile label="Reviews submitted" value={String(reviews.length)} tone="info" />
        <StatTile label="Changes requested" value={String(reviews.filter((r) => r.verdict === "request_changes").length)} tone="neutral" />
      </div>
      <GovCard title="Awaiting review">
        {needsReview.length === 0 ? <EmptyState icon={ClipboardCheck} title="Nothing to review" description="Decisions move here when they enter the review state." /> : (
          <div className="space-y-2">
            {needsReview.map((d) => (
              <Link key={d.id} href={`/governance/decisions/${d.id}` as Route} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 focus-ring hover:bg-slate-50">
                <div className="min-w-0"><p className="truncate text-sm font-medium text-primary-text">{d.title}</p><p className="text-xs text-secondary-text">{d.ownerName} · {relativeTime(d.updatedAt)}{d.reviewerIds.length === 0 ? " · no reviewer assigned" : ""}</p></div>
                <DecisionStatusBadge status={d.status} />
              </Link>
            ))}
          </div>
        )}
      </GovCard>
      <GovCard title="Recent reviews">
        {reviews.length === 0 ? <p className="text-sm text-secondary-text">No reviews yet.</p> : (
          <div className="space-y-2">
            {[...reviews].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 12).map((r) => {
              const d = decisions.find((x) => x.id === r.decisionId);
              return <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"><div className="min-w-0"><p className="truncate text-sm text-primary-text">{d?.title ?? "Decision"}</p><p className="text-xs text-secondary-text">{r.reviewerName} · {r.comment}</p></div><Badge variant={verdictVariant(r.verdict)}>{r.verdict.replace(/_/g, " ")}</Badge></div>;
            })}
          </div>
        )}
      </GovCard>
    </GovShell>
  );
}

export function ApprovalsScreen() {
  const hydrated = useHydrated();
  const decisions = useGovernanceStore((s) => s.decisions);
  const policies = useGovernanceStore((s) => s.policies);
  const recordApproval = useGovernanceStore((s) => s.recordApproval);
  const transitionPolicy = useGovernanceStore((s) => s.transitionPolicy);
  const canApproveDecision = usePermission("decision.approve");
  const canApprovePolicy = usePermission("policy.approve");
  if (!hydrated) return <ListSkeleton />;

  const decisionsPending = decisions.filter((d) => d.status === "review");
  const policiesPending = policies.filter((p) => p.status === "review" || p.status === "approved");
  return (
    <GovShell title="Approvals" description="The central approval queue. Approve or reject decisions, and advance policies toward publication.">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Decisions pending" value={String(decisionsPending.length)} icon={Stamp} tone={decisionsPending.length ? "warning" : "neutral"} />
        <StatTile label="Policies pending" value={String(policiesPending.length)} tone={policiesPending.length ? "warning" : "neutral"} />
        <StatTile label="Approved (decisions)" value={String(decisions.filter((d) => d.status === "approved").length)} tone="success" />
      </div>

      <GovCard title="Decisions awaiting approval">
        {decisionsPending.length === 0 ? <EmptyState icon={Stamp} title="No decisions awaiting approval" description="Approved decisions appear in the Decision Center." /> : (
          <div className="space-y-2">
            {decisionsPending.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                <Link href={`/governance/decisions/${d.id}` as Route} className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-primary-text hover:underline">{d.title}</p><p className="text-xs text-secondary-text">{d.sourceSystem} · {d.ownerName}</p></Link>
                <div className="flex gap-1.5">
                  <Button size="sm" disabled={!canApproveDecision} onClick={() => recordApproval(d.id, true, "Approved from queue")}><Check className="size-4" /> Approve</Button>
                  <Button size="sm" variant="destructive" disabled={!canApproveDecision} onClick={() => recordApproval(d.id, false, "Rejected from queue")}><X className="size-4" /> Reject</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GovCard>

      <GovCard title="Policies awaiting approval / publication">
        {policiesPending.length === 0 ? <p className="text-sm text-secondary-text">No policies pending.</p> : (
          <div className="space-y-2">
            {policiesPending.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                <Link href={`/governance/policies/${p.id}` as Route} className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-primary-text hover:underline">{p.title}</p><p className="text-xs text-secondary-text">{p.ownerName} · v{p.version}</p></Link>
                <div className="flex items-center gap-1.5">
                  <PolicyStatusBadge status={p.status} />
                  {p.status === "review" ? <Button size="sm" disabled={!canApprovePolicy} onClick={() => transitionPolicy(p.id, "approved")}>Approve</Button> : <Button size="sm" disabled={!canApprovePolicy} onClick={() => transitionPolicy(p.id, "published")}>Publish</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </GovCard>
    </GovShell>
  );
}

export function RejectionsScreen() {
  const hydrated = useHydrated();
  const decisions = useGovernanceStore((s) => s.decisions);
  const approvals = useGovernanceStore((s) => s.decisionApprovals.filter((a) => !a.approved));
  if (!hydrated) return <ListSkeleton />;

  const rejected = decisions.filter((d) => d.status === "rejected");
  return (
    <GovShell title="Rejections" description="A log of rejected decisions and recorded rejections, for accountability and learning.">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile label="Rejected decisions" value={String(rejected.length)} icon={XCircle} tone={rejected.length ? "danger" : "neutral"} />
        <StatTile label="Rejection records" value={String(approvals.length)} tone="neutral" />
      </div>
      <GovCard title="Rejected decisions">
        {rejected.length === 0 ? <EmptyState icon={XCircle} title="No rejected decisions" description="Rejected decisions are logged here." /> : (
          <div className="space-y-2">
            {rejected.map((d) => (
              <Link key={d.id} href={`/governance/decisions/${d.id}` as Route} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 focus-ring hover:bg-slate-50">
                <div className="min-w-0"><p className="truncate text-sm font-medium text-primary-text">{d.title}</p><p className="text-xs text-secondary-text">{d.ownerName} · {relativeTime(d.updatedAt)}</p></div>
                <Badge variant="danger">rejected</Badge>
              </Link>
            ))}
          </div>
        )}
      </GovCard>
      <GovCard title="Rejection records">
        {approvals.length === 0 ? <p className="text-sm text-secondary-text">No rejection records.</p> : (
          <div className="space-y-2">
            {[...approvals].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map((a) => {
              const d = decisions.find((x) => x.id === a.decisionId);
              return <div key={a.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"><div className="min-w-0"><p className="truncate text-sm text-primary-text">{d?.title ?? "Decision"}</p><p className="text-xs text-secondary-text">{a.approverName} · {a.note}</p></div><span className="shrink-0 text-xs text-secondary-text">{relativeTime(a.createdAt)}</span></div>;
            })}
          </div>
        )}
      </GovCard>
    </GovShell>
  );
}
