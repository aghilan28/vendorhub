// MCP-0F — Commerce Transaction Engine domain types.
//
// The engine operates on the SAME real shapes the marketplace produces
// (orders, payment attempts, shipments) plus the MCP-0D trust shapes for
// post-purchase (returns/refunds/reviews/tickets). It is pure + deterministic
// so it runs identically on LIVE Supabase data and on the clearly-labelled
// deterministic sample (preview only). No demo data ever drives a "live" count
// — see lib/commerce-transaction/queries.ts.

import type {
  DisputeInput,
  RefundInput,
  ReturnInput,
  ReviewInput,
  SupportTicketInput,
} from "@/lib/trust/types";

export type Severity = "info" | "opportunity" | "watch" | "warning" | "critical";
export type Tone = "healthy" | "watch" | "degraded" | "critical";

// ── Order lifecycle (the 12-state transaction machine) ───────────────────────
// Superset of the live 9-state order machine (features/transactions/lifecycle.ts):
// adds draft / placed / completed / returned / disputed required by MCP-0F.5.

export type TransactionState =
  | "draft"
  | "placed"
  | "confirmed"
  | "packed"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "returned"
  | "refunded"
  | "disputed";

export type TransactionActor = "buyer" | "seller" | "admin" | "system" | "payment_gateway";

export interface TransactionEvent {
  id: string;
  from: TransactionState;
  to: TransactionState;
  actor: TransactionActor;
  note: string;
  at: string;
}

export interface StateMeta {
  label: string;
  buyerLabel: string;
  tone: Tone;
  /** Terminal states allow no onward transition. */
  terminal: boolean;
  /** A "settled" state from the buyer's perspective (delivered/completed). */
  settled: boolean;
}

// ── Payment ──────────────────────────────────────────────────────────────────

export type PaymentMethod = "upi" | "card" | "netbanking" | "wallet" | "cod";

export type PaymentState =
  | "not_started"
  | "intent_created"
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "cod_pending"
  | "cod_confirmed"
  | "refund_pending"
  | "refunded";

export interface PaymentMethodConfig {
  method: PaymentMethod;
  label: string;
  instant: boolean;
  requiresGatewayOrder: boolean;
  requiresSignatureVerification: boolean;
  /** Max order value for the method (0 = unlimited). */
  maxAmount: number;
  retryable: boolean;
}

export interface PaymentAttemptRecord {
  id: string;
  orderId: string;
  method: PaymentMethod;
  state: PaymentState;
  amount: number;
  currency: "INR";
  attempts: number;
  createdAt: string;
  updatedAt: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  failureReason?: string;
}

export interface PaymentStep {
  key: string;
  label: string;
  done: boolean;
}

export interface PaymentPlan {
  method: PaymentMethod;
  amount: number;
  currency: "INR";
  requiresGatewayOrder: boolean;
  codEligible: boolean;
  steps: PaymentStep[];
  blockers: string[];
}

export interface PaymentRetryDecision {
  retryable: boolean;
  recommendedMethod: PaymentMethod;
  reason: string;
  attemptsRemaining: number;
}

export interface PaymentAnalytics {
  total: number;
  succeeded: number;
  failed: number;
  pending: number;
  successRate: number; // 0..100
  failureRate: number; // 0..100
  retryRate: number; // 0..100
  codShare: number; // 0..100
  methodMix: Array<{ method: PaymentMethod; count: number; share: number }>;
  recoverableValue: number;
}

// ── Cart ─────────────────────────────────────────────────────────────────────

export type CartListStatus = "active" | "saved" | "wishlist";

export interface CartLine {
  id: string;
  productId: string;
  sku: string;
  name: string;
  sellerId: string;
  sellerName: string;
  category: string;
  unitPrice: number;
  mrp: number;
  quantity: number;
  available: number;
  lowStockThreshold: number;
  listStatus: CartListStatus;
  imageHint?: string;
}

export type CartIssueKind =
  | "out_of_stock"
  | "insufficient_stock"
  | "low_stock"
  | "price_above_mrp"
  | "quantity_invalid"
  | "coupon_invalid";

export interface CartIssue {
  kind: CartIssueKind;
  severity: Severity;
  lineId?: string;
  message: string;
}

export interface CartSellerGroup {
  sellerId: string;
  sellerName: string;
  lines: CartLine[];
  subtotal: number;
  itemCount: number;
}

export interface CartTotals {
  subtotal: number;
  savings: number; // mrp - price across active lines
  itemCount: number;
  sellerCount: number;
}

export interface CartValidation {
  ok: boolean;
  totals: CartTotals;
  groups: CartSellerGroup[];
  active: CartLine[];
  saved: CartLine[];
  wishlist: CartLine[];
  issues: CartIssue[];
}

// ── Coupons / promotions ──────────────────────────────────────────────────────

export type CouponType = "percent" | "flat" | "bundle";

export interface Coupon {
  code: string;
  type: CouponType;
  value: number;
  minOrder: number;
  maxDiscount?: number;
  sellerId?: string;
  active: boolean;
  expiresAt?: string;
  stackable?: boolean;
  description?: string;
}

export interface CouponResult {
  code: string;
  applied: boolean;
  discount: number;
  reason: string;
}

// ── Checkout ──────────────────────────────────────────────────────────────────

export interface CheckoutAddressInput {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  line1: string;
  locality: string;
  city: string;
  pincode: string;
  instructions?: string;
  isDefault?: boolean;
}

export interface AddressValidation {
  ok: boolean;
  issues: string[];
}

