// MCP-0E — Live Commerce Intelligence domain types.
//
// The engine operates on the SAME shapes the real marketplace returns:
//  - products / inventory / orders  → @/features/seller/types
//  - reviews / returns / refunds / disputes / tickets / sellers → @/lib/trust/types
// so it runs identically on LIVE data (when Supabase is configured) and on a
// clearly-labelled deterministic sample (preview only). No demo data ever
// drives live counts — see lib/marketplace-intelligence/queries.ts.

import type { InventoryItem, SellerOrder, SellerProduct } from "@/features/seller/types";
import type {
  DisputeInput,
  RefundInput,
  ReturnInput,
  ReviewInput,
  SellerActivity,
  SupportTicketInput,
} from "@/lib/trust/types";

export type Severity = "info" | "opportunity" | "watch" | "warning" | "critical";
export type Tone = "healthy" | "watch" | "degraded" | "critical";
export type IntelligenceScope = "product" | "category" | "store" | "marketplace";

// ── Raw activity (the fabric sources) ────────────────────────────────────────

/** A store/vendor present in the marketplace. */
export interface StoreActivity extends SellerActivity {
  city?: string;
  status?: string;
}

/** A search query observed on the marketplace (optional behavioural source). */
export interface SearchEvent {
  query: string;
  category?: string;
  results: number;
  clicked: boolean;
  createdAt: string;
}

/** A product view / add-to-cart / purchase behavioural event (optional). */
export interface BehaviorEvent {
  productId: string;
  type: "view" | "add_to_cart" | "purchase" | "wishlist";
  createdAt: string;
}

/** An active promotion / coupon (reuses MCP-0C seller_promotions shape). */
export interface PromotionActivity {
  code: string;
  sellerId?: string;
  type: "percent" | "flat" | "bundle" | "coupon";
  value: number;
  redemptions: number;
  active: boolean;
}

/**
 * The unified raw marketplace activity that feeds the fabric. Every field maps
 * to a real table; optional fields degrade to empty without breaking the engine.
 */
export interface MarketplaceActivityInput {
  generatedAt?: string;
  /** Real product catalog rows mapped to SellerProduct (carry sellerId via owner). */
  products: FabricProductInput[];
  inventory: InventoryItem[];
  orders: SellerOrder[];
  sellers: StoreActivity[];
  reviews: ReviewInput[];
  returns: ReturnInput[];
  refunds: RefundInput[];
  disputes: DisputeInput[];
  tickets: SupportTicketInput[];
  promotions?: PromotionActivity[];
  searches?: SearchEvent[];
  behavior?: BehaviorEvent[];
}

/** A product with the owning store attached (marketplace is multi-seller). */
export interface FabricProductInput extends SellerProduct {
  sellerId: string;
  sellerName?: string;
}

// ── Fabric (normalized, indexed, the single source engines consume) ──────────

export interface ProductFacts {
  productId: string;
  name: string;
  category: string;
  sellerId: string;
  sellerName: string;
  price: number;
  mrp: number;
  marginPct: number;
  discountPct: number;
  available: number;
  reserved: number;
  lowStockThreshold: number;
  unitsSold: number;
  revenue: number;
  velocityPerDay: number;
  daysOfCover: number | null;
  views: number;
  conversionPct: number;
  rating: number;
  reviewCount: number;
  returnRate: number;
  status: SellerProduct["status"];
  windowDays: number;
}

export interface CategoryFacts {
  category: string;
  products: number;
  unitsSold: number;
  revenue: number;
  velocityPerDay: number;
  avgPrice: number;
  avgRating: number;
  outOfStock: number;
  share: number; // % of marketplace revenue
}

export interface StoreFacts {
  sellerId: string;
  name: string;
  verified: boolean;
  products: number;
  unitsSold: number;
  revenue: number;
  orders: number;
  cancellations: number;
  cancellationRate: number;
  returnRate: number;
  refundRate: number;
  disputes: number;
  avgRating: number;
  responseMinutes: number;
}

export interface MarketplaceTotals {
  gmv: number;
  orders: number;
  averageOrderValue: number;
  unitsSold: number;
  activeProducts: number;
  totalProducts: number;
  sellers: number;
  verifiedSellers: number;
  categories: number;
  outOfStock: number;
  reviews: number;
  flaggedReviews: number;
  openReturns: number;
  openRefunds: number;
  openDisputes: number;
  openTickets: number;
  windowDays: number;
}

export interface MarketplaceFabric {
  generatedAt: string;
  windowDays: number;
  products: ProductFacts[];
  categories: CategoryFacts[];
  stores: StoreFacts[];
  totals: MarketplaceTotals;
  /** Whether this fabric was assembled from any real activity (non-empty). */
  hasActivity: boolean;
}

// ── Engine outputs ───────────────────────────────────────────────────────────

export interface DemandForecast {
  scope: IntelligenceScope;
  refId: string;
  label: string;
  dailyRunRate: number;
  expectedUnits7d: number;
  expectedUnits30d: number;
  trend: "rising" | "flat" | "declining";
  confidence: number; // 0..100
}

