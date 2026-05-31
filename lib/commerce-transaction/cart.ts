// MCP-0F.2 — Cart Platform completion engine (deterministic, pure).
//
// Operates on normalized CartLine[] (mapped from the real live cart in
// queries.ts) and provides every mandated capability: add / remove / update
// quantity / save-for-later / wishlist / move-between-lists, multi-seller
// grouping, and cart / inventory / price / promotion validation.

import type {
  CartIssue,
  CartLine,
  CartListStatus,
  CartSellerGroup,
  CartTotals,
  CartValidation,
  Coupon,
  CouponResult,
} from "./types";
import { evaluateCouponCode, type CouponContext } from "./coupons";

// ── Pure mutations (return a new array; never mutate the input) ──────────────

export function addItem(lines: CartLine[], line: CartLine): CartLine[] {
  const existing = lines.find(
    (l) => l.productId === line.productId && l.listStatus === "active" && l.sku === line.sku,
  );
  if (existing) {
    return lines.map((l) =>
      l.id === existing.id ? { ...l, quantity: clampQuantity(l.quantity + line.quantity, l.available) } : l,
    );
  }
  return [...lines, { ...line, quantity: clampQuantity(line.quantity, line.available) }];
}

export function removeItem(lines: CartLine[], lineId: string): CartLine[] {
  return lines.filter((l) => l.id !== lineId);
}

export function updateQuantity(lines: CartLine[], lineId: string, quantity: number): CartLine[] {
  return lines
    .map((l) => (l.id === lineId ? { ...l, quantity: clampQuantity(quantity, l.available) } : l))
    .filter((l) => l.quantity > 0);
}

export function setListStatus(lines: CartLine[], lineId: string, listStatus: CartListStatus): CartLine[] {
  return lines.map((l) => (l.id === lineId ? { ...l, listStatus } : l));
}

/** Save for later = move an active line to the "saved" list. */
export function saveForLater(lines: CartLine[], lineId: string): CartLine[] {
  return setListStatus(lines, lineId, "saved");
}

/** Move a saved/wishlist line back into the active cart. */
export function moveToCart(lines: CartLine[], lineId: string): CartLine[] {
  return setListStatus(lines, lineId, "active");
}

export function toggleWishlist(lines: CartLine[], lineId: string): CartLine[] {
  const line = lines.find((l) => l.id === lineId);
  if (!line) return lines;
  return setListStatus(lines, lineId, line.listStatus === "wishlist" ? "active" : "wishlist");
}

function clampQuantity(quantity: number, available: number): number {
  const q = Math.max(0, Math.floor(quantity));
  if (available <= 0) return q; // keep requested qty; validation flags out_of_stock
  return Math.min(q, available);
}

// ── Grouping + totals ─────────────────────────────────────────────────────────

function groupBySeller(active: CartLine[]): CartSellerGroup[] {
  const map = new Map<string, CartSellerGroup>();
  for (const line of active) {
    const group = map.get(line.sellerId) ?? {
      sellerId: line.sellerId,
      sellerName: line.sellerName,
      lines: [],
      subtotal: 0,
      itemCount: 0,
    };
    group.lines.push(line);
    group.subtotal += line.unitPrice * line.quantity;
    group.itemCount += line.quantity;
    map.set(line.sellerId, group);
  }
  return [...map.values()].sort((a, b) => b.subtotal - a.subtotal);
}

function totalsFor(active: CartLine[], groups: CartSellerGroup[]): CartTotals {
  const subtotal = active.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const savings = active.reduce((sum, l) => sum + Math.max(0, l.mrp - l.unitPrice) * l.quantity, 0);
  const itemCount = active.reduce((sum, l) => sum + l.quantity, 0);
  return { subtotal, savings, itemCount, sellerCount: groups.length };
}

// ── Validation (inventory + price + promotion) ────────────────────────────────

export interface CartValidationOptions {
  couponCode?: string;
  coupons?: Coupon[];
  now?: string;
}

export function validateCart(lines: CartLine[], options: CartValidationOptions = {}): CartValidation {
  const active = lines.filter((l) => l.listStatus === "active");
  const saved = lines.filter((l) => l.listStatus === "saved");
  const wishlist = lines.filter((l) => l.listStatus === "wishlist");
  const groups = groupBySeller(active);
  const totals = totalsFor(active, groups);
  const issues: CartIssue[] = [];

  for (const line of active) {
    if (line.quantity <= 0) {
      issues.push({ kind: "quantity_invalid", severity: "warning", lineId: line.id, message: `${line.name}: quantity must be at least 1.` });
      continue;
    }
    if (line.available <= 0) {
      issues.push({ kind: "out_of_stock", severity: "critical", lineId: line.id, message: `${line.name} is out of stock.` });
    } else if (line.quantity > line.available) {
      issues.push({
        kind: "insufficient_stock",
        severity: "warning",
        lineId: line.id,
        message: `${line.name}: only ${line.available} in stock (you have ${line.quantity}).`,
      });
    } else if (line.available <= line.lowStockThreshold) {
      issues.push({ kind: "low_stock", severity: "watch", lineId: line.id, message: `${line.name} is low on stock.` });
    }
    if (line.unitPrice > line.mrp && line.mrp > 0) {
      issues.push({ kind: "price_above_mrp", severity: "warning", lineId: line.id, message: `${line.name}: price exceeds MRP.` });
    }
  }

  // Promotion validation.
  if (options.couponCode && options.couponCode.trim()) {
    const ctx: CouponContext = { subtotal: totals.subtotal, sellerIds: groups.map((g) => g.sellerId), now: options.now };
    const result = evaluateCouponCode(options.couponCode, options.coupons ?? [], ctx);
    if (!result.applied) {
      issues.push({ kind: "coupon_invalid", severity: "info", message: result.reason });
    }
  }

  const ok = issues.filter((i) => i.severity === "critical" || i.severity === "warning").length === 0 && totals.itemCount > 0;
  return { ok, totals, groups, active, saved, wishlist, issues };
}

/** Resolve the applied coupon result for a cart (or null). */
export function resolveCartCoupon(validation: CartValidation, options: CartValidationOptions): CouponResult | null {
  if (!options.couponCode || !options.couponCode.trim()) return null;
  const ctx: CouponContext = {
    subtotal: validation.totals.subtotal,
    sellerIds: validation.groups.map((g) => g.sellerId),
    now: options.now,
  };
  return evaluateCouponCode(options.couponCode, options.coupons ?? [], ctx);
}
