import { createDeterministicClock, slugify } from "@/lib/taxonomy";
import { BrandEngine } from "./engine";
import { validateBrandUniverse } from "./validation";
import type {
  Brand,
  BrandAuditEntry,
  BrandChangeRequest,
  BrandInput,
  BrandOperation,
  BrandValidationReport,
  Clock,
  Company,
} from "./types";

export interface BrandGovernanceOptions {
  clock?: Clock;
}

function clone(brand: Brand): Brand {
  return JSON.parse(JSON.stringify(brand)) as Brand;
}

function snapshot(brand: Brand): Partial<Brand> {
  return { id: brand.id, slug: brand.slug, name: brand.name, status: brand.status, verificationStatus: brand.verificationStatus, companyId: brand.companyId };
}

/**
 * Mutable brand governance layer (Phase 5). Supports create / edit / merge / archive / restore /
 * verify / reject / deprecate with a full audit trail and an approval workflow. Companies are held
 * read-only here (ownership is stable); brand mutations rebuild the brand engine on demand.
 */
export class BrandGovernance {
  private readonly store = new Map<string, Brand>();
  private readonly companies: Company[];
  private readonly auditLog: BrandAuditEntry[] = [];
  private readonly changeRequests = new Map<string, BrandChangeRequest>();
  private readonly clock: Clock;
  private seq = 0;

  constructor(seed: BrandEngine, options: BrandGovernanceOptions = {}) {
    this.clock = options.clock ?? createDeterministicClock();
    this.companies = seed.companies();
    for (const brand of seed.brands()) this.store.set(brand.id, clone(brand));
  }

  list(): Brand[] {
    return Array.from(this.store.values()).map(clone);
  }

  engine(): BrandEngine {
    return new BrandEngine(this.list(), this.companies);
  }

  audit(): BrandAuditEntry[] {
    return this.auditLog.map((entry) => ({ ...entry }));
  }

  requests(): BrandChangeRequest[] {
    return Array.from(this.changeRequests.values()).map((request) => ({ ...request }));
  }

  validate(taxonomy?: Parameters<typeof validateBrandUniverse>[2]["taxonomy"]): BrandValidationReport {
    return validateBrandUniverse(this.list(), this.companies, { taxonomy });
  }

  create(input: BrandInput, actor = "system"): Brand {
    const slug = input.slug ?? slugify(input.name);
    const id = input.id ?? slug;
    if (this.store.has(id)) throw new Error(`Brand "${id}" already exists.`);
    if (input.companyId && !this.companies.some((company) => company.id === input.companyId)) {
      throw new Error(`Cannot create brand: company "${input.companyId}" not found.`);
    }
    const now = this.clock();
    const status = input.status ?? "ACTIVE";
    const brand: Brand = {
      id,
      name: input.name,
      slug,
      description: input.description ?? "",
      logoUrl: input.logoUrl ?? null,
      website: input.website ?? null,
      country: input.country ?? "IN",
      companyId: input.companyId ?? null,
      industry: input.industry ?? "OTHER",
      foundedYear: input.foundedYear ?? null,
      verificationStatus: input.verificationStatus ?? "UNVERIFIED",
      status,
      departments: [...(input.departments ?? [])],
      categories: [...(input.categories ?? [])],
      aliases: [...(input.aliases ?? [])],
      originRegion: input.originRegion ?? null,
      isLocalBrand: input.isLocalBrand ?? false,
      localizedNames: { ...(input.localizedNames ?? {}) },
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      mergedIntoId: null,
      metadata: { ...(input.metadata ?? {}) },
    };
    this.store.set(id, brand);
    this.record("CREATE", actor, [id], [], [snapshot(brand)]);
    return clone(brand);
  }

  edit(
    id: string,
    patch: Partial<Pick<BrandInput, "name" | "description" | "logoUrl" | "website" | "industry" | "foundedYear" | "departments" | "categories" | "aliases" | "originRegion" | "isLocalBrand" | "localizedNames" | "metadata">>,
    actor = "system",
  ): Brand {
    const brand = this.require(id);
    const before = snapshot(brand);
    if (patch.name !== undefined) brand.name = patch.name;
    if (patch.description !== undefined) brand.description = patch.description;
    if (patch.logoUrl !== undefined) brand.logoUrl = patch.logoUrl;
    if (patch.website !== undefined) brand.website = patch.website;
    if (patch.industry !== undefined) brand.industry = patch.industry;
    if (patch.foundedYear !== undefined) brand.foundedYear = patch.foundedYear;
    if (patch.departments !== undefined) brand.departments = [...patch.departments];
    if (patch.categories !== undefined) brand.categories = [...patch.categories];
    if (patch.aliases !== undefined) brand.aliases = [...patch.aliases];
    if (patch.originRegion !== undefined) brand.originRegion = patch.originRegion;
    if (patch.isLocalBrand !== undefined) brand.isLocalBrand = patch.isLocalBrand;
    if (patch.localizedNames !== undefined) brand.localizedNames = { ...patch.localizedNames };
    if (patch.metadata !== undefined) brand.metadata = { ...brand.metadata, ...patch.metadata };
    brand.updatedAt = this.clock();
    this.record("EDIT", actor, [id], [before], [snapshot(brand)]);
    return clone(brand);
  }

