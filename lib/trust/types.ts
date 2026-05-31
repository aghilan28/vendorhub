// MCP-0D — Trust Layer domain types (deterministic, client-safe).
// Engine inputs mirror real marketplace activity so trust runs on real data.

export type Tone = "healthy" | "watch" | "degraded" | "critical";

export interface ReviewInput {
  id: string;
  productId: string;
  sellerId: string;
  rating: number; // 1..5
  verifiedPurchase: boolean;
  helpfulVotes: number;
  totalVotes: number;
  moderationStatus: "VISIBLE" | "PENDING" | "HIDDEN" | "REJECTED";
  createdAt: string;
  body?: string;
  authorId?: string;
}

export interface OrderInput {
  id: string;
  sellerId: string;
  status: string; // delivered, cancelled, refunded, ...
  value: number;
  createdAt: string;
}

export interface ReturnInput {
  id: string;
  orderId: string;
  sellerId: string;
  buyerId?: string;
  status: ReturnState;
  reason: string;
  createdAt: string;
}

export interface RefundInput {
  id: string;
  orderId: string;
  sellerId: string;
  buyerId?: string;
  status: RefundState;
  amount: number;
  createdAt: string;
}

export interface SellerActivity {
  sellerId: string;
  name: string;
  verified: boolean;
  responseMinutes: number;
}

export interface QAAnswer {
  id: string;
  body: string;
  bySeller: boolean;
  votes: number;
  accepted: boolean;
}

export interface QAItem {
  id: string;
  productId: string;
  question: string;
  status: "open" | "answered" | "hidden";
  answers: QAAnswer[];
  createdAt: string;
}

export interface SupportTicketInput {
  id: string;
  category: "order" | "payment" | "delivery" | "product" | "account" | "other";
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "waiting" | "resolved" | "closed";
  createdAt: string;
  firstResponseMinutes?: number;
}

export interface DisputeInput {
  id: string;
  orderId: string;
  state: DisputeState;
  createdAt: string;
}

export interface TrustActivityInput {
  sellers: SellerActivity[];
  orders: OrderInput[];
  reviews: ReviewInput[];
  returns: ReturnInput[];
  refunds: RefundInput[];
  qa: QAItem[];
  tickets: SupportTicketInput[];
  disputes: DisputeInput[];
}

// ── Lifecycles ──
export type ReturnState = "requested" | "approved" | "rejected" | "in_transit" | "received" | "resolved" | "cancelled";
export type RefundState = "requested" | "approved" | "rejected" | "processing" | "refunded" | "failed";
export type DisputeState = "open" | "evidence" | "arbitration" | "resolved_buyer" | "resolved_seller" | "dismissed";

// ── Outputs ──
export interface ProductRating {
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  verifiedPct: number;
  recommendedPct: number;
}

export type SellerTier = "new" | "rising" | "established" | "top_rated" | "restricted";

export interface SellerReputation {
  sellerId: string;
  name: string;
  score: number; // 0..100
  tier: SellerTier;
  reputationIndex: number;
  responseTimeMinutes: number;
  fulfillmentQuality: number; // 0..100
  returnRate: number; // %
  refundRate: number; // %
  complaintRate: number; // %
  satisfaction: number; // 0..100
  verified: boolean;
  badges: string[];
}

export interface ProductReputation {
  productId: string;
  trustScore: number; // 0..100
  qualityScore: number;
  reviewScore: number;
  complaintScore: number;
  returnRisk: number; // 0..100 (higher = riskier)
  authenticitySignals: string[];
  confidenceIndex: number; // 0..100
  trend: "up" | "flat" | "down";
}

export interface TrustSignal {
  label: string;
  value: string;
  ok: boolean;
}

export interface BuyerTrustSignals {
  verifiedSeller: boolean;
  verifiedProduct: boolean;
  sellerTrustScore: number;
  productTrustScore: number;
  signals: TrustSignal[];
  policies: { returns: string; refunds: string };
  guarantees: string[];
}

export type TrustInsightKind =
  | "review_fraud"
  | "seller_risk"
  | "product_risk"
  | "refund_abuse"
  | "return_abuse"
  | "trust_degradation"
  | "marketplace_risk"
  | "recommendation"
  | "forecast";

export interface TrustInsight {
  kind: TrustInsightKind;
  severity: "info" | "watch" | "warning" | "critical";
  title: string;
  detail: string;
  action: string;
  entityId?: string;
}

export interface SupportSummary {
  open: number;
  urgent: number;
  avgFirstResponseMinutes: number;
  slaBreaches: number;
  byCategory: { category: string; count: number }[];
}

export interface TrustGovernanceSummary {
  marketplaceTrustScore: number;
  tone: Tone;
  totalReviews: number;
  flaggedReviews: number;
  openReturns: number;
  openRefunds: number;
  openDisputes: number;
  openTickets: number;
  atRiskSellers: number;
}

export interface TrustSnapshot {
  governance: TrustGovernanceSummary;
  sellerReputations: SellerReputation[];
  insights: TrustInsight[];
  support: SupportSummary;
}
