// MCP-0C — Inventory Command (stockout risk, forecast, reorder, turnover)

import type { InventorySignal, InventorySummary, SellerOperatingInput } from "./types";

const FORECAST_DAYS = 7;

function signalFor(product: {
  id: string;
  name: string;
  stock: number;
  reserved: number;
  lowStockThreshold: number;
  soldToday: number;
}): InventorySignal {
  const available = Math.max(0, product.stock - product.reserved);
  const velocity = Math.max(0, product.soldToday);
  const reorderPoint = Math.max(product.lowStockThreshold, Math.ceil(velocity * 2));
  const daysOfCover = velocity > 0 ? Math.round((available / velocity) * 10) / 10 : available > 0 ? 999 : 0;

  let status: InventorySignal["status"] = "healthy";
  if (available <= 0) status = "out";
  else if (available <= reorderPoint) status = "low";
  else if (velocity > 0 && daysOfCover > 60) status = "overstock";

  const target = Math.ceil(velocity * FORECAST_DAYS);
  const suggestedReorder = status === "low" || status === "out" ? Math.max(reorderPoint, target) - available : 0;

  return {
    productId: product.id,
    name: product.name,
    available,
    reorderPoint,
    velocityPerDay: velocity,
    daysOfCover,
    status,
    suggestedReorder: Math.max(0, suggestedReorder),
  };
}

export function computeInventory(input: SellerOperatingInput): InventorySummary {
  const source = input.inventory.length ? input.inventory : input.products;
  const signals = source.map(signalFor).sort((a, b) => {
    const rank = { out: 0, low: 1, overstock: 2, healthy: 3 } as const;
    return rank[a.status] - rank[b.status] || a.daysOfCover - b.daysOfCover;
  });

  const out = signals.filter((s) => s.status === "out").length;
  const low = signals.filter((s) => s.status === "low").length;
  const healthy = signals.filter((s) => s.status === "healthy").length;
  const totalVelocity = signals.reduce((sum, s) => sum + s.velocityPerDay, 0);
  const totalStock = signals.reduce((sum, s) => sum + s.available, 0);
  const turnoverDays = totalVelocity > 0 ? Math.round((totalStock / totalVelocity) * 10) / 10 : 0;

  return { total: signals.length, low, out, healthy, turnoverDays, signals };
}
