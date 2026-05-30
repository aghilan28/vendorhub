"use client";

import { useState } from "react";
import { FileWarning, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/feedback/empty-state";
import { useGovernanceStore } from "@/store/governance-store";
import { useHydrated, usePermission } from "../hooks";
import { formatDate, relativeTime } from "../format";
import { GovShell, GovCard, StatTile, ExceptionStatusBadge } from "./primitives";
import { ListSkeleton } from "./skeletons";

export function ExceptionManagement() {
  const hydrated = useHydrated();
  const exceptions = useGovernanceStore((s) => s.exceptions);
  const policies = useGovernanceStore((s) => s.policies.filter((p) => p.status === "published"));
  const requestException = useGovernanceStore((s) => s.requestException);
  const transitionException = useGovernanceStore((s) => s.transitionException);
  const recordExceptionApproval = useGovernanceStore((s) => s.recordExceptionApproval);
  const canRequest = usePermission("exception.request");
  const canApprove = usePermission("exception.approve");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", policyId: "", reason: "", days: 30 });

  if (!hydrated) return <ListSkeleton />;

  const now = Date.now();
  const pending = exceptions.filter((e) => e.status === "requested" || e.status === "review");
  const active = exceptions.filter((e) => e.status === "approved");

  return (
    <GovShell
      title="Exception Management"
      description="Request, review, approve, and expire exceptions to policies — with full history and expiry tracking."
      actions={<Button onClick={() => { setForm({ title: "", policyId: policies[0]?.id ?? "", reason: "", days: 30 }); setOpen(true); }} disabled={!canRequest}><Plus className="size-4" /> Request exception</Button>}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Pending" value={String(pending.length)} icon={FileWarning} tone={pending.length ? "warning" : "neutral"} />
        <StatTile label="Active (approved)" value={String(active.length)} tone="success" />
        <StatTile label="Expired" value={String(exceptions.filter((e) => e.status === "expired" || (e.status === "approved" && e.expiresAt && Date.parse(e.expiresAt) < now)).length)} tone="danger" />
      </div>

      <GovCard title="Exceptions" description={`${exceptions.length} total`}>
        {exceptions.length === 0 ? <EmptyState icon={FileWarning} title="No exceptions" description="Request an exception to deviate from a policy." /> : (
          <div className="space-y-3">
            {[...exceptions].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).map((e) => {
              const expired = e.status === "approved" && e.expiresAt && Date.parse(e.expiresAt) < now;
              return (
                <div key={e.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0"><p className="text-sm font-semibold text-primary-text">{e.title}</p><p className="mt-0.5 text-xs text-secondary-text">Policy: {e.policyTitle} · requested by {e.requestedByName}</p></div>
                    <div className="flex shrink-0 gap-1.5"><ExceptionStatusBadge status={e.status} />{expired ? <Badge variant="danger">expired</Badge> : null}</div>
                  </div>
                  <p className="mt-2 text-xs text-primary-text">{e.reason}</p>
                  <p className="mt-1 text-[11px] text-secondary-text">Expires {formatDate(e.expiresAt)} · updated {relativeTime(e.updatedAt)}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {e.status === "requested" ? <Button size="sm" variant="secondary" disabled={!canApprove} onClick={() => transitionException(e.id, "review")}>Start review</Button> : null}
                    {(e.status === "requested" || e.status === "review") ? (
                      <>
                        <Button size="sm" disabled={!canApprove} onClick={() => recordExceptionApproval(e.id, true, "Approved")}><Check className="size-4" /> Approve</Button>
                        <Button size="sm" variant="destructive" disabled={!canApprove} onClick={() => recordExceptionApproval(e.id, false, "Rejected")}><X className="size-4" /> Reject</Button>
                      </>
                    ) : null}
                    {e.status === "approved" ? (
                      <>
                        <Button size="sm" variant="secondary" disabled={!canApprove} onClick={() => transitionException(e.id, "expired")}>Mark expired</Button>
                        <Button size="sm" variant="ghost" disabled={!canApprove} onClick={() => transitionException(e.id, "archived")}>Archive</Button>
                      </>
                    ) : null}
                    {(e.status === "rejected" || e.status === "expired") ? <Button size="sm" variant="ghost" disabled={!canApprove} onClick={() => transitionException(e.id, "archived")}>Archive</Button> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GovCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request an exception</DialogTitle></DialogHeader>
          <div className="mt-4 space-y-3">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Exception title" />
            <Select value={form.policyId} onValueChange={(v) => setForm({ ...form, policyId: v })}>
              <SelectTrigger><SelectValue placeholder="Policy to except" /></SelectTrigger>
              <SelectContent>{policies.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
            </Select>
            <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Why is this exception needed?" />
            <div>
              <label className="text-sm text-primary-text">Valid for (days)</label>
              <Input type="number" value={form.days} onChange={(e) => setForm({ ...form, days: Math.max(1, Number(e.target.value)) })} />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.policyId} onClick={() => { requestException({ title: form.title || "Exception request", policyId: form.policyId, reason: form.reason, days: form.days }); setOpen(false); }}>Submit request</Button>
          </div>
        </DialogContent>
      </Dialog>
    </GovShell>
  );
}
