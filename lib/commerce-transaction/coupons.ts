// MCP-0F.3 — Coupon / promotion application engine (deterministic, pure).
//
// Buyer-redeemable coupons (percent / flat / bundle) with min-order, expiry,
// per-seller scoping and max-discount caps. This closes the audit gap where
// checkout applied only a hard-coded discount. Designed to interoperate with
// MCP-0C seller_promotions shapes.

import type { Coupon, CouponResult } from "./types";

export interface CouponContext {
  subtotal: number;
  /** Seller ids present in the cart (for per-seller coupon scoping). */
  sellerIds: string[];
  now?: string;
}

function isExpired(coupon: Coupon, now: string): boolean {
  if (!coupon.expiresAt) return false;
  return new Date(coupon.expiresAt).getTime() < new Date(now).getTime();
}

/** Compute the discount a single coupon would yield (0 when not applicable). */
export function applyCoupon(coupon: Coupon, ctx: CouponContext): CouponResult {
  const now = ctx.now ?? new Date().toISOString();

  if (!coupon.active) {
    return { code: coupon.code, applied: false, discount: 0, reason: "Coupon is not active." };
  }
  if (isExpired(coupon, now)) {
    return { code: coupon.code, applied: false, discount: 0, reason: "Coupon has expired." };
  }
  if (ctx.subtotal < coupon.minOrder) {
    return {
      code: coupon.code,
      applied: false,
      discount: 0,
      reason: `Add ₹${Math.max(0, coupon.minOrder - ctx.subtotal).toLocaleString("en-IN")} more to use ${coupon.code}.`,
    };
  }
  if (coupon.sellerId && !ctx.sellerIds.includes(coupon.sellerId)) {
    return { code: coupon.code, applied: false, discount: 0, reason: "Coupon is not valid for the sellers in your cart." };
  }

  let discount = 0;
  if (coupon.type === "percent") {
    discount = Math.round((ctx.subtotal * coupon.value) / 100);
  } else if (coupon.type === "flat") {
    discount = coupon.value;
  } else {
    // bundle: flat value but only when more than one seller / multiple items.
    discount = ctx.sellerIds.length > 1 ? coupon.value : 0;
  }

  if (coupon.maxDiscount && coupon.maxDiscount > 0) {
    discount = Math.min(discount, coupon.maxDiscount);
  }
  discount = Math.max(0, Math.min(discount, ctx.subtotal));

  if (discount <= 0) {
    return { code: coupon.code, applied: false, discount: 0, reason: "Coupon yields no discount for this cart." };
  }

  return {
    code: coupon.code,
    applied: true,
    discount,
    reason: `Saved ₹${discount.toLocaleString("en-IN")} with ${coupon.code}.`,
  };
}

/** Find a coupon by code and evaluate it. */
export function evaluateCouponCode(code: string, coupons: Coupon[], ctx: CouponContext): CouponResult {
  const normalized = code.trim().toUpperCase();
  const coupon = coupons.find((c) => c.code.toUpperCase() === normalized);
  if (!coupon) {
    return { code: normalized, applied: false, discount: 0, reason: "Coupon code not found." };
  }
  return applyCoupon(coupon, ctx);
}

/** Best automatically-applicable coupon for the cart (highest discount). */
export function bestCoupon(coupons: Coupon[], ctx: CouponContext): CouponResult | null {
  const results = coupons
    .map((coupon) => applyCoupon(coupon, ctx))
    .filter((result) => result.applied)
    .sort((a, b) => b.discount - a.discount);
  return results[0] ?? null;
}

/** Coupons that are applicable now (for surfacing "available offers"). */
export function applicableCoupons(coupons: Coupon[], ctx: CouponContext): Coupon[] {
  return coupons.filter((coupon) => applyCoupon(coupon, ctx).applied);
}
