/**
 * EC-2 — Commerce Core Completion Domain Model
 * Payouts · Returns · Refunds · Reviews · Support · Delivery · Communications
 */

// ─── Common ──────────────────────────────────────────────────────────────────
export type Money = number; // minor units assumed INR rupees (integer)
export type ISO = string;

export type AuditEntry = {
  id: string;
  at: ISO;
  actor: string;
  actorRole: "customer" | "seller" | "admin" | "system";
  action: string;
  detail: string;
};

// ─── Payouts (Phase 2) ─────────────────────────────────────────────────────────
export type PayoutStatus = "PENDING" | "PROCESSING" | "SETTLED" | "FAILED" | "REVERSED";

export type LedgerEntryType = "SALE" | "COMMISSION" | "REFUND_ADJUSTMENT" | "PAYOUT" | "REVERSAL" | "ADJUSTMENT";

export type SellerLedgerEntry = {
  id: string;
  sellerId: string;
  orderId: string | null;
  type: LedgerEntryType;
  amount: Money; // positive = credit to seller, negative = debit
  balanceAfter: Money;
  note: string;
  at: ISO;
};

export type Payout = {
  id: string;
  sellerId: string;
  status: PayoutStatus;
  grossAmount: Money;
  commission: Money;
  refundAdjustments: Money;
  netAmount: Money;
  ledgerEntryIds: string[];
  reference: string;
  initiatedAt: ISO;
  settledAt: ISO | null;
  failureReason: string | null;
  audit: AuditEntry[];
};

export type SellerEarningsSummary = {
  sellerId: string;
  lifetimeGross: Money;
  lifetimeCommission: Money;
  lifetimeNet: Money;
  pendingBalance: Money;
  availableBalance: Money;
  settledTotal: Money;
  payoutsByStatus: Record<PayoutStatus, number>;
};

// ─── Returns (Phase 3) ──────────────────────────────────────────────────────────
export type ReturnStatus =
  | "REQUESTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "IN_TRANSIT"
  | "RECEIVED"
  | "COMPLETED";

export type ReturnReason =
  | "defective"
  | "damaged"
  | "wrong_item"
  | "not_as_described"
  | "size_fit"
  | "changed_mind"
  | "other";

export type ReturnRequest = {
  id: string;
  orderId: string;
  orderItemId: string | null;
  buyerId: string;
  sellerId: string;
  status: ReturnStatus;
  reason: ReturnReason;
  description: string;
  evidencePaths: string[];
  refundId: string | null;
  resolutionNote: string | null;
  createdAt: ISO;
  updatedAt: ISO;
  audit: AuditEntry[];
};

// ─── Refunds (Phase 4) ──────────────────────────────────────────────────────────
export type RefundMode = "full" | "partial" | "wallet" | "store_credit";
export type RefundState = "INITIATED" | "PROCESSING" | "COMPLETED" | "FAILED";

export type Refund = {
  id: string;
  orderId: string;
  customerId: string;
  mode: RefundMode;
  orderTotal: Money;
  amount: Money;
  state: RefundState;
  gatewayReference: string | null;
  walletCredited: boolean;
  reason: string;
  createdAt: ISO;
  completedAt: ISO | null;
  audit: AuditEntry[];
};

export type StoreCreditLedgerEntry = {
  id: string;
  customerId: string;
  amount: Money; // positive = credit, negative = redemption
  balanceAfter: Money;
  source: "refund" | "redemption" | "adjustment" | "promotion";
  refundId: string | null;
  at: ISO;
};

// ─── Reviews & Ratings (Phase 5) ─────────────────────────────────────────────────
export type ModerationStatus = "VISIBLE" | "PENDING" | "FLAGGED" | "REMOVED";

export type ReviewSubmission = {
  userId: string;
  productId: string;
  orderItemId: string | null;
  rating: number; // 1-5
  title: string;
  body: string;
};

export type ReviewValidationResult = {
  valid: boolean;
  errors: string[];
  isVerifiedPurchase: boolean;
  fraudScore: number; // 0-100
  recommendedModeration: ModerationStatus;
};

export type SellerReviewResponse = {
  reviewId: string;
  sellerId: string;
  body: string;
  at: ISO;
};

// ─── Delivery (Phase 7) ──────────────────────────────────────────────────────────
export type ShipmentStatus =
  | "CREATED"
  | "PICKUP_SCHEDULED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED"
  | "RETURNED";

export type DeliveryProviderId = "shiprocket" | "delhivery" | "porter" | "local";

export type ShipmentRequest = {
  orderId: string;
  provider: DeliveryProviderId;
  pickupPincode: string;
  dropPincode: string;
  weightKg: number;
  codAmount: Money;
};

export type Shipment = {
  id: string;
  orderId: string;
  provider: DeliveryProviderId;
  status: ShipmentStatus;
  trackingNumber: string | null;
  awb: string | null;
  events: ShipmentEvent[];
  createdAt: ISO;
  updatedAt: ISO;
};

export type ShipmentEvent = {
  id: string;
  status: ShipmentStatus;
  location: string;
  note: string;
  at: ISO;
};

// ─── Communications (Phase 8) ─────────────────────────────────────────────────────
export type EmailTemplateId =
  | "order_confirmation"
  | "shipment_update"
  | "return_update"
  | "refund_update"
  | "payout_update"
  | "support_update"
  | "admin_alert";

export type EmailMessage = {
  id: string;
  template: EmailTemplateId;
  to: string;
  subject: string;
  body: string;
  data: Record<string, string | number>;
  state: "QUEUED" | "SENT" | "FAILED";
  attempts: number;
  createdAt: ISO;
  sentAt: ISO | null;
};
