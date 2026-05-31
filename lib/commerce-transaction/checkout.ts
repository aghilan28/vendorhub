// MCP-0F.3 — Checkout Platform engine (deterministic, pure).
//
// Address validation, delivery options + slots, coupon application, GST tax,
// fees, order summary, and a risk/trust-gated checkout review. Benchmarked
// against Amazon/Flipkart checkout structure (address → delivery → payment →
// review) while reusing the repo's real atomic_checkout RPC downstream.

import type {
  AddressValidation,
  CartValidation,
  CheckoutAddressInput,
  CheckoutQuote,
  CheckoutReview,
  Coupon,
  CouponResult,
  DeliveryOption,
  DeliverySlot,
  PaymentMethod,
  TaxBreakdown,
} from "./types";
import { evaluateCouponCode, type CouponContext } from "./coupons";

// India GST: default 18% (9% CGST + 9% SGST intra-state). Documented assumption
// consistent with the existing features/commerce-finance/gst behaviour.
const DEFAULT_GST_RATE = 18;
const FREE_DELIVERY_THRESHOLD = 499;
const COD_MAX_AMOUNT = 50_000;

export const DELIVERY_OPTIONS: DeliveryOption[] = [
  { id: "express", label: "Express (under 2 hours)", etaMinutes: 110, fee: 49, slotted: false },
  { id: "standard", label: "Standard (same day)", etaMinutes: 360, fee: 0, slotted: false },
  { id: "slotted", label: "Choose a slot", etaMinutes: 720, fee: 0, slotted: true },
];

export function getDeliveryOption(id: string): DeliveryOption {
  return DELIVERY_OPTIONS.find((option) => option.id === id) ?? DELIVERY_OPTIONS[1];
}

/** Deterministic slot list for a given day reference (slot availability is stable). */
export function deliverySlots(referenceIso?: string): DeliverySlot[] {
  const base = referenceIso ? new Date(referenceIso) : new Date("2026-06-01T08:00:00.000Z");
  const windows = [
    { label: "Today, 2 PM – 4 PM", hour: 14, available: true },
    { label: "Today, 6 PM – 8 PM", hour: 18, available: true },
    { label: "Tomorrow, 9 AM – 11 AM", hour: 33, available: true },
    { label: "Tomorrow, 5 PM – 7 PM", hour: 41, available: false },
  ];
  return windows.map((w, i) => {
    const startsAt = new Date(base.getTime() + w.hour * 60 * 60 * 1000).toISOString();
    return { id: `slot-${i + 1}`, label: w.label, startsAt, available: w.available };
  });
}

// ── Address validation ────────────────────────────────────────────────────────

export function validateAddress(address: CheckoutAddressInput | null | undefined): AddressValidation {
  const issues: string[] = [];
  if (!address) {
    return { ok: false, issues: ["Select a delivery address."] };
  }
  if (address.recipient.trim().length < 2) issues.push("Recipient name is too short.");
  if (!/^\+?[0-9\s-]{6,15}$/.test(address.phone)) issues.push("Enter a valid contact phone.");
  if (address.line1.trim().length < 3) issues.push("Address line is incomplete.");
  if (address.city.trim().length < 2) issues.push("City is required.");
  if (!/^[0-9]{4,6}$/.test(address.pincode)) issues.push("Enter a valid pincode.");
  return { ok: issues.length === 0, issues };
}

// ── Tax ───────────────────────────────────────────────────────────────────────

export function computeTax(taxableValue: number, gstRate = DEFAULT_GST_RATE): TaxBreakdown {
  const value = Math.max(0, taxableValue);
  const tax = Math.round((value * gstRate) / 100);
  const half = Math.round(tax / 2);
  return {
    taxableValue: value,
    gstRate,
    cgst: half,
    sgst: tax - half,
    igst: 0,
    tax,
  };
}

// ── Quote ───────────────────────────────────────────────────────────────────

export interface CheckoutQuoteOptions {
  deliveryOptionId?: string;
  couponCode?: string;
  coupons?: Coupon[];
  gstRate?: number;
  now?: string;
}

