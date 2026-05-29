import "server-only";
import { runtimeConfig } from "./config";
import { loadOptionalModule } from "./optional-module";

/**
 * Degrade-safe Neo4j adapter (relationship runtime). Neo4j is a PROJECTION of
 * Postgres + the knowledge graph-mutations topic; it is never the source of
 * truth. When disabled/unavailable, graph queries return null and callers fall
 * back to relational queries.
 */
let driver: any = null;
let initialized = false;
let lastError: string | null = null;

async function getDriver(): Promise<any | null> {
  const cfg = runtimeConfig.graph;
  if (!cfg.enabled || !cfg.url || !cfg.password) return null;
  if (initialized) return driver;
  initialized = true;
  const mod = (await loadOptionalModule<any>("neo4j-driver")) as any;
  if (!mod) {
    lastError = "neo4j-driver not installed";
    return null;
  }
  try {
    const neo4j = mod.default ?? mod;
    driver = neo4j.driver(cfg.url, neo4j.auth.basic(cfg.username, cfg.password), {
      maxConnectionPoolSize: 20,
      connectionAcquisitionTimeout: 5000,
    });
    return driver;
  } catch (error) {
    lastError = error instanceof Error ? error.message : "neo4j init failed";
    driver = null;
    return null;
  }
}

export const graphRuntime = {
  isEnabled() {
    const cfg = runtimeConfig.graph;
    return cfg.enabled && Boolean(cfg.url) && Boolean(cfg.password);
  },

  /** Run a read query; returns array of records as plain objects, or null on failure. */
  async read(cypher: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>[] | null> {
    const d = await getDriver();
    if (!d) return null;
    const session = d.session({ database: runtimeConfig.graph.database, defaultAccessMode: "READ" });
    try {
      const result = await session.run(cypher, params);
      return result.records.map((r: any) => r.toObject());
    } catch {
      return null;
    } finally {
      await session.close();
    }
  },

  async health(): Promise<{ enabled: boolean; reachable: boolean; error?: string }> {
    if (!this.isEnabled()) return { enabled: false, reachable: false };
    const d = await getDriver();
    if (!d) return { enabled: true, reachable: false, error: lastError ?? "driver unavailable" };
    try {
      await d.verifyConnectivity();
      return { enabled: true, reachable: true };
    } catch (error) {
      return { enabled: true, reachable: false, error: error instanceof Error ? error.message : "connectivity failed" };
    }
  },
};
