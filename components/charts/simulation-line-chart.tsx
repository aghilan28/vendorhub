"use client";

import { useId } from "react";
import type { ResultSeries } from "@/lib/simulation";

const COLOR: Record<ResultSeries["color"], string> = {
  brand: "#059669",
  ai: "#2563eb",
  warning: "#f59e0b",
  danger: "#dc2626",
  neutral: "#94a3b8",
};

const W = 640;
const H = 260;
const PAD = { top: 16, right: 16, bottom: 28, left: 52 };

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min];
  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, i) => min + step * i);
}

export function SimulationLineChart({
  series,
  height = 260,
  yFormatter = (v: number) => new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(v),
  xLabel = "Period",
}: {
  series: ResultSeries[];
  height?: number;
  yFormatter?: (v: number) => string;
  xLabel?: string;
}) {
  const gradientId = useId();
  const visible = series.filter((s) => s.points.length > 0);
  if (visible.length === 0) {
    return <div className="flex h-40 items-center justify-center text-sm text-secondary-text">No series data</div>;
  }

  const allPoints = visible.flatMap((s) => s.points);
  const xs = allPoints.map((p) => p.x);
  const ys = allPoints.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMinRaw = Math.min(...ys, 0);
  const yMaxRaw = Math.max(...ys);
  const yMin = yMinRaw === yMaxRaw ? yMinRaw - 1 : yMinRaw;
  const yMax = yMinRaw === yMaxRaw ? yMaxRaw + 1 : yMaxRaw;

  const sx = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin || 1)) * (W - PAD.left - PAD.right);
  const sy = (y: number) => H - PAD.bottom - ((y - yMin) / (yMax - yMin || 1)) * (H - PAD.top - PAD.bottom);

  const yTicks = niceTicks(yMin, yMax, 4);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} role="img" aria-label={`Line chart of ${visible.map((s) => s.label).join(", ")}`} className="overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={COLOR[visible[0].color]} stopOpacity="0.18" />
            <stop offset="100%" stopColor={COLOR[visible[0].color]} stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={sy(t)} y2={sy(t)} stroke="#e2e8f0" strokeWidth={1} />
            <text x={PAD.left - 8} y={sy(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {yFormatter(t)}
            </text>
          </g>
        ))}
        <text x={sx(xMin)} y={H - 8} fontSize="11" fill="#64748b" textAnchor="start">
          {xLabel} {Math.round(xMin)}
        </text>
        <text x={sx(xMax)} y={H - 8} fontSize="11" fill="#64748b" textAnchor="end">
          {Math.round(xMax)}
        </text>

        {visible.length === 1 ? (
          <polygon
            fill={`url(#${gradientId})`}
            points={`${sx(visible[0].points[0].x)},${sy(yMin)} ${visible[0].points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ")} ${sx(visible[0].points[visible[0].points.length - 1].x)},${sy(yMin)}`}
          />
        ) : null}

        {visible.map((s) => (
          <polyline
            key={s.key}
            fill="none"
            stroke={COLOR[s.color]}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={s.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ")}
          />
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
