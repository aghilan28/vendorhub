// MCP-0C — Pricing Command (margin, optimization, validation)

import type { PricingSignal, PricingSummary, SellerOperatingInput } from "./types";

const MIN_HEALTHY_MARGIN = 12; // %

function signalFor(product: {
  id: string;
  name: string;
  price: number;
  mrp: number;
  stock: number;
  reserved: number;
  lowStockThreshold: number;
  soldToday: number;
}): PricingSignal {
  const mrp = product.mrp > 0 ? product.mrp : product.price;
  const marginPct = mrp > 0 ? Math.round(((product.price - mrp * 0.7) / product.price) * 1000) / 10 : 0;
  const discountPct = mrp > product.price ? Math.round(((mrp - product.price) / mrp) * 1000) / 10 : 0;
  const available = Math.max(0, product.stock - product.reserved);
  const velocity = product.soldToday;

  let recommendation: PricingSignal["recommendation"] = "hold";
  let rationale = "Price is balanced for current demand.";
  if (velocity >= 5 && available <= product.lowStockThreshold) {
    recommendation = "raise";
    rationale = "High demand + low stock: a modest price increase protects margin and stock.";
  } else if (velocity === 0 && available > product.lowStockThreshold * 3) {
    recommendation = "discount";
    rationale = "No recent sales + high stock: a promotion can unlock demand.";
  } else if (marginPct < MIN_HEALTHY_MARGIN) {
    recommendation = "raise";
    rationale = `Margin ${marginPct}% is below the ${MIN_HEALTHY_MARGIN}% threshold.`;
  }

  return { productId: product.id, name: product.name, price: product.price, mrp, marginPct, discountPct, recommendation, rationale };
}

export function computePricing(input: SellerOperatingInput): PricingSummary {
  const source = input.products.length ? input.products : input.inventory;
  const signals = source.map(signalFor);
  const averageMarginPct = signals.length
    ? Math.round((signals.reduce((s, p) => s + p.marginPct, 0) / signals.length) * 10) / 10
    : 0;
  const belowMarginCount = signals.filter((s) => s.marginPct < MIN_HEALTHY_MARGIN).length;
  return { averageMarginPct, belowMarginCount, signals };
}

/** Validates a manual price change (used by bulk price update + scheduled pricing). */
export function validatePriceChange(input: { price: number; mrp?: number }): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!(input.price > 0)) errors.push("price_must_be_positive");
  if (input.mrp !== undefined && input.mrp > 0 && input.price > input.mrp) errors.push("price_exceeds_mrp");
  return { ok: errors.length === 0, errors };
}
