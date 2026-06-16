"use client";

// Simple histogram for Monte-Carlo distributions (e.g., total profit across runs).
export function SimulationHistogram({ values, bins = 18, formatter = (v: number) => new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(v) }: { values: number[]; bins?: number; formatter?: (v: number) => string }) {
  if (!values || values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = (max - min) / bins || 1;
  const counts = new Array(bins).fill(0);
  for (const v of values) {
    const idx = Math.min(bins - 1, Math.floor((v - min) / width));
    counts[idx] += 1;
  }
  const maxCount = Math.max(...counts, 1);
  const zeroBin = Math.min(bins - 1, Math.max(0, Math.floor((0 - min) / width)));

  return (
    <div>
      <div className="flex h-40 items-end gap-0.5">
        {counts.map((c, i) => (
          <div key={i} className="flex flex-1 items-end" title={`${formatter(min + i * width)} – ${formatter(min + (i + 1) * width)}: ${c} runs`}>
            <div
              className="w-full rounded-t"
              style={{ height: `${(c / maxCount) * 100}%`, backgroundColor: min < 0 && i <= zeroBin ? "#f59e0b" : "#059669" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-secondary-text">
        <span>{formatter(min)}</span>
        <span>Outcome distribution ({values.length} runs)</span>
        <span>{formatter(max)}</span>
      </div>
    </div>
  );
}
