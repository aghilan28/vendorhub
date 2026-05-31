// MCP-0F — Deterministic sample transaction activity (PREVIEW ONLY).
//
// Used to render surfaces before sign-in / without Supabase. It is always
// clearly labelled "Preview (sample data)" and never drives a "live" count
// (queries.ts sets sampled: true). Fixed timestamps keep it deterministic for
// tests and snapshots.

import type {
  CartLine,
  CheckoutAddressInput,
  Coupon,
  PaymentAttemptRecord,
  Shipment,
  TransactionActivityInput,
  TransactionState,
  TxOrder,
  TxOrderItem,
} from "./types";
import type { DisputeInput, RefundInput, ReturnInput, ReviewInput, SupportTicketInput } from "@/lib/trust/types";

const T = (offsetMinutes: number) => new Date(Date.UTC(2026, 4, 31, 6, 0, 0) + offsetMinutes * 60000).toISOString();

function items(...rows: Array<[string, string, number, number]>): TxOrderItem[] {
  return rows.map(([sku, name, quantity, unitPrice]) => ({ sku, name, quantity, unitPrice }));
}

function order(
  partial: Pick<TxOrder, "id" | "orderNumber" | "sellerId" | "sellerName" | "state" | "paymentMethod" | "paymentState" | "total" | "items" | "destinationPincode"> &
    Partial<Pick<TxOrder, "slaMinutes" | "courier" | "buyerId" | "buyerName" | "createdAt" | "updatedAt" | "events">>,
): TxOrder {
  return {
    buyerId: "buyer-1",
    buyerName: "A. Buyer",
    currency: "INR",
    createdAt: T(-720),
    updatedAt: T(-30),
    slaMinutes: 120,
    courier: partial.courier,
    events: partial.events ?? [],
    ...partial,
  };
}

