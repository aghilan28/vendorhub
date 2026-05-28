import { describe, expect, it } from "vitest";
import {
  buildDeliveryIntelligence,
  buildDynamicPricing,
  buildFreshnessProfiles,
  buildHyperlocalOperationsSnapshot,
  buildOperationalInventory,
  buildPerishabilityOperations,
  buildSellerOperationsProfiles,
  buildTelemetry,
} from "@/lib/hyperlocal-operations";
import { ProductStatus } from "@/types";
import { createProduct, createVendor } from "../utils/fixtures";

const context = {
  locality: "Mylapore Temple Area",
  city: "Chennai",
  weather: "hot" as const,
  festival: "diwali" as const,
  traffic: "heavy" as const,
  dayType: "weekend" as const,
  now: new Date("2026-05-28T07:30:00+05:30"),
};

function products() {
  const seller = createVendor({
    id: "seller-mylapore-fresh",
    name: "Mylapore Fresh Market",
    locality: "Mylapore Temple Area",
    city: "Chennai",
    fulfillmentPromiseMinutes: 18,
    serviceRadiusKm: 4,
  });
  return [
    createProduct({
      id: "prod-pooja-flower",
      slug: "fresh-pooja-flower",
      name: "Fresh Pooja Flowers",
      vendor: seller,
      category: { id: "cat-pooja", name: "Pooja Items", slug: "pooja-items" },
      tags: ["flower", "diwali", "malligai", "fresh"],
      price: 80,
      stockCount: 6,
      deliveryMinutes: 12,
    }),
    createProduct({
      id: "prod-camphor",
      slug: "camphor",
      name: "Pooja Camphor Pack",
      vendor: seller,
      category: { id: "cat-pooja", name: "Pooja Items", slug: "pooja-items" },
      tags: ["camphor", "pooja", "diwali"],
      price: 40,
      stockCount: 30,
      deliveryMinutes: 15,
    }),
    createProduct({
      id: "prod-fish",
      slug: "seer-fish",
      name: "Fresh Seer Fish Pieces",
      vendor: createVendor({
        id: "seller-coastal-fish",
        name: "Coastal Fish Stall",
        locality: "Mylapore Temple Area",
        city: "Chennai",
        fulfillmentPromiseMinutes: 22,
      }),
      category: { id: "cat-fish", name: "Meat Seafood", slug: "meat-seafood" },
      tags: ["fish", "seafood", "ultra fresh"],
      price: 420,
      stockCount: 4,
      status: ProductStatus.Active,
      deliveryMinutes: 20,
    }),
  ];
}

