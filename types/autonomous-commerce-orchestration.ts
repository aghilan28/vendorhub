import type { Product, Vendor } from "@/types";
import type { HyperlocalOperationsSnapshot, OperationsContext, RiskLevel } from "@/types/hyperlocal-operations";

export type OrchestrationAgentName = "inventory" | "delivery" | "pricing" | "freshness" | "seller" | "trust" | "locality" | "demand";
export type OrchestrationActionType =
  | "rebalance_inventory"
  | "redirect_discovery"
  | "seller_advisory"
  | "delivery_adaptation"
  | "distress_clearance"
  | "trust_review"
  | "stabilization"
  | "forecast_recalculation"
  | "containment";
export type OrchestrationDecisionState = "proposed" | "needs_approval" | "approved" | "suppressed" | "rolled_back";
export type OrchestrationDecisionType =
  | "inventory_rebalancing"
  | "distress_pricing"
  | "seller_boosting"
  | "delivery_adaptation"
  | "freshness_prioritization"
  | "locality_redistribution"
  | "search_reweighting"
  | "surge_preparation"
  | "trust_escalation"
  | "recovery_containment";

export interface OrchestrationExplainabilityReport {
  summary: string;
  why: string[];
  sourceSignals: string[];
  localityContext: string;
  confidence: number;
  risk: RiskLevel;
  recoveryPath: string[];
  rollbackPath: string[];
}

export interface OrchestrationDecision {
  decision_id: string;
  decision_type: OrchestrationDecisionType;
  decision_confidence: number;
  locality_scope: string;
  affected_entities: string[];
  risk_level: RiskLevel;
  approval_required: boolean;
  rollback_supported: boolean;
  replay_safe: boolean;
  explainability_report: OrchestrationExplainabilityReport;
  generated_by: OrchestrationAgentName | "agent_consensus";
  created_at: string;
  expires_at: string;
  id: string;
  actionType: OrchestrationActionType;
  title: string;
  locality: string;
  confidence: number;
  risk: RiskLevel;
  reversible: boolean;
  requiresApproval: boolean;
  replayKey: string;
  rollbackToken: string;
  evidence: string[];
  state: OrchestrationDecisionState;
  severity: RiskLevel;
  impactScope: string;
  auditMetadata: {
    replayKey: string;
    idempotencyKey: string;
    governanceVersion: string;
    unsafeActionsBlocked: string[];
  };
}

export interface LocalityBalancingPlan {
  locality: string;
  city: string;
  localityImbalanceScore: number;
  redistributionRecommendations: string[];
  inventoryPressureAlerts: string[];
  localityStabilizationPlan: string[];
}

export interface InventoryCoordinationPlan {
  restockSuggestions: string[];
  stockReductionSuggestions: string[];
  localityTransfers: string[];
  distressClearance: string[];
  freshnessPrioritization: string[];
  driftDetected: boolean;
}

export interface SellerOptimizationRecommendation {
  sellerId: string;
  sellerName: string;
  recommendations: string[];
  operationalRiskAlerts: string[];
  inventoryAdvisories: string[];
  pricingAdvisories: string[];
  coachingTone: "simple" | "urgent" | "supervised";
  confidence: number;
}

export interface PredictiveLocalityIntelligence {
  demandSurgeProbability: number;
  rainDrivenDemand: number;
  festivalSpikeProbability: number;
  trafficDisruptionRisk: number;
  deliverySaturationRisk: number;
  sellerShortageRisk: number;
  freshnessRisk: number;
  regionalPattern: string;
}

export interface MarketplaceHealthSnapshot {
  marketplaceHealthScore: number;
  localityStabilityScore: number;
  inventoryHealth: number;
  sellerReliability: number;
  deliveryReliability: number;
  freshnessStability: number;
  pricingStability: number;
  searchQuality: number;
  operationalLoad: number;
  saturationDetected: boolean;
}

export interface MarketplacePressureSnapshot {
  sellerMonopolizationRisk: number;
  inventoryFragmentationRisk: number;
  deliverySaturationRisk: number;
  fakeScarcityRisk: number;
  freshnessCollapseRisk: number;
  priceVolatilityRisk: number;
  localityImbalanceRisk: number;
  pressureAlerts: string[];
}

export interface StabilizationPlan {
  pressureType: string;
  stabilizationPlans: string[];
  localityRecoveryRecommendations: string[];
  dynamicDiscoveryReweighting: string[];
  inventoryRedistributionSuggestions: string[];
  reversible: boolean;
  approvalRequired: boolean;
}

export interface RecoveryPlan {
  failureMode:
    | "seller_collapse"
    | "delivery_failure"
    | "delivery_congestion"
    | "locality_shortage"
    | "locality_outage"
    | "inventory_corruption"
    | "inventory_collapse"
    | "telemetry_gap"
    | "search_degradation"
    | "freshness_risk"
    | "none";
  containmentActions: string[];
  failoverSuggestions: string[];
  stabilizationActions: string[];
  rollbackPlan: string[];
  approvalGates: string[];
  auditTrail: string[];
  destructiveActionsBlocked: boolean;
}

export interface RoutingPlan {
  optimizedRoutingPlans: string[];
  sellerBoostRecommendations: string[];
  freshnessAwareDiscoveryRanking: Array<{ productId: string; boost: number; reason: string }>;
  deliveryRoutePriorities: Array<{ productId: string; priority: RiskLevel; reason: string }>;
}

export interface TrustIntegritySignal {
  sellerId: string;
  trustScore: number;
  fakeInventoryRisk: number;
  sellerManipulationRisk: number;
  priceExploitationRisk: number;
  fraudClusterRisk: number;
  freshnessDeceptionRisk: number;
  fakeScarcityRisk: number;
  reviewRequired: boolean;
}

