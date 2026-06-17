"use client";

import { useMemo } from "react";
import { layeredPositions, type EdgeCategory, type SecisEdge, type SecisEntity, type SecisSystem } from "@/lib/secis";

const COL_W = 158;
const ROW_H = 60;
const TOP = 40;
const LEFT = 24;
const R = 9;

function critColor(c: number) {
  if (c >= 0.8) return "#dc2626";
  if (c >= 0.6) return "#f59e0b";
  return "#10b981";
}
function truncate(s: string, n = 16) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

// Layered topology: entities arranged in columns by system; edges drawn between them.
export function GraphView({
  entities,
  edges,
  systems,
  systemOrder,
  category,
}: {
  entities: SecisEntity[];
  edges: SecisEdge[];
  systems: SecisSystem[];
  systemOrder: string[];
  category?: EdgeCategory;
}) {
  const active = useMemo(() => entities.filter((e) => e.status === "active"), [entities]);
  const layout = useMemo(() => layeredPositions(active, systemOrder), [active, systemOrder]);
  const pos = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const e of active) {
      const l = layout.get(e.id);
      if (l) m.set(e.id, { x: LEFT + l.col * COL_W + COL_W / 2, y: TOP + l.row * ROW_H });
    }
    return m;
  }, [active, layout]);

  const cols = systemOrder.length;
  const maxRows = Math.max(...[...layout.values()].map((l) => l.maxRows), 1);
  const width = LEFT * 2 + cols * COL_W;
  const height = TOP + maxRows * ROW_H + 20;
  const shownEdges = edges.filter((e) => (!category || e.category === category) && pos.has(e.sourceId) && pos.has(e.targetId));

  if (active.length === 0) return <p className="text-sm text-secondary-text">No entities to display.</p>;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label="Dependency graph" className="max-w-full">
        {systemOrder.map((sysId, i) => (
          <text key={sysId} x={LEFT + i * COL_W + COL_W / 2} y={18} fontSize="10.5" fontWeight="600" fill="#64748b" textAnchor="middle">
            {truncate(systems.find((s) => s.id === sysId)?.name ?? "", 14)}
          </text>
        ))}
        {shownEdges.map((edge) => {
          const f = pos.get(edge.sourceId)!;
          const t = pos.get(edge.targetId)!;
          const midX = (f.x + t.x) / 2;
          return <path key={edge.id} d={`M ${f.x} ${f.y} C ${midX} ${f.y}, ${midX} ${t.y}, ${t.x} ${t.y}`} fill="none" stroke={edge.category === "relationship" ? "#94a3b8" : "#cbd5e1"} strokeWidth={0.6 + edge.weight * 2.2} opacity={0.6} strokeDasharray={edge.category === "relationship" ? "3 3" : undefined} />;
        })}
        {active.map((e) => {
          const p = pos.get(e.id);
          if (!p) return null;
          return (
            <g key={e.id} transform={`translate(${p.x}, ${p.y})`}>
              <title>{`${e.name} — criticality ${Math.round(e.criticality * 100)}%`}</title>
              <circle r={R} fill={critColor(e.criticality)} stroke="#ffffff" strokeWidth={1.5} />
              <text y={R + 12} fontSize="9.5" fill="#0f172a" textAnchor="middle">{truncate(e.name)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
