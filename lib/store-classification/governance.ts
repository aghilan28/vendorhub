import { createDeterministicClock } from "@/lib/taxonomy";
import { StoreClassificationEngine } from "./engine";
import type {
  CapabilityFlag,
  Clock,
  ClassificationAuditEntry,
  ClassificationChangeRequest,
  ClassificationOperation,
  StoreClassificationProfile,
} from "./types";

export interface ClassificationGovernanceOptions {
  clock?: Clock;
}

function clone(profile: StoreClassificationProfile): StoreClassificationProfile {
  return JSON.parse(JSON.stringify(profile)) as StoreClassificationProfile;
}

function snapshot(profile: StoreClassificationProfile): Partial<StoreClassificationProfile> {
  return { storeId: profile.storeId, categoryL1: profile.categoryL1, categoryL2: profile.categoryL2, formatType: profile.formatType, version: profile.version };
}

/**
 * Classification governance engine (Phase 9). Supports assign / edit / override / approve / reject /
 * reset of store classification profiles with an audit trail and approval workflow. Non-destructive.
 */
export class ClassificationGovernance {
  private readonly store = new Map<string, StoreClassificationProfile>();
  private readonly auditLog: ClassificationAuditEntry[] = [];
  private readonly changeRequests = new Map<string, ClassificationChangeRequest>();
  private readonly clock: Clock;
  private seq = 0;

  constructor(seed: StoreClassificationProfile[] | StoreClassificationEngine = [], options: ClassificationGovernanceOptions = {}) {
    this.clock = options.clock ?? createDeterministicClock();
    const profiles = seed instanceof StoreClassificationEngine ? seed.profiles() : seed;
    for (const profile of profiles) this.store.set(profile.storeId, clone(profile));
  }

  list(): StoreClassificationProfile[] {
    return Array.from(this.store.values()).map(clone);
  }

  engine(): StoreClassificationEngine {
    return new StoreClassificationEngine(this.list());
  }

  audit(): ClassificationAuditEntry[] {
    return this.auditLog.map((entry) => ({ ...entry }));
  }

  requests(): ClassificationChangeRequest[] {
    return Array.from(this.changeRequests.values()).map((request) => ({ ...request }));
  }

  assign(profile: StoreClassificationProfile, actor = "system"): StoreClassificationProfile {
    if (this.store.has(profile.storeId)) throw new Error(`Profile "${profile.storeId}" already exists.`);
    const copy = clone(profile);
    this.store.set(copy.storeId, copy);
    this.record("ASSIGN", actor, [copy.storeId], [], [snapshot(copy)]);
    return clone(copy);
  }

  edit(storeId: string, patch: Partial<Pick<StoreClassificationProfile, "categoryL2" | "fulfillment" | "productCapability">>, actor = "system"): StoreClassificationProfile {
    const profile = this.require(storeId);
    const before = snapshot(profile);
    if (patch.categoryL2 !== undefined) profile.categoryL2 = patch.categoryL2;
    if (patch.fulfillment !== undefined) profile.fulfillment = patch.fulfillment;
    if (patch.productCapability !== undefined) profile.productCapability = patch.productCapability;
    profile.version += 1;
    profile.updatedAt = this.clock();
    this.record("EDIT", actor, [storeId], [before], [snapshot(profile)]);
    return clone(profile);
  }

  /** Overrides a single capability flag (e.g. enable B2B for a specific store). */
  override(storeId: string, flag: CapabilityFlag, value: boolean, actor = "system"): StoreClassificationProfile {
    const profile = this.require(storeId);
    const before = snapshot(profile);
    profile.capabilities = { ...profile.capabilities, [flag]: value };
    profile.version += 1;
    profile.updatedAt = this.clock();
    this.record("OVERRIDE", actor, [storeId], [before], [snapshot(profile)]);
    return clone(profile);
  }

  approve(storeId: string, actor = "system"): StoreClassificationProfile {
    return this.transition(storeId, "APPROVE", actor);
  }

  reject(storeId: string, actor = "system"): StoreClassificationProfile {
    return this.transition(storeId, "REJECT", actor);
  }

  reset(storeId: string, base: StoreClassificationProfile, actor = "system"): StoreClassificationProfile {
    const profile = this.require(storeId);
    const before = snapshot(profile);
    const restored = { ...clone(base), version: profile.version + 1, updatedAt: this.clock() };
    this.store.set(storeId, restored);
    this.record("RESET", actor, [storeId], [before], [snapshot(restored)]);
    return clone(restored);
  }

  submitChangeRequest(operation: ClassificationOperation, payload: Record<string, unknown>, requestedBy: string): ClassificationChangeRequest {
    const now = this.clock();
    const request: ClassificationChangeRequest = {
      id: `ccr-${(this.seq += 1)}`,
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

  approveChangeRequest(id: string, reviewedBy: string): { request: ClassificationChangeRequest; result: unknown } {
    const request = this.changeRequests.get(id);
    if (!request) throw new Error(`Change request "${id}" not found.`);
    if (request.status !== "PENDING_APPROVAL") throw new Error(`Change request "${id}" is not pending.`);
    let result: unknown;
    switch (request.operation) {
      case "OVERRIDE":
        result = this.override(request.payload.storeId as string, request.payload.flag as CapabilityFlag, Boolean(request.payload.value), reviewedBy);
        break;
      case "EDIT":
        result = this.edit(request.payload.storeId as string, request.payload.patch as Record<string, never>, reviewedBy);
        break;
      case "APPROVE":
        result = this.approve(request.payload.storeId as string, reviewedBy);
        break;
      case "REJECT":
        result = this.reject(request.payload.storeId as string, reviewedBy);
        break;
      default:
        throw new Error(`Unsupported operation "${request.operation}".`);
    }
    request.status = "APPLIED";
    request.reviewedBy = reviewedBy;
    request.updatedAt = this.clock();
    return { request: { ...request }, result };
  }

  private require(storeId: string): StoreClassificationProfile {
    const profile = this.store.get(storeId);
    if (!profile) throw new Error(`Classification profile "${storeId}" not found.`);
    return profile;
  }

  private transition(storeId: string, operation: ClassificationOperation, actor: string): StoreClassificationProfile {
    const profile = this.require(storeId);
    const before = snapshot(profile);
    profile.version += 1;
    profile.updatedAt = this.clock();
    this.record(operation, actor, [storeId], [before], [snapshot(profile)]);
    return clone(profile);
  }

  private record(operation: ClassificationOperation, actor: string, storeIds: string[], before: Partial<StoreClassificationProfile>[], after: Partial<StoreClassificationProfile>[]): void {
    this.auditLog.push({ id: `caudit-${(this.seq += 1)}`, operation, actor, at: this.clock(), storeIds, before, after });
  }
}
