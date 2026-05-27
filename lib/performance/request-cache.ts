type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export type RequestCacheOptions = {
  ttlMs: number;
  maxEntries?: number;
};

function prune(maxEntries: number) {
  const now = Date.now();
  for (const [key, entry] of memoryCache) {
    if (entry.expiresAt <= now) memoryCache.delete(key);
  }

  while (memoryCache.size > maxEntries) {
    const firstKey = memoryCache.keys().next().value as string | undefined;
    if (!firstKey) break;
    memoryCache.delete(firstKey);
  }
}

export function stableCacheKey(parts: readonly unknown[]) {
  return JSON.stringify(parts, (_key, value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = (value as Record<string, unknown>)[key];
        return acc;
      }, {});
  });
}

export async function withRequestCache<T>(key: string, options: RequestCacheOptions, loader: () => Promise<T>): Promise<T> {
  const maxEntries = options.maxEntries ?? 250;
  prune(maxEntries);

  const cached = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = loader()
    .then((value) => {
      memoryCache.set(key, { value, expiresAt: Date.now() + options.ttlMs });
      prune(maxEntries);
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export function clearRequestCache(prefix?: string) {
  for (const key of memoryCache.keys()) {
    if (!prefix || key.startsWith(prefix)) memoryCache.delete(key);
  }
}