export const SAMPLE_ORDERS: TxOrder[] = [
  order({ id: "o1", orderNumber: "KX-1051", sellerId: "s1", sellerName: "FreshLocal Mart", state: "placed", paymentMethod: "upi", paymentState: "succeeded", total: 1248, destinationPincode: "560001", createdAt: T(-90), slaMinutes: 120, items: items(["SKU-RICE", "Sona Masoori Rice 5kg", 1, 599], ["SKU-OIL", "Cold-pressed Oil 1L", 1, 649]) }),
  order({ id: "o2", orderNumber: "KX-1052", sellerId: "s1", sellerName: "FreshLocal Mart", state: "confirmed", paymentMethod: "cod", paymentState: "cod_pending", total: 430, destinationPincode: "560002", createdAt: T(-200), slaMinutes: 120, items: items(["SKU-ATTA", "Whole Wheat Atta 5kg", 1, 430]) }),
  order({ id: "o3", orderNumber: "KX-1053", sellerId: "s2", sellerName: "UrbanTech Store", state: "packed", paymentMethod: "card", paymentState: "succeeded", total: 8990, destinationPincode: "560003", createdAt: T(-260), slaMinutes: 180, items: items(["SKU-EAR", "Wireless Earbuds", 1, 2990], ["SKU-PWR", "65W Charger", 2, 3000]) }),
  order({ id: "o4", orderNumber: "KX-1054", sellerId: "s2", sellerName: "UrbanTech Store", state: "shipped", paymentMethod: "upi", paymentState: "succeeded", total: 3499, destinationPincode: "560020", courier: "Shiprocket", createdAt: T(-600), slaMinutes: 240, events: [{ id: "e-o4-1", from: "out_for_delivery", to: "shipped", actor: "seller", note: "dispatched", at: T(-300) }], items: items(["SKU-WTC", "Smart Watch", 1, 3499]) }),
  order({ id: "o5", orderNumber: "KX-1055", sellerId: "s3", sellerName: "BloomCart", state: "out_for_delivery", paymentMethod: "upi", paymentState: "succeeded", total: 899, destinationPincode: "560030", courier: "Delhivery", createdAt: T(-500), slaMinutes: 180, items: items(["SKU-PLT", "Indoor Plant", 1, 899]) }),
  order({ id: "o6", orderNumber: "KX-1056", sellerId: "s1", sellerName: "FreshLocal Mart", state: "delivered", paymentMethod: "upi", paymentState: "succeeded", total: 720, destinationPincode: "560001", courier: "Delhivery", createdAt: T(-3000), slaMinutes: 120, events: [{ id: "e-o6-1", from: "out_for_delivery", to: "delivered", actor: "system", note: "delivered", at: T(-1440) }], items: items(["SKU-VEG", "Veg Box", 1, 720]) }),
  order({ id: "o7", orderNumber: "KX-1057", sellerId: "s2", sellerName: "UrbanTech Store", state: "completed", paymentMethod: "card", paymentState: "succeeded", total: 12990, destinationPincode: "560066", courier: "BlueDart", createdAt: T(-7000), slaMinutes: 240, events: [{ id: "e-o7-1", from: "out_for_delivery", to: "delivered", actor: "system", note: "delivered", at: T(-5000) }, { id: "e-o7-2", from: "delivered", to: "completed", actor: "buyer", note: "confirmed", at: T(-4000) }], items: items(["SKU-LAP", "Laptop Stand", 1, 2990], ["SKU-MON", "Monitor 27\"", 1, 10000]) }),
  order({ id: "o8", orderNumber: "KX-1058", sellerId: "s3", sellerName: "BloomCart", state: "draft", paymentMethod: "upi", paymentState: "not_started", total: 540, destinationPincode: "560040", createdAt: T(-15), slaMinutes: 120, items: items(["SKU-SEED", "Seed Kit", 1, 540]) }),
  order({ id: "o9", orderNumber: "KX-1059", sellerId: "s2", sellerName: "UrbanTech Store", state: "cancelled", paymentMethod: "card", paymentState: "failed", total: 4999, destinationPincode: "560011", createdAt: T(-800), slaMinutes: 180, items: items(["SKU-CAM", "Webcam 1080p", 1, 4999]) }),
  order({ id: "o10", orderNumber: "KX-1060", sellerId: "s1", sellerName: "FreshLocal Mart", state: "shipped", paymentMethod: "cod", paymentState: "cod_pending", total: 1599, destinationPincode: "560078", courier: "Ecom Express", createdAt: T(-900), slaMinutes: 120, items: items(["SKU-GHEE", "Pure Ghee 1L", 1, 799], ["SKU-HONEY", "Raw Honey 500g", 1, 800]) }),
];

export const SAMPLE_PAYMENTS: PaymentAttemptRecord[] = [
  { id: "p1", orderId: "o1", method: "upi", state: "succeeded", amount: 1248, currency: "INR", attempts: 1, createdAt: T(-90), updatedAt: T(-88), providerOrderId: "order_x1", providerPaymentId: "pay_x1" },
  { id: "p2", orderId: "o2", method: "cod", state: "cod_pending", amount: 430, currency: "INR", attempts: 1, createdAt: T(-200), updatedAt: T(-200) },
  { id: "p3", orderId: "o3", method: "card", state: "succeeded", amount: 8990, currency: "INR", attempts: 2, createdAt: T(-260), updatedAt: T(-255), providerPaymentId: "pay_x3" },
  { id: "p4", orderId: "o4", method: "upi", state: "succeeded", amount: 3499, currency: "INR", attempts: 1, createdAt: T(-600), updatedAt: T(-598) },
  { id: "p5", orderId: "o5", method: "upi", state: "succeeded", amount: 899, currency: "INR", attempts: 1, createdAt: T(-500), updatedAt: T(-498) },
  { id: "p6", orderId: "o9", method: "card", state: "failed", amount: 4999, currency: "INR", attempts: 3, createdAt: T(-800), updatedAt: T(-790), failureReason: "card_declined" },
  { id: "p7", orderId: "o7", method: "card", state: "succeeded", amount: 12990, currency: "INR", attempts: 1, createdAt: T(-7000), updatedAt: T(-6998) },
  { id: "p8", orderId: "o10", method: "cod", state: "cod_pending", amount: 1599, currency: "INR", attempts: 1, createdAt: T(-900), updatedAt: T(-900) },
];

