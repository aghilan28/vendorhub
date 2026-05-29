import "server-only";
import { redisRuntime } from "./redis";
import { kafkaRuntime } from "./kafka";
import { graphRuntime } from "./graph";
import { vectorRuntime } from "./vector";
import { streamRuntime } from "./stream";

export type RuntimeHealthEntry = {
  runtime: "redis" | "kafka" | "graph" | "vector" | "stream";
  enabled: boolean;
  reachable: boolean;
  degraded: boolean; // enabled but not reachable => degraded (fallback active)
  detail: Record<string, unknown>;
};

export type RuntimeHealthReport = {
  status: "ok" | "degraded" | "disabled";
  checkedAt: string;
  runtimes: RuntimeHealthEntry[];
};

function entry(runtime: RuntimeHealthEntry["runtime"], detail: any): RuntimeHealthEntry {
  const enabled = Boolean(detail.enabled);
  const reachable = Boolean(detail.reachable);
  return { runtime, enabled, reachable, degraded: enabled && !reachable, detail };
}

export async function getRuntimeHealth(): Promise<RuntimeHealthReport> {
  const [redis, kafka, graph, vector, stream] = await Promise.all([
    redisRuntime.health(),
    kafkaRuntime.health(),
    graphRuntime.health(),
    vectorRuntime.health(),
    streamRuntime.health(),
  ]);

  const runtimes = [
    entry("redis", redis),
    entry("kafka", kafka),
    entry("graph", graph),
    entry("vector", vector),
    entry("stream", stream),
  ];

  const anyEnabled = runtimes.some((r) => r.enabled);
  const anyDegraded = runtimes.some((r) => r.degraded);
  const status: RuntimeHealthReport["status"] = !anyEnabled ? "disabled" : anyDegraded ? "degraded" : "ok";

  return { status, checkedAt: new Date().toISOString(), runtimes };
}
