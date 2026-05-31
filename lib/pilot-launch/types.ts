/**
 * MCP-1G — Pilot Launch Domain Model
 * Types for: pilot readiness, deployment, seller/customer pilot, orders, delivery, market validation
 */

export type ReadinessStatus = "ready" | "conditionally_ready" | "not_ready";
export type PilotDecision = "scale" | "continue_pilot" | "pause" | "pivot";

export type ReadinessCheck = {
  id: string;
  category: string;
  name: string;
  status: ReadinessStatus;
  evidence: string;
  blockers: string[];
  action: string;
};

export type PilotReadinessAudit = {
  checks: ReadinessCheck[];
  overallStatus: ReadinessStatus;
  readyCount: number;
  conditionalCount: number;
  notReadyCount: number;
  summary: string;
};

export type DeploymentCertification = {
  environment: "production" | "staging";
  checks: Array<{ name: string; configured: boolean; evidence: string }>;
  overallReady: boolean;
  deployedAt: string | null;
  verifiedAt: string | null;
};

export type SellerPilotTarget = {
  minSellers: number;
  maxSellers: number;
  categories: string[];
  requirements: string[];
  trainingItems: string[];
};

export type SellerPilotMetrics = {
  onboarded: number;
  active: number;
  productsListed: number;
  avgProductsPerSeller: number;
  verificationRate: number;
  satisfactionScore: number;
  topIssues: string[];
};

export type CatalogActivationMetrics = {
  totalProducts: number;
  withImages: number;
  withPrices: number;
  withInventory: number;
  withVariants: number;
  categoryCoverage: number;
  searchableProducts: number;
  discoverableProducts: number;
  qualityScore: number;
};

export type CustomerPilotTarget = {
  minCustomers: number;
  maxCustomers: number;
  sources: string[];
  feedbackLoop: string[];
};

export type CustomerPilotMetrics = {
  registered: number;
  active: number;
  ordersPlaced: number;
  repeatCustomers: number;
  satisfactionScore: number;
  nps: number;
  topComplaints: string[];
  topRequests: string[];
};

export type OrderActivationMetrics = {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  conversionRate: number;
  cancellationRate: number;
  refundRate: number;
  deliverySuccessRate: number;
  repeatOrderRate: number;
};

export type DeliveryValidationMetrics = {
  totalDeliveries: number;
  onTimeRate: number;
  avgDeliveryMinutes: number;
  failedDeliveries: number;
  customerSatisfaction: number;
  etaAccuracy: number;
  topFailureReasons: string[];
};

export type OperationsValidationMetrics = {
  ticketsCreated: number;
  ticketsResolved: number;
  avgResolutionHours: number;
  slaCompliance: number;
  disputesRaised: number;
  disputesResolved: number;
  incidents: number;
  incidentsResolved: number;
  escalations: number;
};

export type IntelligenceValidationResult = {
  engine: string;
  predictions: number;
  accurate: number;
  accuracy: number;
  practicalValue: "high" | "medium" | "low";
  feedback: string;
};

export type MarketValidationMetrics = {
  sellerRetention: number;
  customerRetention: number;
  repeatOrderRate: number;
  marketplaceLiquidity: number;
  productAvailability: number;
  deliveryPerformance: number;
  customerSatisfaction: number;
  sellerSatisfaction: number;
  totalRevenue: number;
  weekOverWeekGrowth: number;
};

export type FeedbackItem = {
  id: string;
  source: "seller" | "customer" | "operations" | "support" | "admin";
  type: "problem" | "request" | "failure" | "opportunity";
  priority: "critical" | "high" | "medium" | "low";
  description: string;
  frequency: number;
  impact: string;
};

export type GoNoGoBoard = {
  decision: PilotDecision;
  overallScore: number;
  dimensions: Array<{ dimension: string; score: number; status: ReadinessStatus; evidence: string }>;
  strengths: string[];
  risks: string[];
  nextSteps: string[];
};

export type MCP1FinalCertification = {
  phases: Array<{ phase: string; title: string; status: string; keyDeliverable: string }>;
  whatWasBuilt: string[];
  whatWasProven: string[];
  whatWasLearned: string[];
  whatRemains: string[];
  futureRoadmap: string[];
  finalVerdict: string;
};
