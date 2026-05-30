"use client";

const SERIES_COLORS = ["#059669", "#2563eb", "#f59e0b", "#dc2626", "#7c3aed"];

export interface BarGroup {
  label: string;
  values: Array<{ key: string; value: number; display: string }>;
}

// Grouped bar chart for comparing the same KPI across multiple runs.
export function ComparisonBarChart({ groups, seriesLabels }: { groups: BarGroup[]; seriesLabels: string[] }) {
  if (groups.length === 0) return <div className="flex h-32 items-center justify-center text-sm text-secondary-text">Nothing to compare yet</div>;
  const allValues = groups.flatMap((g) => g.values.map((v) => Math.abs(v.value)));
  const max = Math.max(...allValues, 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {seriesLabels.map((label, i) => (
          <span key={label} className="inline-flex items-center gap-1.5 text-xs text-secondary-text">
            <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }} />
            {label}
          </span>
        ))}
      </div>
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 text-xs font-medium text-secondary-text">{group.label}</p>
            <div className="space-y-1.5">
              {group.values.map((v, i) => (
                <div key={v.key} className="flex items-center gap-2">
                  <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
                    <div
                      className="flex h-full items-center justify-end rounded px-2"
                      style={{ width: `${Math.max((Math.abs(v.value) / max) * 100, 4)}%`, backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }}
                    >
                      <span className="truncate text-[10px] font-semibold text-white">{v.display}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
