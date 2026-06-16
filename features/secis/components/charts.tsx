"use client";

type SeriesColor = "brand" | "ai" | "warning" | "danger" | "neutral";

const COLOR: Record<SeriesColor, string> = {
  brand: "#059669",
  ai: "#2563eb",
  warning: "#f59e0b",
  danger: "#dc2626",
  neutral: "#94a3b8",
};

export interface ChartSeries {
  key: string;
  label: string;
  color: SeriesColor;
  points: Array<{ x: number; y: number }>;
}

const W = 640;
const H = 240;
const PAD = { top: 16, right: 16, bottom: 28, left: 48 };

function ticks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min];
  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, i) => min + step * i);
}

export function SecisLineChart({
  series,
  height = 240,
  yFormatter = (v: number) => new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(v),
  xLabel = "Period",
}: {
  series: ChartSeries[];
  height?: number;
  yFormatter?: (v: number) => string;
  xLabel?: string;
}) {
  const visible = series.filter((s) => s.points.length > 0);
  if (visible.length === 0) return <div className="flex h-40 items-center justify-center text-sm text-secondary-text">No data</div>;

  const all = visible.flatMap((s) => s.points);
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys, 0);
  const yMaxRaw = Math.max(...ys);
  const yMax = yMin === yMaxRaw ? yMaxRaw + 1 : yMaxRaw;

  const sx = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin || 1)) * (W - PAD.left - PAD.right);
  const sy = (y: number) => H - PAD.bottom - ((y - yMin) / (yMax - yMin || 1)) * (H - PAD.top - PAD.bottom);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} role="img" aria-label={`Chart of ${visible.map((s) => s.label).join(", ")}`}>
        {ticks(yMin, yMax, 4).map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={sy(t)} y2={sy(t)} stroke="#e2e8f0" strokeWidth={1} />
            <text x={PAD.left - 8} y={sy(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {yFormatter(t)}
            </text>
          </g>
        ))}
        <text x={sx(xMin)} y={H - 8} fontSize="11" fill="#64748b">{xLabel} {Math.round(xMin)}</text>
        <text x={sx(xMax)} y={H - 8} fontSize="11" fill="#64748b" textAnchor="end">{Math.round(xMax)}</text>
        {visible.map((s) => (
          <polyline key={s.key} fill="none" stroke={COLOR[s.color]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" points={s.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ")} />
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {visible.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-secondary-text">
            <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: COLOR[s.color] }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export interface HBarRow {
  label: string;
  value: number; // 0..100 for proportional fill
  display: string;
  tone?: SeriesColor;
}

// Horizontal bar list for impact dimensions, influence, risk scores.
export function HBars({ rows, max = 100 }: { rows: HBarRow[]; max?: number }) {
  if (rows.length === 0) return <p className="text-sm text-secondary-text">No data</p>;
  const peak = Math.max(...rows.map((r) => r.value), max);
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-primary-text">{r.label}</span>
            <span className="text-secondary-text">{r.display}</span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded bg-slate-100">
            <div className="h-full rounded" style={{ width: `${Math.max((r.value / peak) * 100, 3)}%`, backgroundColor: COLOR[r.tone ?? "brand"] }} />
          </div>
        </div>
      ))}
    </div>
  );
}
