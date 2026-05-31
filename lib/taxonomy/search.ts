import { normalizeCommerceText } from "@/lib/commerce-foundation";
import type { TaxonomyEngine } from "./engine";
import type { TaxonomyNode, TaxonomyNodeLevel } from "./types";

export interface TaxonomySearchDocument {
  nodeId: string;
  level: TaxonomyNodeLevel;
  path: string;
  canonicalSlug: string;
  /** Normalized, de-duplicated tokens drawn from the node, its ancestors, synonyms and attributes. */
  tokens: string[];
  /** Distinct synonym surface forms (search-ready, not yet indexed). */
  synonyms: string[];
  /** Attribute keys that are filterable at this node (powers faceted search). */
  filterableAttributes: string[];
  /** Attribute keys that are searchable at this node. */
  searchableAttributes: string[];
  autocompleteTerms: string[];
  /** Hooks: the taxonomy is structured so these consumers can be attached later. */
  fuzzyReady: boolean;
  embeddingReady: boolean;
}

/**
 * Search-readiness projection (Phase 5). Produces the token/synonym/facet structures a search
 * system would consume. It deliberately does NOT perform search — it makes the taxonomy
 * search-ready (category/subcategory/family/type/attribute search, synonym grouping, and
 * fuzzy/embedding hooks).
 */
export function buildSearchIndex(engine: TaxonomyEngine): TaxonomySearchDocument[] {
  return engine.nodes().map((node) => {
    const ancestors = engine.getAncestors(node.id);
    const resolved = engine.resolveAttributes(node.id);
    const labelTokens = resolved.map((attribute) => attribute.definition.label);

    const rawTokens = [
      node.name,
      ...Object.values(node.names),
      ...node.synonyms,
      ...node.searchTerms,
      ...ancestors.map((ancestor) => ancestor.name),
      ...labelTokens,
    ].filter((value): value is string => Boolean(value));

    const tokens = Array.from(new Set(rawTokens.flatMap((value) => normalizeCommerceText(value).split(" ")))).filter(Boolean).sort();

    return {
      nodeId: node.id,
      level: node.level,
      path: node.path,
      canonicalSlug: node.slug,
      tokens,
      synonyms: Array.from(new Set(node.synonyms)).sort(),
      filterableAttributes: resolved.filter((attribute) => attribute.definition.isFilterable).map((attribute) => attribute.key),
      searchableAttributes: resolved.filter((attribute) => attribute.definition.isSearchable).map((attribute) => attribute.key),
      autocompleteTerms: Array.from(new Set([node.name, ...node.synonyms].map((value) => value.toLowerCase()))).sort(),
      fuzzyReady: tokens.length > 0,
      embeddingReady: tokens.length > 0,
    };
  });
}

/**
 * Builds a token -> nodeIds map across the whole taxonomy. Enables cross-category discovery and
 * synonym grouping (e.g. the token "atta" surfacing both a Groceries family and a Bakery category).
 */
export function buildSynonymGroups(engine: TaxonomyEngine): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const document of buildSearchIndex(engine)) {
    for (const token of [...document.tokens, ...document.synonyms.map((value) => normalizeCommerceText(value))]) {
      if (!token) continue;
      const bucket = groups.get(token) ?? [];
      if (!bucket.includes(document.nodeId)) bucket.push(document.nodeId);
      groups.set(token, bucket);
    }
  }
  return groups;
}

/** Convenience: which nodes are discoverable via a free-text term (deterministic, normalized). */
export function nodesForSearchTerm(engine: TaxonomyEngine, term: string): TaxonomyNode[] {
  const normalized = normalizeCommerceText(term).split(" ").filter(Boolean);
  if (!normalized.length) return [];
  const groups = buildSynonymGroups(engine);
  const matches = new Set<string>();
  for (const token of normalized) {
    for (const nodeId of groups.get(token) ?? []) matches.add(nodeId);
  }
  return Array.from(matches)
    .map((id) => engine.getNode(id))
    .filter((node): node is TaxonomyNode => Boolean(node));
}
