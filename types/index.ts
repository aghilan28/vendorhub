export enum UserRole {
  Buyer = "buyer",
  Seller = "seller",
  Admin = "admin",
}

export enum ProductStatus {
  Draft = "draft",
  Active = "active",
  OutOfStock = "out_of_stock",
  Suspended = "suspended",
}

export enum OrderStatus {
  Pending = "PENDING",
  Confirmed = "CONFIRMED",
  Processing = "PROCESSING",
  Packed = "PACKED",
  Shipped = "SHIPPED",
  OutForDelivery = "OUT_FOR_DELIVERY",
  Delivered = "DELIVERED",
  Cancelled = "CANCELLED",
  Refunded = "REFUNDED",
}

export enum PaymentStatus {
  NotStarted = "NOT_STARTED",
  IntentCreated = "INTENT_CREATED",
  Pending = "PENDING",
  Processing = "PROCESSING",
  Succeeded = "SUCCEEDED",
  Failed = "FAILED",
  Cancelled = "CANCELLED",
  CodPending = "COD_PENDING",
  CodConfirmed = "COD_CONFIRMED",
  RefundPending = "REFUND_PENDING",
  Refunded = "REFUNDED",
}

export enum NotificationSeverity {
  Info = "info",
  Success = "success",
  Warning = "warning",
  Critical = "critical",
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface Vendor {
  id: string;
  name: string;
  slug: string;
  rating: number;
  serviceStatus: "open" | "busy" | "closed" | "paused";
  fulfillmentPromiseMinutes: number;
  locality?: string;
  city?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  serviceRadiusKm?: number;
  coverageNote?: string;
  verified?: boolean;
  orderCount?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  description?: string;
  imageUrl?: string;
  productCount?: number;
}

export interface ProductMediaItem {
  url: string;
  thumbUrl: string;
  alt: string;
  isPrimary: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  vendor: Vendor;
  category: Category;
  imageUrl?: string;
  gallery?: ProductMediaItem[];
  price: number;
  originalPrice?: number;
  currency: "INR" | "USD";
  rating: number;
  reviewCount?: number;
  stockCount: number;
  status: ProductStatus;
  unit?: string;
  deliveryMinutes?: number;
  tags?: string[];
  description?: string;
  specs?: Record<string, string>;
  trustSignals?: string[];
}

export interface BuyerLocation {
  id: string;
  label: string;
  source: "gps" | "manual" | "pincode" | "default";
  latitude: number;
  longitude: number;
  locality: string;
  city: string;
  pincode?: string;
  accuracyMeters?: number;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  reservedUntil?: string;
}

export interface MoneyBreakdown {
  subtotal: number;
  tax: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  delivery: number;
  discount: number;
  total: number;
  currency: "INR" | "USD";
}

export interface CheckoutAddress {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  line1: string;
  locality: string;
  city: string;
  pincode: string;
  instructions?: string;
}

export interface PaymentTransaction {
  intentId: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  reference: string;
  method: "upi" | "cod" | "card" | "netbanking" | "wallet";
  status: PaymentStatus;
  amount: number;
  currency: "INR" | "USD";
  upiApp?: "gpay" | "phonepe" | "paytm" | "bhim" | "generic";
  upiDeepLink?: string;
  gatewayEvent?: string;
  createdAt: string;
  updatedAt: string;
  failureReason?: string;
}

export interface GstParty {
  name: string;
  gstin?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface GstInvoiceLine {
  id: string;
  description: string;
  hsnSac: string;
  quantity: number;
  taxableValue: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface GstInvoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  issuedAt: string;
  seller: GstParty;
  buyer: GstParty;
  lines: GstInvoiceLine[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  delivery: number;
  discount: number;
  total: number;
  paymentMode: PaymentTransaction["method"];
  transactionReference: string;
  pdfUrl: string;
  status: "generated" | "download_ready" | "failed";
}

export interface SettlementBreakdown {
  id: string;
  orderId: string;
  sellerId: string;
  sellerName: string;
  paymentMode: PaymentTransaction["method"];
  grossAmount: number;
  commissionRate: number;
  commission: number;
  taxWithheldPlaceholder: number;
  codCollectionPending: number;
  sellerEarnings: number;
  status: "pending" | "eligible" | "processing" | "settled" | "on_hold";
  expectedPayoutDate: string;
  completedAt?: string;
  reference: string;
}

export interface OrderHistoryEntry {
  id: string;
  status: OrderStatus;
  title: string;
  note: string;
  createdAt: string;
  actor: "buyer" | "seller" | "admin" | "system" | "payment_gateway";
 }

export interface AuditEntry {
  id: string;
  action: string;
  targetId: string;
  actor: "buyer" | "seller" | "admin" | "system" | "payment_gateway";
  createdAt: string;
  metadata: Record<string, string | number | boolean>;
}

export interface TransactionNotification {
  id: string;
  event:
    | "order_placed"
    | "payment_success"
    | "payment_failed"
    | "order_confirmed"
    | "shipment_update"
    | "cancellation_update"
    | "refund_requested";
  orderId: string;
  title: string;
  body: string;
  createdAt: string;
  delivered: boolean;
}

export interface Order {
  id: string;
  code: string;
  status: OrderStatus;
  items: CartItem[];
  buyerName: string;
  buyerPhone: string;
  deliveryAddress: CheckoutAddress;
  pricing: MoneyBreakdown;
  payment: PaymentTransaction;
  history: OrderHistoryEntry[];
  auditTrail: AuditEntry[];
  notifications: TransactionNotification[];
  sellerNote?: string;
  supportReference: string;
  invoiceState: "placeholder_ready" | "requested" | "generated" | "download_ready" | "failed";
  invoice?: GstInvoice;
  settlement?: SettlementBreakdown;
  cod?: {
    eligible: boolean;
    confirmedAt?: string;
    maxAmount: number;
    verificationState: "not_required" | "otp_placeholder" | "confirmed" | "blocked";
    restrictionReason?: string;
  };
  cancellation?: {
    requestedAt: string;
    reason: string;
    status: "requested" | "approved_placeholder" | "rejected_placeholder";
  };
  refund?: {
    requestedAt: string;
    reason: string;
    status: "requested" | "under_review" | "approved_placeholder" | "rejected_placeholder";
  };
  total: number;
  currency: "INR" | "USD";
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  severity: NotificationSeverity;
  createdAt: string;
  readAt?: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  body?: string;
  createdAt: string;
}

export type EntityId = string;
export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export * from "./commerce-foundation";
export * from "./catalog-governance";
