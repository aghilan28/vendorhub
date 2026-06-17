"use client";

import { useMemo } from "react";
import { Waypoints } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildAdjacency } from "@/lib/secis";
import { useSecisStore, SYSTEM_ORDER } from "@/store/secis-store";
import { useHydrated } from "../hooks";
import { SecisShell, SecisCard, StatTile } from "./primitives";
import { GraphView } from "./graph-view";
import { HBars } from "./charts";
import { ListSkeleton } from "./skeletons";

export function DependenciesScreen() {
  const hydrated = useHydrated();
  const entities = useSecisStore((s) => s.entities);
  const edges = useSecisStore((s) => s.edges);
  const systems = useSecisStore((s) => s.systems);

  const deps = useMemo(() => edges.filter((e) => e.category === "dependency"), [edges]);
  const entityMap = useMemo(() => new Map(entities.map((e) => [e.id, e])), [entities]);
  const mostDepended = useMemo(() => {
    const adj = buildAdjacency(deps);
    return entities
      .filter((e) => e.status === "active")
      .map((e) => ({ name: e.name, value: (adj.downstream.get(e.id) ?? []).length }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [entities, deps]);

  if (!hydrated) return <ListSkeleton />;

  return (
    <SecisShell title="Dependency Graph" description="The directed dependency network — who supplies, stocks, fulfils, and serves whom. Edge thickness reflects coupling strength.">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Dependencies" value={String(deps.length)} icon={Waypoints} tone="info" />
        <StatTile label="Entities" value={String(entities.filter((e) => e.status === "active").length)} tone="neutral" />
        <StatTile label="Systems" value={String(systems.filter((s) => s.status === "active").length)} tone="neutral" />
      </div>

      <SecisCard title="Topology" description="Entities by system (left → right). Hover a node for details.">
        <GraphView entities={entities} edges={edges} systems={systems} systemOrder={SYSTEM_ORDER} category="dependency" />
      </SecisCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SecisCard title="Most depended-on entities" description="Highest number of downstream dependents.">
          <HBars rows={mostDepended.map((m) => ({ label: m.name, value: m.value, display: String(m.value), tone: "ai" }))} max={mostDepended[0]?.value ?? 1} />
        </SecisCard>
        <SecisCard title="Dependency list" description={`${deps.length} edges`}>
          <div className="responsive-table-shell max-h-96 overflow-y-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Upstream</TableHead><TableHead>Type</TableHead><TableHead>Downstream</TableHead><TableHead>Weight</TableHead></TableRow></TableHeader>
              <TableBody>
                {deps.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-primary-text">{entityMap.get(e.sourceId)?.name ?? e.sourceId}</TableCell>
                    <TableCell><Badge variant="secondary">{e.type}</Badge></TableCell>
                    <TableCell className="text-primary-text">{entityMap.get(e.targetId)?.name ?? e.targetId}</TableCell>
                    <TableCell>{Math.round(e.weight * 100)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SecisCard>
      </div>
    </SecisShell>
  );
}
