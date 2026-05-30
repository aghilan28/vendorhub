import "server-only";
import { runtimeConfig } from "./config";

/**
 * Degrade-safe Qdrant adapter (vector runtime). Uses the REST API directly via
 * fetch (no extra dependency) so it works in any runtime. When disabled or
 * unreachable, search() returns null and callers fall back to pgvector / Postgres FTS.
 * Qdrant is a derived index; the source of truth stays in Postgres.
 */
type QdrantPoint = { id: string | number; score: number; payload?: Record<string, unknown> };

function baseHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (runtimeConfig.vector.apiKey) h["api-key"] = runtimeConfig.vector.apiKey;
  return h;
}

async function call(path: string, init: RequestInit): Promise<any | null> {
  const url = runtimeConfig.vector.url;
  if (!url) return null;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: { ...baseHeaders(), ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export const vectorRuntime = {
  isEnabled() {
    return runtimeConfig.vector.enabled && Boolean(runtimeConfig.vector.url);
  },

  /** ANN search with optional payload filter; returns null on failure (caller falls back). */
  async search(
    collection: string,
    vector: number[],
    options: { limit?: number; filter?: Record<string, unknown> } = {},
  ): Promise<QdrantPoint[] | null> {
    if (!this.isEnabled()) return null;
    const body: Record<string, unknown> = {
      vector,
      limit: options.limit ?? 20,
      with_payload: true,
    };
    if (options.filter) body.filter = options.filter;
    const json = await call(`/collections/${collection}/points/search`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!json || !Array.isArray(json.result)) return null;
    return json.result as QdrantPoint[];
  },

  async upsert(
    collection: string,
    points: { id: string | number; vector: number[]; payload?: Record<string, unknown> }[],
  ): Promise<boolean> {
    if (!this.isEnabled()) return false;
    const json = await call(`/collections/${collection}/points?wait=true`, {
      method: "PUT",
      body: JSON.stringify({ points }),
    });
    return Boolean(json && json.status === "ok");
  },

  async health(): Promise<{ enabled: boolean; reachable: boolean; collections?: number; error?: string }> {
    if (!this.isEnabled()) return { enabled: false, reachable: false };
    const json = await call(`/collections`, { method: "GET" });
    if (!json) return { enabled: true, reachable: false, error: "unreachable" };
    const collections = Array.isArray(json?.result?.collections) ? json.result.collections.length : undefined;
    return { enabled: true, reachable: true, collections };
  },
};
