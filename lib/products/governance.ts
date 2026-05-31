import { createDeterministicClock } from "@/lib/taxonomy";
import { ProductEngine, resolveProducts } from "./engine";
import { validateProducts, type ProductValidationOptions } from "./validation";
import type {
  Clock,
  ProductAuditEntry,
  ProductChangeRequest,
  ProductMaster,
  ProductMasterInput,
  ProductOperation,
  ProductValidationReport,
  ProductVersionEntry,
} from "./types";

export interface ProductGovernanceOptions {
  clock?: Clock;
}

export interface SplitPart {
  name: string;
  slug?: string;
  variantIds: string[];
}

function clone(product: ProductMaster): ProductMaster {
  return JSON.parse(JSON.stringify(product)) as ProductMaster;
}

function snapshot(product: ProductMaster): Partial<ProductMaster> {
  return { id: product.id, slug: product.slug, name: product.name, status: product.status, lifecycleStatus: product.lifecycleStatus, version: product.version };
}

/**
 * Mutable product governance layer (Phase 7): create / edit / archive / restore / approve / reject /
 * merge / split with version history, audit trail and approval workflow. Deterministic clock.
 */
export class ProductGovernance {
  private readonly store = new Map<string, ProductMaster>();
  private readonly history = new Map<string, ProductVersionEntry[]>();
  private readonly auditLog: ProductAuditEntry[] = [];
  private readonly changeRequests = new Map<string, ProductChangeRequest>();
  private readonly clock: Clock;
  private seq = 0;

  constructor(seed: ProductEngine | ProductMaster[] = [], options: ProductGovernanceOptions = {}) {
    this.clock = options.clock ?? createDeterministicClock();
    const products = seed instanceof ProductEngine ? seed.products() : seed;
    for (const product of products) this.store.set(product.id, clone(product));
  }

  list(): ProductMaster[] {
    return Array.from(this.store.values()).map(clone);
  }

  engine(): ProductEngine {
    return new ProductEngine(this.list());
  }

  audit(): ProductAuditEntry[] {
    return this.auditLog.map((entry) => ({ ...entry }));
  }

  requests(): ProductChangeRequest[] {
    return Array.from(this.changeRequests.values()).map((request) => ({ ...request }));
  }

  versionHistory(id: string): ProductVersionEntry[] {
    return (this.history.get(id) ?? []).map((entry) => ({ ...entry }));
  }

  validate(options: ProductValidationOptions = {}): ProductValidationReport {
    return validateProducts(this.list(), options);
  }

  create(input: ProductMasterInput, actor = "system"): ProductMaster {
    const product = resolveProducts([input], this.clock)[0];
    if (this.store.has(product.id)) throw new Error(`Product "${product.id}" already exists.`);
    this.store.set(product.id, product);
    this.record("CREATE", actor, [product.id], [], [snapshot(product)]);
    this.pushVersion(product, actor, "CREATE");
    return clone(product);
  }

  edit(
    id: string,
    patch: Partial<Pick<ProductMasterInput, "name" | "description" | "lifecycleStatus" | "attributes" | "localizedNames" | "categoryId" | "familyId" | "typeId" | "metadata">>,
    actor = "system",
  ): ProductMaster {
    const product = this.require(id);
    const before = snapshot(product);
    if (patch.name !== undefined) product.name = patch.name;
    if (patch.description !== undefined) product.description = patch.description;
    if (patch.lifecycleStatus !== undefined) product.lifecycleStatus = patch.lifecycleStatus;
    if (patch.attributes !== undefined) product.attributes = { ...product.attributes, ...patch.attributes };
    if (patch.localizedNames !== undefined) product.localizedNames = { ...product.localizedNames, ...patch.localizedNames };
    if (patch.categoryId !== undefined) product.categoryId = patch.categoryId;
    if (patch.familyId !== undefined) product.familyId = patch.familyId;
    if (patch.typeId !== undefined) product.typeId = patch.typeId;
    if (patch.metadata !== undefined) product.metadata = { ...product.metadata, ...patch.metadata };
    product.version += 1;
    product.updatedAt = this.clock();
    this.record("EDIT", actor, [id], [before], [snapshot(product)]);
    this.pushVersion(product, actor, "EDIT");
    return clone(product);
  }

  archive(id: string, actor = "system"): ProductMaster {
    return this.transition(id, "ARCHIVE", actor, (product) => {
      product.status = "ARCHIVED";
      product.deletedAt = this.clock();
    });
  }

  restore(id: string, actor = "system"): ProductMaster {
    return this.transition(id, "RESTORE", actor, (product) => {
      product.status = "ACTIVE";
      product.deletedAt = null;
    });
  }

  approve(id: string, actor = "system"): ProductMaster {
    return this.transition(id, "APPROVE", actor, (product) => {
      product.status = "ACTIVE";
      product.lifecycleStatus = product.lifecycleStatus === "PLANNED" ? "ACTIVE" : product.lifecycleStatus;
      product.metadata = { ...product.metadata, approvalState: "APPROVED" };
    });
  }

  reject(id: string, actor = "system"): ProductMaster {
    return this.transition(id, "REJECT", actor, (product) => {
      product.metadata = { ...product.metadata, approvalState: "REJECTED" };
    });
  }