describe("hyperlocal operations engine", () => {
  it("builds freshness-aware inventory with sellout predictions and loose inventory support", () => {
    const inventory = buildOperationalInventory(products(), context, [
      {
        product_id: "prod-pooja-flower",
        batch_time: new Date("2026-05-28T02:00:00+05:30").toISOString(),
        current_stock: 6,
        reserved_stock: 2,
      },
    ]);

    const flowers = inventory.find((item) => item.product_id === "prod-pooja-flower");
    expect(flowers?.freshness_score).toBeLessThan(0.7);
    expect(flowers?.spoilage_risk).toBeGreaterThan(0.3);
    expect(flowers?.predicted_sellout_time).toBeTruthy();
    expect(flowers?.loose_inventory?.unit).toBe("string");
  });

  it("models intraday, festival, climate, and distress pricing with guardrails", () => {
    const inventory = buildOperationalInventory(products(), context, [
      {
        product_id: "prod-fish",
        current_stock: 12,
        reserved_stock: 0,
        freshness_score: 0.35,
        spoilage_risk: 0.82,
      },
    ]);
    const forecasts = [
      {
        productId: "prod-fish",
        locality: context.locality,
        predictedHourlySales: 1,
        predictedDailySales: 8,
        demandSpike: false,
        stockRisk: "low" as const,
        replenishmentAlert: null,
        surgeAlert: null,
        confidence: 0.7,
        factors: [],
      },
    ];

    const pricing = buildDynamicPricing(products(), inventory, forecasts, context);
    const fish = pricing.find((item) => item.productId === "prod-fish");

    expect(fish?.recommendedPrice).toBeLessThan(420);
    expect(fish?.signals).toContain("distress markdown");
    expect(fish?.guardrail).toContain("seller consent");
  });

  it("creates a complete living commerce operations snapshot", () => {
    const snapshot = buildHyperlocalOperationsSnapshot({
      products: products(),
      context,
      inventory: [
        {
          product_id: "prod-pooja-flower",
          current_stock: 5,
          reserved_stock: 4,
          batch_time: new Date("2026-05-28T01:00:00+05:30").toISOString(),
        },
      ],
      telemetry: [
        {
          id: "purchase-1",
          createdAt: context.now.toISOString(),
          eventType: "purchase",
          locality: context.locality,
          city: context.city,
          productId: "prod-pooja-flower",
          sellerId: "seller-mylapore-fresh",
          value: 2,
          metadata: { channel: "buyer_app" },
        },
      ],
    });

    expect(snapshot.forecasts.some((forecast) => forecast.demandSpike)).toBe(true);
    expect(snapshot.perishability.find((item) => item.productId === "prod-pooja-flower")?.distressSaleRecommended).toBe(true);
    expect(snapshot.sellers[0].sellerHealthScore).toBeGreaterThan(50);
    expect(snapshot.delivery.some((item) => item.deliveryRisk === "high" || item.deliveryRisk === "critical")).toBe(true);
    expect(snapshot.baskets.some((basket) => basket.basketType === "festival")).toBe(true);
    expect(snapshot.geoCommerce.archetype).toBe("temple_town");
    expect(snapshot.risks.some((risk) => risk.domain === "spoilage" || risk.domain === "saturation")).toBe(true);
    expect(snapshot.telemetry.metrics.purchases).toBe(1);
    expect(snapshot.aiReadiness.localityVectors[0]).toContain("Mylapore");
  });

  it("prioritizes ultra-fresh perishability operations for seafood", () => {
    const inventory = buildOperationalInventory(products(), { ...context, weather: "normal" });
    const perishability = buildPerishabilityOperations(products(), inventory, { ...context, weather: "normal" });

    const fish = perishability.find((item) => item.productId === "prod-fish");
    expect(fish?.perishabilityClass).toBe("ultra_fresh");
    expect(["medium", "high", "critical"]).toContain(fish?.deliveryUrgency);
  });

  it("models heatwave freshness decay and heat damage risk", () => {
    const inventory = buildOperationalInventory(products(), {
      ...context,
      weather: "hot",
      heatIndexCelsius: 39,
      humidity: 82,
      refrigeration: "none",
      transitMinutes: 45,
    });
    const freshness = buildFreshnessProfiles(products(), inventory, { ...context, heatIndexCelsius: 39, humidity: 82, refrigeration: "none" });
    const fish = freshness.find((item) => item.productId === "prod-fish");

    expect(fish?.heatDamageRisk).toBeGreaterThan(0.25);
    expect(fish?.climateAdjustedShelfLifeHours).toBeLessThan(fish?.shelfLifeHours ?? 999);
    expect(fish?.deliveryFreshnessThresholdMinutes).toBeLessThanOrEqual(35);
  });

  it("raises delivery congestion and failure probability during rain and festival traffic", () => {
    const delivery = buildDeliveryIntelligence(products(), {
      ...context,
      weather: "storm",
      traffic: "heavy",
      festivalCongestion: true,
      ruralAccess: true,
    });
    const flower = delivery.find((item) => item.productId === "prod-pooja-flower");

    expect(["high", "critical"]).toContain(flower?.deliveryRisk);
    expect(flower?.etaConfidence).toBeLessThan(0.7);
    expect(flower?.deliveryFailureProbability).toBeGreaterThan(0.25);
  });

  it("detects distress pricing, locality shortages, alerts, and dashboards in one snapshot", () => {
    const snapshot = buildHyperlocalOperationsSnapshot({
      products: products(),
      context: { ...context, weather: "hot", traffic: "heavy", salaryWindow: true },
      inventory: [
        {
          product_id: "prod-fish",
          current_stock: 3,
          reserved_stock: 2,
          freshness_score: 0.28,
          spoilage_risk: 0.9,
          batch_time: new Date("2026-05-28T00:30:00+05:30").toISOString(),
        },
      ],
    });

    expect(snapshot.inventory.find((item) => item.product_id === "prod-fish")?.inventory_state).toBe("distressed");
    expect(snapshot.distress.find((item) => item.productId === "prod-fish")?.markdownSuggestion).toBeGreaterThanOrEqual(26);
    expect(snapshot.geoCommerce.shortageProbability).toBeGreaterThan(0);
    expect(snapshot.alerts.length).toBeGreaterThan(0);
    expect(snapshot.dashboard.panels.map((panel) => panel.key)).toContain("freshness");
    expect(snapshot.aiReadiness.freshnessVectors.length).toBe(products().length);
  });

  it("detects seller failure and degrading operational trend", () => {
    const failingSeller = createVendor({
      id: "seller-failing",
      name: "Late Closed Seller",
      serviceStatus: "closed",
      rating: 2.4,
      fulfillmentPromiseMinutes: 95,
    });
    const failingProduct = createProduct({
      id: "prod-aging-bakery",
      name: "Bakery Distress Bread",
      vendor: failingSeller,
      category: { id: "cat-bakery", name: "Bakery Breakfast", slug: "bakery-breakfast" },
      stockCount: 2,
      tags: ["bakery", "bread"],
    });
    const inventory = buildOperationalInventory([failingProduct], context, [{ product_id: "prod-aging-bakery", freshness_score: 0.25, current_stock: 1, reserved_stock: 1 }]);
    const sellers = buildSellerOperationsProfiles([failingSeller], [failingProduct], inventory);

    expect(sellers[0].sellerOperationalGrade).toBe("D");
    expect(sellers[0].sellerReliabilityTrend).toBe("degrading");
    expect(["high", "critical"]).toContain(sellers[0].riskLevel);
  });

  it("keeps commerce telemetry replay-safe and queues recovery jobs", () => {
    const duplicate = {
      id: "event-1",
      createdAt: context.now.toISOString(),
      eventType: "purchase" as const,
      locality: context.locality,
      city: context.city,
      productId: "prod-fish",
      sellerId: "seller-coastal-fish",
      value: 1,
      metadata: { channel: "buyer_app" },
      idempotencyKey: "purchase:prod-fish:1",
    };
    const telemetry = buildTelemetry(products(), context, [duplicate, { ...duplicate, id: "event-1-replay" }]);
    const snapshot = buildHyperlocalOperationsSnapshot({ products: products(), context, telemetry: [duplicate, { ...duplicate, id: "event-1-replay" }] });

    expect(telemetry.aggregation.replaySafe).toBe(true);
    expect(telemetry.aggregation.dedupedEventCount).toBe(1);
    expect(snapshot.asyncJobs.map((job) => job.jobName)).toContain("tier3.freshness.scan");
    expect(snapshot.asyncJobs.every((job) => job.idempotencyKey.includes(context.city))).toBe(true);
  });
});
