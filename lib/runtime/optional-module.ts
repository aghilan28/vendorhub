import "server-only";

/**
 * Loads an OPTIONAL runtime dependency (ioredis, kafkajs, neo4j-driver,
 * @qdrant/js-client-rest) at runtime without the bundler/typechecker trying to
 * resolve it at build time. If the package is not installed, the caller degrades
 * gracefully instead of crashing the build or the request path.
 *
 * The indirection via `Function` is intentional: a static `import("ioredis")`
 * would force webpack to resolve+bundle the module and `tsc` to require its
 * types, which would break `next build` / `tsc --noEmit` when the optional
 * package is absent. This keeps Phase B adapters install-on-demand.
 */
const hiddenImport = new Function("specifier", "return import(specifier);") as (
  specifier: string,
) => Promise<unknown>;

const cache = new Map<string, unknown>();

export async function loadOptionalModule<T = unknown>(specifier: string): Promise<T | null> {
  if (cache.has(specifier)) return cache.get(specifier) as T;
  try {
    const mod = (await hiddenImport(specifier)) as T;
    cache.set(specifier, mod);
    return mod;
  } catch {
    cache.set(specifier, null);
    return null;
  }
}

export function clearOptionalModuleCacheForTests() {
  cache.clear();
}
