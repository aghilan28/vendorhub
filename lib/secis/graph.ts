// KARTEX M4 — Graph helpers for the SECIS dependency graph.
// Pure + deterministic. Edges flow source (upstream) → target (downstream):
// a shock at the source propagates to its targets.

import type { SecisEdge, SecisEntity } from "./types";

export interface Adjacency {
  downstream: Map<string, SecisEdge[]>; // sourceId → edges to dependents
  upstream: Map<string, SecisEdge[]>; // targetId → edges from producers
}

export function buildAdjacency(edges: SecisEdge[]): Adjacency {
  const downstream = new Map<string, SecisEdge[]>();
  const upstream = new Map<string, SecisEdge[]>();
  for (const edge of edges) {
    if (!downstream.has(edge.sourceId)) downstream.set(edge.sourceId, []);
    downstream.get(edge.sourceId)!.push(edge);
    if (!upstream.has(edge.targetId)) upstream.set(edge.targetId, []);
    upstream.get(edge.targetId)!.push(edge);
  }
  return { downstream, upstream };
}

// Direct dependents (downstream consumers of this node).
export function dependentsOf(entityId: string, adj: Adjacency): SecisEdge[] {
  return adj.downstream.get(entityId) ?? [];
}

// Direct producers (upstream nodes this node depends on).
export function producersOf(entityId: string, adj: Adjacency): SecisEdge[] {
  return adj.upstream.get(entityId) ?? [];
}

// Count of all reachable downstream nodes (influence reach).
export function influenceReach(entityId: string, adj: Adjacency): number {
  const seen = new Set<string>();
  const stack = [entityId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const edge of adj.downstream.get(id) ?? []) {
      if (!seen.has(edge.targetId)) {
        seen.add(edge.targetId);
        stack.push(edge.targetId);
      }
    }
  }
  return seen.size;
}

// Count of all upstream nodes this node ultimately depends on (dependency depth).
export function dependencyReach(entityId: string, adj: Adjacency): number {
  const seen = new Set<string>();
  const stack = [entityId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const edge of adj.upstream.get(id) ?? []) {
      if (!seen.has(edge.sourceId)) {
        seen.add(edge.sourceId);
        stack.push(edge.sourceId);
      }
    }
  }
  return seen.size;
}

export interface InfluenceProfile {
  entityId: string;
  directDependents: number;
  directProducers: number;
  influenceReach: number;
  dependencyReach: number;
  influenceScore: number; // 0..100 normalised reach × criticality
}

export function influenceProfile(entity: SecisEntity, adj: Adjacency, totalEntities: number): InfluenceProfile {
  const reach = influenceReach(entity.id, adj);
  const norm = totalEntities > 1 ? reach / (totalEntities - 1) : 0;
  return {
    entityId: entity.id,
    directDependents: dependentsOf(entity.id, adj).length,
    directProducers: producersOf(entity.id, adj).length,
    influenceReach: reach,
    dependencyReach: dependencyReach(entity.id, adj),
    influenceScore: Math.round((0.6 * norm + 0.4 * entity.criticality) * 100),
  };
}

// Layered layout for a graph view: x by system column, y by index within column.
export function layeredPositions(
  entities: SecisEntity[],
  systemOrder: string[],
): Map<string, { col: number; row: number; cols: number; maxRows: number }> {
  const byCol = new Map<number, SecisEntity[]>();
  const colOf = (systemId: string) => {
    const i = systemOrder.indexOf(systemId);
    return i === -1 ? systemOrder.length : i;
  };
  for (const e of entities) {
    const col = colOf(e.systemId);
    if (!byCol.has(col)) byCol.set(col, []);
    byCol.get(col)!.push(e);
  }
  const cols = Math.max(systemOrder.length, 1);
  const maxRows = Math.max(...[...byCol.values()].map((arr) => arr.length), 1);
  const pos = new Map<string, { col: number; row: number; cols: number; maxRows: number }>();
  for (const [col, arr] of byCol.entries()) {
    arr.forEach((e, row) => pos.set(e.id, { col, row, cols, maxRows }));
  }
  return pos;
}
