import type { GlobalRegion } from "@/lib/global-infrastructure";

export type ExecutiveDomain =
  | "marketplace"
  | "seller"
  | "inventory"
  | "logistics"
  | "finance"
  | "ai"
  | "governance"
  | "global"
  | "platform"
  | "autonomous"
  | "observability";

export type ExecutiveSeverity = "info" | "watch" | "critical";
export type ForecastHorizon = "24h" | "7d" | "30d";

export type ExecutiveCommerceSignals = {
  orders24h: number;
  orders7d: number;
  revenue24h: number;
  revenue7d: number;
  activeSellers: number;
  sellerHealthScore: number;
  inventoryStockoutRate: number;
  inventoryDaysOfCoverMedian: number;
  fulfillmentDelayRate: number;
  logisticsDispatchBacklog: number;
  logisticsZonePressure: number;
  payoutLatencyHours: number;
  financeReplayFrequency: number;
  reconciliationBacklog: number;
  aiFallbackRate: number;
  aiRankingDrift: number;
  governanceBacklog: number;
  governanceHighRiskSignals: number;
  regionalOutages: number;
  regionalQueuePressure: number;
  platformApiErrorRate: number;
  webhookRetryRate: number;
  autonomousCriticalIncidents: number;
  remediationLoopSignals: number;
  observabilityLagSeconds: number;
  realtimeReconnects: number;
  replayAnomalyRate: number;
  tenantLeakageSignals: number;
};

export type ExecutiveForecast = {
  id: string;
  domain: ExecutiveDomain;
  horizon: ForecastHorizon;
  metric: string;
  currentValue: number;
  predictedValue: number;
  direction: "up" | "down" | "flat";
  confidence: number;
  stale: boolean;
  driftRisk: ExecutiveSeverity;
  replaySnapshotKey: string;
  assumptions: string[];
  explanation: string;
  operationalImpact: string;
  observedAt: string;
};

export type StrategicAnomaly = {
  id: string;
  domain: ExecutiveDomain;
  severity: ExecutiveSeverity;
  title: string;
  businessImpactScore: number;
  correlatedDomains: ExecutiveDomain[];
  replayTraceKey: string;
  evidence: string[];
  explanation: string;
  recommendedAction: string;
};

export type ExecutiveDecisionRecommendation = {
  id: string;
  priority: number;
  domain: ExecutiveDomain;
  title: string;
  recommendation: string;
  businessImpactScore: number;
  governanceSafe: boolean;
  requiresHumanApproval: boolean;
  reasoning: string[];
  replayTraceKey: string;
};

export type ExecutiveTimelineEvent = {
  id: string;
  at: string;
  domain: ExecutiveDomain;
  severity: ExecutiveSeverity;
  summary: string;
  replayTraceKey: string;
};

export type ExecutiveCommandCenterSnapshot = {
  generatedAt: string;
  tenantSafe: boolean;
  replaySafe: boolean;
  overallSeverity: ExecutiveSeverity;
  executiveSummary: string;
  strategicScore: number;
  regions: GlobalRegion[];
  forecasts: ExecutiveForecast[];
  anomalies: StrategicAnomaly[];
  recommendations: ExecutiveDecisionRecommendation[];
  timeline: ExecutiveTimelineEvent[];
  observability: {
    aggregationLatencyMs: number;
    staleForecasts: number;
    driftWarnings: number;
    alertGroups: number;
    replayDiagnostics: string[];
    explainability: string[];
  };
};

export type ExecutiveValidationReport = {
  productionSafe: boolean;
  replaySafe: boolean;
  tenantSafe: boolean;
  forecastObservable: boolean;
  risks: string[];
  metrics: {
    forecastAccuracyProxy: number;
    forecastDriftRate: number;
    strategicAnomalyFrequency: number;
    marketplaceGrowthPressure: number;
    infrastructureSaturationTrend: number;
    regionalOperationalPressure: number;
    financeVolatilityIndicator: number;
    logisticsDemandSpike: number;
  };
  checkedAt: string;
};
