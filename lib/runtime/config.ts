/**
 * Phase B runtime configuration. Self-contained (reads process.env directly) so it
 * does not alter the central lib/env.ts contract. Every runtime is DISABLED unless
 * its RUNTIME_*_ENABLED flag is explicitly "true", guaranteeing zero behavioural
 * change until an operator opts in with real connection details.
 */
export type RuntimeName = "redis" | "kafka" | "graph" | "vector" | "stream";

function flag(name: string): boolean {
  return (process.env[name] ?? "").toLowerCase() === "true";
}

function str(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

function int(name: string, fallback: number): number {
  const v = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(v) ? v : fallback;
}

export const runtimeConfig = {
  redis: {
    enabled: flag("RUNTIME_REDIS_ENABLED"),
    url: str("REDIS_URL"),
    keyPrefix: str("REDIS_KEY_PREFIX") ?? "kartex",
    connectTimeoutMs: int("REDIS_CONNECT_TIMEOUT_MS", 2000),
  },
  kafka: {
    enabled: flag("RUNTIME_KAFKA_ENABLED"),
    brokers: (str("KAFKA_BROKERS") ?? "").split(",").map((b) => b.trim()).filter(Boolean),
    clientId: str("KAFKA_CLIENT_ID") ?? "kartex-app",
    ssl: flag("KAFKA_SSL"),
    saslMechanism: str("KAFKA_SASL_MECHANISM"),
    saslUsername: str("KAFKA_SASL_USERNAME"),
    saslPassword: str("KAFKA_SASL_PASSWORD"),
    schemaRegistryUrl: str("KAFKA_SCHEMA_REGISTRY_URL"),
  },
  graph: {
    enabled: flag("RUNTIME_NEO4J_ENABLED"),
    url: str("NEO4J_URL"),
    username: str("NEO4J_USERNAME") ?? "neo4j",
    password: str("NEO4J_PASSWORD"),
    database: str("NEO4J_DATABASE") ?? "neo4j",
  },
  vector: {
    enabled: flag("RUNTIME_QDRANT_ENABLED"),
    url: str("QDRANT_URL"),
    apiKey: str("QDRANT_API_KEY"),
  },
  stream: {
    enabled: flag("RUNTIME_FLINK_ENABLED"),
    restUrl: str("FLINK_REST_URL"),
  },
} as const;

export function runtimeEnabled(name: RuntimeName): boolean {
  return runtimeConfig[name].enabled;
}