export interface DeliveryOption {
  id: string;
  label: string;
  etaMinutes: number;
  fee: number;
  slotted: boolean;
}

export interface DeliverySlot {
  id: string;
  label: string;
  startsAt: string;
  available: boolean;
}

export interface TaxBreakdown {
  taxableValue: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
}

export interface CheckoutQuote {
  subtotal: number;
  tax: TaxBreakdown;
  deliveryFee: number;
  discount: number;
  total: number;
  currency: "INR";
  itemCount: number;
  coupon: CouponResult | null;
  deliveryOptionId: string;
}

export interface CheckoutReview {
  ready: boolean;
  blockers: string[];
  warnings: string[];
  riskScore: number; // 0..100 (higher = riskier)
  trustOk: boolean;
  codEligible: boolean;
  quote: CheckoutQuote;
}

// ── Fulfillment ───────────────────────────────────────────────────────────────

export interface TxOrderItem {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface TxOrder {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  state: TransactionState;
  paymentMethod: PaymentMethod;
  paymentState: PaymentState;
  total: number;
  currency: "INR";
  createdAt: string;
  updatedAt: string;
  items: TxOrderItem[];
  destinationPincode: string;
  slaMinutes: number;
  courier?: string;
  events: TransactionEvent[];
}

export type FulfillmentAction = "accept" | "pack" | "dispatch" | "deliver" | "resolve" | "none";

export interface FulfillmentTask {
  orderId: string;
  orderNumber: string;
  sellerId: string;
  sellerName: string;
  state: TransactionState;
  nextAction: FulfillmentAction;
  ageMinutes: number;
  slaMinutes: number;
  breached: boolean;
  atRisk: boolean;
  total: number;
  itemCount: number;
}

export interface CourierHealth {
  courier: string;
  shipments: number;
  onTimePct: number;
  delayed: number;
  tone: Tone;
}

export interface FulfillmentHealth {
  score: number; // 0..100
  tone: Tone;
  openTasks: number;
  breaches: number;
  atRisk: number;
  onTimePct: number;
  byState: Array<{ state: TransactionState; count: number }>;
  couriers: CourierHealth[];
}

// ── Delivery tracking ─────────────────────────────────────────────────────────

export interface TrackingEvent {
  at: string;
  state: TransactionState;
  label: string;
  location?: string;
  note?: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  orderNumber: string;
  courier: string;
  state: TransactionState;
  originPincode: string;
  destinationPincode: string;
  dispatchedAt?: string;
  promisedAt: string;
  deliveredAt?: string;
  events: TrackingEvent[];
}

export interface TrackingView {
  orderNumber: string;
  courier: string;
  stage: TransactionState;
  stageLabel: string;
  etaMinutes: number | null;
  delayed: boolean;
  delayMinutes: number;
  confidence: number; // 0..100
  history: TrackingEvent[];
}

export interface DeliveryPerformance {
  shipments: number;
  delivered: number;
  delayed: number;
  onTimePct: number;
  avgDelayMinutes: number;
  couriers: CourierHealth[];
}

// ── Post-purchase ─────────────────────────────────────────────────────────────

export type PostPurchaseKind = "review" | "return" | "refund" | "support";

export interface ReturnEligibility {
  eligible: boolean;
  windowDays: number;
  daysRemaining: number;
  reason: string;
}

export interface PostPurchaseSummary {
  reviewable: number;
  openReturns: number;
  openRefunds: number;
  openTickets: number;
  openDisputes: number;
  resolvedReturns: number;
  refundedValue: number;
}

export interface ResolutionStep {
  label: string;
  done: boolean;
  current: boolean;
}

// ── Transaction intelligence ──────────────────────────────────────────────────

export type TransactionRiskKind =
  | "checkout_drop"
  | "payment_risk"
  | "fulfillment_risk"
  | "delivery_risk"
  | "return_risk"
  | "refund_risk"
  | "operational_risk";

export interface TransactionRisk {
  id: string;
  kind: TransactionRiskKind;
  severity: Severity;
  scope: "order" | "seller" | "marketplace";
  refId: string;
  title: string;
  detail: string;
  recommendedAction: string;
  score: number; // 0..100
}

export interface TransactionThroughput {
  orders: number;
  gmv: number;
  averageOrderValue: number;
  placedToConfirmed: number;
  shippedToDelivered: number;
  cancellationRate: number; // 0..100
  returnRate: number; // 0..100
  refundRate: number; // 0..100
  fulfillmentRate: number; // 0..100 (delivered+completed / total)
}

export interface TransactionIntelligence {
  score: number; // 0..100 (commerce-loop health)
  tone: Tone;
  throughput: TransactionThroughput;
  risks: TransactionRisk[];
}

// ── Activity input + snapshot ─────────────────────────────────────────────────

export interface TransactionActivityInput {
  generatedAt?: string;
  orders: TxOrder[];
  payments: PaymentAttemptRecord[];
  shipments: Shipment[];
  coupons: Coupon[];
  returns: ReturnInput[];
  refunds: RefundInput[];
  reviews: ReviewInput[];
  tickets: SupportTicketInput[];
  disputes: DisputeInput[];
}

export interface TransactionSnapshot {
  generatedAt: string;
  hasActivity: boolean;
  orders: TxOrder[];
  shipments: Shipment[];
  fulfillment: FulfillmentHealth;
  tasks: FulfillmentTask[];
  delivery: DeliveryPerformance;
  payment: PaymentAnalytics;
  postPurchase: PostPurchaseSummary;
  intelligence: TransactionIntelligence;
}
