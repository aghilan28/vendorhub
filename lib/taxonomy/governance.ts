import { AttributeRegistry } from "./attributes";
import { TaxonomyEngine, rederiveStructure } from "./engine";
import { buildHierarchicalSlug, buildPath, createDeterministicClock, slugify } from "./slug";
import { validateTaxonomy } from "./validation";
import {
  TAXONOMY_LEVEL_DEPTH,
  type Clock,
  type LocalizedNames,
  type TaxonomyAuditEntry,
  type TaxonomyChangeRequest,
  type TaxonomyNode,
  type TaxonomyNodeInput,
  type TaxonomyOperation,
  type TaxonomySeo,
  type TaxonomyValidationReport,
} from "./types";

export interface GovernanceOptions {
  clock?: Clock;
  attributeRegistry?: AttributeRegistry;
}

export interface SplitTarget {
  name: string;
  slug?: string;
  reassignChildIds?: string[];
  attributeKeys?: string[];
}

function clone(node: TaxonomyNode): TaxonomyNode {
  return JSON.parse(JSON.stringify(node)) as TaxonomyNode;
}

function snapshot(node: TaxonomyNode): Partial<TaxonomyNode> {
  return { id: node.id, slug: node.slug, path: node.path, name: node.name, status: node.status, parentId: node.parentId, version: node.version };
}

/**
 * Mutable taxonomy governance layer (Phase 10). Supports create / edit / deprecate / merge / split
 * / archive / restore with a full audit trail and an approval workflow (change requests). All
 * timestamps come from an injectable deterministic clock for reproducible tests.
 */
export class TaxonomyGovernance {
  private readonly store = new Map<string, TaxonomyNode>();
  private readonly auditLog: TaxonomyAuditEntry[] = [];
  private readonly changeRequests = new Map<string, TaxonomyChangeRequest>();
  private readonly clock: Clock;
  private readonly attributes: AttributeRegistry;
  private seq = 0;

  constructor(seed: TaxonomyNode[] | TaxonomyEngine = [], options: GovernanceOptions = {}) {
    this.clock = options.clock ?? createDeterministicClock();
    this.attributes = options.attributeRegistry ?? new AttributeRegistry();
    const nodes = seed instanceof TaxonomyEngine ? seed.nodes() : seed;
    for (const node of nodes) {
      this.store.set(node.id, clone(node));
    }
  }

  // -------------------------------------------------------------------------------------------
  // Inspection
  // -------------------------------------------------------------------------------------------

  list(): TaxonomyNode[] {
    return Array.from(this.store.values()).map(clone);
  }

  engine(): TaxonomyEngine {
    return new TaxonomyEngine(this.list(), this.attributes);
  }

  audit(): TaxonomyAuditEntry[] {
    return this.auditLog.map((entry) => ({ ...entry }));
  }

  requests(): TaxonomyChangeRequest[] {
    return Array.from(this.changeRequests.values()).map((request) => ({ ...request }));
  }

  validate(): TaxonomyValidationReport {
    return validateTaxonomy(this.list(), { attributeRegistry: this.attributes });
  }

  // -------------------------------------------------------------------------------------------
  // Direct operations
  // -------------------------------------------------------------------------------------------

  create(input: TaxonomyNodeInput, actor = "system"): TaxonomyNode {
    const parent = input.parentId ? this.store.get(input.parentId) : null;
    if (input.parentId && !parent) {
      throw new Error(`Cannot create node: parent "${input.parentId}" not found.`);
    }
    if (parent && TAXONOMY_LEVEL_DEPTH[input.level] !== parent.depth + 1) {
      throw new Error(`Cannot create node: level ${input.level} cannot be a child of ${parent.level}.`);
    }
    if (!parent && input.level !== "DEPARTMENT") {
      throw new Error(`Cannot create node: ${input.level} requires a parent.`);
    }

    const node = this.buildNode(input, parent ?? null);
    if (this.store.has(node.id)) {
      throw new Error(`Cannot create node: id "${node.id}" already exists.`);
    }
    this.store.set(node.id, node);
    this.record("CREATE", actor, [node.id], [], [snapshot(node)], input.metadata?.note as string | undefined);
    return clone(node);
  }

