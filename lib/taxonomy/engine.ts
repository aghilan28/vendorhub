import { AttributeRegistry } from "./attributes";
import { buildHierarchicalSlug, buildPath, createDeterministicClock, slugify } from "./slug";
import {
  TAXONOMY_LEVEL_DEPTH,
  type Clock,
  type LocalizedNames,
  type ResolvedAttribute,
  type TaxonomyNode,
  type TaxonomyNodeInput,
  type TaxonomyNodeLevel,
  type TaxonomySeo,
} from "./types";

export interface TaxonomyEngineOptions {
  clock?: Clock;
  attributeRegistry?: AttributeRegistry;
}

function defaultSeo(name: string, path: string, provided?: Partial<TaxonomySeo>): TaxonomySeo {
  return {
    metaTitle: provided?.metaTitle ?? `${name} | VendorHub`,
    metaDescription: provided?.metaDescription ?? `Shop ${name} on VendorHub.`,
    keywords: provided?.keywords ?? [],
    canonicalPath: provided?.canonicalPath ?? `/c/${path.replace(/\//g, "-")}`,
  };
}

function localSlugOf(input: { slug?: string; name: string }): string {
  return slugify(input.slug ?? input.name);
}

/**
 * Resolves raw node inputs into fully-derived {@link TaxonomyNode}s. Order-independent: nodes are
 * resolved in dependency order via repeated passes. Nodes whose parent cannot be resolved (missing
 * or cyclic) are still emitted in a degraded form so the validation engine can report them.
 */
export function resolveInputs(inputs: TaxonomyNodeInput[], options: TaxonomyEngineOptions = {}): TaxonomyNode[] {
  const clock = options.clock ?? createDeterministicClock();
  const resolvedById = new Map<string, TaxonomyNode>();
  const localChainById = new Map<string, string[]>();

  const pending = inputs.map((input) => ({ input, localSlug: localSlugOf(input) }));
  let progressed = true;

  const emit = (input: TaxonomyNodeInput, localSlug: string, parent: TaxonomyNode | null): TaxonomyNode => {
    const parentChain = parent ? localChainById.get(parent.id) ?? [] : [];
    const localChain = [...parentChain, localSlug];
    const slug = buildHierarchicalSlug(localChain);
    const path = buildPath(localChain);
    const id = input.id ?? slug;
    const pathIds = parent ? [...parent.pathIds, id] : [id];
    const depth = parent ? parent.depth + 1 : 0;
    const now = clock();
    const status = input.status ?? "ACTIVE";
    const node: TaxonomyNode = {
      id,
      level: input.level,
      depth,
      slug,
      localSlug,
      name: input.name,
      parentId: input.parentId ?? null,
      path,
      pathIds,
      names: { ...(input.names ?? {}) } as LocalizedNames,
      synonyms: [...(input.synonyms ?? [])],
      searchTerms: [...(input.searchTerms ?? [])],
      attributeKeys: [...(input.attributeKeys ?? [])],
      seo: defaultSeo(input.name, path, input.seo),
      regions: [...(input.regions ?? [])],
      sortOrder: input.sortOrder ?? 0,
      status,
      isActive: status === "ACTIVE" || status === "DRAFT",
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      mergedIntoId: null,
      metadata: { ...(input.metadata ?? {}) },
    };
    localChainById.set(id, localChain);
    resolvedById.set(id, node);
    return node;
  };

  const remaining = [...pending];
  while (progressed) {
    progressed = false;
    for (let i = remaining.length - 1; i >= 0; i -= 1) {
      const { input, localSlug } = remaining[i];
      const parentId = input.parentId ?? null;
      if (parentId === null) {
        emit(input, localSlug, null);
        remaining.splice(i, 1);
        progressed = true;
      } else if (resolvedById.has(parentId)) {
        emit(input, localSlug, resolvedById.get(parentId) as TaxonomyNode);
        remaining.splice(i, 1);
        progressed = true;
      }
    }
  }

  // Degraded emit for nodes with unresolved/cyclic parents (flagged later by validation).
  for (const { input, localSlug } of remaining) {
    const now = clock();
    const id = input.id ?? slugify(input.name);
    const status = input.status ?? "ACTIVE";
    const node: TaxonomyNode = {
      id,
      level: input.level,
      depth: TAXONOMY_LEVEL_DEPTH[input.level],
      slug: input.id ?? localSlug,
      localSlug,
      name: input.name,
      parentId: input.parentId ?? null,
      path: localSlug,
      pathIds: [id],
      names: { ...(input.names ?? {}) } as LocalizedNames,
      synonyms: [...(input.synonyms ?? [])],
      searchTerms: [...(input.searchTerms ?? [])],
      attributeKeys: [...(input.attributeKeys ?? [])],
      seo: defaultSeo(input.name, localSlug, input.seo),
      regions: [...(input.regions ?? [])],
      sortOrder: input.sortOrder ?? 0,
      status,
      isActive: status === "ACTIVE" || status === "DRAFT",
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      mergedIntoId: null,
      metadata: { ...(input.metadata ?? {}) },
    };
    resolvedById.set(id, node);
  }

  return Array.from(resolvedById.values());
}

