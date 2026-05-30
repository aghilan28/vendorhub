// KARTEX M3 — Comparison logic. Compares completed runs across KPIs, risk,
// outcomes and recommendations to power the visual Comparison Engine.

import type { SimulationRun } from "./types";

export interface KpiComparisonRow {
  key: string;
  label: string;
  values: Array<{ runId: string; value: number; display: string }>;
  best?: string; // runId with the best value (heuristic)
  spread: number; // % spread between best and worst
}

export interface ComparisonOutput {
  runs: SimulationRun[];
  sharedKpis: KpiComparisonRow[];
  riskByRun: Array<{ runId: string; label: string; level: string; score: number }>;
  outcomeByRun: Array<{ runId: string; label: string; summary: string }>;
  bestRunId?: string;
}

// KPIs where a lower value is better.
const LOWER_IS_BETTER = new Set(["loss_probability", "stockout_days", "units_short", "attrition_ratio"]);

export function compareRuns(runs: SimulationRun[]): ComparisonOutput {
  const completed = runs.filter((r) => r.status === "completed" && r.result);
  if (completed.length === 0) {
    return { runs: completed, sharedKpis: [], riskByRun: [], outcomeByRun: [] };
  }

  // Intersect KPI keys across runs.
  const keySets = completed.map((r) => new Set(r.result!.kpis.map((k) => k.key)));
  const sharedKeys = [...keySets[0]].filter((key) => keySets.every((s) => s.has(key)));

  const sharedKpis: KpiComparisonRow[] = sharedKeys.map((key) => {
    const meta = completed[0].result!.kpis.find((k) => k.key === key)!;
    const values = completed.map((r) => {
      const k = r.result!.kpis.find((x) => x.key === key)!;
      return { runId: r.id, value: k.value, display: k.display };
    });
    const numericValues = values.map((v) => v.value);
    const max = Math.max(...numericValues);
    const min = Math.min(...numericValues);
    const lowerBetter = LOWER_IS_BETTER.has(key);
    const bestValue = lowerBetter ? min : max;
    const best = values.find((v) => v.value === bestValue)?.runId;
    const spread = Math.abs(max) > 0 ? ((max - min) / Math.abs(max)) * 100 : 0;
    return { key, label: meta.label, values, best, spread: Math.round(spread * 10) / 10 };
  });

  // Heuristic best run: most "best" KPI wins, tie-break on lowest risk.
  const winCounts = new Map<string, number>();
  for (const row of sharedKpis) {
    if (row.best) winCounts.set(row.best, (winCounts.get(row.best) ?? 0) + 1);
  }
  let bestRunId = completed[0].id;
  let bestScore = -1;
  for (const r of completed) {
    const wins = winCounts.get(r.id) ?? 0;
    const riskPenalty = (r.result!.risk.score ?? 0) / 100;
    const score = wins - riskPenalty;
    if (score > bestScore) {
      bestScore = score;
      bestRunId = r.id;
    }
  }

  return {
    runs: completed,
    sharedKpis,
    riskByRun: completed.map((r) => ({ runId: r.id, label: r.label, level: r.result!.risk.level, score: r.result!.risk.score })),
    outcomeByRun: completed.map((r) => ({ runId: r.id, label: r.label, summary: r.result!.outcomeSummary })),
    bestRunId,
  };
}
