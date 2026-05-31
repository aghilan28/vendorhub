import { describe, expect, it } from "vitest";
import {
  applyPromotion,
  buildSellerOs,
  canTransition,
  computeAnalytics,
  computeCustomers,
  computeInventory,
  computeOrderOps,
  computePricing,
  computeStoreHealth,
  detectWorkflows,
  nextActions,
  projectConversion,
  validatePriceChange,
  validatePromotion,
  SAMPLE_SELLER_INPUT,
  type Promotion,
} from "@/lib/seller-os";

const INPUT = SAMPLE_SELLER_INPUT;

describe("MCP-0C store management", () => {
  it("scores an active store as verified", () => {
    const store = computeStoreHealth(INPUT);
    expect(store.verified).toBe(true);
    expect(store.score).toBeGreaterThan(0);
    expect(store.signals.length).toBeGreaterThan(0);
  });
});

describe("MCP-0C inventory command", () => {
  it("detects out-of-stock and low-stock with reorder suggestions", () => {
    const inv = computeInventory(INPUT);
    expect(inv.out).toBeGreaterThanOrEqual(1); // milk stock 0
    expect(inv.low).toBeGreaterThanOrEqual(1); // atta below reorder
    const milk = inv.signals.find((s) => s.name.includes("Milk"));
    expect(milk?.status).toBe("out");
    const lowItem = inv.signals.find((s) => s.status === "low");
    expect(lowItem?.suggestedReorder).toBeGreaterThan(0);
    // riskiest first
    expect(inv.signals[0].status).toBe("out");
  });
});

describe("MCP-0C pricing command", () => {
  it("recommends discount for stagnant high-stock and validates changes", () => {
    const pricing = computePricing(INPUT);
    const oil = pricing.signals.find((s) => s.name.includes("Oil"));
    expect(oil?.recommendation).toBe("discount");
    expect(validatePriceChange({ price: 0 }).ok).toBe(false);
    expect(validatePriceChange({ price: 100, mrp: 90 }).errors).toContain("price_exceeds_mrp");
    expect(validatePriceChange({ price: 100, mrp: 120 }).ok).toBe(true);
  });
});

describe("MCP-0C order operations", () => {
  it("computes the queue, next actions and SLA risk", () => {
    const ops = computeOrderOps(INPUT);
    expect(ops.open).toBeGreaterThan(0);
    expect(ops.needsAction).toBeGreaterThan(0);
    expect(nextActions("pending")).toEqual(["accept", "reject"]);
    expect(nextActions("delivered")).toEqual(["refund"]);
    expect(ops.slaRisk).toBeGreaterThanOrEqual(1); // ORD-1 pending, promised 15
    expect(ops.fulfillmentRate).toBeGreaterThanOrEqual(0);
  });
});

describe("MCP-0C promotions", () => {
  it("validates, applies and projects conversion", () => {
    const promo: Promotion = { code: "SAVE10", type: "percent", value: 10, minOrder: 199, active: true };
    expect(validatePromotion(promo).ok).toBe(true);
    expect(validatePromotion({ code: "x", type: "percent", value: 200, minOrder: 0 }).ok).toBe(false);

    const applied = applyPromotion(promo, 500);
    expect(applied.discount).toBe(50);
    expect(applied.total).toBe(450);
    expect(applyPromotion(promo, 100).applied).toBe(false); // below min order

    const proj = projectConversion(promo, 20);
    expect(proj.upliftPct).toBeGreaterThan(0);
    expect(proj.projectedOrders).toBeGreaterThanOrEqual(20);
  });
});

describe("MCP-0C customers", () => {
  it("segments customers from real orders", () => {
    const customers = computeCustomers(INPUT);
    expect(customers.totalCustomers).toBeGreaterThan(0);
    const vip = customers.segments.find((s) => s.segment === "vip");
    expect(vip?.count).toBeGreaterThanOrEqual(1); // Meena: 2 orders, >Rs 2000
    expect(customers.topCustomers[0].value).toBeGreaterThan(0);
  });
});

describe("MCP-0C analytics", () => {
  it("computes revenue and top performers", () => {
    const analytics = computeAnalytics(INPUT);
    expect(analytics.revenue).toBeGreaterThan(0);
    expect(analytics.orders).toBe(INPUT.orders.length);
    expect(analytics.topProducts[0].name).toContain("Milk"); // highest soldToday
  });
});

describe("MCP-0C workflows", () => {
  it("enforces transitions and detects triggered workflows", () => {
    expect(canTransition("idle", "in_progress")).toBe(true);
    expect(canTransition("completed", "idle")).toBe(false);
    const os = buildSellerOs(INPUT);
    const workflows = detectWorkflows(os);
    expect(workflows.some((w) => w.id === "low_stock")).toBe(true);
  });
});

describe("MCP-0C intelligence (on real snapshot)", () => {
  it("assembles recommendations across kinds", () => {
    const os = buildSellerOs(INPUT, 82);
    expect(os.intelligence.healthScore).toBe(82); // external score folded in
    expect(os.intelligence.revenueForecast).toBeGreaterThan(0);
    const kinds = new Set(os.intelligence.recommendations.map((r) => r.kind));
    expect(kinds.has("stockout_risk")).toBe(true);
    expect(kinds.has("revenue_forecast")).toBe(true);
    expect(kinds.has("store_health")).toBe(true);
    expect(os.intelligence.recommendations[0].kind).toBe("action"); // headline first
  });

  it("buildSellerOs returns every center", () => {
    const os = buildSellerOs(INPUT);
    expect(os.store).toBeDefined();
    expect(os.inventory).toBeDefined();
    expect(os.pricing).toBeDefined();
    expect(os.orders).toBeDefined();
    expect(os.customers).toBeDefined();
    expect(os.analytics).toBeDefined();
    expect(os.intelligence).toBeDefined();
  });
});