/**
 * Recomputes structural derived fields (depth, path, pathIds, slug) for an existing node set after
 * a restructure (merge/split/move), preserving identity, version, status, timestamps and metadata.
 * Stable IDs are never changed by this pass.
 */
export function rederiveStructure(nodes: TaxonomyNode[]): TaxonomyNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const localChainById = new Map<string, string[]>();
  const pathIdsById = new Map<string, string[]>();
  const depthById = new Map<string, number>();

  const resolveChain = (node: TaxonomyNode, seen: Set<string>): { chain: string[]; ids: string[]; depth: number } => {
    if (localChainById.has(node.id)) {
      return { chain: localChainById.get(node.id) as string[], ids: pathIdsById.get(node.id) as string[], depth: depthById.get(node.id) as number };
    }
    if (node.parentId === null || !byId.has(node.parentId) || seen.has(node.id)) {
      const chain = [node.localSlug];
      localChainById.set(node.id, chain);
      pathIdsById.set(node.id, [node.id]);
      depthById.set(node.id, node.parentId === null ? 0 : node.depth);
      return { chain, ids: [node.id], depth: depthById.get(node.id) as number };
    }
    seen.add(node.id);
    const parent = byId.get(node.parentId) as TaxonomyNode;
    const parentResolved = resolveChain(parent, seen);
    const chain = [...parentResolved.chain, node.localSlug];
    const ids = [...parentResolved.ids, node.id];
    localChainById.set(node.id, chain);
    pathIdsById.set(node.id, ids);
    depthById.set(node.id, parentResolved.depth + 1);
    return { chain, ids, depth: parentResolved.depth + 1 };
  };

  for (const node of nodes) {
    const { chain, ids, depth } = resolveChain(node, new Set());
    node.slug = buildHierarchicalSlug(chain);
    node.path = buildPath(chain);
    node.pathIds = ids;
    node.depth = depth;
    node.seo.canonicalPath = `/c/${node.path.replace(/\//g, "-")}`;
  }

  return nodes;
}

/**
 * Read-optimized, indexed view over a resolved taxonomy. All queries are O(1)/O(children) using
 * pre-built maps. The engine is immutable; mutations are performed by the governance layer which
 * produces a new engine.
 */
export class TaxonomyEngine {
  private readonly byId = new Map<string, TaxonomyNode>();
  private readonly bySlug = new Map<string, string>();
  private readonly byPath = new Map<string, string>();
  private readonly childrenByParent = new Map<string | null, string[]>();
  private readonly nodesList: TaxonomyNode[];
  readonly attributes: AttributeRegistry;

  constructor(nodes: TaxonomyNode[], attributeRegistry: AttributeRegistry = new AttributeRegistry()) {
    this.attributes = attributeRegistry;
    this.nodesList = [...nodes].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    for (const node of this.nodesList) {
      this.byId.set(node.id, node);
      this.bySlug.set(node.slug, node.id);
      this.byPath.set(node.path, node.id);
      const bucket = this.childrenByParent.get(node.parentId) ?? [];
      bucket.push(node.id);
      this.childrenByParent.set(node.parentId, bucket);
    }
    for (const [, bucket] of this.childrenByParent) {
      bucket.sort((a, b) => {
        const na = this.byId.get(a) as TaxonomyNode;
        const nb = this.byId.get(b) as TaxonomyNode;
        if (na.sortOrder !== nb.sortOrder) return na.sortOrder - nb.sortOrder;
        return na.slug < nb.slug ? -1 : na.slug > nb.slug ? 1 : 0;
      });
    }
  }