export interface MarketplaceIntegrityGraph {
  sellerTrustProfiles: TrustIntegritySignal[];
  fraudSignals: string[];
  trustCorrelations: string[];
  escalationRecommendations: string[];
  automaticBansBlocked: boolean;
}

export interface AdaptiveLearningEvent {
  id: string;
  signal: "search" | "purchase" | "locality_demand" | "delivery_outcome" | "freshness_complaint" | "seller_performance";
  adjustment: string;
  explainability: string;
  reversible: boolean;
  replayKey: string;
}

export interface OperationalAgentState {
  agent: OrchestrationAgentName;
  health: RiskLevel;
  proposedActions: OrchestrationActionType[];
  conflicts: string[];
  bounded: boolean;
  replaySafe: boolean;
  confidence: number;
  deterministicOutputKey: string;
  localityScope: string;
  consensusWeight: number;
}

export interface AgentCoordination {
  sharedContextKey: string;
  arbitrationDecisions: string[];
  conflictResolution: string[];
  consensusSummary: string[];
  priorityEscalations: string[];
  deterministic: boolean;
  replaySafe: boolean;
}

export interface OrchestrationGovernance {
  approvalRequiredCount: number;
  rollbackTokens: string[];
  operatorOverrideEnabled: boolean;
  safetyThresholds: Record<string, number>;
  replayValidationKeys: string[];
  explainabilityReport: string[];
  approvalQueue: Array<{ decisionId: string; risk: RiskLevel; reason: string; rollbackToken: string }>;
  humanOverrideControls: string[];
  replayValidationLayer: string[];
  decisionAuditEvents: string[];
}

export interface OrchestrationJob {
  jobName:
    | "tier5.locality.balance"
    | "tier5.forecast.recalculate"
    | "tier5.seller.advisory"
    | "tier5.delivery.adapt"
    | "tier5.trust.analyze"
    | "tier5.marketplace.stabilize"
    | "tier5.demand.respond"
    | "tier5.orchestration.simulate";
  queueName: string;
  idempotencyKey: string;
  replaySafe: boolean;
  failoverEnabled: boolean;
  observable: boolean;
  queueIsolationKey: string;
}

export interface SupplyDemandRebalancing {
  locality_pressure_score: number;
  imbalance_severity: RiskLevel;
  redistribution_efficiency: number;
  locality_stability_score: number;
  nearbySellerRebalancing: string[];
  discoveryRedistribution: string[];
  inventorySurplusRouting: string[];
  demandSpikeCompensation: string[];
}

export interface DeliveryAdaptationIntelligence {
  weatherRisk: number;
  heatRisk: number;
  rainRisk: number;
  trafficRisk: number;
  festivalCongestionRisk: number;
  apartmentDensityRisk: number;
  ruralComplexityRisk: number;
  deliveryRiskAdaptation: string[];
  etaRecoveryPlanning: string[];
  deliverySaturationDetection: string[];
  adaptiveRoutingIntelligence: string[];
}

export interface OrchestrationTelemetry {
  decisionGeneration: string[];
  confidenceShifts: string[];
  recoveryPlans: string[];
  approvalEvents: string[];
  rollbackEvents: string[];
  localityInterventions: string[];
  trustEscalations: string[];
  replayValidationMetrics: Record<string, number>;
  governanceAnalytics: Record<string, number>;
}

export interface OrchestrationSimulationResult {
  scenario:
    | "locality_demand_surge"
    | "seller_collapse"
    | "fish_market_shortage"
    | "delivery_saturation"
    | "rain_disruption"
    | "festival_congestion"
    | "fake_scarcity_attack"
    | "inventory_imbalance"
    | "search_degradation"
    | "multi_agent_conflict_resolution";
  boundedActions: boolean;
  replaySafe: boolean;
  rollbackSupported: boolean;
  localityStability: number;
  operationalExplainability: boolean;
  validationNotes: string[];
}

export interface AutonomousOrchestrationInput {
  products: Product[];
  sellers?: Vendor[];
  context: OperationsContext;
  operations?: HyperlocalOperationsSnapshot;
  outageSellerIds?: string[];
  telemetryGap?: boolean;
}

export interface AutonomousCommerceOrchestrationSnapshot {
  generatedAt: string;
  operations: HyperlocalOperationsSnapshot;
  decisions: OrchestrationDecision[];
  localityBalancing: LocalityBalancingPlan;
  inventoryCoordination: InventoryCoordinationPlan;
  sellerOptimization: SellerOptimizationRecommendation[];
  predictiveLocality: PredictiveLocalityIntelligence;
  marketplaceHealth: MarketplaceHealthSnapshot;
  marketplacePressure: MarketplacePressureSnapshot;
  stabilizationPlan: StabilizationPlan;
  recovery: RecoveryPlan;
  routing: RoutingPlan;
  rebalancing: SupplyDemandRebalancing;
  deliveryAdaptation: DeliveryAdaptationIntelligence;
  demandResponse: string[];
  regionalOptimization: string[];
  stabilization: string[];
  resourceAllocation: string[];
  trustIntegrity: TrustIntegritySignal[];
  marketplaceIntegrity: MarketplaceIntegrityGraph;
  adaptiveLearning: AdaptiveLearningEvent[];
  agents: OperationalAgentState[];
  agentCoordination: AgentCoordination;
  governance: OrchestrationGovernance;
  asyncJobs: OrchestrationJob[];
  telemetry: OrchestrationTelemetry;
  simulations: OrchestrationSimulationResult[];
}