export interface DemandSignal {
  kind: "trend" | "risk" | "opportunity";
  scope: IntelligenceScope;
  refId: string;
  severity: Severity;
  title: string;
  detail: string;
}

export interface DemandIntelligence {
  forecasts: DemandForecast[];
  signals: DemandSignal[];
  marketplaceRunRate: number;
  marketplaceForecast30d: number;
}

export interface InventorySignal {
  productId: string;
  name: string;
  sellerId: string;
  available: number;
  daysOfCover: number | null;
  reorderPoint: number;
  suggestedReorder: number;
  risk: "healthy" | "watch" | "stockout" | "overstock" | "dead_stock";
  rationale: string;
}

export interface InventoryIntelligence {
  signals: InventorySignal[];
  healthScore: number; // 0..100
  stockoutCount: number;
  overstockCount: number;
  reorderUnits: number;
}

export interface PricingSignal {
  productId: string;
  name: string;
  sellerId: string;
  price: number;
  marginPct: number;
  recommendation: "raise" | "discount" | "promote" | "hold";
  expectedRevenueImpactPct: number;
  expectedMarginImpactPct: number;
  rationale: string;
}

export interface PricingIntelligence {
  signals: PricingSignal[];
  averageMarginPct: number;
  belowMarginCount: number;
  promotionGuidance: string[];
}

export interface MarketplaceHealth {
  score: number; // 0..100
  tone: Tone;
  demandScore: number;
  inventoryScore: number;
  pricingScore: number;
  trustScore: number;
  fulfillmentScore: number;
}

export interface MarketplaceRisk {
  kind:
    | "demand_risk"
    | "inventory_risk"
    | "pricing_risk"
    | "trust_risk"
    | "seller_risk"
    | "fulfillment_risk"
    | "marketplace_risk";
  severity: Severity;
  scope: IntelligenceScope;
  refId: string;
  title: string;
  detail: string;
  recommendedAction: string;
}

export interface GrowthOpportunity {
  kind: "category_expansion" | "demand_surge" | "pricing_headroom" | "seller_growth" | "discovery_gap";
  scope: IntelligenceScope;
  refId: string;
  title: string;
  detail: string;
  action: string;
  potential: "low" | "medium" | "high";
}

export interface MarketplaceInsight {
  domain: "demand" | "inventory" | "pricing" | "trust" | "growth" | "fulfillment" | "marketplace";
  severity: Severity;
  title: string;
  detail: string;
}

/** A unified, rankable, activatable recommendation produced by the engine. */
export interface IntelligenceRecommendation {
  id: string;
  kind:
    | "demand_forecast"
    | "stockout_risk"
    | "overstock_risk"
    | "reorder"
    | "price_optimization"
    | "promotion"
    | "trust_risk"
    | "seller_risk"
    | "growth_opportunity"
    | "marketplace_action";
  scope: IntelligenceScope;
  refId: string;
  severity: Severity;
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  detail: string;
  action: string;
  evidence: string[];
  /** Which downstream layer this recommendation activates. */
  activation: "execution" | "governance" | "simulation";
  score: number; // ranking score 0..100
}

// ── Buyer intelligence ────────────────────────────────────────────────────────

export interface BuyerRecommendation {
  productId: string;
  name: string;
  reason: string;
  score: number;
}

export interface BuyerIntelligence {
  trending: BuyerRecommendation[];
  recommended: BuyerRecommendation[];
  relatedByCategory: Record<string, BuyerRecommendation[]>;
  availabilityPredictions: Array<{ productId: string; name: string; prediction: string; daysOfCover: number | null }>;
  deliveryPredictions: Array<{ sellerId: string; name: string; etaMinutes: number; confidence: number }>;
  smartDiscovery: string[];
}

// ── Workflow engine ───────────────────────────────────────────────────────────

export type WorkflowKind =
  | "demand_risk"
  | "inventory_risk"
  | "price_optimization"
  | "trust_risk"
  | "seller_risk"
  | "marketplace_growth";

export interface WorkflowAction {
  id: string;
  title: string;
  detail: string;
  owner: string;
  priority: "low" | "medium" | "high" | "critical";
  sourceRecommendationId: string;
}

export interface IntelligenceWorkflow {
  kind: WorkflowKind;
  title: string;
  description: string;
  triggered: boolean;
  triggerCount: number;
  actions: WorkflowAction[];
}

// ── Top-level snapshot ────────────────────────────────────────────────────────

export interface MarketplaceIntelligenceSnapshot {
  generatedAt: string;
  windowDays: number;
  fabric: MarketplaceFabric;
  demand: DemandIntelligence;
  inventory: InventoryIntelligence;
  pricing: PricingIntelligence;
  health: MarketplaceHealth;
  risks: MarketplaceRisk[];
  growth: GrowthOpportunity[];
  insights: MarketplaceInsight[];
  recommendations: IntelligenceRecommendation[];
  workflows: IntelligenceWorkflow[];
}
