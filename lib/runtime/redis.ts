import "server-only";
import { runtimeConfig } from "./config";
import { loadOptionalModule } from "./optional-module";

/**
 * Degrade-safe Redis adapter. When RUNTIME_REDIS_ENABLED!=true, REDIS_URL is
 * unset, or `ioredis` is not installed, every operation returns a "miss"/no-op
 * so callers transparently fall back to their existing in-process behaviour.
 */
type RedisLike = {
  status?: string;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, ttl?: number, nx?: string): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  pexpire(key: string, ms: number): Promise<number>;
  pttl(key: string): Promise<number>;
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown>;
  ping(): Promise<string>;
  quit(): Promise<unknown>;
};

let client: RedisLike | null = null;
let initialized = false;
let lastError: string | null = null;

async function getClient(): Promise<RedisLike | null> {
  if (!runtimeConfig.redis.enabled || !runtimeConfig.redis.url) return null;
  if (initialized) return client;
  initialized = true;

  const mod = (await loadOptionalModule<any>("ioredis")) as any;
  if (!mod) {
    lastError = "ioredis not installed";
    return null;
  }
  try {
    const RedisCtor = mod.default ?? mod.Redis ?? mod;
    client = new RedisCtor(runtimeConfig.redis.url, {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
      connectTimeout: runtimeConfig.redis.connectTimeoutMs,
      enableOfflineQueue: false,
      keyPrefix: `${runtimeConfig.redis.keyPrefix}:`,
    }) as RedisLike;
    return client;
  } catch (error) {
    lastError = error instanceof Error ? error.message : "redis init failed";
    client = null;
    return null;
  }
}

export const redisRuntime = {
  isEnabled() {
    return runtimeConfig.redis.enabled && Boolean(runtimeConfig.redis.url);
  },

  async getClient() {
    return getClient();
  },

  async cacheGet(key: string): Promise<string | null> {
    const c = await getClient();
    if (!c) return null;
    try {
      return await c.get(key);
    } catch {
      return null;
    }
  },

  async cacheSet(key: string, value: string, ttlMs: number): Promise<boolean> {
    const c = await getClient();
    if (!c) return false;
    try {
      await c.set(key, value, "PX", ttlMs);
      return true;
    } catch {
      return false;
    }
  },

  /** Fixed-window counter; returns null if Redis unavailable (caller should fall back). */
  async incrementWindow(key: string, windowMs: number): Promise<{ count: number; ttlMs: number } | null> {
    const c = await getClient();
    if (!c) return null;
    try {
      // INCR then set PEXPIRE only on first hit (atomic via Lua).
      const script =
        "local v = redis.call('INCR', KEYS[1]); if v == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end; local t = redis.call('PTTL', KEYS[1]); return {v, t}";
      const res = (await c.eval(script, 1, key, windowMs)) as [number, number];
      return { count: res[0], ttlMs: res[1] < 0 ? windowMs : res[1] };
    } catch {
      return null;
    }
  },

  async health(): Promise<{ enabled: boolean; reachable: boolean; latencyMs?: number; error?: string }> {
    if (!this.isEnabled()) return { enabled: false, reachable: false };
    const c = await getClient();
    if (!c) return { enabled: true, reachable: false, error: lastError ?? "client unavailable" };
    const startedAt = Date.now();
    try {
      await c.ping();
      return { enabled: true, reachable: true, latencyMs: Date.now() - startedAt };
    } catch (error) {
      return { enabled: true, reachable: false, error: error instanceof Error ? error.message : "ping failed" };
    }
  },
};