  edit(
    id: string,
    patch: Partial<Pick<TaxonomyNodeInput, "name" | "names" | "synonyms" | "searchTerms" | "attributeKeys" | "seo" | "regions" | "sortOrder" | "metadata">>,
    actor = "system",
  ): TaxonomyNode {
    const node = this.require(id);
    const before = snapshot(node);
    if (patch.name !== undefined) node.name = patch.name;
    if (patch.names !== undefined) node.names = { ...(patch.names as LocalizedNames) };
    if (patch.synonyms !== undefined) node.synonyms = [...patch.synonyms];
    if (patch.searchTerms !== undefined) node.searchTerms = [...patch.searchTerms];
    if (patch.attributeKeys !== undefined) node.attributeKeys = [...patch.attributeKeys];
    if (patch.seo !== undefined) node.seo = { ...node.seo, ...(patch.seo as Partial<TaxonomySeo>) };
    if (patch.regions !== undefined) node.regions = [...patch.regions];
    if (patch.sortOrder !== undefined) node.sortOrder = patch.sortOrder;
    if (patch.metadata !== undefined) node.metadata = { ...node.metadata, ...patch.metadata };
    node.version += 1;
    node.updatedAt = this.clock();
    this.record("EDIT", actor, [id], [before], [snapshot(node)]);
    return clone(node);
  }

  deprecate(id: string, actor = "system"): TaxonomyNode {
    return this.transition(id, "DEPRECATE", actor, (node) => {
      node.status = "DEPRECATED";
      node.isActive = false;
    });
  }

  archive(id: string, actor = "system"): TaxonomyNode {
    return this.transition(id, "ARCHIVE", actor, (node) => {
      node.status = "ARCHIVED";
      node.isActive = false;
      node.deletedAt = this.clock();
    });
  }

  restore(id: string, actor = "system"): TaxonomyNode {
    return this.transition(id, "RESTORE", actor, (node) => {
      node.status = "ACTIVE";
      node.isActive = true;
      node.deletedAt = null;
    });
  }

  /**
   * Merges one or more source nodes into a target node of the same level. Each source's children
   * are re-parented to the target; the source is marked MERGED (soft-deleted) with `mergedIntoId`.
   */
  merge(sourceIds: string[], targetId: string, actor = "system"): { target: TaxonomyNode; merged: TaxonomyNode[] } {
    const target = this.require(targetId);
    const before: Partial<TaxonomyNode>[] = [snapshot(target)];
    const merged: TaxonomyNode[] = [];
    for (const sourceId of sourceIds) {
      if (sourceId === targetId) throw new Error("Cannot merge a node into itself.");
      const source = this.require(sourceId);
      if (source.level !== target.level) throw new Error(`Cannot merge ${source.level} into ${target.level}.`);
      before.push(snapshot(source));
      for (const child of this.childrenOf(sourceId)) {
        child.parentId = targetId;
        child.updatedAt = this.clock();
      }
      source.status = "MERGED";
      source.isActive = false;
      source.mergedIntoId = targetId;
      source.deletedAt = this.clock();
      source.updatedAt = this.clock();
      merged.push(source);
    }
    this.reindex();
    this.record("MERGE", actor, [targetId, ...sourceIds], before, [snapshot(target), ...merged.map(snapshot)]);
    return { target: clone(target), merged: merged.map(clone) };
  }

  /**
   * Splits a source node into multiple sibling nodes at the same level. Existing children may be
   * reassigned among the new siblings; the source is marked SPLIT (soft-deleted).
   */
  split(sourceId: string, targets: SplitTarget[], actor = "system"): { source: TaxonomyNode; created: TaxonomyNode[] } {
    const source = this.require(sourceId);
    if (targets.length < 2) throw new Error("A split requires at least two targets.");
    const parent = source.parentId ? this.require(source.parentId) : null;
    const before = [snapshot(source)];
    const created: TaxonomyNode[] = [];

    for (const target of targets) {
      const node = this.buildNode(
        { level: source.level, name: target.name, slug: target.slug, parentId: source.parentId, attributeKeys: target.attributeKeys ?? source.attributeKeys },
        parent,
      );
      if (this.store.has(node.id)) throw new Error(`Split target id "${node.id}" already exists.`);
      this.store.set(node.id, node);
      created.push(node);
    }

    const reassignments = new Map<string, string>();
    targets.forEach((target, index) => {
      for (const childId of target.reassignChildIds ?? []) {
        reassignments.set(childId, created[index].id);
      }
    });
    for (const child of this.childrenOf(sourceId)) {
      const newParent = reassignments.get(child.id);
      if (newParent) {
        child.parentId = newParent;
        child.updatedAt = this.clock();
      }
    }

    source.status = "SPLIT";
    source.isActive = false;
    source.deletedAt = this.clock();
    source.updatedAt = this.clock();
    this.reindex();
    this.record("SPLIT", actor, [sourceId, ...created.map((node) => node.id)], before, created.map(snapshot));
    return { source: clone(source), created: created.map(clone) };
  }

  // -------------------------------------------------------------------------------------------
  // Approval workflow
  // -------------------------------------------------------------------------------------------

