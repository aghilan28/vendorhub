// MCP-0E.4 — Inventory Intelligence Engine.
// Operates on the fabric (inventory + sales velocity + demand forecasts) to
// produce stockout/overstock risks, reorder suggestions and health scores.

import type { InventoryIntelligence, InventorySignal, MarketplaceFabric, ProductFacts } from "./types";

/** Assumed replenishment lead time when computing reorder points. */
export const LEAD_TIME_DAYS = 5;
const TARGET_COVER_DAYS = 14;
const OVERSTOCK_COVER_DAYS = 60;

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function classify(product: ProductFacts): { risk: InventorySignal["risk"]; rationale: string } {
  const cover = product.daysOfCover;
  if (product.available <= 0) {
    return product.velocityPerDay > 0
      ? { risk: "stockout", rationale: `Out of stock with live demand of ${product.velocityPerDay}/day.` }
      : { risk: "dead_stock", rationale: "Out of stock and no recent demand." };
  }
  if (cover !== null && cover <= 3) {
    return { risk: "stockout", rationale: `Only ${cover}d of cover at ${product.velocityPerDay}/day.` };
  }
  if (product.velocityPerDay === 0 && product.available > product.lowStockThreshold * 3) {
    return { risk: "dead_stock", rationale: `${product.available} units, no sales in ${product.windowDays}d.` };
  }
  if (cover !== null && cover >= OVERSTOCK_COVER_DAYS) {
    return { risk: "overstock", rationale: `${cover}d of cover ties up working capital.` };
  }
  if (cover !== null && cover <= 7) {
    return { risk: "watch", rationale: `${cover}d of cover — monitor and prepare to reorder.` };
  }
  return { risk: "healthy", rationale: "Stock aligned with demand." };
}

export function analyzeInventory(fabric: MarketplaceFabric): InventoryIntelligence {
  const signals: InventorySignal[] = [];
  let stockoutCount = 0;
  let overstockCount = 0;
  let deadCount = 0;
  let reorderUnits = 0;

  for (const product of fabric.products) {
    const { risk, rationale } = classify(product);
    const reorderPoint = Math.max(product.lowStockThreshold, Math.ceil(product.velocityPerDay * LEAD_TIME_DAYS));
    const suggestedReorder =
      risk === "stockout" || risk === "watch"
        ? Math.max(0, Math.ceil(product.velocityPerDay * TARGET_COVER_DAYS) - product.available)
        : 0;

    if (risk === "stockout") stockoutCount += 1;
    if (risk === "overstock") overstockCount += 1;
    if (risk === "dead_stock") deadCount += 1;
    reorderUnits += suggestedReorder;

    if (risk !== "healthy") {
      signals.push({
        productId: product.productId,
        name: product.name,
        sellerId: product.sellerId,
        available: product.available,
        daysOfCover: product.daysOfCover,
        reorderPoint,
        suggestedReorder,
        risk,
        rationale,
      });
    }
  }

  // Order signals by urgency.
  const order: Record<InventorySignal["risk"], number> = { stockout: 0, watch: 1, dead_stock: 2, overstock: 3, healthy: 4 };
  signals.sort((a, b) => order[a.risk] - order[b.risk] || (a.daysOfCover ?? 999) - (b.daysOfCover ?? 999));

  const total = fabric.products.length;
  const healthScore = total
    ? clampScore(100 - (stockoutCount / total) * 50 - (deadCount / total) * 25 - (overstockCount / total) * 20)
    : 100;

  return { signals, healthScore, stockoutCount, overstockCount, reorderUnits };
}
