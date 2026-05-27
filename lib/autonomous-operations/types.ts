import type { GlobalRegion } from "@/lib/global-infrastructure";

export type AutonomousDomain =
  | "async"
  | "global"
  | "edge"
  | "realtime"
  | "ai"
  | "finance"
  | "logistics"
  | "governance"
  | "developer_platform"
  | "observability";

export type IncidentSeverity = "info" | "watch" | "critical";
export type RemediationMode = "monitor" | "contain" | "heal" | "escalate";

export type AutonomousSignalInput = {
  queueDepth: number;
  queueLatencySeconds: number;
  retryCount: number;
  deadLetters: number;
  replayDuplicates: number;
  regionalOutages: number;
  failoverFlaps: number;
  realtimeReconnects: number;
  activeRealtimeChannels: number;
  edgeInvalidationBacklog: number;
  aiFallbackRate: number;
  financeReplayRate: number;
  reconciliationBacklog: number;
  logisticsProviderOutages: number;
  governanceBacklog: number;
  webhookRetryRate: number;
  webhookDeadLetters: number;
  observabilityLagSeconds: number;
  tenantLeakageSignals: number;
};

export type AutonomousIncident = {
  id: string;
  domain: AutonomousDomain;
  severity: IncidentSeverity;
  title: string;
  signal: string;
  correlatedSignals: string[];
  anomalyScore: number;
  groupKey: string;
  replayAware: boolean;
  tenantSafe: boolean;
  suppressionKey: string;
  escalationCooldownSeconds: number;
  diagnostics: string[];
  explainability: {
    summary: string;
    evidence: string[];
    operatorAction: string;
  };
  detectedAt: string;
};

export type SelfHealingAction = {
  id: string;
  domain: AutonomousDomain;
  mode: RemediationMode;
  description: string;
  boundedRetries: number;
  cooldownSeconds: number;
  cooldownEnforced: boolean;
  reversible: boolean;
  replaySafe: boolean;
  retryTraceKey: string;
  rollbackValidation: string[];
  requiresHumanApproval: boolean;
};

export type SelfHealingPlan = {
  incidentId: string;
  severity: IncidentSeverity;
  mode: RemediationMode;
  actions: SelfHealingAction[];
  rollbackActions: string[];
  containmentActive: boolean;
  escalationRequired: boolean;
  replayTraceKey: string;
  deterministicTrace: string;
  boundedRetryBudget: number;
  cooldownUntil: string;
  explainability: string[];
  observabilityTags: string[];
};

export type ContainmentPlan = {
  active: boolean;
  quarantinedDomains: AutonomousDomain[];
  throttledDomains: AutonomousDomain[];
  degradedModes: string[];
  maxRetryBudget: number;
  reason: string;
  replayDiagnostics: string[];
  recoveryValidation: string[];
  quarantineRecoveryActions: string[];
  adaptiveThrottlePercent: number;
  driftDetected: boolean;
};

export type AutonomousFailoverPlan = {
  stable: boolean;
  targetRegion?: GlobalRegion;
  isolationRequired: boolean;
  cooldownSeconds: number;
  replayTraceKey: string;
  failbackAllowed: boolean;
  oscillationPrevented: boolean;
  recoveryValidation: string[];
  actions: string[];
};

export type AutonomousValidationReport = {
  productionSafe: boolean;
  replaySafe: boolean;
  bounded: boolean;
  governable: boolean;
  risks: string[];
  metrics: {
    remediationSuccessRate: number;
    replayContainmentFrequency: number;
    alertSuppressionRate: number;
    failoverRecoveryDurationSeconds: number;
    anomalyEscalationFrequency: number;
    autonomousRollbackRate: number;
    containmentActivationFrequency: number;
    recoveryDeadlockDetected: boolean;
    remediationCooldownViolations: number;
  };
  explainability: string[];
  checkedAt: string;
};
