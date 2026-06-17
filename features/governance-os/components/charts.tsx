"use client";

type Tone = "brand" | "ai" | "warning" | "danger" | "neutral";
const COLOR: Record<Tone, string> = { brand: "#059669", ai: "#2563eb", warning: "#f59e0b", danger: "#dc2626", neutral: "#94a3b8" };

export interface HBarRow {
  label: string;
  value: number;
  display: string;
  tone?: Tone;
}

export function HBars({ rows, max }: { rows: HBarRow[]; max?: number }) {
  if (rows.length === 0) return <p className="text-sm text-secondary-text">No data</p>;
  const peak = max ?? Math.max(...rows.map((r) => r.value), 1);
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

// Donut-style compliance gauge (pure SVG).
export function ComplianceGauge({ score, target }: { score: number; target: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const color = score >= target ? "#059669" : score >= target * 0.7 ? "#f59e0b" : "#dc2626";
  return (
    <div className="flex items-center gap-4">
      <svg width="128" height="128" viewBox="0 0 128 128" role="img" aria-label={`Compliance score ${score}%`}>
        <circle cx="64" cy="64" r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`} transform="rotate(-90 64 64)" />
        <text x="64" y="60" textAnchor="middle" fontSize="26" fontWeight="700" fill="#0f172a">{score}</text>
        <text x="64" y="80" textAnchor="middle" fontSize="11" fill="#64748b">/ 100</text>
      </svg>
      <div className="text-sm">
        <p className="text-primary-text">Target: <span className="font-semibold">{target}%</span></p>
        <p className={score >= target ? "text-success" : "text-warning"}>{score >= target ? "Meeting target" : `${target - score}% below target`}</p>
      </div>
    </div>
  );
}
