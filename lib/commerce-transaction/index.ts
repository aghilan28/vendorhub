// MCP-0F — Commerce Transaction Engine (public surface).
//
// One assembler turns raw transaction activity (orders / payments / shipments /
// returns / refunds / reviews / tickets / disputes) into a complete snapshot:
// fulfillment health + queue, delivery performance, payment analytics,
// post-purchase summary and transaction intelligence. Cart / checkout / payment
// /coupon helpers are exported for request-time use by surfaces.

export * from "./types";

// State machine
export {
  TRANSITIONS,
  STATE_META,
  HAPPY_PATH,
  canTransition,
  nextStates,
  isTerminal,
  sellerNextStates,
  applyTransition,
  lifecycleProgress,
  toDbOrderStatus,
  fromDbOrderStatus,
  type TransitionResult,
} from "./state-machine";

// Cart
export {
  addItem,
  removeItem,
  updateQuantity,
  setListStatus,
  saveForLater,
  moveToCart,
  toggleWishlist,
  validateCart,
  resolveCartCoupon,
  type CartValidationOptions,
} from "./cart";

// Coupons
export { applyCoupon, evaluateCouponCode, bestCoupon, applicableCoupons, type CouponContext } from "./coupons";

// Checkout
export {
  DELIVERY_OPTIONS,
  getDeliveryOption,
  deliverySlots,
  validateAddress,
  computeTax,
  buildCheckoutQuote,
  codEligible,
  checkoutRiskScore,
  buildCheckoutReview,
  type CheckoutQuoteOptions,
  type CheckoutReviewOptions,
  type CheckoutRiskInput,
} from "./checkout";

// Payment
export {
  PAYMENT_METHODS,
  paymentMethodConfig,
  isPaymentSettled,
  isPaymentFailed,
  isPaymentPending,
  buildPaymentPlan,
  planPaymentRetry,
  needsReconciliation,
  buildPaymentAnalytics,
  paymentGovernanceSignals,
} from "./payment";

// Fulfillment
export {
  buildFulfillmentTask,
  buildFulfillmentQueue,
  fulfillmentActions,
  buildCourierHealth,
  buildFulfillmentHealth,
} from "./fulfillment";

// Tracking
export {
  deliveryConfidence,
  buildTrackingView,
  deliveryDelayAlerts,
  buildDeliveryPerformance,
  type TrackingOptions,
} from "./tracking";

// Post-purchase
export {
  returnEligibility,
  canReview,
  returnResolutionSteps,
  refundResolutionSteps,
  buildPostPurchaseSummary,
  type PostPurchaseInput,
} from "./post-purchase";

// Intelligence
export {
  buildThroughput,
  detectTransactionRisks,
  risksToRecommendations,
  buildTransactionIntelligence,
  buildTransactionIntelligenceFromActivity,
  type TransactionRiskInput,
} from "./intelligence";

// Sample
export {
  SAMPLE_TRANSACTION_INPUT,
  SAMPLE_ORDERS,
  SAMPLE_PAYMENTS,
  SAMPLE_SHIPMENTS,
  SAMPLE_COUPONS,
  SAMPLE_CART_LINES,
  SAMPLE_ADDRESSES,
} from "./sample";

import { buildFulfillmentHealth, buildFulfillmentQueue } from "./fulfillment";
import { buildPaymentAnalytics } from "./payment";
import { buildPostPurchaseSummary } from "./post-purchase";
import { buildDeliveryPerformance } from "./tracking";
import { buildTransactionIntelligence } from "./intelligence";
import type { TransactionActivityInput, TransactionSnapshot } from "./types";

/**
 * Assembles the complete commerce-transaction snapshot from live (or sample)
 * activity. Pure + deterministic so it runs identically server-side on real
 * Supabase data and offline in previews/tests.
 */
export function buildTransactionSnapshot(input: TransactionActivityInput): TransactionSnapshot {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const payment = buildPaymentAnalytics(input.payments);
  const fulfillment = buildFulfillmentHealth(input.orders, input.shipments, generatedAt);
  const tasks = buildFulfillmentQueue(input.orders, generatedAt);
  const delivery = buildDeliveryPerformance(input.shipments, generatedAt);
  const postPurchase = buildPostPurchaseSummary({
    orders: input.orders,
    returns: input.returns,
    refunds: input.refunds,
    reviews: input.reviews,
    tickets: input.tickets,
    disputes: input.disputes,
  });
  const intelligence = buildTransactionIntelligence({
    orders: input.orders,
    shipments: input.shipments,
    payments: payment,
    returns: input.returns,
    refunds: input.refunds,
    now: generatedAt,
  });

  const hasActivity = input.orders.length > 0 || input.payments.length > 0 || input.shipments.length > 0;

  return {
    generatedAt,
    hasActivity,
    orders: input.orders,
    shipments: input.shipments,
    fulfillment,
    tasks,
    delivery,
    payment,
    postPurchase,
    intelligence,
  };
}
