// MCP-0C — Seller Analytics (revenue, orders, top products/categories, trends)

import type { AnalyticsSummary, SellerOperatingInput } from "./types";

export function computeAnalytics(input: SellerOperatingInput): AnalyticsSummary {
  const orderValues = input.orders.map((o) => o.subtotal + o.deliveryFee);
  const revenue = Math.round(orderValues.reduce((s, v) => s + v, 0));
  const orders = input.orders.length;
  const averageOrderValue = orders ? Math.round((revenue / orders) * 100) / 100 : 0;

  const products = input.products.length ? input.products : input.inventory;
  const topProducts = [...products]
    .sort((a, b) => b.soldToday - a.soldToday)
    .slice(0, 8)
    .map((p) => ({ name: p.name, sold: p.soldToday }));

  const catCounts = new Map<string, number>();
  for (const p of products) catCounts.set(p.category, (catCounts.get(p.category) ?? 0) + 1);
  const topCategories = [...catCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Conversion proxy: orders relative to total available stock units listed.
  const listedUnits = products.reduce((s, p) => s + Math.max(0, p.stock), 0);
  const conversionProxy = listedUnits > 0 ? Math.round((orders / listedUnits) * 10000) / 100 : 0;

  const revenueTrend = orderValues.slice(0, 12).reverse();

  return { revenue, orders, averageOrderValue, conversionProxy, topProducts, topCategories, revenueTrend };
}
