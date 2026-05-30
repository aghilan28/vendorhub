"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ClipboardCheck, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/feedback/empty-state";
import type { ReviewDecision } from "@/lib/simulation";
import { useSimulationStore } from "@/store/simulation-store";
import { useHydrated, usePermission } from "../hooks";
import { relativeTime } from "../format";
import { SimShell, SimCard, WorkflowBadge, StatTile } from "./primitives";
import { ListSkeleton } from "./skeletons";

function ReviewForm({ simulationId }: { simulationId: string }) {
  const submitReview = useSimulationStore((s) => s.submitReview);
  const recordApproval = useSimulationStore((s) => s.recordApproval);
  const canReview = usePermission("review.submit");
  const canApprove = usePermission("approval.record");
  const [decision, setDecision] = useState<ReviewDecision>("approved");
  const [comment, setComment] = useState("");

  return (
    <div className="mt-3 rounded-md border border-border bg-slate-50 p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Select value={decision} onValueChange={(v) => setDecision(v as ReviewDecision)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="approved">Approve</SelectItem>
            <SelectItem value="changes_requested">Request changes</SelectItem>
            <SelectItem value="rejected">Reject</SelectItem>
            <SelectItem value="pending">Mark pending</SelectItem>
          </SelectContent>
        </Select>
        <Button disabled={!canReview} onClick={() => { submitReview(simulationId, decision, comment || "Reviewed."); setComment(""); }}>
          <ClipboardCheck className="size-4" /> Submit review
        </Button>
      </div>
      <Textarea className="mt-2" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Review comment" />
      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="secondary" disabled={!canApprove} onClick={() => recordApproval(simulationId, true, comment || "Approved.")}>
          <ThumbsUp className="size-4" /> Approve &amp; advance
        </Button>
        <Button size="sm" variant="ghost" disabled={!canApprove} onClick={() => recordApproval(simulationId, false, comment || "Declined.")}>
          Decline approval
        </Button>
      </div>
      {!canReview ? <p className="mt-2 text-xs text-danger">Your role cannot submit reviews. Switch to Reviewer or Admin.</p> : null}
    </div>
  );
}

export function ReviewsScreen() {
  const hydrated = useHydrated();
  const simulations = useSimulationStore((s) => s.simulations);
  const reviews = useSimulationStore((s) => s.reviews);
  const approvals = useSimulationStore((s) => s.approvals);

  if (!hydrated) return <ListSkeleton />;

  const inReview = simulations.filter((s) => s.workflowState === "review");
  const decisionVariant = (d: ReviewDecision) => (d === "approved" ? "default" : d === "rejected" ? "danger" : d === "changes_requested" ? "warning" : "secondary");

  return (
    <SimShell
      title="Simulation Reviews & Approvals"
      description="Review simulations awaiting sign-off, leave structured feedback, and record approvals that advance the workflow."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Awaiting review" value={String(inReview.length)} icon={ClipboardCheck} tone={inReview.length ? "warning" : "neutral"} />
        <StatTile label="Reviews submitted" value={String(reviews.length)} tone="info" />
        <StatTile label="Approvals recorded" value={String(approvals.length)} tone="success" />
      </div>

      <SimCard title="Awaiting your review" description="Simulations in the review stage of the workflow.">
        {inReview.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="Nothing awaiting review" description="Move a simulation to the Review state from the Workflow Engine to request a review." />
        ) : (
          <div className="space-y-4">
            {inReview.map((sim) => (
              <div key={sim.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={`/simulations/${sim.id}` as Route} className="font-medium text-primary-text hover:underline">{sim.name}</Link>
                    <p className="text-xs text-secondary-text">{sim.ownerName} · v{sim.version} · {sim.category}</p>
                  </div>
                  <WorkflowBadge state={sim.workflowState} />
                </div>
                <p className="mt-2 text-sm text-secondary-text">{sim.description}</p>
                <ReviewForm simulationId={sim.id} />
              </div>
            ))}
          </div>
        )}
      </SimCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SimCard title="Recent reviews">
          {reviews.length === 0 ? (
            <p className="text-sm text-secondary-text">No reviews yet.</p>
          ) : (
            <div className="space-y-2">
              {[...reviews].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map((r) => {
                const sim = simulations.find((s) => s.id === r.simulationId);
                return (
                  <div key={r.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-primary-text">{sim?.name ?? "Simulation"}</p>
                      <Badge variant={decisionVariant(r.decision)}>{r.decision.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-secondary-text">{r.comment}</p>
                    <p className="mt-1 text-[11px] text-secondary-text">{r.reviewerName} · {relativeTime(r.createdAt)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </SimCard>

        <SimCard title="Approvals">
          {approvals.length === 0 ? (
            <p className="text-sm text-secondary-text">No approvals yet.</p>
          ) : (
            <div className="space-y-2">
              {[...approvals].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map((a) => {
                const sim = simulations.find((s) => s.id === a.simulationId);
                return (
                  <div key={a.id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-primary-text">{sim?.name ?? "Simulation"}</p>
                      <Badge variant={a.approved ? "default" : "danger"}>{a.approved ? "approved" : "declined"}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-secondary-text">{a.note}</p>
                    <p className="mt-1 text-[11px] text-secondary-text">{a.approverName} · {relativeTime(a.createdAt)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </SimCard>
      </div>
    </SimShell>
  );
}
