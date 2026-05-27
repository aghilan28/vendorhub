import type { InventoryItem, SellerOrder, SellerProduct } from "@/features/seller/types";
import type {
  DemandForecast,
  DiscoverabilityInsight,
  FulfillmentIntelligence,
  HyperlocalIntelligence,
  InventoryIntelligence,
  MerchantInsight,
  MerchantIntelligenceSnapshot,
  PricingGuidance,
} from "./types";

type VendorLike = {
  id: string;
  name: string;
  city?: string | null;
  locality?: string | null;
  service_radius_km?: number | string | null;
  delivery_radius_km?: number | string | null;
  rating_average?: number | string | null;
  status?: string | null;
  metadata?: unknown;
};

type BuildInput = {
  vendor: VendorLike;
  products: SellerProduct[];
  inventory: InventoryItem[];
  orders: SellerOrder[];
  generatedInMs?: number;
  snapshotSource?: "database" | "generated";
  refreshReasons?: string[];
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function available(item: Pick<SellerProduct, "stock" | "reserved">) {
  return Math.max(0, item.stock - item.reserved);
}

function safeNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function metadataString(metadata: unknown, key: string, fallback = "") {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return fallback;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : fallback;
}

function daysBetween(from: string) {
  const created = new Date(from).getTime();
  if (!Number.isFinite(created)) return 1;
  return Math.max(1, Math.ceil((Date.now() - created) / 86_400_000));
}

function demandByProduct(orders: SellerOrder[]) {
  const demand = new Map<string, { units: number; revenue: number; days: number }>();
  for (const order of orders) {
    if (["cancelled", "refunded"].includes(order.status)) continue;
    for (const item of order.items) {
      const current = demand.get(item.sku) ?? { units: 0, revenue: 0, days: daysBetween(order.createdAt) };
      current.units += item.quantity;
      current.revenue += item.quantity * item.unitPrice;
      current.days = Math.max(current.days, daysBetween(order.createdAt));
      demand.set(item.sku, current);
    }
  }
  return demand;
}

export function buildDemandForecasts(products: SellerProduct[], orders: SellerOrder[], vendor?: VendorLike): DemandForecast[] {
  const demand = demandByProduct(orders);
  const locality = vendor?.locality ?? metadataString(vendor?.metadata, "locality", "the seller service area");
  const city = vendor?.city ?? metadataString(vendor?.metadata, "city", "the active city");
  return products
    .map((product) => {
      const signal = demand.get(product.id) ?? demand.get(product.sku);
      const observedUnits = signal?.units ?? product.soldToday;
      const observedDays = signal?.days ?? 1;
      const dailyRunRate = Math.max(0.05, observedUnits / Math.max(1, observedDays));
      const expectedUnits7d = Math.ceil(dailyRunRate * 7);
      const cover = dailyRunRate > 0 ? available(product) / dailyRunRate : null;
      const stockoutRisk = cover !== null && cover <= 3 ? "high" : cover !== null && cover <= 7 ? "medium" : "low";
      const confidence = signal ? (observedUnits >= 8 ? 0.82 : 0.72) : product.soldToday > 0 ? 0.62 : 0.48;
      const confidenceReasoning = signal
        ? `Confidence uses ${observedUnits} ordered unit(s), ${observedDays} observed day(s), and current stock cover.`
        : "Confidence is conservative because the seller has limited order history for this product.";
      const demandRationale = signal
        ? `Recent paid demand indicates about ${Math.round(dailyRunRate * 10) / 10} unit(s) per day.`
        : "Cold-start demand uses stock readiness, listing presence, and today's seller movement signal.";
      const regionalContext = `${product.category} forecast is scoped to ${locality}, ${city}; it is not blended with another seller's demand.`;
      const operationalImpact =
        stockoutRisk === "high"
          ? "High stockout risk can interrupt search eligibility and fulfillment reliability unless replenishment is planned."
          : stockoutRisk === "medium"
            ? "Maintain stock above the reorder point before increasing visibility campaigns."
            : "Current cover supports normal selling while monitoring demand changes.";

      return {
        productId: product.id,
        productName: product.name,
        category: product.category,
        expectedUnits7d,
        dailyRunRate: Math.round(dailyRunRate * 10) / 10,
        stockoutRisk,
        daysOfCover: cover === null ? null : Math.round(cover * 10) / 10,
        confidence,
        confidenceReasoning,
        demandRationale,
        regionalContext,
        operationalImpact,
        explanation: signal
          ? `Based on ${observedUnits} observed units across recent orders and current available stock.`
          : "Cold-start forecast using listed stock, category presence, and today's seller movement signal.",
      } satisfies DemandForecast;
    })
    .sort((a, b) => {
      const riskRank = { high: 3, medium: 2, low: 1 };
      return riskRank[b.stockoutRisk] - riskRank[a.stockoutRisk] || b.expectedUnits7d - a.expectedUnits7d;
    })
    .slice(0, 8);
}

export function buildInventoryIntelligence(products: SellerProduct[], inventory: InventoryItem[], forecasts: DemandForecast[]): InventoryIntelligence[] {
  const forecastByProduct = new Map(forecasts.map((forecast) => [forecast.productId, forecast]));
  const inventoryByProduct = new Map(inventory.map((item) => [item.id, item]));

  return products
    .map((product) => {
      const stock = inventoryByProduct.get(product.id) ?? product;
      const forecast = forecastByProduct.get(product.id);
      const runRate = forecast?.dailyRunRate ?? Math.max(0.05, product.soldToday / 1);
      const daysOfCover = forecast?.daysOfCover ?? (runRate > 0 ? available(stock) / runRate : 99);
      const reorderPoint = Math.max(product.lowStockThreshold, Math.ceil(runRate * 4));
      const recommendedRestock = available(stock) <= reorderPoint ? Math.ceil(Math.max(0, runRate * 10 - available(stock))) : 0;
      const turnoverSignal = product.soldToday >= 8 || runRate >= 2 ? "fast" : product.soldToday >= 2 || runRate >= 0.5 ? "steady" : product.soldToday === 0 ? "cold_start" : "slow";
      const risk = available(stock) <= 0 ? "restock" : daysOfCover <= 4 ? "restock" : turnoverSignal === "cold_start" && available(stock) > product.lowStockThreshold * 4 ? "dead_stock" : daysOfCover <= 8 ? "watch" : "healthy";

      return {
        productId: product.id,
        productName: product.name,
        available: available(stock),
        reserved: stock.reserved,
        reorderPoint,
        recommendedRestock,
        turnoverSignal,
        risk,
        rationale:
          risk === "restock"
            ? `Available stock may cover only ${Math.round(daysOfCover * 10) / 10} days.`
            : risk === "dead_stock"
              ? "High available stock with limited movement; consider visibility or smaller replenishment cycles."
              : "Stock position is aligned with recent movement.",
      } satisfies InventoryIntelligence;
    })
    .sort((a, b) => {
      const riskRank = { restock: 4, watch: 3, dead_stock: 2, healthy: 1 };
      return riskRank[b.risk] - riskRank[a.risk] || b.recommendedRestock - a.recommendedRestock;
    });
}

export function buildFulfillmentIntelligence(orders: SellerOrder[]): FulfillmentIntelligence {
  const terminal = orders.filter((order) => ["delivered", "cancelled", "refunded"].includes(order.status));
  const delivered = orders.filter((order) => order.status === "delivered").length;
  const cancelled = orders.filter((order) => order.status === "cancelled" || order.status === "refunded").length;
  const active = orders.filter((order) => !["delivered", "cancelled", "refunded"].includes(order.status));
  const delayed = active.filter((order) => order.promisedInMinutes <= 15 || ["pending", "confirmed"].includes(order.status)).length;
  const averagePromiseMinutes = orders.length ? Math.round(orders.reduce((sum, order) => sum + order.promisedInMinutes, 0) / orders.length) : 0;
  const fulfillmentRate = terminal.length ? Math.round((delivered / terminal.length) * 100) : active.length ? 70 : 100;
  const cancellationRate = orders.length ? Math.round((cancelled / orders.length) * 1000) / 10 : 0;
  const bottlenecks = [
    delayed ? `${delayed} order(s) need faster confirmation or processing.` : "",
    cancellationRate > 5 ? "Cancellation rate is above the seller health guardrail." : "",
    averagePromiseMinutes > 45 ? "Average promise window is long for hyperlocal commerce." : "",
  ].filter(Boolean);

  return {
    activeOrders: active.length,
    delayedOrders: delayed,
    cancellationRate,
    fulfillmentRate,
    averagePromiseMinutes,
    bottlenecks: bottlenecks.length ? bottlenecks : ["No major fulfillment bottleneck detected."],
  };
}

export function buildDiscoverabilityInsights(products: SellerProduct[]): DiscoverabilityInsight[] {
  return products
    .map((product) => {
      const hasPackSignal = /\d+\s?(g|kg|ml|l|pcs|pack)/i.test(product.name);
      const stockScore = available(product) > 0 ? 22 : 0;
      const qualityScore = product.name.length >= 18 ? 18 : 8;
      const priceScore = product.price > 0 ? 12 : 0;
      const categoryScore = product.category ? 12 : 0;
      const movementScore = Math.min(24, product.soldToday * 3);
      const score = clamp(stockScore + qualityScore + priceScore + categoryScore + movementScore + (hasPackSignal ? 12 : 4));
      const visibility = score >= 72 ? "strong" : score >= 48 ? "improving" : "weak";
      const reasons = [
        available(product) > 0 ? "Available stock supports recommendation eligibility." : "Out-of-stock products lose search and recommendation visibility.",
        hasPackSignal ? "Title includes a quantity or pack signal." : "Title may need pack size or key buyer attribute.",
        product.soldToday > 0 ? "Recent movement supports ranking confidence." : "Limited recent movement means relevance must come from content quality.",
      ];

      return {
        productId: product.id,
        productName: product.name,
        score,
        visibility,
        reasons,
        recommendation:
          visibility === "weak"
            ? "Improve title specificity, stock availability, and category language before adding promotions."
            : visibility === "improving"
              ? "Add buyer-use keywords and keep stock above the low-stock threshold."
              : "Maintain stock and protect fulfillment quality to preserve visibility.",
      } satisfies DiscoverabilityInsight;
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 6);
}

export function buildPricingGuidance(products: SellerProduct[], forecasts: DemandForecast[]): PricingGuidance[] {
  const forecastByProduct = new Map(forecasts.map((forecast) => [forecast.productId, forecast]));
  const categoryAverage = new Map<string, number>();
  for (const product of products) {
    const peers = products.filter((item) => item.category === product.category);
    categoryAverage.set(product.category, peers.reduce((sum, item) => sum + item.price, 0) / Math.max(1, peers.length));
  }

  return products.slice(0, 8).map((product) => {
    const average = categoryAverage.get(product.category) ?? product.price;
    const forecast = forecastByProduct.get(product.id);
    const position = product.price > average * 1.15 ? "premium" : product.price < average * 0.85 ? "value" : product.price <= 0 ? "review" : "balanced";
    const suggestion =
      forecast?.stockoutRisk === "high"
        ? "Avoid discounting until replenishment is planned; demand may consume current stock."
        : position === "premium"
          ? "Confirm the listing explains quality, pack size, or freshness before holding a premium price."
          : position === "value"
            ? "Value pricing can support visibility, but check margin before increasing promotion depth."
            : "Price is close to category peers; optimize content and fulfillment before changing price.";

    return {
      productId: product.id,
      productName: product.name,
      currentPrice: product.price,
      position,
      suggestion,
      guardrail: "Decision support only. VendorHub does not automatically change seller pricing.",
    } satisfies PricingGuidance;
  });
}

export function buildHyperlocalIntelligence(vendor: VendorLike, products: SellerProduct[], orders: SellerOrder[]): HyperlocalIntelligence {
  const categoryCounts = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.items) {
      const product = products.find((candidate) => candidate.id === item.sku || candidate.sku === item.sku);
      if (product) categoryCounts.set(product.category, (categoryCounts.get(product.category) ?? 0) + item.quantity);
    }
  }
  const sortedCategories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]);
  const locality = vendor.locality ?? metadataString(vendor.metadata, "locality", "Local operating area");
  const city = vendor.city ?? metadataString(vendor.metadata, "city", "Chennai");

  return {
    locality,
    city,
    serviceRadiusKm: safeNumber(vendor.delivery_radius_km ?? vendor.service_radius_km, 5),
    demandSignals: [
      sortedCategories[0] ? `${sortedCategories[0][0]} has the strongest recent movement in ${locality}.` : `Build first demand signals in ${locality}.`,
      orders.length ? `${orders.length} recent order(s) provide local operating signal.` : "No recent orders yet; use onboarding guidance before scaling inventory.",
      "Geo visibility depends on active store status, delivery radius, stock availability, and fulfillment reliability.",
    ],
    opportunityCategories: (sortedCategories.length ? sortedCategories : products.slice(0, 3).map((product) => [product.category, 0] as [string, number])).slice(0, 3).map(([category, units]) => ({
      category,
      signal: units ? `${units} unit(s) observed in recent seller orders.` : "Cold-start category; use small replenishment and strong listing content.",
    })),
  };
}

