"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { FileText, GitBranch, Save, Archive, ChevronRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/feedback/empty-state";
import { POLICY_CATEGORIES, POLICY_ORDER, POLICY_TRANSITIONS, SOURCE_SYSTEM_META, type PolicyStatus } from "@/lib/governance-os";
import { useGovernanceStore } from "@/store/governance-store";
import { useHydrated, usePermission } from "../hooks";
import { POLICY_STATUS_META, relativeTime, formatDate } from "../format";
import { GovShell, GovCard, PolicyStatusBadge } from "./primitives";
import { PolicyForm } from "./policy-form";
import { DetailSkeleton } from "./skeletons";

export function PolicyDetail({ policyId }: { policyId: string }) {
  const hydrated = useHydrated();
  const policy = useGovernanceStore((s) => s.policies.find((p) => p.id === policyId));
  const versions = useGovernanceStore((s) => s.policyVersions.filter((v) => v.policyId === policyId));
  const controls = useGovernanceStore((s) => s.controls);
  const users = useGovernanceStore((s) => s.users);
  const decisions = useGovernanceStore((s) => s.decisions.filter((d) => d.relatedPolicyIds.includes(policyId)));
  const audit = useGovernanceStore((s) => s.audit.filter((a) => a.objectId === policyId));
  const transitionPolicy = useGovernanceStore((s) => s.transitionPolicy);
  const versionPolicy = useGovernanceStore((s) => s.versionPolicy);
  const archivePolicy = useGovernanceStore((s) => s.archivePolicy);
  const canManage = usePermission("policy.manage");
  const canApprove = usePermission("policy.approve");

  const [editOpen, setEditOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [versionLabel, setVersionLabel] = useState("");

  if (!hydrated) return <DetailSkeleton />;
  if (!policy) {
    return <GovShell title="Policy" description="Policy detail."><EmptyState icon={FileText} title="Policy not found" description="It may have been archived or removed." /></GovShell>;
  }

  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const categoryName = POLICY_CATEGORIES.find((c) => c.id === policy.category)?.name ?? policy.category;
  // Approval-stage transitions require approve permission; others require manage.
  const transitionAllowed = (to: PolicyStatus) => (to === "approved" || to === "published" ? canApprove : canManage);

  return (
    <GovShell
      title={policy.title}
      description={policy.summary}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" disabled={!canManage} onClick={() => setEditOpen(true)}><Pencil className="size-4" /> Edit</Button>
          <Button size="sm" variant="secondary" disabled={!canManage} onClick={() => { setVersionLabel(""); setVersionOpen(true); }}><GitBranch className="size-4" /> New version</Button>
          <Button size="sm" variant="ghost" disabled={!canManage} onClick={() => archivePolicy(policy.id)}><Archive className="size-4" /> Archive</Button>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <PolicyStatusBadge status={policy.status} />
        <Badge variant="secondary">{categoryName}</Badge>
        <Badge variant="secondary">v{policy.version}</Badge>
        <Badge variant="secondary">{policy.visibility}</Badge>
        {policy.effectiveDate ? <Badge variant="ai">effective {formatDate(policy.effectiveDate)}</Badge> : null}
      </div>

      <GovCard title="Lifecycle" description="Advance this policy through its governed lifecycle.">
        <div className="flex flex-wrap items-center gap-2">
          {POLICY_ORDER.map((st, i) => (
            <span key={st} className="flex items-center gap-2">
              <Badge variant={st === policy.status ? POLICY_STATUS_META[st].variant : "secondary"}>{POLICY_STATUS_META[st].label}</Badge>
              {i < POLICY_ORDER.length - 1 ? <ChevronRight className="size-3.5 text-secondary-text" /> : null}
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-secondary-text">Move to:</span>
          {POLICY_TRANSITIONS[policy.status].map((to) => (
            <Button key={to} size="sm" variant="secondary" disabled={!transitionAllowed(to)} onClick={() => transitionPolicy(policy.id, to)}>{POLICY_STATUS_META[to].label}</Button>
          ))}
          {POLICY_TRANSITIONS[policy.status].length === 0 ? <span className="text-sm text-secondary-text">No transitions available.</span> : null}
        </div>
      </GovCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <GovCard title="Rules">
          <div className="space-y-2">
            {policy.rules.map((r) => (
              <div key={r.id} className="rounded-md border border-border p-3">
                <p className="text-sm text-primary-text">{r.statement}</p>
                <div className="mt-1 flex gap-1.5"><Badge variant={r.type === "mandatory" ? "danger" : "secondary"}>{r.type}</Badge><Badge variant="secondary">severity: {r.severityIfViolated}</Badge></div>
              </div>
            ))}
            {policy.rules.length === 0 ? <p className="text-sm text-secondary-text">No rules.</p> : null}
          </div>
        </GovCard>

        <GovCard title="Ownership & governance">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-secondary-text">Owner</dt><dd className="font-medium text-primary-text">{policy.ownerName}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-secondary-text">Reviewers</dt><dd className="text-right text-primary-text">{policy.reviewerIds.map(userName).join(", ") || "—"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-secondary-text">Approvers</dt><dd className="text-right text-primary-text">{policy.approverIds.map(userName).join(", ") || "—"}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-secondary-text">Applies to</dt><dd className="text-right text-primary-text">{policy.appliesToSystems.map((s) => SOURCE_SYSTEM_META[s].label).join(", ")}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-secondary-text">Controls</dt><dd className="text-right text-primary-text">{policy.controlIds.map((id) => controls.find((c) => c.id === id)?.name ?? id).join(", ") || "—"}</dd></div>
          </dl>
        </GovCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <GovCard title="Version history">
          {versions.length === 0 ? <p className="text-sm text-secondary-text">No versions recorded.</p> : (
            <div className="space-y-2">
              {[...versions].sort((a, b) => b.version - a.version).map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <div><p className="text-sm font-medium text-primary-text">v{v.version} · {v.label}</p><p className="text-[11px] text-secondary-text">{v.authorName} · {formatDate(v.createdAt)}</p></div>
                  <Badge variant="secondary">{v.snapshot.ruleCount} rules</Badge>
                </div>
              ))}
            </div>
          )}
        </GovCard>

        <GovCard title="Related decisions" description="Decisions linked to this policy.">
          {decisions.length === 0 ? <p className="text-sm text-secondary-text">No related decisions.</p> : (
            <div className="space-y-2">
              {decisions.map((d) => (
                <Link key={d.id} href={`/governance/decisions/${d.id}` as Route} className="flex items-center justify-between rounded-md border border-border px-3 py-2 focus-ring hover:bg-slate-50">
                  <span className="truncate text-sm text-primary-text">{d.title}</span>
                  <Badge variant="secondary">{d.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </GovCard>
      </div>

      <GovCard title="Policy audit trail">
        {audit.length === 0 ? <p className="text-sm text-secondary-text">No history.</p> : (
          <div className="space-y-2">
            {[...audit].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"><p className="truncate text-sm text-primary-text">{a.summary}</p><span className="text-xs text-secondary-text">{a.actorName} · {relativeTime(a.at)}</span></div>
            ))}
          </div>
        )}
      </GovCard>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Edit policy</DialogTitle></DialogHeader>
          <div className="mt-2"><PolicyForm policyId={policy.id} onSaved={() => setEditOpen(false)} onCancel={() => setEditOpen(false)} /></div>
        </DialogContent>
      </Dialog>

      <Dialog open={versionOpen} onOpenChange={setVersionOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save new version</DialogTitle><DialogDescription>Capture an immutable snapshot of the current policy.</DialogDescription></DialogHeader>
          <Input className="mt-4" value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} placeholder="Version label (e.g. 'Clarified retention window')" />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setVersionOpen(false)}>Cancel</Button>
            <Button onClick={() => { versionPolicy(policy.id, versionLabel || `Version ${policy.version + 1}`); setVersionOpen(false); }}><Save className="size-4" /> Save version</Button>
          </div>
        </DialogContent>
      </Dialog>
    </GovShell>
  );
}
