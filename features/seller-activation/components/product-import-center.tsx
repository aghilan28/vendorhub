"use client";

// MCP-1A Phase 4 — Product Population / Import Center.
// Interactive CSV import over the deterministic MCP-0B ingestion engine:
// paste/upload → validate → report (valid/invalid/duplicate/quality) →
// publishable gating + governance + recoverable rows. Template download.

import { useMemo, useState } from "react";
import { Download, FileUp, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GovernanceCard } from "@/features/admin/components/governance-card";
import { IMPORT_TEMPLATE, importCsv, importGovernance, importTemplateCsv } from "@/lib/seller-activation";

export function ProductImportCenter({ sampleCsv, sampled }: { sampleCsv: string; sampled: boolean }) {
  const [csv, setCsv] = useState(sampleCsv);

  const result = useMemo(() => (csv.trim() ? importCsv("preview-seller", csv) : null), [csv]);
  const governance = result ? importGovernance(result.job) : null;

  function downloadTemplate() {
    try {
      const blob = new Blob([importTemplateCsv()], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vendorhub-product-template.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-primary-text"><FileUp className="size-5" /> Product Import</h1>
          <p className="text-sm text-secondary-text">Upload hundreds of products at once. Validated against the marketplace catalog engine.</p>
        </div>
        <Badge variant={sampled ? "warning" : "default"}>{sampled ? "Preview (sample data)" : "Live"}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <GovernanceCard title="Upload catalog (CSV)" description="Paste CSV rows or edit the sample below." action={<Button variant="secondary" className="h-8 px-2 text-xs" onClick={downloadTemplate}><Download className="size-3" /> Template</Button>}>
          <textarea
            className="focus-ring h-56 w-full rounded-md border border-border bg-surface p-3 font-mono text-xs"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            spellCheck={false}
            aria-label="CSV import"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {IMPORT_TEMPLATE.map((c) => (
              <Badge key={c.key} variant="secondary">{c.key}{c.required ? "*" : ""}</Badge>
            ))}
          </div>
        </GovernanceCard>

        <div className="space-y-4">
          <GovernanceCard title="Import report" action={<ShieldCheck className="size-4 text-secondary-text" />}>
            {result ? (
              <>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Metric label="Total" value={result.report.total} />
                  <Metric label="Publishable" value={result.job.publishable} tone="good" />
                  <Metric label="Invalid" value={result.report.invalid} tone={result.report.invalid ? "bad" : undefined} />
                  <Metric label="Duplicates" value={result.report.duplicates} tone={result.report.duplicates ? "warn" : undefined} />
                  <Metric label="Warnings" value={result.report.warnings} />
                  <Metric label="Avg quality" value={result.report.averageQuality} />
                </div>
                {result.parseErrors.length ? (
                  <p className="mt-3 text-xs text-red-700">Parse: {result.parseErrors.join(", ")}</p>
                ) : null}
                {governance ? (
                  <div className={`mt-3 rounded-md border p-2 text-xs ${governance.canPublish ? "border-emerald-200 text-emerald-700" : "border-amber-200 text-amber-700"}`}>
                    {governance.canPublish ? (
                      <span className="inline-flex items-center gap-1"><ShieldCheck className="size-3" /> {result.job.publishable} rows ready to publish.</span>
                    ) : (
                      <span className="inline-flex items-center gap-1"><TriangleAlert className="size-3" /> {governance.reasons.join(" ")}</span>
                    )}
                  </div>
                ) : null}
                <Button className="mt-3 w-full" disabled={!governance?.canPublish}>{governance?.canPublish ? `Publish ${result.job.publishable} products` : "Resolve issues to publish"}</Button>
                {result.job.recoverableRefs.length ? (
                  <p className="mt-2 text-xs text-secondary-text">{result.job.recoverableRefs.length} row(s) can be fixed and re-imported.</p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-secondary-text">Paste CSV to see the validation report.</p>
            )}
          </GovernanceCard>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "good" | "warn" | "bad" }) {
  const color = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-red-600" : tone === "warn" ? "text-amber-600" : "text-primary-text";
  return (
    <div className="rounded-md border border-border p-2">
      <p className="text-xs text-secondary-text">{label}</p>
      <p className={`text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}
