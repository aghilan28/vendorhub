import { AttributeRegistry } from "./attributes";
import {
  TAXONOMY_LEVEL_DEPTH,
  TAXONOMY_MAX_DEPTH,
  TAXONOMY_NODE_LEVELS,
  type TaxonomyNode,
  type TaxonomyValidationIssue,
  type TaxonomyValidationReport,
} from "./types";

const LEVEL_INDEX: Record<string, number> = Object.fromEntries(TAXONOMY_NODE_LEVELS.map((level, index) => [level, index]));

export interface ValidationOptions {
  attributeRegistry?: AttributeRegistry;
  maxDepth?: number;
}

/**
 * Deterministic taxonomy integrity validator (Phase 9). Detects circular references, orphan nodes,
 * duplicate slugs/paths/ids, broken hierarchy, invalid parent assignment, depth violations, and
 * attribute integrity problems. Pure: identical input always yields identical output.
 */
export function validateTaxonomy(nodes: TaxonomyNode[], options: ValidationOptions = {}): TaxonomyValidationReport {
  const registry = options.attributeRegistry ?? new AttributeRegistry();
  const maxDepth = options.maxDepth ?? TAXONOMY_MAX_DEPTH;
  const issues: TaxonomyValidationIssue[] = [];

  const byId = new Map<string, TaxonomyNode>();
  const idCounts = new Map<string, number>();
  const slugOwners = new Map<string, string[]>();
  const pathOwners = new Map<string, string[]>();

  for (const node of nodes) {
    idCounts.set(node.id, (idCounts.get(node.id) ?? 0) + 1);
    if (!byId.has(node.id)) byId.set(node.id, node);
    slugOwners.set(node.slug, [...(slugOwners.get(node.slug) ?? []), node.id]);
    pathOwners.set(node.path, [...(pathOwners.get(node.path) ?? []), node.id]);
  }

  // Duplicate IDs
  for (const [id, count] of idCounts) {
    if (count > 1) {
      issues.push({ code: "DUPLICATE_ID", severity: "error", nodeId: id, message: `Node id "${id}" is used ${count} times.`, detail: { count } });
    }
  }

  // Duplicate slugs / paths
  for (const [slug, owners] of slugOwners) {
    if (owners.length > 1) {
      issues.push({ code: "DUPLICATE_SLUG", severity: "error", nodeId: owners[0], message: `Slug "${slug}" is shared by ${owners.length} nodes.`, detail: { slug, owners } });
    }
  }
  for (const [path, owners] of pathOwners) {
    if (owners.length > 1) {
      issues.push({ code: "DUPLICATE_PATH", severity: "error", nodeId: owners[0], message: `Path "${path}" is shared by ${owners.length} nodes.`, detail: { path, owners } });
    }
  }

  for (const node of nodes) {
    const levelIndex = LEVEL_INDEX[node.level];

    // Root / parent presence
    if (node.parentId === null) {
      if (node.level !== "DEPARTMENT") {
        issues.push({ code: "MISSING_ROOT_PARENT", severity: "error", nodeId: node.id, message: `Non-department node "${node.id}" (${node.level}) has no parent.` });
      }
    } else {
      const parent = byId.get(node.parentId);
      if (!parent) {
        issues.push({ code: "ORPHAN_NODE", severity: "error", nodeId: node.id, message: `Node "${node.id}" references missing parent "${node.parentId}".`, detail: { parentId: node.parentId } });
      } else {
        const parentIndex = LEVEL_INDEX[parent.level];
        if (node.level === "DEPARTMENT") {
          issues.push({ code: "INVALID_PARENT", severity: "error", nodeId: node.id, message: `Department "${node.id}" must be a root node but has parent "${node.parentId}".` });
        } else if (parentIndex !== levelIndex - 1) {
          issues.push({
            code: "BROKEN_HIERARCHY",
            severity: "error",
            nodeId: node.id,
            message: `Node "${node.id}" (${node.level}) must descend from ${TAXONOMY_NODE_LEVELS[levelIndex - 1]} but parent "${parent.id}" is ${parent.level}.`,
            detail: { parentLevel: parent.level, expected: TAXONOMY_NODE_LEVELS[levelIndex - 1] },
          });
        }
      }
    }

    // Depth integrity
    if (node.depth > maxDepth) {
      issues.push({ code: "DEPTH_VIOLATION", severity: "error", nodeId: node.id, message: `Node "${node.id}" depth ${node.depth} exceeds max depth ${maxDepth}.`, detail: { depth: node.depth, maxDepth } });
    } else if (node.depth !== TAXONOMY_LEVEL_DEPTH[node.level]) {
      issues.push({
        code: "DEPTH_VIOLATION",
        severity: "error",
        nodeId: node.id,
        message: `Node "${node.id}" (${node.level}) has depth ${node.depth} but its level requires depth ${TAXONOMY_LEVEL_DEPTH[node.level]}.`,
        detail: { depth: node.depth, expected: TAXONOMY_LEVEL_DEPTH[node.level] },
      });
    }

    // Attribute integrity
    for (const key of node.attributeKeys) {
      if (!registry.has(key)) {
        issues.push({ code: "UNKNOWN_ATTRIBUTE", severity: "error", nodeId: node.id, message: `Node "${node.id}" references unknown attribute "${key}".`, detail: { key } });
      } else if (!registry.appliesTo(key, node.level)) {
        issues.push({ code: "ATTRIBUTE_LEVEL_MISMATCH", severity: "warning", nodeId: node.id, message: `Attribute "${key}" is not declared for level ${node.level}.`, detail: { key, level: node.level } });
      }
    }
  }

  // Circular references — walk each parent chain guarding against revisits.
  for (const node of nodes) {
    const seen = new Set<string>();
    let current: TaxonomyNode | undefined = node;
    while (current && current.parentId !== null) {
      if (seen.has(current.id)) {
        issues.push({ code: "CIRCULAR_REFERENCE", severity: "error", nodeId: node.id, message: `Circular parent reference detected starting at "${node.id}".`, detail: { chain: Array.from(seen) } });
        break;
      }
      seen.add(current.id);
      const next: TaxonomyNode | undefined = byId.get(current.parentId);
      if (!next) break;
      if (next.id === node.id) {
        issues.push({ code: "CIRCULAR_REFERENCE", severity: "error", nodeId: node.id, message: `Circular parent reference detected starting at "${node.id}".`, detail: { chain: [...Array.from(seen), next.id] } });
        break;
      }
      current = next;
    }
  }

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;

  return {
    valid: errorCount === 0,
    checkedNodes: nodes.length,
    errorCount,
    warningCount,
    issues,
  };
}
