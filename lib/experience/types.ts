export type ExperiencePersona = "buyer" | "seller" | "admin" | "executive" | "developer";

export type ExperienceDomain =
  | "commerce"
  | "seller_operations"
  | "governance"
  | "finance"
  | "logistics"
  | "ai"
  | "realtime"
  | "accessibility"
  | "performance";

export type ExperienceTone = "healthy" | "watch" | "degraded" | "critical";

export type ExperienceSignal = {
  id: string;
  label: string;
  detail: string;
  domain: ExperienceDomain;
  tone: ExperienceTone;
  trustVisible: boolean;
  userAction?: string;
};

export type ExperienceInput = {
  persona: ExperiencePersona;
  isOnline?: boolean;
  realtimeState?: "idle" | "connecting" | "connected" | "degraded" | "offline";
  aiAvailable?: boolean;
  paymentRecoverable?: boolean;
  logisticsDelayed?: boolean;
  operationalPressure?: number;
  accessibilityMode?: boolean;
};

export type ExperiencePosture = {
  persona: ExperiencePersona;
  tone: ExperienceTone;
  title: string;
  summary: string;
  signals: ExperienceSignal[];
  guarantees: string[];
  userMessage: string;
};
