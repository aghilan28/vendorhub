import { createDeterministicClock } from "@/lib/taxonomy";
import { SellerNetworkEngine, resolveStores } from "./engine";
import { validateSellerNetwork } from "./validation";
import type {
  Clock,
  Seller,
  SellerValidationReport,
  Store,
  StoreAuditEntry,
  StoreChangeRequest,
  StoreInput,
  StoreOperation,
  StoreVersionEntry,
} from "./types";

export interface StoreGovernanceOptions {
  clock?: Clock;
}

function clone(store: Store): Store {
  return JSON.parse(JSON.stringify(store)) as Store;
}

function snapshot(store: Store): Partial<Store> {
  return { id: store.id, slug: store.slug, name: store.name, storeType: store.storeType, verificationStatus: store.verificationStatus, operationalStatus: store.operationalStatus, lifecycleStatus: store.lifecycleStatus };
}

/**
 * Store governance engine (Phase 6): create / edit / archive / restore / approve / reject / verify /
 * suspend with version history, audit trail and approval workflow. Sellers are held read-only.
 */
export class StoreGovernance {
  private readonly store = new Map<string, Store>();
  private readonly sellers: Seller[];
  private readonly history = new Map<string, StoreVersionEntry[]>();
  private readonly auditLog: StoreAuditEntry[] = [];
  private readonly changeRequests = new Map<string, StoreChangeRequest>();
  private readonly clock: Clock;
  private versionCounter = new Map<string, number>();
  private seq = 0;

  constructor(seed: SellerNetworkEngine, options: StoreGovernanceOptions = {}) {
    this.clock = options.clock ?? createDeterministicClock();
    this.sellers = seed.sellers();
    for (const store of seed.stores()) this.store.set(store.id, clone(store));
  }

  list(): Store[] {
    return Array.from(this.store.values()).map(clone);
  }

  engine(): SellerNetworkEngine {
    return new SellerNetworkEngine(this.sellers, this.list());
  }

  audit(): StoreAuditEntry[] {
    return this.auditLog.map((entry) => ({ ...entry }));
  }

  requests(): StoreChangeRequest[] {
    return Array.from(this.changeRequests.values()).map((request) => ({ ...request }));
  }

  versionHistory(id: string): StoreVersionEntry[] {
    return (this.history.get(id) ?? []).map((entry) => ({ ...entry }));
  }

  validate(): SellerValidationReport {
    return validateSellerNetwork(this.sellers, this.list());
  }

  create(input: StoreInput, actor = "system"): Store {
    const store = resolveStores([input], this.clock)[0];
    if (this.store.has(store.id)) throw new Error(`Store "${store.id}" already exists.`);
    if (!this.sellers.some((seller) => seller.id === store.sellerId)) throw new Error(`Cannot create store: seller "${store.sellerId}" not found.`);
    this.store.set(store.id, store);
    this.record("CREATE", actor, [store.id], [], [snapshot(store)]);
    this.pushVersion(store, actor, "CREATE");
    return clone(store);
  }

  edit(id: string, patch: Partial<Pick<StoreInput, "name" | "description" | "operatingHours" | "departments" | "metadata">>, actor = "system"): Store {
    const store = this.require(id);
    const before = snapshot(store);
    if (patch.name !== undefined) store.name = patch.name;
    if (patch.description !== undefined) store.description = patch.description;
    if (patch.operatingHours !== undefined) store.operatingHours = patch.operatingHours;
    if (patch.departments !== undefined) store.departments = [...patch.departments];
    if (patch.metadata !== undefined) store.metadata = { ...store.metadata, ...patch.metadata };
    store.updatedAt = this.clock();
    this.record("EDIT", actor, [id], [before], [snapshot(store)]);
    this.pushVersion(store, actor, "EDIT");
    return clone(store);
  }

  archive(id: string, actor = "system"): Store {
    return this.transition(id, "ARCHIVE", actor, (store) => {
      store.lifecycleStatus = "ARCHIVED";
      store.operationalStatus = "CLOSED";
    });
  }

