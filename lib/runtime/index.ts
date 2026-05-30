/**
 * KARTEX Phase B distributed runtime layer.
 *
 * Five degrade-safe runtime adapters. All are DISABLED by default and fall back
 * to the existing Postgres/in-process implementations, so adopting any runtime is
 * additive and reversible (flip the RUNTIME_*_ENABLED flag).
 */
export { runtimeConfig, runtimeEnabled } from "./config";
export type { RuntimeName } from "./config";
export { redisRuntime } from "./redis";
export { kafkaRuntime } from "./kafka";
export { graphRuntime } from "./graph";
export { vectorRuntime } from "./vector";
export { streamRuntime, EXPECTED_FLINK_JOBS } from "./stream";
export { TOPICS, allTopicSpecs } from "./topics";
export type { TopicSpec, TopicKey, RuntimeDomain } from "./topics";
export { getRuntimeHealth } from "./health";
export type { RuntimeHealthReport, RuntimeHealthEntry } from "./health";
