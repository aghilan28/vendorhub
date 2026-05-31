// MCP-0C.10 — Seller Intelligence Activation (operates on the REAL snapshot)
// Produces demand/inventory/stockout/price/category/expansion/revenue/health/
// risk/action recommendations from the seller's live products, inventory,
// pricing and orders. Optionally folds in an external health score from the
// existing merchant-intelligence engine.

import type {
  AnalyticsSummary,
  CustomerSummary,
  InventorySummary,
  PricingSummary,
  OrderOpsSummary,
  SellerIntelligence,
  SellerOperatingInput,
  SellerRecommendation,
  StoreHealth,
} from "./types";

export interface IntelligenceInputs {
  input: SellerOperatingInput;
  store: StoreHealth;
  inventory: InventorySummary;
  pricing: PricingSummary;
  orders: OrderOpsSummary;
  analytics: AnalyticsSummary;
  customers: CustomerSummary;
  /** Optional health score from features/merchant-intelligence (real engine). */
  externalHealthScore?: number;
}

export function assembleSellerIntelligence(ctx: IntelligenceInputs): SellerIntelligence {
  const recs: SellerRecommendation[] = [];

  // Stockout risk (from real inventory velocity vs cover)
  const atRisk = ctx.inventory.signals.filter((s) => s.status === "out" || (s.status === "low" && s.daysOfCover <= 3));
  for (const s of atRisk.slice(0, 5)) {
    recs.push({
      kind: "stockout_risk",
      severity: s.status === "out" ? "critical" : "warning",
      title: `${s.name}: ${s.status === "out" ? "out of stock" : `${s.daysOfCover}d cover left`}`,
      detail: `Velocity ${s.velocityPerDay}/day, ${s.available} available.`,
      action: s.suggestedReorder > 0 ? `Reorder ~${s.suggestedReorder} units` : "Restock now",
      entityId: s.productId,
    });
  }

  // Demand + inventory forecast (aggregate)
  const totalVelocity = ctx.inventory.signals.reduce((sum, s) => sum + s.velocityPerDay, 0);
  if (totalVelocity > 0) {
    recs.push({
      kind: "demand_forecast",
      severity: "info",
      title: `~${Math.round(totalVelocity * 7)} units demand forecast (7d)`,
      detail: `Based on current ${totalVelocity}/day blended velocity across the catalog.`,
      action: "Align inventory to the 7-day demand forecast",
    });
    recs.push({
      kind: "inventory_forecast",
      severity: ctx.inventory.turnoverDays > 45 ? "warning" : "info",
      title: `Inventory turnover ~${ctx.inventory.turnoverDays} days`,
      detail: ctx.inventory.turnoverDays > 45 ? "Slow turnover ties up capital." : "Turnover is healthy.",
      action: ctx.inventory.turnoverDays > 45 ? "Promote slow movers / reduce reorders" : "Maintain current plan",
    });
  }

  // Price optimization (from real pricing signals)
  const priceMoves = ctx.pricing.signals.filter((s) => s.recommendation !== "hold");
  for (const s of priceMoves.slice(0, 4)) {
    recs.push({
      kind: "price_optimization",
      severity: "opportunity",
      title: `${s.name}: ${s.recommendation === "raise" ? "raise price" : "run a discount"}`,
      detail: s.rationale,
      action: s.recommendation === "raise" ? "Increase price 3-5%" : "Apply a 10% promotion",
      entityId: s.productId,
    });
  }

  // Category opportunity (top categories with momentum)
  if (ctx.analytics.topCategories.length) {
    const top = ctx.analytics.topCategories[0];
    recs.push({
      kind: "category_opportunity",
      severity: "opportunity",
      title: `Grow your strongest category: ${top.name}`,
      detail: `${top.count} listed products; concentrate media + pricing focus here.`,
      action: `Add more ${top.name} SKUs and feature them`,
    });
  }

  // Expansion opportunity
  if (ctx.input.products.length > 0 && ctx.analytics.topProducts[0]?.sold > 0) {
    recs.push({
      kind: "expansion_opportunity",
      severity: "opportunity",
      title: "Expand around your best-seller",
      detail: `${ctx.analytics.topProducts[0].name} is selling — add variants/bundles.`,
      action: "Create variants or a bundle for your top product",
    });
  }

  // Revenue forecast (simple run-rate from recent orders)
  const aov = ctx.analytics.averageOrderValue;
  const dailyOrders = Math.max(1, ctx.orders.open + Math.round(ctx.input.orders.length / 7));
  const revenueForecast = Math.round(aov * dailyOrders * 30);
  recs.push({
    kind: "revenue_forecast",
    severity: "info",
    title: `~Rs ${revenueForecast.toLocaleString("en-IN")} projected (30d)`,
    detail: `AOV Rs ${aov} × ~${dailyOrders} orders/day run-rate.`,
    action: "Increase AOV with bundles + free-delivery thresholds",
  });

  // Store health
  const healthScore = ctx.externalHealthScore ?? ctx.store.score;
  recs.push({
    kind: "store_health",
    severity: healthScore >= 80 ? "info" : healthScore >= 60 ? "warning" : "critical",
    title: `Store health ${healthScore}/100`,
    detail: ctx.store.signals.filter((s) => !s.ok).map((s) => s.label).join(", ") || "All store signals healthy.",
    action: ctx.store.verified ? "Maintain catalog + fulfillment quality" : "Complete store verification",
  });

  // Risk alerts (SLA + cancellations)
  if (ctx.orders.slaRisk > 0) {
    recs.push({
      kind: "risk_alert",
      severity: "warning",
      title: `${ctx.orders.slaRisk} orders at SLA risk`,
      detail: "Open orders approaching their promised time.",
      action: "Prioritise fulfillment of at-risk orders",
    });
  }
  if (ctx.orders.cancellationRate > 5) {
    recs.push({
      kind: "risk_alert",
      severity: "critical",
      title: `High cancellation rate ${ctx.orders.cancellationRate}%`,
      detail: "Cancellations above the 5% tolerance hurt ranking.",
      action: "Investigate stock accuracy + fulfillment delays",
    });
  }

  // Headline action
  const headline = recs.find((r) => r.severity === "critical") ?? recs.find((r) => r.severity === "warning") ?? recs.find((r) => r.severity === "opportunity");
  if (headline) {
    recs.unshift({
      kind: "action",
      severity: headline.severity,
      title: "Today's top action",
      detail: headline.title,
      action: headline.action,
      entityId: headline.entityId,
    });
  }

  return { healthScore, revenueForecast, recommendations: recs };
}
