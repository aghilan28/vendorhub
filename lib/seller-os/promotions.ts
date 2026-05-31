// MCP-0C — Promotion Management (coupons/discounts/bundles + analytics)

import type { Promotion } from "./types";

export interface PromotionValidation {
  ok: boolean;
  errors: string[];
}

export function validatePromotion(promo: Partial<Promotion>): PromotionValidation {
  const errors: string[] = [];
  if (!promo.code || !/^[A-Z0-9]{3,20}$/.test(promo.code)) errors.push("invalid_code");
  if (promo.type === "percent" && (!(promo.value! > 0) || promo.value! > 90)) errors.push("percent_out_of_range");
  if ((promo.type === "flat" || promo.type === "coupon") && !(promo.value! > 0)) errors.push("value_must_be_positive");
  if (promo.minOrder !== undefined && promo.minOrder < 0) errors.push("min_order_negative");
  return { ok: errors.length === 0, errors };
}

/** Applies a promotion to an order subtotal, honouring minimum order value. */
export function applyPromotion(promo: Promotion, subtotal: number): { discount: number; total: number; applied: boolean } {
  if (!promo.active || subtotal < promo.minOrder) return { discount: 0, total: subtotal, applied: false };
  let discount = 0;
  if (promo.type === "percent") discount = Math.round(subtotal * (promo.value / 100) * 100) / 100;
  else if (promo.type === "flat" || promo.type === "coupon") discount = Math.min(subtotal, promo.value);
  return { discount, total: Math.max(0, subtotal - discount), applied: discount > 0 };
}

export interface ConversionProjection {
  baselineConversion: number;
  projectedConversion: number;
  upliftPct: number;
  projectedOrders: number;
}

/**
 * Deterministic conversion projection for a promotion: deeper discounts lift
 * conversion with diminishing returns.
 */
export function projectConversion(promo: Promotion, baselineOrders: number, baselineConversion = 0.04): ConversionProjection {
  const depth = promo.type === "percent" ? promo.value / 100 : Math.min(0.5, promo.value / 1000);
  const uplift = Math.min(0.6, depth * 1.2); // capped uplift
  const projectedConversion = Math.round(baselineConversion * (1 + uplift) * 10000) / 10000;
  return {
    baselineConversion,
    projectedConversion,
    upliftPct: Math.round(uplift * 1000) / 10,
    projectedOrders: Math.round(baselineOrders * (1 + uplift)),
  };
}
