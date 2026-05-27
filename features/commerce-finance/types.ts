import type { CartItem, GstInvoice, Order, PaymentTransaction, SettlementBreakdown } from "@/types";

export type IndiaPaymentMode = PaymentTransaction["method"];
export type UpiAppId = NonNullable<PaymentTransaction["upiApp"]>;

export interface CodEligibilityResult {
  eligible: boolean;
  maxAmount: number;
  reason?: string;
  verificationState: "not_required" | "otp_placeholder" | "confirmed" | "blocked";
}

export interface UpiAppOption {
  id: UpiAppId;
  label: string;
  packageHint: string;
  trustMessage: string;
}

export interface PaymentRecoveryState {
  title: string;
  message: string;
  action: string;
}

export interface SellerTaxProfile {
  sellerId: string;
  sellerName: string;
  legalName: string;
  gstin?: string;
  gstVerification: "verified_placeholder" | "pending_placeholder" | "not_provided";
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface FinanceDashboardSummary {
  grossSales: number;
  sellerEarnings: number;
  pendingPayouts: number;
  settledPayouts: number;
  codExposure: number;
  commission: number;
  settlements: SettlementBreakdown[];
  invoices: GstInvoice[];
  paymentMix: Array<{ label: string; value: number; amount: number }>;
}

export interface RazorpayCreateOrderInput {
  amount: number;
  currency: "INR";
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayVerificationInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface RazorpayWebhookResult {
  verified: boolean;
  event: string;
  paymentStatus: PaymentTransaction["status"];
  orderReference?: string;
  message: string;
}

export type FinanceOrderInput = Pick<Order, "id" | "code" | "items" | "deliveryAddress" | "pricing" | "payment" | "total" | "createdAt"> & {
  buyerName: string;
  buyerPhone: string;
};

export interface InvoiceGenerationInput {
  order: FinanceOrderInput;
  sellerProfile?: SellerTaxProfile;
}

export interface SettlementGenerationInput {
  order: Pick<Order, "id" | "code" | "items" | "payment" | "total" | "createdAt">;
}

export interface CodRuleInput {
  items: CartItem[];
  total: number;
  pincode: string;
}
