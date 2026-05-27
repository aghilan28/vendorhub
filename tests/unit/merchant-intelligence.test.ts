import { describe, expect, it } from "vitest";
import { buildMerchantIntelligence } from "@/features/merchant-intelligence";
import type { InventoryItem, SellerOrder, SellerProduct } from "@/features/seller/types";

const products: SellerProduct[] = [
  {
    id: "p-rice",
    sku: "p-rice",
    name: "Premium Rice 5kg Pack",
    category: "Grocery",
    price: 520,
    mrp: 560,
    status: "published",
    visibility: "marketplace",
    stock: 6,
    reserved: 2,
    lowStockThreshold: 5,
    soldToday: 4,
    imageHint: "rice",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "p-tea",
    sku: "p-tea",
    name: "Tea",
    category: "Grocery",
    price: 120,
    mrp: 140,
    status: "published",
    visibility: "marketplace",
    stock: 80,
    reserved: 0,
    lowStockThreshold: 5,
    soldToday: 0,
    imageHint: "tea",
    updatedAt: new Date().toISOString(),
  },
];

const inventory: InventoryItem[] = products.map((product) => ({
  ...product,
  aisle: "A1",
  batch: "B1",
  expiry: "2026-06-10",
  lastMovement: "SALE 2",
}));

const orders: SellerOrder[] = [
  {
    id: "VH-1",
    customer: "Buyer",
    phone: "9999999999",
    address: "Local street",
    status: "processing",
    promisedInMinutes: 12,
    createdAt: new Date().toISOString(),
    paymentMode: "UPI",
    subtotal: 1040,
    deliveryFee: 0,
    notes: "",
    items: [{ sku: "p-rice", name: "Premium Rice 5kg Pack", quantity: 2, unitPrice: 520, picked: false }],
    timeline: [],
  },
];

describe("merchant intelligence engine", () => {
  it("produces actionable stockout forecasts and restock guidance", () => {
    const snapshot = buildMerchantIntelligence({
      vendor: { id: "v1", name: "Local Store", locality: "Malleswaram", city: "Bengaluru", delivery_radius_km: 5 },
      products,
      inventory,
      orders,
    });

    expect(snapshot.forecasts[0].productId).toBe("p-rice");
    expect(snapshot.forecasts[0].stockoutRisk).toBe("high");
    expect(snapshot.forecasts[0].confidenceReasoning).toContain("Confidence");
    expect(snapshot.forecasts[0].regionalContext).toContain("Malleswaram");
    expect(snapshot.forecasts[0].operationalImpact).toContain("stockout");
    expect(snapshot.inventory.find((item) => item.productId === "p-rice")?.recommendedRestock).toBeGreaterThan(0);
    expect(snapshot.insights.some((insight) => insight.domain === "inventory" && insight.action.length > 10)).toBe(true);
    expect(snapshot.observability.snapshotTtlMinutes).toBe(120);
  });

  it("activates cold-start fairness guidance for new sellers", () => {
    const snapshot = buildMerchantIntelligence({
      vendor: { id: "v1", name: "New Store", locality: "Adyar", city: "Chennai", delivery_radius_km: 4 },
      products,
      inventory,
      orders: [],
    });

    expect(snapshot.coldStart.isColdStart).toBe(true);
    expect(snapshot.summary.fairnessScore).toBeGreaterThanOrEqual(90);
    expect(snapshot.insights.some((insight) => insight.domain === "fairness")).toBe(true);
    expect(snapshot.insights.find((insight) => insight.domain === "fairness")?.localeText.ta).toContain("புதிய");
  });
});
