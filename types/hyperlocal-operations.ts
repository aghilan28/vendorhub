import type { BuyerLocation, Product, Vendor } from "@/types";

export type WeatherCondition = "normal" | "rainy" | "hot" | "storm";
export type FestivalKey = "pongal" | "diwali" | "onam" | "ramadan" | "temple_event" | "school_reopening" | "salary_cycle" | "none";
export type PerishabilityClass = "ambient" | "fresh" | "same_day" | "ultra_fresh" | "cold_chain";
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type InventoryOperationalState = "healthy" | "low_stock" | "critical" | "reserved" | "expiring" | "distressed" | "unavailable" | "pending_restock";
export type OperationalAlertDomain = "inventory" | "seller" | "delivery" | "stockout" | "spoilage" | "fraud" | "saturation" | "pricing" | "freshness" | "locality";
export type OperationalAlertState = "open" | "suppressed" | "escalated" | "resolved";

export interface OperationalInventoryRecord {
  inventory_id: string;
  seller_id: string;
  product_id: string;
  variant_id?: string | null;
  current_stock: number;
  reserved_stock: number;
  damaged_stock?: number;
  spoilage_stock?: number;
  incoming_stock?: number;
  freshness_score: number;
  batch_time: string;
  estimated_expiry: string;
  spoilage_risk: number;
  last_restocked_at: string;
  reorder_threshold: number;
  predicted_sellout_time: string | null;
  inventory_velocity: number;
  locality_demand_score: number;
  sales_velocity?: number;
  restock_velocity?: number;
  spoilage_velocity?: number;
  locality_demand_velocity?: number;
  inventory_health_score?: number;
  sellout_eta_hours?: number;
  spoilage_eta_hours?: number;
  freshness_confidence?: number;
  locality_pressure_score?: number;
  inventory_state?: InventoryOperationalState;
  loose_inventory?: {
    unit: "kg" | "g" | "piece" | "bunch" | "string" | "bundle" | "packet";
    estimatedWeightGrams?: number;
    confidence: number;
  };
}

export interface OperationsContext {
  now?: Date;
  buyerLocation?: BuyerLocation | null;
  locality: string;
  city: string;
  weather?: WeatherCondition;
  festival?: FestivalKey;
  traffic?: "light" | "normal" | "heavy";
  dayType?: "weekday" | "weekend";
  salaryWindow?: boolean;
  humidity?: number;
  heatIndexCelsius?: number;
  transitMinutes?: number;
  refrigeration?: "none" | "passive" | "active";
  ruralAccess?: boolean;
  festivalCongestion?: boolean;
  region?: string;
}

export interface DynamicPricingDecision {
  productId: string;
  currentPrice: number;
  recommendedPrice: number;
  priceDeltaPercent: number;
  volatilityScore: number;
  manipulationRisk: RiskLevel;
  pricingConfidence: number;
  markdownRecommendation: number;
  distressUrgency: RiskLevel;
  signals: string[];
  guardrail: string;
}

export interface DemandForecastOutput {
  productId: string;
  locality: string;
  predictedHourlySales: number;
  predictedDailySales: number;
  demandSpike: boolean;
  stockRisk: RiskLevel;
  replenishmentAlert: string | null;
  surgeAlert: string | null;
  confidence: number;
  demandCurve?: number[];
  surgeProbability?: number;
  temporalDemandProfile?: Record<string, number>;
  localityDemandProjection?: number;
  factors: string[];
}

export interface PerishabilityDecision {
  productId: string;
  perishabilityClass: PerishabilityClass;
  freshnessScore: number;
  spoilageRisk: number;
  predictedSpoilageAt: string;
  distressSaleRecommended: boolean;
  markdownPercent: number;
  deliveryUrgency: RiskLevel;
  freshnessEtaHours: number;
  heatDamageRisk: number;
  freshnessConfidence: number;
}

export interface SellerOperationsProfile {
  sellerId: string;
  sellerName: string;
  fulfillmentReliability: number;
  stockAccuracy: number;
  deliveryTimeliness: number;
  freshnessQuality: number;
  reorderPatternScore: number;
  demandVelocity: number;
  peakOperationalHours: string[];
  sellerHealthScore: number;
  sellerRiskScore: number;
  sellerOperationalGrade: "A" | "B" | "C" | "D";
  sellerReliabilityTrend: "improving" | "stable" | "degrading";
  riskLevel: RiskLevel;
  recoverySuggestions: string[];
  sellerEmbeddingId: string;
}

export interface DeliveryIntelligenceDecision {
  productId: string;
  etaMinutes: number;
  deliveryRisk: RiskLevel;
  routingComplexity: number;
  etaConfidence: number;
  spoilageTransitRisk: number;
  localityComplexityScore: number;
  deliveryFailureProbability: number;
  heatSensitivity: boolean;
  batchingAllowed: boolean;
  reason: string;
}

export interface BasketAffinityInsight {
  anchorProductId: string;
  affinityProductIds: string[];
  basketType: "co_purchase" | "meal" | "occasion" | "festival";
  score: number;
  reason: string;
  affinityEmbeddingId: string;
}

