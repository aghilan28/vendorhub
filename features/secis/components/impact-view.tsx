"use client";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ImpactAssessment, ImpactEvent, PropagationPath, RiskAssessment } from "@/lib/secis";
import { formatCurrency } from "@/lib/secis";
import { riskVariant, severityVariant } from "../format";

export function DimensionGrid({ impact }: { impact: ImpactAssessment }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {impact.dimensions.map((d) => (
        <div key={d.dimension} className="rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-secondary-text">{d.label}</p>
            <Badge variant={riskVariant(d.level)}>{d.level}</Badge>
          </div>
          <p className="mt-2 text-lg font-semibold text-primary-text">{d.value}</p>
          <div className="mt-2 h-2 overflow-hidden rounded bg-slate-100">
            <div className="h-full rounded bg-ai" style={{ width: `${d.score}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-secondary-text">{d.score}/100</p>
        </div>
      ))}
    </div>
  );
}

export function RiskFactors({ risk }: { risk: RiskAssessment }) {
  return (
    <div className="space-y-2">
      {risk.factors.map((f, i) => (
        <div key={i} className="rounded-md border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-primary-text">{f.label}</p>
            <Badge variant={riskVariant(f.level)}>{f.level}</Badge>
          </div>
          <p className="mt-1 text-xs text-secondary-text">{f.detail}</p>
        </div>
      ))}
    </div>
  );
}

export function AffectedTable({ affected }: { affected: ImpactEvent[] }) {
  return (
    <div className="responsive-table-shell max-h-96 overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Entity</TableHead>
            <TableHead>Depth</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Arrives</TableHead>
            <TableHead>Revenue at risk</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {affected.map((a) => (
            <TableRow key={a.entityId}>
              <TableCell className="font-medium text-primary-text">{a.entityName}</TableCell>
              <TableCell>{a.depth === 0 ? "Origin" : `Hop ${a.depth}`}</TableCell>
              <TableCell>
                <Badge variant={severityVariant(a.severity)}>{Math.round(a.severity * 100)}%</Badge>
              </TableCell>
              <TableCell>P{a.arrivalPeriod}</TableCell>
              <TableCell>{formatCurrency(a.revenueAtRisk)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function PathsList({ paths }: { paths: PropagationPath[] }) {
  if (paths.length === 0) return <p className="text-sm text-secondary-text">No multi-hop paths — the impact is contained at the origin.</p>;
  return (
    <div className="space-y-2">
      {paths.slice(0, 12).map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
          <p className="min-w-0 truncate text-sm text-primary-text">{p.labels.join(" → ")}</p>
          <Badge variant={severityVariant(p.terminalSeverity)}>{Math.round(p.terminalSeverity * 100)}%</Badge>
        </div>
      ))}
    </div>
  );
}