/** Build the priced checkout quote from a validated cart. */
export function buildCheckoutQuote(cart: CartValidation, options: CheckoutQuoteOptions = {}): CheckoutQuote {
  const subtotal = cart.totals.subtotal;
  const deliveryOption = getDeliveryOption(options.deliveryOptionId ?? "standard");
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : deliveryOption.fee;

  let coupon: CouponResult | null = null;
  if (options.couponCode && options.couponCode.trim()) {
    const ctx: CouponContext = { subtotal, sellerIds: cart.groups.map((g) => g.sellerId), now: options.now };
    coupon = evaluateCouponCode(options.couponCode, options.coupons ?? [], ctx);
  }
  const discount = coupon?.applied ? coupon.discount : 0;

  const taxableValue = Math.max(0, subtotal - discount);
  const tax = computeTax(taxableValue, options.gstRate);
  const total = Math.max(0, taxableValue + tax.tax + deliveryFee);

  return {
    subtotal,
    tax,
    deliveryFee,
    discount,
    total,
    currency: "INR",
    itemCount: cart.totals.itemCount,
    coupon,
    deliveryOptionId: deliveryOption.id,
  };
}

// ── COD eligibility ────────────────────────────────────────────────────────────

export function codEligible(total: number, address: CheckoutAddressInput | null): boolean {
  if (!address) return false;
  if (total <= 0 || total > COD_MAX_AMOUNT) return false;
  // Pincode must be deliverable (deterministic: 4-6 digit pincode present).
  return /^[0-9]{4,6}$/.test(address.pincode);
}

// ── Risk scoring ───────────────────────────────────────────────────────────────

export interface CheckoutRiskInput {
  total: number;
  itemCount: number;
  newAddress?: boolean;
  paymentMethod: PaymentMethod;
  buyerPriorOrders?: number;
}

/** A deterministic 0..100 checkout risk score (higher = riskier). */
export function checkoutRiskScore(input: CheckoutRiskInput): number {
  let score = 0;
  if (input.total > 20_000) score += 25;
  else if (input.total > 7_500) score += 12;
  if (input.paymentMethod === "cod") score += 18;
  if (input.newAddress) score += 15;
  if ((input.buyerPriorOrders ?? 0) === 0) score += 20;
  if (input.itemCount > 12) score += 10;
  return Math.max(0, Math.min(100, score));
}

// ── Checkout review (the gate before payment) ──────────────────────────────────

export interface CheckoutReviewOptions extends CheckoutQuoteOptions {
  address: CheckoutAddressInput | null;
  paymentMethod: PaymentMethod;
  buyerPriorOrders?: number;
  newAddress?: boolean;
}

export function buildCheckoutReview(cart: CartValidation, options: CheckoutReviewOptions): CheckoutReview {
  const quote = buildCheckoutQuote(cart, options);
  const addressCheck = validateAddress(options.address);
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (cart.totals.itemCount <= 0) blockers.push("Your cart is empty.");
  if (!cart.ok) blockers.push("Resolve cart issues (stock or pricing) before checkout.");
  if (!addressCheck.ok) blockers.push(...addressCheck.issues);

  const cod = codEligible(quote.total, options.address);
  if (options.paymentMethod === "cod" && !cod) {
    blockers.push("Cash on Delivery is not available for this order.");
  }

  if (options.couponCode && options.couponCode.trim() && quote.coupon && !quote.coupon.applied) {
    warnings.push(quote.coupon.reason);
  }

  const riskScore = checkoutRiskScore({
    total: quote.total,
    itemCount: quote.itemCount,
    newAddress: options.newAddress,
    paymentMethod: options.paymentMethod,
    buyerPriorOrders: options.buyerPriorOrders,
  });
  if (riskScore >= 60) warnings.push("High-value or new-buyer order — extra verification may apply.");

  const trustOk = riskScore < 80;
  const ready = blockers.length === 0 && trustOk;

  return { ready, blockers, warnings, riskScore, trustOk, codEligible: cod, quote };
}
