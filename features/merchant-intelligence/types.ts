export type MerchantInsightSeverity = "info" | "opportunity" | "warning" | "critical";
export type MerchantInsightDomain = "inventory" | "demand" | "fulfillment" | "discoverability" | "pricing" | "trust" | "hyperlocal" | "fairness";

export type MerchantInsight = {
  id: string;
  domain: MerchantInsightDomain;
  severity: MerchantInsightSeverity;
  title: string;
  explanation: string;
  action: string;
  confidence: number;
  evidence: string[];
  localeText: {
    en: string;
    ta: string;
    hi: string;
  };
};

export type DemandForecast = {
  productId: string;
  productName: string;
  category: string;
  expectedUnits7d: number;
  dailyRunRate: number;
  stockoutRisk: "low" | "medium" | "high";
  daysOfCover: number | null;
  confidence: number;
  confidenceReasoning: string;
  demandRationale: string;
  regionalContext: string;
  operationalImpact: string;
  explanation: string;
};

export type InventoryIntelligence = {
  productId: string;
  productName: string;
  available: number;
  reserved: number;
  reorderPoint: number;
  recommendedRestock: number;
  turnoverSignal: "fast" | "steady" | "slow" | "cold_start";
  risk: "healthy" | "watch" | "restock" | "dead_stock";
  rationale: string;
};

export type DiscoverabilityInsight = {
  productId: string;
  productName: string;
  score: number;
  visibility: "strong" | "improving" | "weak";
  reasons: string[];
  recommendation: string;
};

export type FulfillmentIntelligence = {
  activeOrders: number;
  delayedOrders: number;
  cancellationRate: number;
  fulfillmentRate: number;
  averagePromiseMinutes: number;
  bottlenecks: string[];
};

export type PricingGuidance = {
  productId: string;
  productName: string;
  currentPrice: number;
  position: "premium" | "balanced" | "value" | "review";
  suggestion: string;
  guardrail: string;
};

export type HyperlocalIntelligence = {
  locality: string;
  city: string;
  serviceRadiusKm: number;
  demandSignals: string[];
  opportunityCategories: Array<{ category: string; signal: string }>;
};

export type MerchantIntelligenceSnapshot = {
  generatedAt: string;
  stale: boolean;
  summary: {
    healthScore: number;
    demandScore: number;
    inventoryScore: number;
    fulfillmentScore: number;
    discoverabilityScore: number;
    fairnessScore: number;
  };
  insights: MerchantInsight[];
  forecasts: DemandForecast[];
  inventory: InventoryIntelligence[];
  discoverability: DiscoverabilityInsight[];
  fulfillment: FulfillmentIntelligence;
  pricing: PricingGuidance[];
  hyperlocal: HyperlocalIntelligence;
  coldStart: {
    isColdStart: boolean;
    recommendations: string[];
  };
  observability: {
    generatedInMs: number;
    snapshotTtlMinutes: number;
    source: "database" | "generated";
    refreshReasons: string[];
  };
};
