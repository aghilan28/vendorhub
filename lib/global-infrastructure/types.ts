import type { AsyncJobName, QueueDomain } from "@/lib/async/types";

export const GLOBAL_REGIONS = ["bom1", "sin1", "fra1", "iad1"] as const;

export type GlobalRegion = (typeof GLOBAL_REGIONS)[number];
export type RegionState = "HEALTHY" | "DEGRADED" | "OUTAGE" | "RECOVERY";
export type RegionCapability = "commerce" | "logistics" | "ai" | "finance" | "governance" | "analytics" | "realtime" | "edge";
export type GlobalFailureMode =
  | "total_region_outage"
  | "edge_cache_corruption"
  | "regional_queue_collapse"
  | "realtime_geo_desync"
  | "cross_region_replay_storm"
  | "global_observability_fragmentation";

export type RegionHealthSignal = {
  region: GlobalRegion;
  state: RegionState;
  latencyMs: number;
  saturation: number;
  queuePressure: number;
  realtimePressure: number;
  cacheInconsistency: number;
  replayBacklog: number;
  observabilityLagSeconds: number;
  capabilities: RegionCapability[];
};

export type GeoRoutingRequest = {
  preferredRegion?: GlobalRegion;
  userRegionHint?: string | null;
  domain: QueueDomain | RegionCapability;
  latencySensitive?: boolean;
  consistencyRequired?: boolean;
  tenantId?: string | null;
};

export type GeoRoutingDecision = {
  region: GlobalRegion;
  fallbackRegions: GlobalRegion[];
  degraded: boolean;
  consistencyMode: "regional_strong" | "global_eventual" | "read_only_degraded";
  reason: string;
  replaySafe: boolean;
  routingKey: string;
  observabilityTags: string[];
};

export type GeoAsyncRoutingDecision = GeoRoutingDecision & {
  jobName: AsyncJobName;
  queueRegionKey: string;
};

export type EdgeCachePolicy = {
  cacheKey: string;
  region: GlobalRegion;
  version: string;
  ttlSeconds: number;
  staleWhileRevalidateSeconds: number;
  consistency: "static" | "tenant_scoped" | "critical_revalidate";
  replayKey: string;
};

export type CacheInvalidationEvent = {
  cacheKey: string;
  region: GlobalRegion;
  version: string;
  replayKey: string;
  reason: string;
  createdAt: string;
};

export type CacheRepairPlan = {
  safe: boolean;
  staleRegions: GlobalRegion[];
  replayedInvalidations: number;
  actions: string[];
  diagnostics: {
    acceptedInvalidations: number;
    staleVersions: Partial<Record<GlobalRegion, string>>;
    consistencyGuaranteed: boolean;
  };
};

export type RegionalFailoverPlan = {
  failedRegion: GlobalRegion;
  targetRegion: GlobalRegion;
  affectedCapabilities: RegionCapability[];
  trafficMode: "reroute" | "read_only" | "shed_non_critical";
  replayStrategy: "dedupe_then_replay" | "freeze_then_reconcile";
  failbackAllowed: boolean;
  actions: string[];
  stabilityWindowSeconds: number;
  recoveryCursor: string;
};

export type RegionalRecoveryPlan = {
  region: GlobalRegion;
  state: RegionState;
  canFailback: boolean;
  writeMode: "active" | "read_only" | "frozen";
  replayMode: "blocked" | "dedupe" | "drain_after_stabilization";
  stabilizationSeconds: number;
  recoveryActions: string[];
  validationChecks: string[];
};

export type GlobalRealtimePlan = {
  primaryRegion: GlobalRegion;
  fanoutRegions: GlobalRegion[];
  throttleInvalidations: boolean;
  replayRecovery: boolean;
  consistencyWindowMs: number;
  channelPartition: string;
  floodProtection: "normal" | "batch" | "shed_low_priority";
  observabilityTags: string[];
};

export type GeoReplayDiagnostics = {
  replaySafe: boolean;
  duplicateCount: number;
  regionalSkew: Partial<Record<GlobalRegion, number>>;
  stormDetected: boolean;
  safeReplayKeys: string[];
  quarantineKeys: string[];
  actions: string[];
};

export type GlobalCompatibilityReport = {
  compatible: boolean;
  domains: Record<"ai" | "finance" | "governance" | "logistics", {
    regionAware: boolean;
    replaySafe: boolean;
    observabilityReady: boolean;
    actions: string[];
  }>;
};

export type GlobalInfrastructureLoadInput = {
  regionalOutages: number;
  crossRegionTraffic: number;
  edgeInvalidations: number;
  realtimeEvents: number;
  queueBacklog: number;
  aiRegionalLoad: number;
  financeReconciliationEvents: number;
  activeRegions: number;
};

export type GlobalInfrastructureValidationReport = {
  productionSafe: boolean;
  checkedAt: string;
  risks: string[];
  gracefulDegradation: string[];
  latencyOptimized: boolean;
  replaySafe: boolean;
  regionalObservabilityReady: boolean;
  recoveryDeterministic: boolean;
};