const SHIP_EVENTS = (states: Array<[TransactionState, number, string]>): Shipment["events"] =>
  states.map(([state, off, label]) => ({ at: T(off), state, label }));

export const SAMPLE_SHIPMENTS: Shipment[] = [
  { id: "sh3", orderId: "o3", orderNumber: "KX-1053", courier: "BlueDart", state: "packed", originPincode: "560100", destinationPincode: "560003", promisedAt: T(180), events: SHIP_EVENTS([["confirmed", -255, "Confirmed"], ["packed", -120, "Packed"]]) },
  { id: "sh4", orderId: "o4", orderNumber: "KX-1054", courier: "Shiprocket", state: "shipped", originPincode: "560100", destinationPincode: "560020", dispatchedAt: T(-300), promisedAt: T(-60), events: SHIP_EVENTS([["packed", -400, "Packed"], ["shipped", -300, "Shipped"]]) },
  { id: "sh5", orderId: "o5", orderNumber: "KX-1055", courier: "Delhivery", state: "out_for_delivery", originPincode: "560100", destinationPincode: "560030", dispatchedAt: T(-200), promisedAt: T(40), events: SHIP_EVENTS([["shipped", -200, "Shipped"], ["out_for_delivery", -40, "Out for delivery"]]) },
  { id: "sh6", orderId: "o6", orderNumber: "KX-1056", courier: "Delhivery", state: "delivered", originPincode: "560100", destinationPincode: "560001", dispatchedAt: T(-2000), promisedAt: T(-1500), deliveredAt: T(-1440), events: SHIP_EVENTS([["shipped", -2000, "Shipped"], ["out_for_delivery", -1600, "Out for delivery"], ["delivered", -1440, "Delivered"]]) },
  { id: "sh7", orderId: "o7", orderNumber: "KX-1057", courier: "BlueDart", state: "completed", originPincode: "560100", destinationPincode: "560066", dispatchedAt: T(-6000), promisedAt: T(-5200), deliveredAt: T(-5000), events: SHIP_EVENTS([["shipped", -6000, "Shipped"], ["delivered", -5000, "Delivered"]]) },
  { id: "sh10", orderId: "o10", orderNumber: "KX-1060", courier: "Ecom Express", state: "shipped", originPincode: "560100", destinationPincode: "560078", dispatchedAt: T(-700), promisedAt: T(-120), events: SHIP_EVENTS([["packed", -800, "Packed"], ["shipped", -700, "Shipped"]]) },
];

export const SAMPLE_COUPONS: Coupon[] = [
  { code: "WELCOME10", type: "percent", value: 10, minOrder: 499, maxDiscount: 150, active: true, description: "10% off your first order (max ₹150)." },
  { code: "FLAT100", type: "flat", value: 100, minOrder: 999, active: true, description: "₹100 off orders above ₹999." },
  { code: "FRESH50", type: "flat", value: 50, minOrder: 299, sellerId: "s1", active: true, description: "₹50 off at FreshLocal Mart." },
  { code: "MULTI75", type: "bundle", value: 75, minOrder: 799, active: true, description: "₹75 off when buying from 2+ sellers." },
  { code: "EXPIRED20", type: "percent", value: 20, minOrder: 199, active: true, expiresAt: T(-100000), description: "Expired offer." },
];

export const SAMPLE_RETURNS: ReturnInput[] = [
  { id: "r1", orderId: "o6", sellerId: "s1", buyerId: "buyer-1", status: "requested", reason: "Item damaged", createdAt: T(-1000) },
  { id: "r2", orderId: "o7", sellerId: "s2", buyerId: "buyer-2", status: "resolved", reason: "Wrong variant", createdAt: T(-4500) },
];