export interface GeoCommerceProfile {
  locality: string;
  city: string;
  archetype: "it_corridor" | "hostel_zone" | "temple_town" | "coastal" | "rural_market" | "high_income" | "working_class" | "mixed";
  demandHeat: number;
  competitionDensity: number;
  supplyPressure: number;
  localityPressureScore: number;
  supplyImbalanceScore: number;
  shortageProbability: number;
  redistributionSuggestion: string;
  demandHeatmap: GeoCommerceHeatmapPoint[];
  sellerSaturationMap: GeoCommerceHeatmapPoint[];
  deliveryCongestionMap: GeoCommerceHeatmapPoint[];
  inventoryScarcityMap: GeoCommerceHeatmapPoint[];
  freshnessRiskMap: GeoCommerceHeatmapPoint[];
  recommendedAction: string;
  localityVectorId: string;
}

export interface GeoCommerceHeatmapPoint {
  locality: string;
  city: string;
  latitude?: number;
  longitude?: number;
  intensity: number;
  metric: "demand" | "seller_saturation" | "delivery_congestion" | "inventory_scarcity" | "freshness_risk";
}

export interface OperationalRiskSignal {
  id: string;
  domain: OperationalAlertDomain;
  level: RiskLevel;
  title: string;
  evidence: string[];
  recoverySuggestion: string;
}

export interface RealtimeTelemetryEvent {
  id: string;
  createdAt: string;
  eventType: "search" | "purchase" | "stock_change" | "inventory_change" | "delivery_state" | "seller_activity" | "pricing_change" | "spoilage_event" | "distress_markdown";
  locality: string;
  city: string;
  productId?: string;
  sellerId?: string;
  value?: number;
  metadata: Record<string, string | number | boolean>;
  sequence?: number;
  region?: string;
  idempotencyKey?: string;
}

export interface FreshnessDecayProfile {
  productId: string;
  perishabilityClass: PerishabilityClass;
  shelfLifeHours: number;
  decayCurve: number[];
  climateAdjustedShelfLifeHours: number;
  freshnessScore: number;
  spoilageProbability: number;
  freshnessEtaHours: number;
  heatDamageRisk: number;
  deliveryFreshnessThresholdMinutes: number;
  freshnessRankBoost: number;
}

export interface DistressPricingRecommendation {
  productId: string;
  wasteRiskScore: number;
  markdownSuggestion: number;
  clearanceUrgency: RiskLevel;
  distressCampaignRecommendation: string | null;
  localityDemandMatchScore: number;
}

export interface TelemetryAggregation {
  partitionKey: string;
  dedupedEventCount: number;
  replaySafe: boolean;
  idempotencyKeys: string[];
  counters: Record<string, number>;
  region: string;
}

export interface OperationalAlertEvent {
  id: string;
  domain: OperationalAlertDomain;
  severity: RiskLevel;
  state: OperationalAlertState;
  title: string;
  escalationTarget: "seller" | "ops" | "admin" | "automation";
  suppressionKey: string;
  replayKey: string;
  evidence: string[];
  createdAt: string;
}

export interface OperationalDashboard {
  inventoryHealth: number;
  freshnessMonitoring: number;
  localityPressure: number;
  deliveryRisk: number;
  sellerHealth: number;
  distressInventory: number;
  demandForecasts: number;
  festivalSurgeMonitoring: number;
  panels: Array<{ key: string; label: string; value: number; severity: RiskLevel }>;
}

export interface OperationalAsyncJob {
  jobName:
    | "tier3.inventory.scan"
    | "tier3.demand.forecast"
    | "tier3.distress.pricing"
    | "tier3.locality.rebalance"
    | "tier3.freshness.scan"
    | "tier3.telemetry.aggregate";
  queueName: string;
  partitionKey: string;
  idempotencyKey: string;
  priority: "critical" | "high" | "normal" | "low";
  payload: Record<string, string | number | boolean>;
}

export interface OperationalVectorReadiness {
  entityEmbeddings: string[];
  behavioralVectors: string[];
  temporalVectors: string[];
  localityVectors: string[];
  demandEmbeddings: string[];
  sellerEmbeddings: string[];
  productAffinityEmbeddings: string[];
  freshnessVectors: string[];
  operationalEmbeddings: string[];
}

export interface HyperlocalOperationsSnapshot {
  generatedAt: string;
  context: OperationsContext;
  inventory: OperationalInventoryRecord[];
  pricing: DynamicPricingDecision[];
  forecasts: DemandForecastOutput[];
  freshness: FreshnessDecayProfile[];
  perishability: PerishabilityDecision[];
  sellers: SellerOperationsProfile[];
  delivery: DeliveryIntelligenceDecision[];
  baskets: BasketAffinityInsight[];
  geoCommerce: GeoCommerceProfile;
  distress: DistressPricingRecommendation[];
  risks: OperationalRiskSignal[];
  alerts: OperationalAlertEvent[];
  dashboard: OperationalDashboard;
  asyncJobs: OperationalAsyncJob[];
  telemetry: {
    events: RealtimeTelemetryEvent[];
    metrics: Record<string, number>;
    streamKey: string;
    aggregation: TelemetryAggregation;
  };
  aiReadiness: OperationalVectorReadiness;
}

export interface BuildOperationsInput {
  products: Product[];
  inventory?: Partial<OperationalInventoryRecord>[];
  sellers?: Vendor[];
  context: OperationsContext;
  telemetry?: RealtimeTelemetryEvent[];
}