  restore(id: string, actor = "system"): Store {
    return this.transition(id, "RESTORE", actor, (store) => {
      store.lifecycleStatus = "ACTIVE";
      store.operationalStatus = "ACTIVE";
    });
  }

  approve(id: string, actor = "system"): Store {
    return this.transition(id, "APPROVE", actor, (store) => {
      store.lifecycleStatus = "ACTIVE";
      store.metadata = { ...store.metadata, approvalState: "APPROVED" };
    });
  }

  reject(id: string, actor = "system"): Store {
    return this.transition(id, "REJECT", actor, (store) => {
      store.metadata = { ...store.metadata, approvalState: "REJECTED" };
    });
  }

  verify(id: string, actor = "system"): Store {
    return this.transition(id, "VERIFY", actor, (store) => {
      store.verificationStatus = "VERIFIED";
    });
  }

  suspend(id: string, actor = "system"): Store {
    return this.transition(id, "SUSPEND", actor, (store) => {
      store.operationalStatus = "SUSPENDED";
    });
  }

  submitChangeRequest(operation: StoreOperation, payload: Record<string, unknown>, requestedBy: string): StoreChangeRequest {
    const now = this.clock();
    const request: StoreChangeRequest = {
      id: `scr-${(this.seq += 1)}`,
      operation,
      status: "PENDING_APPROVAL",
      requestedBy,
      reviewedBy: null,
      createdAt: now,
      updatedAt: now,
      payload,
    };
    this.changeRequests.set(request.id, request);
    return { ...request };
  }

  approveChangeRequest(id: string, reviewedBy: string): { request: StoreChangeRequest; result: unknown } {
    const request = this.changeRequests.get(id);
    if (!request) throw new Error(`Change request "${id}" not found.`);
    if (request.status !== "PENDING_APPROVAL") throw new Error(`Change request "${id}" is not pending.`);
    let result: unknown;
    switch (request.operation) {
      case "CREATE":
        result = this.create(request.payload.input as StoreInput, reviewedBy);
        break;
      case "EDIT":
        result = this.edit(request.payload.id as string, request.payload.patch as Record<string, never>, reviewedBy);
        break;
      case "ARCHIVE":
        result = this.archive(request.payload.id as string, reviewedBy);
        break;
      case "RESTORE":
        result = this.restore(request.payload.id as string, reviewedBy);
        break;
      case "APPROVE":
        result = this.approve(request.payload.id as string, reviewedBy);
        break;
      case "REJECT":
        result = this.reject(request.payload.id as string, reviewedBy);
        break;
      case "VERIFY":
        result = this.verify(request.payload.id as string, reviewedBy);
        break;
      case "SUSPEND":
        result = this.suspend(request.payload.id as string, reviewedBy);
        break;
      default:
        throw new Error(`Unsupported operation "${request.operation}".`);
    }
    request.status = "APPLIED";
    request.reviewedBy = reviewedBy;
    request.updatedAt = this.clock();
    return { request: { ...request }, result };
  }

  private require(id: string): Store {
    const store = this.store.get(id);
    if (!store) throw new Error(`Store "${id}" not found.`);
    return store;
  }

  private transition(id: string, operation: StoreOperation, actor: string, mutate: (store: Store) => void): Store {
    const store = this.require(id);
    const before = snapshot(store);
    mutate(store);
    store.updatedAt = this.clock();
    this.record(operation, actor, [id], [before], [snapshot(store)]);
    this.pushVersion(store, actor, operation);
    return clone(store);
  }

  private pushVersion(store: Store, actor: string, operation: StoreOperation): void {
    const version = (this.versionCounter.get(store.id) ?? 0) + 1;
    this.versionCounter.set(store.id, version);
    const entries = this.history.get(store.id) ?? [];
    entries.push({ version, at: this.clock(), actor, operation, snapshot: snapshot(store) });
    this.history.set(store.id, entries);
  }

  private record(operation: StoreOperation, actor: string, storeIds: string[], before: Partial<Store>[], after: Partial<Store>[]): void {
    this.auditLog.push({ id: `saudit-${(this.seq += 1)}`, operation, actor, at: this.clock(), storeIds, before, after });
  }
}
