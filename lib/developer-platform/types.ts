import type { QueueDomain } from "@/lib/async/types";
import type { GlobalRegion } from "@/lib/global-infrastructure";

export const PUBLIC_API_VERSIONS = ["2026-05-27"] as const;
export type PublicApiVersion = (typeof PUBLIC_API_VERSIONS)[number];

export type DeveloperScope =
  | "orders:read"
  | "orders:write"
  | "logistics:read"
  | "logistics:write"
  | "payouts:read"
  | "governance:read"
  | "ai:read"
  | "events:read"
  | "webhooks:write";

export type DeveloperIntegration = {
  id: string;
  organizationId: string;
  workspaceId?: string | null;
  vendorId?: string | null;
  name: string;
  scopes: readonly DeveloperScope[];
  tokenHash: string;
  tokenPrefix: string;
  revokedAt?: string | null;
  rotatedAt?: string | null;
  rateLimitPerMinute: number;
};

export type DeveloperAuthContext = {
  integrationId: string;
  organizationId: string;
  workspaceId?: string | null;
  vendorId?: string | null;
  scopes: readonly DeveloperScope[];
  rateLimitKey: string;
  replayKeyPrefix: string;
};

export type PublicApiContract = {
  id: string;
  version: PublicApiVersion;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  domain: QueueDomain | "finance" | "platform";
  requiredScopes: readonly DeveloperScope[];
  stability: "stable" | "deprecated";
  deprecatesAt?: string;
  responseShape: readonly string[];
};

export type PublicApiDecision = {
  version: PublicApiVersion;
  contract: PublicApiContract;
  deprecated: boolean;
  compatible: boolean;
  replayKey: string;
  headers: Record<string, string>;
  observabilityTags: string[];
};

export type PlatformWebhookTopic =
  | "order.created"
  | "order.updated"
  | "logistics.delivery.updated"
  | "payout.released"
  | "governance.moderation.updated"
  | "ai.index.updated"
  | "operations.alert.created";

export type WebhookEndpoint = {
  id: string;
  integrationId: string;
  organizationId: string;
  url: string;
  topics: readonly PlatformWebhookTopic[];
  secret: string;
  disabledAt?: string | null;
  region?: GlobalRegion;
};

export type PlatformWebhookEvent = {
  id: string;
  topic: PlatformWebhookTopic;
  organizationId: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  replayKey: string;
};

export type WebhookDeliveryPlan = {
  endpointId: string;
  eventId: string;
  topic: PlatformWebhookTopic;
  signature: string;
  replayKey: string;
  attempt: number;
  nextAttemptAt: string;
  state: "deliver" | "backpressure" | "dead_letter" | "disabled";
  actions: string[];
};

export type EventStreamSubscription = {
  integrationId: string;
  organizationId: string;
  topics: readonly PlatformWebhookTopic[];
  cursor?: string | null;
  region?: GlobalRegion;
};

export type EventStreamPlan = {
  partition: string;
  cursor: string;
  replaySafe: boolean;
  retentionHours: number;
  actions: string[];
};

export type SdkContract = {
  language: "typescript" | "mobile-placeholder";
  version: PublicApiVersion;
  exports: string[];
  checksum: string;
  replaySafe: boolean;
};

export type PlatformTelemetryInput = {
  apiLatencyMs: number;
  apiErrorRate: number;
  webhookRetryRate: number;
  webhookDeadLetters: number;
  integrationFailureRate: number;
  sdkContractDrift: number;
  replayFrequency: number;
  rateLimitSaturation: number;
  externalAuthFailures: number;
  tenantLeakageSignals: number;
  externalQueuePressure: number;
};

export type PlatformValidationReport = {
  productionSafe: boolean;
  risks: string[];
  gracefulDegradation: string[];
  replaySafe: boolean;
  developerObservable: boolean;
  checkedAt: string;
};