  static fromInputs(inputs: TaxonomyNodeInput[], options: TaxonomyEngineOptions = {}): TaxonomyEngine {
    return new TaxonomyEngine(resolveInputs(inputs, options), options.attributeRegistry ?? new AttributeRegistry());
  }

  get size(): number {
    return this.nodesList.length;
  }

  nodes(): TaxonomyNode[] {
    return [...this.nodesList];
  }

  getNode(id: string): TaxonomyNode | undefined {
    return this.byId.get(id);
  }

  getBySlug(slug: string): TaxonomyNode | undefined {
    const id = this.bySlug.get(slug);
    return id ? this.byId.get(id) : undefined;
  }

  getByPath(path: string): TaxonomyNode | undefined {
    const id = this.byPath.get(path);
    return id ? this.byId.get(id) : undefined;
  }

  getParent(id: string): TaxonomyNode | undefined {
    const node = this.byId.get(id);
    if (!node || node.parentId === null) return undefined;
    return this.byId.get(node.parentId);
  }

  getChildren(id: string | null): TaxonomyNode[] {
    return (this.childrenByParent.get(id) ?? []).map((childId) => this.byId.get(childId) as TaxonomyNode);
  }

  getAncestors(id: string): TaxonomyNode[] {
    const ancestors: TaxonomyNode[] = [];
    let current = this.byId.get(id);
    const guard = new Set<string>();
    while (current && current.parentId !== null && !guard.has(current.id)) {
      guard.add(current.id);
      const parent = this.byId.get(current.parentId);
      if (!parent) break;
      ancestors.push(parent);
      current = parent;
    }
    return ancestors;
  }

  getDescendants(id: string): TaxonomyNode[] {
    const out: TaxonomyNode[] = [];
    const queue = [...(this.childrenByParent.get(id) ?? [])];
    const guard = new Set<string>();
    while (queue.length) {
      const childId = queue.shift() as string;
      if (guard.has(childId)) continue;
      guard.add(childId);
      const child = this.byId.get(childId);
      if (!child) continue;
      out.push(child);
      queue.push(...(this.childrenByParent.get(childId) ?? []));
    }
    return out;
  }

  getSiblings(id: string): TaxonomyNode[] {
    const node = this.byId.get(id);
    if (!node) return [];
    return this.getChildren(node.parentId).filter((sibling) => sibling.id !== id);
  }

  getRoots(): TaxonomyNode[] {
    return this.getChildren(null);
  }

  getDepartments(): TaxonomyNode[] {
    return this.getByLevel("DEPARTMENT");
  }

  getLeaves(): TaxonomyNode[] {
    return this.nodesList.filter((node) => (this.childrenByParent.get(node.id) ?? []).length === 0);
  }

  getByLevel(level: TaxonomyNodeLevel): TaxonomyNode[] {
    return this.nodesList.filter((node) => node.level === level);
  }

  /**
   * Resolves the effective attribute set for a node: attributes declared on the node plus those
   * inherited from ancestors. The nearest declaration wins; inherited attributes are flagged.
   */
  resolveAttributes(id: string): ResolvedAttribute[] {
    const node = this.byId.get(id);
    if (!node) return [];
    const seen = new Set<string>();
    const out: ResolvedAttribute[] = [];
    const consider = (keys: string[], sourceNodeId: string, inherited: boolean) => {
      for (const key of keys) {
        if (seen.has(key)) continue;
        const definition = this.attributes.get(key);
        if (!definition) continue;
        seen.add(key);
        out.push({ key, definition, sourceNodeId, inherited });
      }
    };
    consider(node.attributeKeys, node.id, false);
    for (const ancestor of this.getAncestors(id)) {
      consider(ancestor.attributeKeys, ancestor.id, true);
    }
    return out;
  }

  stats(): { total: number; byLevel: Record<TaxonomyNodeLevel, number>; maxDepth: number } {
    const byLevel = {
      DEPARTMENT: 0,
      CATEGORY: 0,
      SUBCATEGORY: 0,
      PRODUCT_FAMILY: 0,
      PRODUCT_TYPE: 0,
      VARIANT_GROUP: 0,
    } as Record<TaxonomyNodeLevel, number>;
    let maxDepth = 0;
    for (const node of this.nodesList) {
      byLevel[node.level] += 1;
      if (node.depth > maxDepth) maxDepth = node.depth;
    }
    return { total: this.nodesList.length, byLevel, maxDepth };
  }
}
