"use client";

import { useMemo } from "react";
import type { ImpactEvent, PropagationPath } from "@/lib/secis";
import { severityColor } from "../format";

const COL_W = 196;
const ROW_H = 78;
const TOP = 44;
const LEFT = 48;
const R = 13;

function truncate(s: string, n = 18) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

// Node-link diagram laying out the propagation tree by depth (origin → blast radius).
export function PropagationGraph({
  affected,
  paths,
  originId,
  selectedId,
  onSelect,
}: {
  affected: ImpactEvent[];
  paths: PropagationPath[];
  originId: string;
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const layout = useMemo(() => {
    const maxDepth = Math.max(...affected.map((a) => a.depth), 0);
    const byDepth = new Map<number, ImpactEvent[]>();
    for (let d = 0; d <= maxDepth; d += 1) byDepth.set(d, []);
    for (const a of [...affected].sort((x, y) => y.severity - x.severity)) {
      byDepth.get(a.depth)!.push(a);
    }
    const maxRows = Math.max(...[...byDepth.values()].map((arr) => arr.length), 1);

    const pos = new Map<string, { x: number; y: number }>();
    for (const [depth, arr] of byDepth.entries()) {
      const colOffset = ((maxRows - arr.length) * ROW_H) / 2;
      arr.forEach((a, i) => pos.set(a.entityId, { x: LEFT + depth * COL_W, y: TOP + colOffset + i * ROW_H }));
    }

    // Parent edge per affected node (from its best path).
    const parentOf = new Map<string, string>();
    for (const p of paths) {
      if (p.nodeIds.length >= 2) parentOf.set(p.nodeIds[p.nodeIds.length - 1], p.nodeIds[p.nodeIds.length - 2]);
    }

    const width = Math.max(560, LEFT * 2 + maxDepth * COL_W + 80);
    const height = TOP + maxRows * ROW_H + 24;
    return { pos, parentOf, width, height, maxDepth };
  }, [affected, paths]);

  if (affected.length === 0) {
    return <p className="text-sm text-secondary-text">No propagation to display.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} width={layout.width} height={layout.height} role="img" aria-label="Change propagation graph" className="max-w-full">
        {/* depth column labels */}
        {Array.from({ length: layout.maxDepth + 1 }).map((_, d) => (
          <text key={d} x={LEFT + d * COL_W} y={20} fontSize="11" fill="#94a3b8" textAnchor="middle">
            {d === 0 ? "Origin" : `Hop ${d}`}
          </text>
        ))}

        {/* edges */}
        {affected.map((a) => {
          const parentId = layout.parentOf.get(a.entityId);
          if (!parentId) return null;
          const from = layout.pos.get(parentId);
          const to = layout.pos.get(a.entityId);
          if (!from || !to) return null;
          const midX = (from.x + to.x) / 2;
          const sev = a.severity;
          return (
            <path
              key={`edge-${a.entityId}`}
              d={`M ${from.x + R} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x - R} ${to.y}`}
              fill="none"
              stroke={severityColor(sev)}
              strokeWidth={1 + sev * 4}
              opacity={0.55}
            />
          );
        })}

        {/* nodes */}
        {affected.map((a) => {
          const p = layout.pos.get(a.entityId);
          if (!p) return null;
          const isOrigin = a.entityId === originId;
          const isSelected = a.entityId === selectedId;
          const radius = R + (isOrigin ? 5 : 0);
          return (
            <g key={a.entityId} transform={`translate(${p.x}, ${p.y})`} className={onSelect ? "cursor-pointer" : undefined} onClick={() => onSelect?.(a.entityId)}>
              <title>{`${a.entityName} — severity ${Math.round(a.severity * 100)}%, depth ${a.depth}, period ${a.arrivalPeriod}`}</title>
              {isSelected ? <circle r={radius + 5} fill="none" stroke="#2563eb" strokeWidth={2} /> : null}
              <circle r={radius} fill={severityColor(a.severity)} stroke={isOrigin ? "#1e293b" : "#ffffff"} strokeWidth={isOrigin ? 2.5 : 1.5} />
              <text y={4} fontSize="10" fontWeight="600" fill="#ffffff" textAnchor="middle">
                {Math.round(a.severity * 100)}
              </text>
              <text y={radius + 14} fontSize="10.5" fill="#0f172a" textAnchor="middle">
                {truncate(a.entityName)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-secondary-text">
        <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-full" style={{ background: severityColor(0.8) }} /> high</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-full" style={{ background: severityColor(0.5) }} /> medium</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-full" style={{ background: severityColor(0.25) }} /> low</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-full" style={{ background: severityColor(0.1) }} /> minimal</span>
        <span>Number = severity %. Ring = origin.</span>
      </div>
    </div>
  );
}
