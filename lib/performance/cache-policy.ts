export const performanceBudgets = {
  apiP95Ms: 450,
  checkoutP95Ms: 900,
  aiRetrievalP95Ms: 800,
  realtimePropagationP95Ms: 1200,
  hydrationP95Ms: 1800,
  renderP95Ms: 1200,
  cacheHitRatioMin: 0.72,
  eventPayloadMaxBytes: 4096,
  realtimeBatchWindowMs: 900,
  memoryGrowthWarnMb: 64,
} as const;

export const queryCachePolicy = {
  realtime: { staleTime: 15_000, gcTime: 5 * 60_000 },
  criticalCommerce: { staleTime: 30_000, gcTime: 10 * 60_000 },
  marketplace: { staleTime: 90_000, gcTime: 20 * 60_000 },
  dashboards: { staleTime: 120_000, gcTime: 30 * 60_000 },
  analytics: { staleTime: 5 * 60_000, gcTime: 45 * 60_000 },
  staticReference: { staleTime: 15 * 60_000, gcTime: 60 * 60_000 },
} as const;

export const httpCachePolicy = {
  privateRealtime: "private, no-store",
  privateShort: "private, max-age=15, stale-while-revalidate=45",
  privateDashboard: "private, max-age=60, stale-while-revalidate=180",
  publicMarketplace: "public, max-age=60, stale-while-revalidate=300",
  publicReference: "public, max-age=300, stale-while-revalidate=1800",
} as const;

export function boundedPageSize(pageSize: number | undefined, fallback = 24, max = 60) {
  if (!Number.isFinite(pageSize)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(pageSize ?? fallback)));
}

export function shouldRecordPerformanceSample(sampleRate = 0.1) {
  return Math.random() < Math.min(1, Math.max(0, sampleRate));
}
