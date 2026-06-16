"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SimulationLineChart } from "@/components/charts/simulation-line-chart";
import { SimulationHistogram } from "@/components/charts/simulation-histogram";
import { CheckCircle2, XCircle } from "lucide-react";
import type { ModelKey, SimulationResult } from "@/lib/simulation";
import { toneToBadge } from "../format";
import { SimCard, RiskBadge } from "./primitives";

const CURRENCY_MODELS: ModelKey[] = ["revenue_projection", "pricing_sensitivity"];

function compact(v: number) {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(v);
}

export function ResultKpiGrid({ result }: { result: SimulationResult }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {result.kpis.map((kpi) => (
        <div key={kpi.key} className={`rounded-lg border border-border p-3 ${kpi.key === result.headlineKpiKey ? "bg-emerald-50" : "bg-surface"}`}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-secondary-text">{kpi.label}</p>
            <Badge variant={toneToBadge(kpi.tone)}>{kpi.tone === "success" ? "good" : kpi.tone === "danger" ? "watch" : kpi.tone === "warning" ? "caution" : "info"}</Badge>
          </div>
          <p className="mt-2 text-xl font-semibold text-primary-text">{kpi.display}</p>
        </div>
      ))}
    </div>
  );
}

export function ResultView({ result, modelKey, xLabel = "Period" }: { result: SimulationResult; modelKey: ModelKey; xLabel?: string }) {
  const isCurrency = CURRENCY_MODELS.includes(modelKey);
  const yFormatter = isCurrency ? (v: number) => `₹${compact(v)}` : compact;
  const chartXLabel = modelKey === "pricing_sensitivity" ? "Price" : modelKey === "inventory_simulation" ? "Day" : xLabel;

  return (
    <div className="space-y-6">
      <SimCard title="Outcome" description={result.trendSummary}>
        <p className="text-sm text-primary-text">{result.outcomeSummary}</p>
        <div className="mt-4">
          <ResultKpiGrid result={result} />
        </div>
      </SimCard>

      <SimCard title="Charts" description="Time series / response curve produced by the model.">
        <SimulationLineChart series={result.series} yFormatter={yFormatter} xLabel={chartXLabel} />
      </SimCard>

      {result.distribution && result.distribution.length > 0 ? (
        <SimCard title="Outcome distribution" description="Monte-Carlo distribution of the total outcome across all runs.">
          <SimulationHistogram values={result.distribution} formatter={(v) => `₹${compact(v)}`} />
        </SimCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <SimCard title="Risk analysis" action={<RiskBadge level={result.risk.level} score={result.risk.score} />}>
          <div className="space-y-3">
            {result.risk.factors.map((f, i) => (
              <div key={i} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-primary-text">{f.label}</p>
                  <Badge variant={f.impact === "low" ? "default" : f.impact === "medium" ? "warning" : "danger"}>{f.impact}</Badge>
                </div>
                <p className="mt-1 text-xs text-secondary-text">{f.detail}</p>
              </div>
            ))}
          </div>
        </SimCard>

        <SimCard title="Sensitivity analysis" description="How much each input moves the headline outcome.">
          <div className="space-y-3">
            {[...result.sensitivity]
              .sort((a, b) => Math.abs(b.outcomeDelta) - Math.abs(a.outcomeDelta))
              .map((s) => {
                const maxDelta = Math.max(...result.sensitivity.map((x) => Math.abs(x.outcomeDelta)), 1);
                return (
                  <div key={s.parameterKey}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-primary-text">{s.parameterLabel}</span>
                      <span className="text-secondary-text">±{s.outcomeDelta}%</span>
                    </div>
                    <div className="mt-1 h-2.5 overflow-hidden rounded bg-slate-100">
                      <div className="h-full rounded bg-ai" style={{ width: `${Math.max((Math.abs(s.outcomeDelta) / maxDelta) * 100, 5)}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </SimCard>
      </div>

      {result.constraintChecks.length > 0 ? (
        <SimCard title="Constraint validation" description="Whether the result satisfies the scenario's governance constraints.">
          <div className="space-y-2">
            {result.constraintChecks.map((c) => (
              <div key={c.constraintId} className={`flex items-center justify-between gap-3 rounded-md border p-3 ${c.satisfied ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                <div className="flex items-center gap-2">
                  {c.satisfied ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-danger" />}
                  <p className="text-sm font-medium text-primary-text">{c.label}</p>
                </div>
                <p className="text-xs text-secondary-text">
                  {c.metric} = {c.actual} (target {c.operator === "lte" ? "≤" : c.operator === "gte" ? "≥" : "="} {c.threshold})
                </p>
              </div>
            ))}
          </div>
        </SimCard>
      ) : null}

      <SimCard title="Detailed table" description="Period-by-period output.">
        <div className="responsive-table-shell max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {result.table.columns.map((col) => (
                  <TableHead key={col}>{col}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.table.rows.map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => (
                    <TableCell key={j}>{cell}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SimCard>
    </div>
  );
}
