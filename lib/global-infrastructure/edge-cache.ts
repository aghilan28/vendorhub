import type { CacheInvalidationEvent, CacheRepairPlan, EdgeCachePolicy, GlobalRegion } from "./types";
import { GLOBAL_REGIONS } from "./types";
import { globalReplayKey } from "./orchestration";

export function buildEdgeCachePolicy(input: {
  keyParts: readonly unknown[];
  region: GlobalRegion;
  version: string;
  tenantScoped?: boolean;
  critical?: boolean;
  ttlSeconds?: number;
}): EdgeCachePolicy {
  const cacheKey = JSON.stringify(input.keyParts);
  const consistency = input.critical ? "critical_revalidate" : input.tenantScoped ? "tenant_scoped" : "static";

  return {
    cacheKey,
    region: input.region,
    version: input.version,
    ttlSeconds: input.ttlSeconds ?? (input.critical ? 15 : input.tenantScoped ? 60 : 300),
    staleWhileRevalidateSeconds: input.critical ? 15 : input.tenantScoped ? 180 : 1800,
    consistency,
    replayKey: globalReplayKey(["edge-cache", input.region, cacheKey, input.version]),
  };
}

export function buildEdgeInvalidation(input: {
  policy: EdgeCachePolicy;
  reason: string;
  now?: Date;
}): CacheInvalidationEvent {
  return {
    cacheKey: input.policy.cacheKey,
    region: input.policy.region,
    version: input.policy.version,
    replayKey: globalReplayKey(["edge-invalidate", input.policy.region, input.policy.cacheKey, input.policy.version, input.reason]),
    reason: input.reason,
    createdAt: (input.now ?? new Date()).toISOString(),
  };
}

export function dedupeEdgeInvalidations(events: CacheInvalidationEvent[]) {
  const seen = new Set<string>();
  const accepted: CacheInvalidationEvent[] = [];
  const replayed: CacheInvalidationEvent[] = [];

  for (const event of events) {
    if (seen.has(event.replayKey)) {
      replayed.push(event);
      continue;
    }
    seen.add(event.replayKey);
    accepted.push(event);
  }

  return { accepted, replayed, replayedCount: replayed.length };
}

export function diagnoseEdgeInvalidationReplay(events: CacheInvalidationEvent[]) {
  const replay = dedupeEdgeInvalidations(events);
  const byRegion = replay.accepted.reduce<Partial<Record<GlobalRegion, number>>>((current, event) => {
    current[event.region] = (current[event.region] ?? 0) + 1;
    return current;
  }, {});
  const stormDetected = events.length > 0 && replay.replayedCount / events.length > 0.25;

  return {
    stormDetected,
    replayedInvalidations: replay.replayedCount,
    acceptedInvalidations: replay.accepted.length,
    byRegion,
    actions: stormDetected
      ? ["hold duplicate invalidation fanout", "replay accepted edge invalidations only", "emit edge replay storm alert"]
      : ["continue edge invalidation fanout"],
  };
}

export function planCacheRepair(input: {
  expectedVersion: string;
  versionsByRegion: Partial<Record<GlobalRegion, string>>;
  invalidations: CacheInvalidationEvent[];
}): CacheRepairPlan {
  const staleRegions = GLOBAL_REGIONS.filter((region) => input.versionsByRegion[region] && input.versionsByRegion[region] !== input.expectedVersion);
  const replay = dedupeEdgeInvalidations(input.invalidations);
  const staleVersions = Object.fromEntries(staleRegions.map((region) => [region, input.versionsByRegion[region]])) as Partial<Record<GlobalRegion, string>>;

  return {
    safe: staleRegions.length === 0,
    staleRegions,
    replayedInvalidations: replay.replayedCount,
    actions: staleRegions.length
      ? ["serve stale-while-revalidate for affected regions", "replay accepted invalidations", "repair regional cache version cursor"]
      : ["continue regional edge delivery"],
    diagnostics: {
      acceptedInvalidations: replay.accepted.length,
      staleVersions,
      consistencyGuaranteed: staleRegions.length === 0 && replay.replayedCount === 0,
    },
  };
}
