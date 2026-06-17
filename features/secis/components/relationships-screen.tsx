"use client";

import { useMemo } from "react";
import { Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/feedback/empty-state";
import { useSecisStore, SYSTEM_ORDER } from "@/store/secis-store";
import { useHydrated } from "../hooks";
import { SecisShell, SecisCard, StatTile } from "./primitives";
import { GraphView } from "./graph-view";
import { ListSkeleton } from "./skeletons";

export function RelationshipsScreen() {
  const hydrated = useHydrated();
  const entities = useSecisStore((s) => s.entities);
  const edges = useSecisStore((s) => s.edges);
  const systems = useSecisStore((s) => s.systems);

  const rels = useMemo(() => edges.filter((e) => e.category === "relationship"), [edges]);
  const entityMap = useMemo(() => new Map(entities.map((e) => [e.id, e])), [entities]);

  if (!hydrated) return <ListSkeleton />;

  return (
    <SecisShell title="Relationships" description="Non-dependency relationships between entities — informational links that describe how the network is connected beyond strict dependencies.">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Relationships" value={String(rels.length)} icon={Share2} tone="info" />
        <StatTile label="Dependencies" value={String(edges.filter((e) => e.category === "dependency").length)} tone="neutral" />
        <StatTile label="Total links" value={String(edges.length)} tone="neutral" />
      </div>

      <SecisCard title="Relationship topology" description="Relationship links are dashed; dependency links are solid for context.">
        <GraphView entities={entities} edges={edges} systems={systems} systemOrder={SYSTEM_ORDER} />
      </SecisCard>

      <SecisCard title="Relationship list" description={`${rels.length} relationships`}>
        {rels.length === 0 ? (
          <EmptyState icon={Share2} title="No relationships yet" description="Add relationship-category links from the Entity Explorer." />
        ) : (
          <div className="responsive-table-shell">
            <Table>
              <TableHeader><TableRow><TableHead>Source</TableHead><TableHead>Type</TableHead><TableHead>Target</TableHead><TableHead>Strength</TableHead></TableRow></TableHeader>
              <TableBody>
                {rels.map((e) => (
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
        )}
      </SecisCard>
    </SecisShell>
  );
}