function buildInsights(input: BuildInput, forecasts: DemandForecast[], inventory: InventoryIntelligence[], fulfillment: FulfillmentIntelligence, discoverability: DiscoverabilityInsight[]): MerchantInsight[] {
  const insights: MerchantInsight[] = [];
  const restock = inventory.find((item) => item.risk === "restock");
  const deadStock = inventory.find((item) => item.risk === "dead_stock");
  const weakListing = discoverability.find((item) => item.visibility === "weak");
  const highDemand = forecasts.find((item) => item.expectedUnits7d >= 5);

  if (restock) {
    insights.push({
      id: `inventory-${restock.productId}`,
      domain: "inventory",
      severity: "critical",
      title: `${restock.productName} needs replenishment planning`,
      explanation: restock.rationale,
      action: restock.recommendedRestock ? `Plan approximately ${restock.recommendedRestock} units before the next demand window.` : "Review stock and reserved quantity now.",
      confidence: 0.82,
      evidence: [`${restock.available} available`, `${restock.reserved} reserved`, `Reorder point ${restock.reorderPoint}`],
      localeText: {
        en: "Restock planning is recommended.",
        ta: "மீண்டும் சரக்கு நிரப்ப திட்டமிட பரிந்துரைக்கப்படுகிறது.",
        hi: "रीस्टॉक योजना बनाने की सलाह दी जाती है.",
      },
    });
  }

  if (fulfillment.delayedOrders > 0) {
    insights.push({
      id: "fulfillment-delay",
      domain: "fulfillment",
      severity: "warning",
      title: "Fulfillment queue needs attention",
      explanation: `${fulfillment.delayedOrders} active order(s) may affect seller reliability if not advanced soon.`,
      action: "Confirm, process, or pack the oldest orders before adding new promotions.",
      confidence: 0.78,
      evidence: [`${fulfillment.activeOrders} active orders`, `${fulfillment.averagePromiseMinutes} min average promise`],
      localeText: {
        en: "Advance pending orders before visibility campaigns.",
        ta: "காட்சி பிரச்சாரங்களுக்கு முன் நிலுவை ஆர்டர்களை முன்னேற்றவும்.",
        hi: "विजिबिलिटी अभियान से पहले लंबित ऑर्डर आगे बढ़ाएं.",
      },
    });
  }

  if (weakListing) {
    insights.push({
      id: `discoverability-${weakListing.productId}`,
      domain: "discoverability",
      severity: "opportunity",
      title: `${weakListing.productName} has weak discoverability`,
      explanation: weakListing.reasons.join(" "),
      action: weakListing.recommendation,
      confidence: 0.72,
      evidence: [`Visibility score ${weakListing.score}/100`, weakListing.visibility],
      localeText: {
        en: "Improve listing clarity to lift search visibility.",
        ta: "தேடல் காட்சியை உயர்த்த பட்டியல் தெளிவை மேம்படுத்தவும்.",
        hi: "सर्च विजिबिलिटी बढ़ाने के लिए लिस्टिंग स्पष्ट करें.",
      },
    });
  }

  if (deadStock) {
    insights.push({
      id: `dead-stock-${deadStock.productId}`,
      domain: "inventory",
      severity: "warning",
      title: `${deadStock.productName} may become slow-moving stock`,
      explanation: deadStock.rationale,
      action: "Improve listing content or reduce replenishment until demand is proven.",
      confidence: 0.68,
      evidence: [`${deadStock.available} available`, deadStock.turnoverSignal],
      localeText: {
        en: "Avoid overstocking until demand improves.",
        ta: "தேவை மேம்படும் வரை அதிக சரக்கை தவிர்க்கவும்.",
        hi: "मांग सुधरने तक अधिक स्टॉक से बचें.",
      },
    });
  }

  if (highDemand) {
    insights.push({
      id: `demand-${highDemand.productId}`,
      domain: "demand",
      severity: "opportunity",
      title: `${highDemand.productName} has demand momentum`,
      explanation: highDemand.explanation,
      action: "Keep stock healthy and protect prep speed for this product.",
      confidence: 0.74,
      evidence: [`${highDemand.expectedUnits7d} expected units in 7d`, `${highDemand.dailyRunRate} daily run rate`],
      localeText: {
        en: "Demand is building; protect availability.",
        ta: "தேவை அதிகரிக்கிறது; கிடைப்பை பாதுகாக்கவும்.",
        hi: "मांग बढ़ रही है; उपलब्धता बनाए रखें.",
      },
    });
  }

  if (!input.orders.length) {
    insights.push({
      id: "cold-start-guidance",
      domain: "fairness",
      severity: "info",
      title: "Cold-start seller guidance is active",
      explanation: "VendorHub is using listing quality, stock readiness, local category coverage, and trust setup until order history exists.",
      action: "Complete profile trust signals, keep a focused starter assortment, and improve searchable titles.",
      confidence: 0.7,
      evidence: [`${input.products.length} listed products`, `${input.inventory.length} inventory rows`],
      localeText: {
        en: "New sellers receive guidance without requiring historical volume.",
        ta: "புதிய விற்பனையாளர்களுக்கு வரலாற்று அளவு இல்லாமலும் வழிகாட்டுதல் கிடைக்கும்.",
        hi: "नए विक्रेताओं को पुराने वॉल्यूम के बिना भी मार्गदर्शन मिलता है.",
      },
    });
  }

  return insights.slice(0, 6);
}
export function buildMerchantIntelligence(input: BuildInput): MerchantIntelligenceSnapshot {
  const startedAt = Date.now();
  const forecasts = buildDemandForecasts(input.products, input.orders, input.vendor);
  const inventory = buildInventoryIntelligence(input.products, input.inventory, forecasts);
  const fulfillment = buildFulfillmentIntelligence(input.orders);
  const discoverability = buildDiscoverabilityInsights(input.products);
  const pricing = buildPricingGuidance(input.products, forecasts);
  const hyperlocal = buildHyperlocalIntelligence(input.vendor, input.products, input.orders);
  const insights = buildInsights(input, forecasts, inventory, fulfillment, discoverability);
  const inventoryRiskPenalty = inventory.filter((item) => item.risk === "restock").length * 12 + inventory.filter((item) => item.risk === "dead_stock").length * 6;
  const discoverabilityScore = discoverability.length ? Math.round(discoverability.reduce((sum, item) => sum + item.score, 0) / discoverability.length) : 70;
  const inventoryScore = clamp(100 - inventoryRiskPenalty);
  const fulfillmentScore = clamp(fulfillment.fulfillmentRate - fulfillment.delayedOrders * 8 - fulfillment.cancellationRate * 2);
  const demandScore = clamp(50 + forecasts.filter((item) => item.expectedUnits7d > 1).length * 8);
  const fairnessScore = input.orders.length < 5 ? 92 : 84;
  const healthScore = clamp((inventoryScore + fulfillmentScore + discoverabilityScore + demandScore + fairnessScore) / 5);

  return {
    generatedAt: new Date().toISOString(),
    stale: false,
    summary: {
      healthScore,
      demandScore,
      inventoryScore,
      fulfillmentScore,
      discoverabilityScore,
      fairnessScore,
    },
    insights,
    forecasts,
    inventory,
    discoverability,
    fulfillment,
    pricing,
    hyperlocal,
    coldStart: {
      isColdStart: input.orders.length < 5,
      recommendations: [
        "Keep starter stock focused on products you can fulfill reliably today.",
        "Use searchable titles with pack size, freshness, use case, and local delivery context.",
        "Avoid deep discounting until demand and replenishment patterns are visible.",
      ],
    },
    observability: {
      generatedInMs: input.generatedInMs ?? Math.max(0, Date.now() - startedAt),
      snapshotTtlMinutes: 120,
      source: input.snapshotSource ?? "generated",
      refreshReasons: input.refreshReasons ?? ["seller_snapshot_requested"],
    },
  };
}
