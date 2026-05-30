import "server-only";
import { runtimeConfig } from "./config";
import { loadOptionalModule } from "./optional-module";
import type { TopicSpec } from "./topics";

/**
 * Degrade-safe Kafka adapter (event fabric). When disabled or `kafkajs` is not
 * installed, publish() returns {published:false} and callers MUST continue using
 * the Postgres-backed durable event/queue fabric (lib/async/*). Kafka is additive,
 * never the sole path for a critical workflow during Phase B.
 */
let kafka: any = null;
let producer: any = null;
let initialized = false;
let lastError: string | null = null;

function buildClientConfig() {
  const cfg = runtimeConfig.kafka;
  const out: any = { clientId: cfg.clientId, brokers: cfg.brokers, ssl: cfg.ssl || undefined };
  if (cfg.saslMechanism && cfg.saslUsername && cfg.saslPassword) {
    out.sasl = { mechanism: cfg.saslMechanism, username: cfg.saslUsername, password: cfg.saslPassword };
  }
  return out;
}

async function getProducer(): Promise<any | null> {
  if (!runtimeConfig.kafka.enabled || runtimeConfig.kafka.brokers.length === 0) return null;
  if (initialized) return producer;
  initialized = true;
  const mod = (await loadOptionalModule<any>("kafkajs")) as any;
  if (!mod) {
    lastError = "kafkajs not installed";
    return null;
  }
  try {
    const Kafka = mod.Kafka;
    kafka = new Kafka(buildClientConfig());
    producer = kafka.producer({ allowAutoTopicCreation: false, idempotent: true });
    await producer.connect();
    return producer;
  } catch (error) {
    lastError = error instanceof Error ? error.message : "kafka connect failed";
    producer = null;
    return null;
  }
}

export type PublishResult = { published: boolean; reason?: string };

export const kafkaRuntime = {
  isEnabled() {
    return runtimeConfig.kafka.enabled && runtimeConfig.kafka.brokers.length > 0;
  },

  /**
   * Publish keyed by the topic's partition key (extracted from the message),
   * preserving per-entity ordering. Returns published:false on any failure so
   * the caller keeps the durable Postgres path as the source of truth.
   */
  async publish(topic: TopicSpec, message: Record<string, unknown>): Promise<PublishResult> {
    const p = await getProducer();
    if (!p) return { published: false, reason: lastError ?? "kafka disabled" };
    const key = message[topic.partitionKey];
    try {
      await p.send({
        topic: topic.name,
        messages: [
          {
            key: key != null ? String(key) : undefined,
            value: JSON.stringify(message),
            headers: { producer: runtimeConfig.kafka.clientId },
          },
        ],
      });
      return { published: true };
    } catch (error) {
      return { published: false, reason: error instanceof Error ? error.message : "publish failed" };
    }
  },

  /** Route a poison message to the topic's dead-letter queue with failure context. */
  async deadLetter(topic: TopicSpec, message: Record<string, unknown>, failure: string): Promise<PublishResult> {
    const p = await getProducer();
    if (!p) return { published: false, reason: "kafka disabled" };
    try {
      await p.send({
        topic: topic.dlq,
        messages: [{ value: JSON.stringify({ original: message, failure, failedAt: new Date().toISOString() }) }],
      });
      return { published: true };
    } catch (error) {
      return { published: false, reason: error instanceof Error ? error.message : "dlq publish failed" };
    }
  },

  async health(): Promise<{ enabled: boolean; reachable: boolean; brokers: number; error?: string }> {
    const brokers = runtimeConfig.kafka.brokers.length;
    if (!this.isEnabled()) return { enabled: false, reachable: false, brokers };
    const mod = (await loadOptionalModule<any>("kafkajs")) as any;
    if (!mod) return { enabled: true, reachable: false, brokers, error: "kafkajs not installed" };
    try {
      const admin = new mod.Kafka(buildClientConfig()).admin();
      await admin.connect();
      await admin.listTopics();
      await admin.disconnect();
      return { enabled: true, reachable: true, brokers };
    } catch (error) {
      return { enabled: true, reachable: false, brokers, error: error instanceof Error ? error.message : "admin failed" };
    }
  },
};
