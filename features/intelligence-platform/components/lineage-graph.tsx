"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { STAGE_META, STAGE_ORDER, type IntelligenceNode } from "@/lib/intelligence-platform";

const COL_W = 188;
const ROW_H = 86;
const TOP = 40;
const LEFT = 24;
const R = 11;

function truncate(s: string, n = 22) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

// Visual lineage graph: canonical nodes laid out by stage column with edges
// following parent links. Clicking a node opens the underlying item.
export function LineageGraph({ nodes }: { nodes: IntelligenceNode[] }) {
  const router = useRouter();
  const layout = useMemo(() => {
    const pos = new Map<string, { x: number; y: number; node: IntelligenceNode }>();
    STAGE_ORDER.forEach((stage, col) => {
      const stageNodes = nodes.filter((n) => n.stage === stage);
      stageNodes.forEach((n, row) => pos.set(n.id, { x: LEFT + col * COL_W + COL_W / 2, y: TOP + row * ROW_H, node: n }));
    });
    const maxRows = Math.max(...STAGE_ORDER.map((stage) => nodes.filter((n) => n.stage === stage).length), 1);
    return { pos, width: LEFT * 2 + STAGE_ORDER.length * COL_W, height: TOP + maxRows * ROW_H + 20 };
  }, [nodes]);

  if (nodes.length === 0) return <p className="text-sm text-secondary-text">No lineage to display.</p>;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} width={layout.width} height={layout.height} role="img" aria-label="Cross-system lineage graph" className="max-w-full">
        {STAGE_ORDER.map((stage, col) => (
          <text key={stage} x={LEFT + col * COL_W + COL_W / 2} y={18} fontSize="11" fontWeight="600" fill="#64748b" textAnchor="middle">{STAGE_META[stage].label}</text>
        ))}
        {/* edges from parents */}
        {nodes.map((n) =>
          n.parentIds.map((pid) => {
            const from = layout.pos.get(pid);
            const to = layout.pos.get(n.id);
            if (!from || !to) return null;
            const midX = (from.x + to.x) / 2;
            return <path key={`${pid}-${n.id}`} d={`M ${from.x + R} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x - R} ${to.y}`} fill="none" stroke="#cbd5e1" strokeWidth={2} />;
          }),
        )}
        {/* nodes */}
        {[...layout.pos.values()].map(({ x, y, node }) => {
          const meta = STAGE_META[node.stage];
          return (
            <g key={node.id} transform={`translate(${x}, ${y})`} className={node.refRoute ? "cursor-pointer" : undefined} onClick={() => node.refRoute && router.push(node.refRoute as Route)}>
              <title>{`${node.title} (${meta.label}${node.refRoute ? ` — opens ${node.refRoute}` : ""})`}</title>
              <circle r={R} fill={meta.color} stroke="#ffffff" strokeWidth={2} />
              <text y={R + 13} fontSize="10" fill="#0f172a" textAnchor="middle">{truncate(node.title)}</text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-[11px] text-secondary-text">Click a node to open the underlying item in its system.</p>
    </div>
  );
}
