"use client";

import Link from "next/link";
import type { Route } from "next";
import { FileText, Gavel, ClipboardCheck, Stamp, FileWarning, ShieldCheck, ShieldAlert, ScrollText, Workflow, Lightbulb, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AUDIT_ACTION_LABELS, POLICY_STATUS_META, priorityVariant, relativeTime } from "../format";
import { useGovernanceDashboard, useHydrated, useRecommendations } from "../hooks";
import { useGovernanceStore } from "@/store/governance-store";
import { GovShell, GovCard, StatTile, NavCard, DecisionStatusBadge } from "./primitives";
import { HBars, ComplianceGauge } from "./charts";
import { DashboardSkeleton } from "./skeletons";

export function CommandCenter() {
  const hydrated = useHydrated();
  const dash = useGovernanceDashboard();
  const recs = useRecommendations();
  const policies = useGovernanceStore((s) => s.policies);
  const decisions = useGovernanceStore((s) => s.decisions);
  const risks = useGovernanceStore((s) => s.risks);
  const audit = useGovernanceStore((s) => s.audit);
  const settings = useGovernanceStore((s) => s.settings);

  if (!hydrated) return <DashboardSkeleton />;

  const pendingReviewDecisions = decisions.filter((d) => d.status === "review").slice(0, 5);
  const recentAudit = [...audit].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 6);
  const riskBySeverity = (["critical", "high", "medium", "low"] as const).map((sev) => ({
    label: sev,
    value: risks.filter((r) => r.severity === sev).length,
    display: String(risks.filter((r) => r.severity === sev).length),
    tone: (sev === "critical" || sev === "high" ? "danger" : sev === "medium" ? "warning" : "brand") as "danger" | "warning" | "brand",
  }));
  const policyByStatus = (["published", "approved", "review", "draft", "archived"] as const).map((st) => ({ label: POLICY_STATUS_META[st].label, value: policies.filter((p) => p.status === st).length, display: String(policies.filter((p) => p.status === st).length), tone: "ai" as const }));

  return (
    <GovShell
      title="Governance Operating Center"
      description="One place to govern everything: policies, decisions, approvals, exceptions, compliance, risk, and a complete audit trail across the Research, Knowledge, Simulation, and SECIS systems."
      actions={
        <>
          <Button asChild variant="secondary"><Link href="/governance/policies"><FileText className="size-4" /> Policies</Link></Button>
          <Button asChild><Link href="/governance/decisions"><Plus className="size-4" /> New decision</Link></Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Policies" value={String(dash.policies)} helper={`${dash.publishedPolicies} published · ${dash.draftPolicies} draft`} icon={FileText} tone="info" />
        <StatTile label="Decisions" value={String(dash.decisions)} helper={`${dash.pendingReviews} pending review`} icon={Gavel} tone="neutral" />
        <StatTile label="Compliance score" value={`${dash.complianceScore}%`} helper={`Target ${settings.complianceTargetPct}% · coverage ${dash.controlCoverage}%`} icon={ShieldCheck} tone={dash.complianceScore >= settings.complianceTargetPct ? "success" : "warning"} />
        <StatTile label="Open risks" value={String(dash.openRisks)} helper={`${dash.criticalRisks} critical`} icon={ShieldAlert} tone={dash.criticalRisks ? "danger" : "neutral"} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Pending reviews" value={String(dash.pendingReviews)} icon={ClipboardCheck} tone={dash.pendingReviews ? "warning" : "neutral"} />
        <StatTile label="Pending approvals" value={String(dash.pendingApprovals)} icon={Stamp} tone={dash.pendingApprovals ? "warning" : "neutral"} />
        <StatTile label="Pending exceptions" value={String(dash.pendingExceptions)} icon={FileWarning} tone={dash.pendingExceptions ? "warning" : "neutral"} />
        <StatTile label="Audit events" value={String(dash.auditEvents)} icon={ScrollText} tone="neutral" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <GovCard title="Compliance status" description="Control effectiveness across the platform.">
          <ComplianceGauge score={dash.complianceScore} target={settings.complianceTargetPct} />
        </GovCard>
        <GovCard title="Governance risks" description="Open risks by severity." action={<Link href={"/governance/risks" as Route} className="text-xs font-medium text-ai hover:underline">Risk center</Link>}>
          <HBars rows={riskBySeverity} />
        </GovCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <GovCard title="Pending approvals & reviews" description="Decisions awaiting governance." action={<Link href={"/governance/approvals" as Route} className="text-xs font-medium text-ai hover:underline">Approvals</Link>}>
          {pendingReviewDecisions.length === 0 ? <p className="text-sm text-secondary-text">Nothing pending.</p> : (
            <div className="space-y-2">
              {pendingReviewDecisions.map((d) => (
                <Link key={d.id} href={`/governance/decisions/${d.id}` as Route} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 focus-ring hover:bg-slate-50">
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-primary-text">{d.title}</p><p className="text-xs text-secondary-text">{d.sourceSystem} · {d.ownerName} · {relativeTime(d.updatedAt)}</p></div>
                  <DecisionStatusBadge status={d.status} />
                </Link>
              ))}
            </div>
          )}
        </GovCard>

        <GovCard title="Recommendations" description="Where governance attention is needed." action={<Badge variant={recs.length ? "warning" : "default"}>{recs.length}</Badge>}>
          {recs.length === 0 ? <p className="text-sm text-secondary-text">No outstanding governance gaps.</p> : (
            <div className="space-y-2">
              {recs.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-start gap-2 rounded-md border border-border p-3">
                  <Lightbulb className="mt-0.5 size-4 text-secondary-text" />
                  <div className="min-w-0"><p className="text-sm font-medium text-primary-text">{r.title}</p><p className="text-xs text-secondary-text">{r.detail}</p></div>
                  <Badge variant={priorityVariant(r.priority)}>{r.priority}</Badge>
                </div>
              ))}
            </div>
          )}
        </GovCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <GovCard title="Recent audit activity" description="Who did what, when." action={<Link href={"/governance/audit" as Route} className="text-xs font-medium text-ai hover:underline">Audit center</Link>}>
          <div className="space-y-2">
            {recentAudit.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                <div className="min-w-0"><p className="truncate text-sm text-primary-text">{a.summary}</p><p className="text-xs text-secondary-text">{a.actorName} · {relativeTime(a.at)}</p></div>
                <Badge variant="secondary">{AUDIT_ACTION_LABELS[a.action]}</Badge>
              </div>
            ))}
          </div>
        </GovCard>
        <GovCard title="Policy status" description="Lifecycle distribution.">
          <HBars rows={policyByStatus} />
        </GovCard>
      </div>

      <GovCard title="Quick navigation">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NavCard href="/governance/policies" label="Policy Management" icon={FileText} />
          <NavCard href="/governance/decisions" label="Decision Center" icon={Gavel} />
          <NavCard href="/governance/workflows" label="Workflow Engine" icon={Workflow} />
          <NavCard href="/governance/exceptions" label="Exceptions" icon={FileWarning} />
        </div>
      </GovCard>
    </GovShell>
  );
}
