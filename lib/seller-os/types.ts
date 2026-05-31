// MCP-0C — Seller Operating System domain types.
// The engine operates on the SAME shapes the real seller snapshot returns
// (features/seller/types), so it runs on live data — not demo data.

import type { InventoryItem, SellerOrder, SellerProduct } from "@/features/seller/types";

export type Tone = "healthy" | "watch" | "degraded" | "critical";

/** The seller's live operating snapshot (subset the OS engine consumes). */
export interface SellerOperatingInput {
  storeName: string;
  storeStatus: string; // vendor.status
  products: SellerProduct[];
  inventory: InventoryItem[];
  orders: SellerOrder[];
}

export interface StoreHealth {
  score: number; // 0..100
  tone: Tone;
  profileCompletion: number; // 0..100
  verified: boolean;
  signals: { label: string; value: string; ok: boolean }[];
}

export interface InventorySignal {
  productId: string;
  name: string;
  available: number;
  reorderPoint: number;
  velocityPerDay: number;
  daysOfCover: number;
  status: "healthy" | "low" | "out" | "overstock";
  suggestedReorder: number;
}

export interface InventorySummary {
  total: number;
  low: number;
  out: number;
  healthy: number;
  turnoverDays: number;
  signals: InventorySignal[];
}

export interface PricingSignal {
  productId: string;
  name: string;
  price: number;
  mrp: number;
  marginPct: number;
  discountPct: number;
  recommendation: "raise" | "discount" | "hold";
  rationale: string;
}

export interface PricingSummary {
  averageMarginPct: number;
  belowMarginCount: number;
  signals: PricingSignal[];
}

export type OrderAction = "accept" | "reject" | "process" | "ship" | "complete" | "cancel" | "refund" | "none";

export interface OrderOpsItem {
  id: string;
  customer: string;
  status: SellerOrder["status"];
  value: number;
  nextActions: OrderAction[];
  slaRisk: boolean;
}

export interface OrderOpsSummary {
  open: number;
  needsAction: number;
  fulfillmentRate: number;
  cancellationRate: number;
  slaRisk: number;
  items: OrderOpsItem[];
}

export type PromotionType = "coupon" | "percent" | "flat" | "bundle";

export interface Promotion {
  code: string;
  type: PromotionType;
  value: number; // percent or flat amount
  minOrder: number;
  active: boolean;
  startsAt?: string;
  endsAt?: string;
}

export interface CustomerSegment {
  segment: "new" | "repeat" | "vip" | "at_risk";
  count: number;
  revenue: number;
}

export interface CustomerSummary {
  totalCustomers: number;
  repeatRate: number;
  segments: CustomerSegment[];
  topCustomers: { name: string; orders: number; value: number }[];
}

export interface AnalyticsSummary {
  revenue: number;
  orders: number;
  averageOrderValue: number;
  conversionProxy: number;
  topProducts: { name: string; sold: number }[];
  topCategories: { name: string; count: number }[];
  revenueTrend: number[];
}

export type RecommendationKind =
  | "demand_forecast"
  | "inventory_forecast"
  | "stockout_risk"
  | "price_optimization"
  | "category_opportunity"
  | "expansion_opportunity"
  | "revenue_forecast"
  | "store_health"
  | "risk_alert"
  | "action";

export interface SellerRecommendation {
  kind: RecommendationKind;
  severity: "info" | "opportunity" | "warning" | "critical";
  title: string;
  detail: string;
  action: string;
  entityId?: string;
}

export interface SellerIntelligence {
  healthScore: number;
  revenueForecast: number;
  recommendations: SellerRecommendation[];
}

export interface SellerOsSnapshot {
  store: StoreHealth;
  inventory: InventorySummary;
  pricing: PricingSummary;
  orders: OrderOpsSummary;
  customers: CustomerSummary;
  analytics: AnalyticsSummary;
  intelligence: SellerIntelligence;
}
