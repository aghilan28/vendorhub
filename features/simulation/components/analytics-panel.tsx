"use client";

import { OperationalBarChart } from "@/components/charts/operational-bar-chart";
import { useSimulationAnalytics } from "../hooks";
import { formatRuntime } from "../format";
import { SimCard } from "./primitives";

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs text-secondary-text">{label}</p>
      <p className="mt-1 text-lg font-semibold text-primary-text">{value}</p>
    </div>
  );
}

export function AnalyticsPanel() {
  const a = useSimulationAnalytics();

  return (
    <SimCard title="Simulation analytics" description="Throughput, reliability, coverage, and impact across the workspace.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Runs" value={String(a.totalRuns)} />
        <MiniStat label="Scenarios" value={String(a.totalScenarios)} />
        <MiniStat label="Success rate" value={`${a.successRate}%`} />
        <MiniStat label="Failure rate" value={`${a.failureRate}%`} />
        <MiniStat label="Average runtime" value={formatRuntime(a.avgRuntimeMs)} />
        <MiniStat label="Recommendation acceptance" value={`${a.recommendationAcceptance}%`} />
        <MiniStat label="Scenario coverage" value={`${a.scenarioCoverage}%`} />
        <MiniStat label="High-impact decisions" value={String(a.highImpactDecisions)} />
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary-text">Runs by model</p>
          {a.runsByModel.length === 0 ? (
            <p className="text-sm text-secondary-text">No runs yet.</p>
          ) : (
            <div className="space-y-2">
              {a.runsByModel.map((m) => {
                const max = Math.max(...a.runsByModel.map((x) => x.count), 1);
                return (
                  <div key={m.model}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-primary-text">{m.model}</span>
                      <span className="text-secondary-text">{m.count}</span>
                    </div>
                    <div className="mt-1 h-2.5 overflow-hidden rounded bg-slate-100">
                      <div className="h-full rounded bg-brand" style={{ width: `${(m.count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary-text">Run throughput</p>
          <OperationalBarChart values={a.runsTrend.some((v) => v > 0) ? a.runsTrend : [0]} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {a.runsByCategory.slice(0, 4).map((c) => (
              <MiniStat key={c.category} label={c.category} value={`${c.count} runs`} />
            ))}
          </div>
        </div>
      </div>
    </SimCard>
  );
}
