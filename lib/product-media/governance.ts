import { createDeterministicClock } from "@/lib/taxonomy";
import { makeImageAsset } from "./asset";
import type {
  Clock,
  MediaAsset,
  MediaAuditEntry,
  MediaChangeRequest,
  MediaOperation,
} from "./types";

export interface MediaGovernanceOptions {
  clock?: Clock;
}

function clone(asset: MediaAsset): MediaAsset {
  return JSON.parse(JSON.stringify(asset)) as MediaAsset;
}

function snapshot(asset: MediaAsset): Partial<MediaAsset> {
  return { id: asset.id, productId: asset.productId, kind: asset.kind, status: asset.status, version: asset.version, url: asset.url };
}

/**
 * Media governance engine (Phase 9): approve / reject / archive / restore / replace / version /
 * moderate with audit trail and approval workflow. Non-destructive (replace bumps version, keeps
 * lineage). Deterministic clock.
 */
export class MediaGovernance {
  private readonly store = new Map<string, MediaAsset>();
  private readonly auditLog: MediaAuditEntry[] = [];
  private readonly changeRequests = new Map<string, MediaChangeRequest>();
  private readonly clock: Clock;
  private seq = 0;

  constructor(seed: MediaAsset[] = [], options: MediaGovernanceOptions = {}) {
    this.clock = options.clock ?? createDeterministicClock();
    for (const asset of seed) this.store.set(asset.id, clone(asset));
  }

  list(): MediaAsset[] {
    return Array.from(this.store.values()).map(clone);
  }

  audit(): MediaAuditEntry[] {
    return this.auditLog.map((entry) => ({ ...entry }));
  }

  requests(): MediaChangeRequest[] {
    return Array.from(this.changeRequests.values()).map((request) => ({ ...request }));
  }

  approve(id: string, actor = "system"): MediaAsset {
    return this.transition(id, "APPROVE", actor, (asset) => {
      asset.status = "ACTIVE";
    });
  }

  reject(id: string, actor = "system"): MediaAsset {
    return this.transition(id, "REJECT", actor, (asset) => {
      asset.status = "REJECTED";
    });
  }

  archive(id: string, actor = "system"): MediaAsset {
    return this.transition(id, "ARCHIVE", actor, (asset) => {
      asset.status = "ARCHIVED";
    });
  }

  restore(id: string, actor = "system"): MediaAsset {
    return this.transition(id, "RESTORE", actor, (asset) => {
      asset.status = "ACTIVE";
    });
  }

  moderate(id: string, approved: boolean, actor = "system"): MediaAsset {
    return this.transition(id, "MODERATE", actor, (asset) => {
      asset.status = approved ? "ACTIVE" : "REJECTED";
    });
  }

  /** Replaces an asset's URL, marking the old version REPLACED and bumping version (non-destructive). */
  replace(id: string, newUrl: string, actor = "system"): MediaAsset {
    const asset = this.require(id);
    const before = snapshot(asset);
    asset.url = newUrl;
    asset.version += 1;
    asset.updatedAt = this.clock();
    this.record("REPLACE", actor, [id], [before], [snapshot(asset)]);
    return clone(asset);
  }

  /** Registers a new asset version deterministically. */
  version(params: Parameters<typeof makeImageAsset>[0], actor = "system"): MediaAsset {
    const asset = makeImageAsset(params);
    this.store.set(asset.id, asset);
    this.record("VERSION", actor, [asset.id], [], [snapshot(asset)]);
    return clone(asset);
  }

  submitChangeRequest(operation: MediaOperation, payload: Record<string, unknown>, requestedBy: string): MediaChangeRequest {
    const now = this.clock();
    const request: MediaChangeRequest = {
      id: `mcr-${(this.seq += 1)}`,
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

  approveChangeRequest(id: string, reviewedBy: string): { request: MediaChangeRequest; result: unknown } {
    const request = this.changeRequests.get(id);
    if (!request) throw new Error(`Change request "${id}" not found.`);
    if (request.status !== "PENDING_APPROVAL") throw new Error(`Change request "${id}" is not pending.`);
    let result: unknown;
    switch (request.operation) {
      case "APPROVE":
        result = this.approve(request.payload.id as string, reviewedBy);
        break;
      case "REJECT":
        result = this.reject(request.payload.id as string, reviewedBy);
        break;
      case "ARCHIVE":
        result = this.archive(request.payload.id as string, reviewedBy);
        break;
      case "RESTORE":
        result = this.restore(request.payload.id as string, reviewedBy);
        break;
      case "REPLACE":
        result = this.replace(request.payload.id as string, request.payload.url as string, reviewedBy);
        break;
      case "MODERATE":
        result = this.moderate(request.payload.id as string, Boolean(request.payload.approved), reviewedBy);
        break;
      default:
        throw new Error(`Unsupported operation "${request.operation}".`);
    }
    request.status = "APPLIED";
    request.reviewedBy = reviewedBy;
    request.updatedAt = this.clock();
    return { request: { ...request }, result };
  }

  private require(id: string): MediaAsset {
    const asset = this.store.get(id);
    if (!asset) throw new Error(`Media asset "${id}" not found.`);
    return asset;
  }

  private transition(id: string, operation: MediaOperation, actor: string, mutate: (asset: MediaAsset) => void): MediaAsset {
    const asset = this.require(id);
    const before = snapshot(asset);
    mutate(asset);
    asset.version += 1;
    asset.updatedAt = this.clock();
    this.record(operation, actor, [id], [before], [snapshot(asset)]);
    return clone(asset);
  }

  private record(operation: MediaOperation, actor: string, assetIds: string[], before: Partial<MediaAsset>[], after: Partial<MediaAsset>[]): void {
    this.auditLog.push({ id: `maudit-${(this.seq += 1)}`, operation, actor, at: this.clock(), assetIds, before, after });
  }
}