  /** Merges a source brand into a target brand: aliases are folded in and the source is MERGED. */
  merge(sourceId: string, targetId: string, actor = "system"): { target: Brand; source: Brand } {
    if (sourceId === targetId) throw new Error("Cannot merge a brand into itself.");
    const source = this.require(sourceId);
    const target = this.require(targetId);
    const before = [snapshot(target), snapshot(source)];
    const folded = new Set([...target.aliases, ...source.aliases, source.name]);
    target.aliases = Array.from(folded);
    target.updatedAt = this.clock();
    source.status = "MERGED";
    source.mergedIntoId = targetId;
    source.deletedAt = this.clock();
    source.updatedAt = this.clock();
    this.record("MERGE", actor, [targetId, sourceId], before, [snapshot(target), snapshot(source)]);
    return { target: clone(target), source: clone(source) };
  }

  archive(id: string, actor = "system"): Brand {
    return this.transition(id, "ARCHIVE", actor, (brand) => {
      brand.status = "ARCHIVED";
      brand.deletedAt = this.clock();
    });
  }

  restore(id: string, actor = "system"): Brand {
    return this.transition(id, "RESTORE", actor, (brand) => {
      brand.status = "ACTIVE";
      brand.deletedAt = null;
    });
  }

  deprecate(id: string, actor = "system"): Brand {
    return this.transition(id, "DEPRECATE", actor, (brand) => {
      brand.status = "DEPRECATED";
    });
  }

  verify(id: string, actor = "system"): Brand {
    return this.transition(id, "VERIFY", actor, (brand) => {
      brand.verificationStatus = "VERIFIED";
    });
  }

  reject(id: string, actor = "system"): Brand {
    return this.transition(id, "REJECT", actor, (brand) => {
      brand.verificationStatus = "REJECTED";
    });
  }

  submitChangeRequest(operation: BrandOperation, payload: Record<string, unknown>, requestedBy: string, note?: string): BrandChangeRequest {
    const now = this.clock();
    const request: BrandChangeRequest = {
      id: `bcr-${(this.seq += 1)}`,
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

  rejectChangeRequest(id: string, reviewedBy: string): BrandChangeRequest {
    const request = this.changeRequests.get(id);
    if (!request) throw new Error(`Change request "${id}" not found.`);
    if (request.status !== "PENDING_APPROVAL") throw new Error(`Change request "${id}" is not pending.`);
    request.status = "REJECTED";
    request.reviewedBy = reviewedBy;
    request.updatedAt = this.clock();
    return { ...request };
  }

  approveChangeRequest(id: string, reviewedBy: string): { request: BrandChangeRequest; result: unknown } {
    const request = this.changeRequests.get(id);
    if (!request) throw new Error(`Change request "${id}" not found.`);
    if (request.status !== "PENDING_APPROVAL") throw new Error(`Change request "${id}" is not pending.`);
    const payload = request.payload;
    let result: unknown;
    switch (request.operation) {
      case "CREATE":
        result = this.create(payload.input as BrandInput, reviewedBy);
        break;
      case "EDIT":
        result = this.edit(payload.id as string, payload.patch as Record<string, never>, reviewedBy);
        break;
      case "MERGE":
        result = this.merge(payload.sourceId as string, payload.targetId as string, reviewedBy);
        break;
      case "ARCHIVE":
        result = this.archive(payload.id as string, reviewedBy);
        break;
      case "RESTORE":
        result = this.restore(payload.id as string, reviewedBy);
        break;
      case "DEPRECATE":
        result = this.deprecate(payload.id as string, reviewedBy);
        break;
      case "VERIFY":
        result = this.verify(payload.id as string, reviewedBy);
        break;
      case "REJECT":
        result = this.reject(payload.id as string, reviewedBy);
        break;
      default:
        throw new Error(`Unsupported operation "${request.operation}".`);
    }
    request.status = "APPLIED";
    request.reviewedBy = reviewedBy;
    request.updatedAt = this.clock();
    return { request: { ...request }, result };
  }

  private require(id: string): Brand {
    const brand = this.store.get(id);
    if (!brand) throw new Error(`Brand "${id}" not found.`);
    return brand;
  }

  private transition(id: string, operation: BrandOperation, actor: string, mutate: (brand: Brand) => void): Brand {
    const brand = this.require(id);
    const before = snapshot(brand);
    mutate(brand);
    brand.updatedAt = this.clock();
    this.record(operation, actor, [id], [before], [snapshot(brand)]);
    return clone(brand);
  }

  private record(operation: BrandOperation, actor: string, brandIds: string[], before: Partial<Brand>[], after: Partial<Brand>[], note?: string): void {
    this.auditLog.push({ id: `baudit-${(this.seq += 1)}`, operation, actor, at: this.clock(), brandIds, before, after, note });
  }
}
