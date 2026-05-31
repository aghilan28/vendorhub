import type { TaxonomyEngine } from "./engine";
import type { TaxonomyNode } from "./types";

export interface AffinityEdge {
  source: string;
  target: string;
  /** Affinity kind powering downstream recommendation engines. */
  relation: "sibling" | "substitute" | "cross_sell" | "upsell";
  weight: number;
}

export interface SubstitutionGroup {
  parentId: string;
  level: TaxonomyNode["level"];
  members: string[];
}

export interface TaxonomyAffinityGraph {
  edges: AffinityEdge[];
  substitutionGroups: SubstitutionGroup[];
}

/**
 * Recommendation-readiness projection (Phase 6). Emits affinity edges and substitution groups the
 * recommendation engine can consume — it does not itself compute recommendations.
 *
 * - sibling affinity: nodes sharing a parent (category affinity).
 * - substitution: PRODUCT_TYPE / VARIANT_GROUP nodes under the same PRODUCT_FAMILY are substitutes.
 * - cross_sell/upsell: structural hooks left for behavioral data to weight later.
 */
export function buildAffinityGraph(engine: TaxonomyEngine): TaxonomyAffinityGraph {
  const edges: AffinityEdge[] = [];
  const substitutionGroups: SubstitutionGroup[] = [];

  for (const node of engine.nodes()) {
    const children = engine.getChildren(node.id);

    // Sibling affinity among children of this node.
    for (let i = 0; i < children.length; i += 1) {
      for (let j = i + 1; j < children.length; j += 1) {
        edges.push({ source: children[i].id, target: children[j].id, relation: "sibling", weight: 0.5 });
      }
    }

    // Substitution groups under product families (and types).
    if ((node.level === "PRODUCT_FAMILY" || node.level === "PRODUCT_TYPE") && children.length > 1) {
      substitutionGroups.push({ parentId: node.id, level: children[0].level, members: children.map((child) => child.id) });
      for (let i = 0; i < children.length; i += 1) {
        for (let j = i + 1; j < children.length; j += 1) {
          edges.push({ source: children[i].id, target: children[j].id, relation: "substitute", weight: 0.8 });
        }
      }
    }
  }

  return { edges, substitutionGroups };
}

/**
 * Deterministic structural similarity in [0,1] between two nodes, combining shared-ancestry
 * (Jaccard over path IDs) and shared attributes. Used as a cold-start similarity prior before
 * behavioral signals are available.
 */
export function similarityScore(engine: TaxonomyEngine, idA: string, idB: string): number {
  const a = engine.getNode(idA);
  const b = engine.getNode(idB);
  if (!a || !b) return 0;
  if (a.id === b.id) return 1;

  const jaccard = (left: string[], right: string[]): number => {
    const setA = new Set(left);
    const setB = new Set(right);
    const union = new Set([...left, ...right]);
    if (!union.size) return 0;
    let intersection = 0;
    for (const value of setA) if (setB.has(value)) intersection += 1;
    return intersection / union.size;
  };

  const pathScore = jaccard(a.pathIds.slice(0, -1), b.pathIds.slice(0, -1));
  const attributeScore = jaccard(a.attributeKeys, b.attributeKeys);
  return Number((pathScore * 0.7 + attributeScore * 0.3).toFixed(4));
}
