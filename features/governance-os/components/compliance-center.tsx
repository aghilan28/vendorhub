"use client";

import { ShieldCheck, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { computeCompliance, controlCoverage, type CheckStatus } from "@/lib/governance-os";
import { useGovernanceStore } from "@/store/governance-store";
import { useHydrated, usePermission } from "../hooks";
import { checkVariant, formatDate } from "../format";
import { GovShell, GovCard, StatTile } from "./primitives";
import { HBars, ComplianceGauge } from "./charts";
import { ListSkeleton } from "./skeletons";

const STATUS_CYCLE: CheckStatus[] = ["pass", "warning", "fail", "not_assessed"];

export function ComplianceCenter() {
  const hydrated = useHydrated();
  const checks = useGovernanceStore((s) => s.checks);
  const controls = useGovernanceStore((s) => s.controls);
  const policies = useGovernanceStore((s) => s.policies);
  const settings = useGovernanceStore((s) => s.settings);
  const runCheck = useGovernanceStore((s) => s.runCheck);
  const canManage = usePermission("risk.manage");
  if (!hydrated) return <ListSkeleton />;

  const summary = computeCompliance(checks);
  const coverage = controlCoverage(policies);
  const violations = checks.filter((c) => c.status === "fail");
  const byStatus = [
    { label: "Pass", value: summary.counts.pass, display: String(summary.counts.pass), tone: "brand" as const },
    { label: "Warning", value: summary.counts.warning, display: String(summary.counts.warning), tone: "warning" as const },
    { label: "Fail", value: summary.counts.fail, display: String(summary.counts.fail), tone: "danger" as const },
    { label: "Not assessed", value: summary.counts.not_assessed, display: String(summary.counts.not_assessed), tone: "neutral" as const },
  ];

  return (
    <GovShell title="Compliance Center" description="Track controls, run compliance checks, surface violations, and measure policy and control coverage.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Compliance score" value={`${summary.score}%`} icon={ShieldCheck} tone={summary.score >= settings.complianceTargetPct ? "success" : "warning"} />
        <StatTile label="Assessment coverage" value={`${summary.coverage}%`} tone="info" />
        <StatTile label="Policy control coverage" value={`${coverage}%`} tone="info" />
        <StatTile label="Open violations" value={String(violations.length)} tone={violations.length ? "danger" : "success"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <GovCard title="Compliance status"><ComplianceGauge score={summary.score} target={settings.complianceTargetPct} /></GovCard>
        <GovCard title="Checks by status"><HBars rows={byStatus} /></GovCard>
      </div>

      {violations.length > 0 ? (
        <GovCard title="Violations" description="Failing controls that require remediation.">
          <div className="space-y-2">
            {violations.map((c) => <div key={c.id} className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2"><div className="min-w-0"><p className="truncate text-sm font-medium text-primary-text">{c.title}</p><p className="text-xs text-secondary-text">{c.evidence}</p></div><Badge variant="danger">fail</Badge></div>)}
          </div>
        </GovCard>
      ) : null}

      <GovCard title="Compliance checks" description="Run a check to cycle its status (pass → warning → fail → not assessed).">
        <div className="responsive-table-shell">
          <Table>
            <TableHeader><TableRow><TableHead>Check</TableHead><TableHead>Control</TableHead><TableHead>Status</TableHead><TableHead>Owner</TableHead><TableHead>Last checked</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {checks.map((c) => {
                const control = controls.find((x) => x.id === c.controlId);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-primary-text">{c.title}</TableCell>
                    <TableCell>{control?.name ?? "—"}</TableCell>
                    <TableCell><Badge variant={checkVariant(c.status)}>{c.status.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell>{c.ownerName}</TableCell>
                    <TableCell>{formatDate(c.lastCheckedAt)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="secondary" disabled={!canManage} onClick={() => { const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(c.status) + 1) % STATUS_CYCLE.length]; runCheck(c.id, next, ""); }}><Check className="size-4" /> Run</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </GovCard>

      <GovCard title="Controls" description="Preventive, detective, and corrective controls.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {controls.map((c) => (
            <div key={c.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-primary-text">{c.name}</p><Badge variant="secondary">{c.type}</Badge></div>
              <p className="mt-1 text-xs text-secondary-text">{c.description}</p>
              <p className="mt-1 text-[11px] text-secondary-text">{c.policyIds.length} linked policies · {c.ownerName}</p>
            </div>
          ))}
        </div>
      </GovCard>
    </GovShell>
  );
}
