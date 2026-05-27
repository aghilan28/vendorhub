export type ObservabilityLevel = "debug" | "info" | "warn" | "error" | "fatal";

export type ObservabilityDomain =
  | "api"
  | "auth"
  | "checkout"
  | "payment"
  | "refund"
  | "reconciliation"
  | "realtime"
  | "ai"
  | "database"
  | "delivery"
  | "seller"
  | "admin"
  | "enterprise"
  | "frontend"
  | "security"
  | "system";

export type ObservabilityMetadata = Record<string, string | number | boolean | null | undefined>;

export type OperationalEvent = {
  service: "vendorhub-web";
  environment: string;
  level: ObservabilityLevel;
  domain: ObservabilityDomain;
  event: string;
  message?: string;
  traceId: string;
  spanId?: string;
  correlationId?: string;
  requestId?: string;
  actorId?: string;
  subjectId?: string;
  organizationId?: string;
  workspaceId?: string;
  vendorId?: string;
  durationMs?: number;
  metadata?: ObservabilityMetadata;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  timestamp: string;
};

export type TraceContext = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  correlationId?: string;
  requestId?: string;
  actorId?: string;
  subjectId?: string;
  organizationId?: string;
  workspaceId?: string;
  vendorId?: string;
};

export type HealthTone = "healthy" | "watch" | "degraded" | "critical";

export type OperationalAlert = {
  id: string;
  title: string;
  domain: ObservabilityDomain;
  severity: "info" | "warning" | "critical";
  signal: string;
  action: string;
  value?: string | number;
};