export const SAMPLE_REFUNDS: RefundInput[] = [
  { id: "rf1", orderId: "o9", sellerId: "s2", buyerId: "buyer-1", status: "refunded", amount: 4999, createdAt: T(-780) },
  { id: "rf2", orderId: "o7", sellerId: "s2", buyerId: "buyer-2", status: "processing", amount: 2990, createdAt: T(-4400) },
];

export const SAMPLE_REVIEWS: ReviewInput[] = [
  { id: "rv1", productId: "SKU-VEG", sellerId: "s1", rating: 5, verifiedPurchase: true, helpfulVotes: 4, totalVotes: 5, moderationStatus: "VISIBLE", createdAt: T(-1300) },
  { id: "rv2", productId: "SKU-MON", sellerId: "s2", rating: 4, verifiedPurchase: true, helpfulVotes: 2, totalVotes: 3, moderationStatus: "VISIBLE", createdAt: T(-3900) },
];

export const SAMPLE_TICKETS: SupportTicketInput[] = [
  { id: "t1", category: "delivery", priority: "high", status: "open", createdAt: T(-120), firstResponseMinutes: 30 },
  { id: "t2", category: "payment", priority: "urgent", status: "in_progress", createdAt: T(-300), firstResponseMinutes: 15 },
  { id: "t3", category: "order", priority: "low", status: "resolved", createdAt: T(-5000), firstResponseMinutes: 60 },
];

export const SAMPLE_DISPUTES: DisputeInput[] = [
  { id: "d1", orderId: "o9", state: "open", createdAt: T(-700) },
];

export const SAMPLE_TRANSACTION_INPUT: TransactionActivityInput = {
  generatedAt: T(0),
  orders: SAMPLE_ORDERS,
  payments: SAMPLE_PAYMENTS,
  shipments: SAMPLE_SHIPMENTS,
  coupons: SAMPLE_COUPONS,
  returns: SAMPLE_RETURNS,
  refunds: SAMPLE_REFUNDS,
  reviews: SAMPLE_REVIEWS,
  tickets: SAMPLE_TICKETS,
  disputes: SAMPLE_DISPUTES,
};

// Sample cart + addresses for checkout previews.
export const SAMPLE_CART_LINES: CartLine[] = [
  { id: "cl1", productId: "SKU-RICE", sku: "SKU-RICE", name: "Sona Masoori Rice 5kg", sellerId: "s1", sellerName: "FreshLocal Mart", category: "Groceries", unitPrice: 599, mrp: 699, quantity: 1, available: 24, lowStockThreshold: 5, listStatus: "active" },
  { id: "cl2", productId: "SKU-OIL", sku: "SKU-OIL", name: "Cold-pressed Oil 1L", sellerId: "s1", sellerName: "FreshLocal Mart", category: "Groceries", unitPrice: 649, mrp: 749, quantity: 2, available: 3, lowStockThreshold: 5, listStatus: "active" },
  { id: "cl3", productId: "SKU-EAR", sku: "SKU-EAR", name: "Wireless Earbuds", sellerId: "s2", sellerName: "UrbanTech Store", category: "Electronics", unitPrice: 2990, mrp: 3990, quantity: 1, available: 12, lowStockThreshold: 4, listStatus: "active" },
  { id: "cl4", productId: "SKU-PLT", sku: "SKU-PLT", name: "Indoor Plant", sellerId: "s3", sellerName: "BloomCart", category: "Home", unitPrice: 899, mrp: 999, quantity: 1, available: 8, lowStockThreshold: 3, listStatus: "saved" },
];

export const SAMPLE_ADDRESSES: CheckoutAddressInput[] = [
  { id: "addr-1", label: "Home", recipient: "A. Buyer", phone: "+91 90000 12345", line1: "12, MG Road", locality: "Indiranagar", city: "Bengaluru", pincode: "560001", isDefault: true },
  { id: "addr-2", label: "Work", recipient: "A. Buyer", phone: "+91 90000 12345", line1: "Tower B, Tech Park", locality: "Whitefield", city: "Bengaluru", pincode: "560066" },
];