  submitChangeRequest(operation: TaxonomyOperation, payload: Record<string, unknown>, requestedBy: string, note?: string): TaxonomyChangeRequest {
    const now = this.clock();
    const request: TaxonomyChangeRequest = {
      id: `cr-${(this.seq += 1)}`,
      operation,
      status: "PENDING_APPROVAL",
      requestedBy,
      reviewedBy: null,
      createdAt: now,
      updatedAt: now,
      payload,
      note,
    };
    this.changeRequests.set(request.id, request);
    return { ...request };
  }

  rejectChangeRequest(id: string, reviewedBy: string): TaxonomyChangeRequest {
    const request = this.changeRequests.get(id);
    if (!request) throw new Error(`Change request "${id}" not found.`);
    if (request.status !== "PENDING_APPROVAL") throw new Error(`Change request "${id}" is not pending.`);
    request.status = "REJECTED";
    request.reviewedBy = reviewedBy;
    request.updatedAt = this.clock();
    return { ...request };
  }

  approveChangeRequest(id: string, reviewedBy: string): { request: TaxonomyChangeRequest; result: unknown } {
    const request = this.changeRequests.get(id);
    if (!request) throw new Error(`Change request "${id}" not found.`);
    if (request.status !== "PENDING_APPROVAL") throw new Error(`Change request "${id}" is not pending.`);
    const payload = request.payload;
    let result: unknown;
    switch (request.operation) {
      case "CREATE":
        result = this.create(payload.input as TaxonomyNodeInput, reviewedBy);
        break;
      case "EDIT":
        result = this.edit(payload.id as string, payload.patch as Record<string, never>, reviewedBy);
        break;
      case "DEPRECATE":
        result = this.deprecate(payload.id as string, reviewedBy);
        break;
      case "ARCHIVE":
        result = this.archive(payload.id as string, reviewedBy);
        break;
      case "RESTORE":
        result = this.restore(payload.id as string, reviewedBy);
        break;
      case "MERGE":
        result = this.merge(payload.sourceIds as string[], payload.targetId as string, reviewedBy);
        break;
      case "SPLIT":
        result = this.split(payload.sourceId as string, payload.targets as SplitTarget[], reviewedBy);
        break;
      default:
        throw new Error(`Unsupported operation "${request.operation}".`);
    }
    request.status = "APPLIED";
    request.reviewedBy = reviewedBy;
    request.updatedAt = this.clock();
    return { request: { ...request }, result };
  }

  // -------------------------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------------------------

  private buildNode(input: TaxonomyNodeInput, parent: TaxonomyNode | null): TaxonomyNode {
    const localSlug = slugify(input.slug ?? input.name);
    const parentChain = parent ? parent.path.split("/") : [];
    const localChain = [...parentChain, localSlug];
    const slug = buildHierarchicalSlug(localChain);
    const path = buildPath(localChain);
    const id = input.id ?? slug;
    const now = this.clock();
    const status = input.status ?? "ACTIVE";
    return {
      id,
      level: input.level,
      depth: parent ? parent.depth + 1 : 0,
      slug,
      localSlug,
      name: input.name,
      parentId: parent ? parent.id : null,
      path,
      pathIds: parent ? [...parent.pathIds, id] : [id],
      names: { ...(input.names ?? {}) } as LocalizedNames,
      synonyms: [...(input.synonyms ?? [])],
      searchTerms: [...(input.searchTerms ?? [])],
      attributeKeys: [...(input.attributeKeys ?? [])],
      seo: {
        metaTitle: input.seo?.metaTitle ?? `${input.name} | VendorHub`,
        metaDescription: input.seo?.metaDescription ?? `Shop ${input.name} on VendorHub.`,
        keywords: input.seo?.keywords ?? [],
        canonicalPath: input.seo?.canonicalPath ?? `/c/${path.replace(/\//g, "-")}`,
      },
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
  }

  private require(id: string): TaxonomyNode {
    const node = this.store.get(id);
    if (!node) throw new Error(`Taxonomy node "${id}" not found.`);
    return node;
  }

  private childrenOf(id: string): TaxonomyNode[] {
    return Array.from(this.store.values()).filter((node) => node.parentId === id);
  }

  private transition(id: string, operation: TaxonomyOperation, actor: string, mutate: (node: TaxonomyNode) => void): TaxonomyNode {
    const node = this.require(id);
    const before = snapshot(node);
    mutate(node);
    node.version += 1;
    node.updatedAt = this.clock();
    this.record(operation, actor, [id], [before], [snapshot(node)]);
    return clone(node);
  }

  private reindex(): void {
    rederiveStructure(Array.from(this.store.values()));
  }

  private record(operation: TaxonomyOperation, actor: string, nodeIds: string[], before: Partial<TaxonomyNode>[], after: Partial<TaxonomyNode>[], note?: string): void {
    this.auditLog.push({
      id: `audit-${(this.seq += 1)}`,
      operation,
      actor,
      at: this.clock(),
      nodeIds,
      before,
      after,
      note,
    });
  }
}
