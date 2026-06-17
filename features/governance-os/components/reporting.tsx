"use client";

import { useState } from "react";
import { FileBarChart, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/feedback/empty-state";
import type { ReportKind } from "@/lib/governance-os";
import { useGovernanceStore } from "@/store/governance-store";
import { useHydrated, usePermission } from "../hooks";
import { formatDateTime, relativeTime } from "../format";
import { GovShell, GovCard } from "./primitives";
import { ListSkeleton } from "./skeletons";

const KINDS: Array<{ kind: ReportKind; label: string }> = [
  { kind: "policy", label: "Policy report" },
  { kind: "decision", label: "Decision report" },
  { kind: "risk", label: "Risk report" },
  { kind: "compliance", label: "Compliance report" },
  { kind: "audit", label: "Audit report" },
];

function downloadCsv(filename: string, columns: string[], rows: string[][]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [columns.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function Reporting() {
  const hydrated = useHydrated();
  const reports = useGovernanceStore((s) => s.reports);
  const generateReport = useGovernanceStore((s) => s.generateReport);
  const deleteReport = useGovernanceStore((s) => s.deleteReport);
  const canGenerate = usePermission("report.generate");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!hydrated) return <ListSkeleton />;
  const selected = selectedId ? reports.find((r) => r.id === selectedId) : reports[0];

  return (
    <GovShell title="Governance Reporting" description="Generate and export policy, decision, risk, compliance, and audit reports.">
      <GovCard title="Generate a report" description="Reports are generated from the live governance state.">
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => <Button key={k.kind} variant="secondary" disabled={!canGenerate} onClick={() => { const id = generateReport(k.kind); setSelectedId(id); }}><FileBarChart className="size-4" /> {k.label}</Button>)}
        </div>
        {!canGenerate ? <p className="mt-2 text-xs text-danger">Your role cannot generate reports.</p> : null}
      </GovCard>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <GovCard title="Generated reports" description={`${reports.length} report(s)`}>
          {reports.length === 0 ? <p className="text-sm text-secondary-text">No reports yet.</p> : (
            <div className="space-y-1.5">
              {reports.map((r) => (
                <button key={r.id} type="button" onClick={() => setSelectedId(r.id)} className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left focus-ring ${selected?.id === r.id ? "border-brand bg-emerald-50" : "border-border hover:bg-slate-50"}`}>
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-primary-text">{r.title}</p><p className="text-[11px] text-secondary-text">{r.generatedByName} · {relativeTime(r.generatedAt)}</p></div>
                  <Badge variant="secondary">{r.kind}</Badge>
                </button>
              ))}
            </div>
          )}
        </GovCard>

        <div>
          {selected ? (
            <GovCard title={selected.title} description={`Generated ${formatDateTime(selected.generatedAt)} by ${selected.generatedByName}`} action={
              <div className="flex gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => selected.sections.forEach((sec, i) => downloadCsv(`${selected.kind}-report-${i + 1}.csv`, sec.columns, sec.rows))}><Download className="size-4" /> Export CSV</Button>
                <Button size="sm" variant="ghost" className="text-danger" onClick={() => { deleteReport(selected.id); setSelectedId(null); }} aria-label="Delete report"><Trash2 className="size-4" /></Button>
              </div>
            }>
              <p className="text-sm text-primary-text">{selected.summary}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {selected.metrics.map((m) => <div key={m.label} className="rounded-md bg-slate-50 p-3"><p className="text-xs text-secondary-text">{m.label}</p><p className="mt-1 text-lg font-semibold text-primary-text">{m.value}</p></div>)}
              </div>
              {selected.sections.map((sec) => (
                <div key={sec.heading} className="mt-5">
                  <p className="mb-2 text-sm font-semibold text-primary-text">{sec.heading}</p>
                  <div className="responsive-table-shell max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader><TableRow>{sec.columns.map((c) => <TableHead key={c}>{c}</TableHead>)}</TableRow></TableHeader>
                      <TableBody>{sec.rows.map((row, i) => <TableRow key={i}>{row.map((cell, j) => <TableCell key={j}>{cell}</TableCell>)}</TableRow>)}</TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </GovCard>
          ) : (
            <EmptyState icon={FileBarChart} title="No report selected" description="Generate a report above to view and export it." />
          )}
        </div>
      </div>
    </GovShell>
  );
}