  /** Merges a source product into a target: source variants are re-parented; source marked MERGED. */
  merge(sourceId: string, targetId: string, actor = "system"): { target: ProductMaster; source: ProductMaster } {
    if (sourceId === targetId) throw new Error("Cannot merge a product into itself.");
    const source = this.require(sourceId);
    const target = this.require(targetId);
    const before = [snapshot(target), snapshot(source)];
    for (const variant of source.variants) {
      target.variants.push({ ...variant, productId: target.id, updatedAt: this.clock() });
    }
    source.variants = [];
    source.status = "MERGED";
    source.mergedIntoId = targetId;
    source.deletedAt = this.clock();
    source.updatedAt = this.clock();
    target.version += 1;
    target.updatedAt = this.clock();
    this.record("MERGE", actor, [targetId, sourceId], before, [snapshot(target), snapshot(source)]);
    this.pushVersion(target, actor, "MERGE");
    this.pushVersion(source, actor, "MERGE");
    return { target: clone(target), source: clone(source) };
  }

  /** Splits a source product into new products that take subsets of its variants. */
  split(sourceId: string, parts: SplitPart[], actor = "system"): { source: ProductMaster; created: ProductMaster[] } {
    const source = this.require(sourceId);
    if (parts.length < 2) throw new Error("A split requires at least two parts.");
    const created: ProductMaster[] = [];
    const reassigned = new Set<string>();

    for (const part of parts) {
      const newProduct = resolveProducts(
        [{ name: part.name, slug: part.slug, departmentId: source.departmentId, brandId: source.brandId, categoryId: source.categoryId, familyId: source.familyId, typeId: source.typeId }],
        this.clock,
      )[0];
      if (this.store.has(newProduct.id)) throw new Error(`Split product id "${newProduct.id}" already exists.`);
      for (const variantId of part.variantIds) {
        const variant = source.variants.find((v) => v.id === variantId);
        if (variant) {
          newProduct.variants.push({ ...variant, productId: newProduct.id, updatedAt: this.clock() });
          reassigned.add(variantId);
        }
      }
      this.store.set(newProduct.id, newProduct);
      created.push(newProduct);
      this.pushVersion(newProduct, actor, "SPLIT");
    }

    source.variants = source.variants.filter((variant) => !reassigned.has(variant.id));
    source.status = "SPLIT";
    source.deletedAt = this.clock();
    source.updatedAt = this.clock();
    this.record("SPLIT", actor, [sourceId, ...created.map((p) => p.id)], [snapshot(source)], created.map(snapshot));
    this.pushVersion(source, actor, "SPLIT");
    return { source: clone(source), created: created.map(clone) };
  }

  submitChangeRequest(operation: ProductOperation, payload: Record<string, unknown>, requestedBy: string, note?: string): ProductChangeRequest {
    const now = this.clock();
    const request: ProductChangeRequest = {
      id: `pcr-${(this.seq += 1)}`,
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

  rejectChangeRequest(id: string, reviewedBy: string): ProductChangeRequest {
    const request = this.changeRequests.get(id);
    if (!request) throw new Error(`Change request "${id}" not found.`);
    if (request.status !== "PENDING_APPROVAL") throw new Error(`Change request "${id}" is not pending.`);
    request.status = "REJECTED";
    request.reviewedBy = reviewedBy;
    request.updatedAt = this.clock();
    return { ...request };
  }

  approveChangeRequest(id: string, reviewedBy: string): { request: ProductChangeRequest; result: unknown } {
    const request = this.changeRequests.get(id);
    if (!request) throw new Error(`Change request "${id}" not found.`);
    if (request.status !== "PENDING_APPROVAL") throw new Error(`Change request "${id}" is not pending.`);
    const payload = request.payload;
    let result: unknown;
    switch (request.operation) {
      case "CREATE":
        result = this.create(payload.input as ProductMasterInput, reviewedBy);
        break;
      case "EDIT":
        result = this.edit(payload.id as string, payload.patch as Record<string, never>, reviewedBy);
        break;
      case "ARCHIVE":
        result = this.archive(payload.id as string, reviewedBy);
        break;
      case "RESTORE":
        result = this.restore(payload.id as string, reviewedBy);
        break;
      case "APPROVE":
        result = this.approve(payload.id as string, reviewedBy);
        break;
      case "REJECT":
        result = this.reject(payload.id as string, reviewedBy);
        break;
      case "MERGE":
        result = this.merge(payload.sourceId as string, payload.targetId as string, reviewedBy);
        break;
      case "SPLIT":
        result = this.split(payload.sourceId as string, payload.parts as SplitPart[], reviewedBy);
        break;
      default:
        throw new Error(`Unsupported operation "${request.operation}".`);
    }
    request.status = "APPLIED";
    request.reviewedBy = reviewedBy;
    request.updatedAt = this.clock();
    return { request: { ...request }, result };
  }

  private require(id: string): ProductMaster {
    const product = this.store.get(id);
    if (!product) throw new Error(`Product "${id}" not found.`);
    return product;
  }

  private transition(id: string, operation: ProductOperation, actor: string, mutate: (product: ProductMaster) => void): ProductMaster {
    const product = this.require(id);
    const before = snapshot(product);
    mutate(product);
    product.version += 1;
    product.updatedAt = this.clock();
    this.record(operation, actor, [id], [before], [snapshot(product)]);
    this.pushVersion(product, actor, operation);
    return clone(product);
  }

  private pushVersion(product: ProductMaster, actor: string, operation: ProductOperation): void {
    const entries = this.history.get(product.id) ?? [];
    entries.push({ version: product.version, at: this.clock(), actor, operation, snapshot: snapshot(product) });
    this.history.set(product.id, entries);
  }

  private record(operation: ProductOperation, actor: string, productIds: string[], before: Partial<ProductMaster>[], after: Partial<ProductMaster>[], note?: string): void {
    this.auditLog.push({ id: `paudit-${(this.seq += 1)}`, operation, actor, at: this.clock(), productIds, before, after, note });
  }
}
